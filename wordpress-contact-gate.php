<?php
/**
 * Plugin Name: Playful Contact Gate
 * Description: Protege el endpoint de contacto de Playful y evita entregas duplicadas.
 * Version: 1.2.0
 * Author: Playful Agency
 */

defined('ABSPATH') || exit;

const PLAYFUL_CONTACT_GATE_TOKEN_OPTION = 'playful_contact_gate_token';
const PLAYFUL_CONTACT_GATE_ENFORCE_OPTION = 'playful_contact_gate_enforce';
const PLAYFUL_CONTACT_RECEIPT_PREFIX = 'playful_contact_receipt_';
const PLAYFUL_CONTACT_RECEIPT_TTL_SECONDS = 604800;
const PLAYFUL_CONTACT_RECEIPT_CLEANUP_HOOK = 'playful_contact_gate_cleanup_receipt';

function playful_contact_gate_is_contact_request($request) {
    return $request instanceof WP_REST_Request
        && $request->get_route() === '/playful/v1/contact'
        && $request->get_method() === 'POST';
}

function playful_contact_gate_is_receipt_request($request) {
    return $request instanceof WP_REST_Request
        && $request->get_route() === '/playful/v1/contact-receipt'
        && $request->get_method() === 'POST';
}

function playful_contact_gate_is_protected_request($request) {
    return playful_contact_gate_is_contact_request($request)
        || playful_contact_gate_is_receipt_request($request);
}

function playful_contact_gate_receipt_key($submission_id) {
    return PLAYFUL_CONTACT_RECEIPT_PREFIX . hash('sha256', $submission_id);
}

function playful_contact_gate_receipt_value($state, $created_at, $updated_at) {
    return wp_json_encode(array(
        'state' => $state,
        'created_at' => (int) $created_at,
        'updated_at' => (int) $updated_at,
    ));
}

function playful_contact_gate_submission_id($request) {
    $body_id = $request->get_param('submission_id');
    $header_id = (string) $request->get_header('x-playful-submission-id');

    if ($body_id !== null && !is_string($body_id)) {
        return new WP_Error(
            'playful_contact_gate_invalid_submission_id',
            'Invalid submission identifier.',
            array('status' => 400)
        );
    }

    $body_id = (string) $body_id;
    if ($body_id === '' && $header_id === '') {
        return '';
    }

    if ($body_id !== '' && $header_id !== '' && !hash_equals($body_id, $header_id)) {
        return new WP_Error(
            'playful_contact_gate_submission_id_mismatch',
            'Invalid submission identifier.',
            array('status' => 400)
        );
    }

    $submission_id = $body_id !== '' ? $body_id : $header_id;
    if (preg_match('/\A[A-Za-z0-9_-]{20,100}\z/', $submission_id) !== 1) {
        return new WP_Error(
            'playful_contact_gate_invalid_submission_id',
            'Invalid submission identifier.',
            array('status' => 400)
        );
    }

    return $submission_id;
}

function playful_contact_gate_allowed_qualification_values() {
    return array(
        'decisionRole' => array('owner', 'decision_lead', 'researching_for_other', 'other'),
        'salesModel' => array('d2c', 'd2c_b2b', 'amazon', 'mercado_libre', 'marketplaces_other', 'marketplace_to_d2c', 'pre_d2c', 'not_online_or_unsure', 'other'),
        'monthlyRevenue' => array('over_100k', '50k_100k', '10k_50k', 'under_10k', 'prefer_not_to_say', 'other'),
        'projectTiming' => array('0_30_days', '1_3_months', 'evaluating', 'researching', 'other'),
    );
}

function playful_contact_gate_validate_qualification($request) {
    $qualification = $request->get_param('qualification');
    // Existing integrations retain their current contract until Next.js sends
    // the versioned qualification object. New submissions fail closed.
    if ($qualification === null) {
        return true;
    }
    if (!is_array($qualification)) {
        return new WP_Error('playful_contact_gate_invalid_qualification', 'Invalid qualification payload.', array('status' => 422));
    }

    foreach (playful_contact_gate_allowed_qualification_values() as $field => $allowed) {
        $value = isset($qualification[$field]) ? (string) $qualification[$field] : '';
        if (!in_array($value, $allowed, true)) {
            return new WP_Error('playful_contact_gate_invalid_qualification', 'Invalid qualification selection.', array('status' => 422));
        }
        $other_field = $field . 'Other';
        $other = isset($qualification[$other_field]) ? trim((string) $qualification[$other_field]) : '';
        if ($value === 'other' && ($other === '' || strlen($other) > 250)) {
            return new WP_Error('playful_contact_gate_invalid_qualification', 'Qualification clarification is required.', array('status' => 422));
        }
    }

    $marketplaces = isset($qualification['secondaryMarketplaces'])
        ? (string) $qualification['secondaryMarketplaces']
        : '';
    if (strlen($marketplaces) > 250) {
        return new WP_Error('playful_contact_gate_invalid_qualification', 'Qualification detail is too long.', array('status' => 422));
    }

    return true;
}

function playful_contact_gate_request_context($request, $context = null, $remove = false) {
    static $contexts = array();
    $request_key = spl_object_hash($request);

    if ($remove) {
        $current = isset($contexts[$request_key]) ? $contexts[$request_key] : null;
        unset($contexts[$request_key]);
        return $current;
    }

    if (is_array($context)) {
        $contexts[$request_key] = $context;
    }

    return isset($contexts[$request_key]) ? $contexts[$request_key] : null;
}

function playful_contact_gate_schedule_cleanup($key, $created_at) {
    $args = array($key, (int) $created_at);
    if (!wp_next_scheduled(PLAYFUL_CONTACT_RECEIPT_CLEANUP_HOOK, $args)) {
        wp_schedule_single_event(
            (int) $created_at + PLAYFUL_CONTACT_RECEIPT_TTL_SECONDS,
            PLAYFUL_CONTACT_RECEIPT_CLEANUP_HOOK,
            $args
        );
    }
}

function playful_contact_gate_cleanup_receipt($key, $expected_created_at) {
    if (!is_string($key) || preg_match('/\Aplayful_contact_receipt_[a-f0-9]{64}\z/', $key) !== 1) {
        return;
    }

    $current = (string) get_option($key, '');
    $decoded = json_decode($current, true);
    $created_at = is_array($decoded) ? (int) ($decoded['created_at'] ?? 0) : 0;
    if ($created_at !== (int) $expected_created_at) {
        return;
    }

    $expires_at = $created_at + PLAYFUL_CONTACT_RECEIPT_TTL_SECONDS;
    if (time() < $expires_at) {
        playful_contact_gate_schedule_cleanup($key, $created_at);
        return;
    }

    delete_option($key);
}

add_action(
    PLAYFUL_CONTACT_RECEIPT_CLEANUP_HOOK,
    'playful_contact_gate_cleanup_receipt',
    10,
    2
);

function playful_contact_gate_claim_submission($submission_id) {
    $key = playful_contact_gate_receipt_key($submission_id);
    $created_at = time();
    $processing = playful_contact_gate_receipt_value('processing', $created_at, $created_at);

    // add_option is a single INSERT against a UNIQUE option_name and is the
    // atomic claim. Autoload stays disabled and the key contains only a hash.
    if (add_option($key, $processing, '', false)) {
        playful_contact_gate_schedule_cleanup($key, $created_at);
        return array(
            'kind' => 'acquired',
            'key' => $key,
            'created_at' => $created_at,
            'processing' => $processing,
        );
    }

    $current = (string) get_option($key, '');
    $decoded = json_decode($current, true);
    if (is_array($decoded) && ($decoded['state'] ?? '') === 'completed') {
        return array('kind' => 'completed', 'key' => $key);
    }

    // Unknown, corrupt and in-flight states all fail closed. A worker never
    // steals a claim because the original callback may still have side effects.
    return array('kind' => 'busy', 'key' => $key);
}

function playful_contact_gate_mark_completed($context) {
    global $wpdb;

    $completed = playful_contact_gate_receipt_value(
        'completed',
        $context['created_at'],
        time()
    );
    $updated = $wpdb->query($wpdb->prepare(
        "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value = %s",
        $completed,
        $context['key'],
        $context['processing']
    ));
    wp_cache_delete($context['key'], 'options');

    return $updated === 1;
}

function playful_contact_gate_release_claim($context) {
    global $wpdb;

    $deleted = $wpdb->query($wpdb->prepare(
        "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s",
        $context['key'],
        $context['processing']
    ));
    wp_cache_delete($context['key'], 'options');

    if ($deleted === 1) {
        wp_clear_scheduled_hook(
            PLAYFUL_CONTACT_RECEIPT_CLEANUP_HOOK,
            array($context['key'], (int) $context['created_at'])
        );
    }
}

function playful_contact_gate_is_deterministic_rejection($status) {
    return $status >= 400
        && $status < 500
        && !in_array($status, array(408, 409, 425, 429), true);
}

function playful_contact_gate_protocol_response($status, $body) {
    $response = new WP_REST_Response($body, $status);
    $response->header('X-Playful-Contact-Idempotency', 'v1');
    return $response;
}

function playful_contact_gate_read_receipt($request) {
    if (get_option(PLAYFUL_CONTACT_GATE_ENFORCE_OPTION, '0') !== '1') {
        return playful_contact_gate_protocol_response(503, array(
            'state' => 'unavailable',
            'message' => 'Contact endpoint protection is not enforced.',
        ));
    }

    $submission_id = playful_contact_gate_submission_id($request);
    if (is_wp_error($submission_id)) {
        return $submission_id;
    }
    if ($submission_id === '') {
        return new WP_Error(
            'playful_contact_gate_missing_submission_id',
            'Missing submission identifier.',
            array('status' => 400)
        );
    }

    $current = (string) get_option(playful_contact_gate_receipt_key($submission_id), '');
    if ($current === '') {
        return playful_contact_gate_protocol_response(404, array('state' => 'missing'));
    }

    $decoded = json_decode($current, true);
    $state = is_array($decoded) ? ($decoded['state'] ?? '') : '';
    if ($state === 'completed') {
        return playful_contact_gate_protocol_response(200, array('state' => 'completed'));
    }
    if ($state === 'processing') {
        return playful_contact_gate_protocol_response(202, array('state' => 'processing'));
    }

    return playful_contact_gate_protocol_response(503, array('state' => 'unknown'));
}

add_action('rest_api_init', function () {
    register_rest_route('playful/v1', '/contact-receipt', array(
        'methods' => 'POST',
        'callback' => 'playful_contact_gate_read_receipt',
        'permission_callback' => '__return_true',
        'args' => array(
            'submission_id' => array(
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'validate_callback' => function($param) {
                    return preg_match('/\A[A-Za-z0-9_-]{20,100}\z/', $param) === 1;
                }
            ),
        ),
    ));
});

register_activation_hook(__FILE__, function () {
    add_option(PLAYFUL_CONTACT_GATE_ENFORCE_OPTION, '0');
});

// Ejecutar al final para que ningún plugin posterior pueda reabrir la solicitud.
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if (!playful_contact_gate_is_protected_request($request)) {
        return $result;
    }

    if (get_option(PLAYFUL_CONTACT_GATE_ENFORCE_OPTION, '0') === '1') {
        $expected = (string) get_option(PLAYFUL_CONTACT_GATE_TOKEN_OPTION, '');
        if ($expected === '') {
            return new WP_Error(
                'playful_contact_gate_not_configured',
                'Contact endpoint protection is not configured.',
                array('status' => 503)
            );
        }

        $provided = (string) $request->get_header('x-playful-contact-token');
        if ($provided === '' || !hash_equals($expected, $provided)) {
            return new WP_Error(
                'playful_contact_gate_forbidden',
                'Invalid contact endpoint credentials.',
                array('status' => 403)
            );
        }
    }

    if (playful_contact_gate_is_receipt_request($request)) {
        return $result;
    }

    if ($result !== null) {
        return $result;
    }

    $qualification = playful_contact_gate_validate_qualification($request);
    if (is_wp_error($qualification)) {
        return $qualification;
    }

    $submission_id = playful_contact_gate_submission_id($request);
    if (is_wp_error($submission_id)) {
        return $submission_id;
    }
    if ($submission_id === '') {
        return $result;
    }

    $claim = playful_contact_gate_claim_submission($submission_id);
    if ($claim['kind'] === 'completed') {
        return playful_contact_gate_protocol_response(200, array(
            'success' => true,
            'message' => 'Mensaje enviado correctamente',
            'replayed' => true,
        ));
    }
    if ($claim['kind'] === 'busy') {
        $response = playful_contact_gate_protocol_response(409, array(
            'success' => false,
            'retryable' => true,
            'message' => 'El mensaje todavía se está procesando',
        ));
        $response->header('Retry-After', '1');
        return $response;
    }

    playful_contact_gate_request_context($request, $claim);
    return $result;
}, PHP_INT_MAX, 3);

// Runs after the endpoint callback but before WordPress serves the response.
// Only a confirmed 2xx changes the durable receipt to completed.
add_filter('rest_post_dispatch', function ($response, $server, $request) {
    if (!playful_contact_gate_is_contact_request($request)) {
        return $response;
    }

    $context = playful_contact_gate_request_context($request, null, true);
    if (!is_array($context) || ($context['kind'] ?? '') !== 'acquired') {
        return $response;
    }

    if (is_wp_error($response)) {
        $response = $server->error_to_response($response);
    } else {
        $response = rest_ensure_response($response);
    }
    if (!is_object($response) || !method_exists($response, 'get_status')) {
        return playful_contact_gate_protocol_response(503, array(
            'success' => false,
            'message' => 'No se pudo confirmar de forma segura la entrega.',
        ));
    }
    $status = (int) $response->get_status();
    $response->header('X-Playful-Contact-Idempotency', 'v1');

    if ($status >= 200 && $status < 300) {
        if (!playful_contact_gate_mark_completed($context)) {
            return playful_contact_gate_protocol_response(503, array(
                'success' => false,
                'message' => 'No se pudo confirmar de forma segura la entrega.',
            ));
        }
    } elseif (playful_contact_gate_is_deterministic_rejection($status)) {
        playful_contact_gate_release_claim($context);
    }

    return $response;
}, PHP_INT_MAX, 3);

add_action('admin_init', function () {
    register_setting('playful_contact_gate', PLAYFUL_CONTACT_GATE_TOKEN_OPTION, array(
        'type' => 'string',
        'default' => '',
        'sanitize_callback' => function ($value) {
            $value = trim((string) $value);
            if ($value === '') {
                return (string) get_option(PLAYFUL_CONTACT_GATE_TOKEN_OPTION, '');
            }

            if (!preg_match('/\\A[A-Za-z0-9_-]{32,128}\\z/', $value)) {
                add_settings_error(
                    PLAYFUL_CONTACT_GATE_TOKEN_OPTION,
                    'playful_contact_gate_invalid_token',
                    'El secreto debe tener entre 32 y 128 caracteres seguros.'
                );
                return (string) get_option(PLAYFUL_CONTACT_GATE_TOKEN_OPTION, '');
            }

            return $value;
        },
    ));

    register_setting('playful_contact_gate', PLAYFUL_CONTACT_GATE_ENFORCE_OPTION, array(
        'type' => 'string',
        'default' => '0',
        'sanitize_callback' => function ($value) {
            return $value === '1' ? '1' : '0';
        },
    ));
});

add_action('admin_menu', function () {
    add_options_page(
        'Playful Contact Gate',
        'Playful Contact Gate',
        'manage_options',
        'playful-contact-gate',
        'playful_contact_gate_render_settings'
    );
});

function playful_contact_gate_render_settings() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $has_token = get_option(PLAYFUL_CONTACT_GATE_TOKEN_OPTION, '') !== '';
    $enforced = get_option(PLAYFUL_CONTACT_GATE_ENFORCE_OPTION, '0') === '1';
    ?>
    <div class="wrap">
        <h1>Playful Contact Gate</h1>
        <p>Protege <code>/playful/v1/contact</code> con un secreto enviado únicamente por el servidor de Playful.</p>
        <p>Los envíos con identificador válido conservan un recibo sin datos personales durante siete días para evitar correos duplicados.</p>
        <p><strong>Secreto configurado:</strong> <?php echo $has_token ? 'Sí' : 'No'; ?></p>
        <form method="post" action="options.php">
            <?php settings_fields('playful_contact_gate'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="playful-contact-gate-token">Nuevo secreto</label></th>
                    <td>
                        <input
                            id="playful-contact-gate-token"
                            name="<?php echo esc_attr(PLAYFUL_CONTACT_GATE_TOKEN_OPTION); ?>"
                            type="password"
                            value=""
                            class="regular-text"
                            minlength="32"
                            maxlength="128"
                            autocomplete="new-password"
                        />
                        <p class="description">Déjalo vacío para conservar el secreto actual.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Aplicar protección</th>
                    <td>
                        <input type="hidden" name="<?php echo esc_attr(PLAYFUL_CONTACT_GATE_ENFORCE_OPTION); ?>" value="0" />
                        <label>
                            <input
                                name="<?php echo esc_attr(PLAYFUL_CONTACT_GATE_ENFORCE_OPTION); ?>"
                                type="checkbox"
                                value="1"
                                <?php checked($enforced); ?>
                            />
                            Rechazar solicitudes que no incluyan el secreto correcto
                        </label>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
