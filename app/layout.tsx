import type { Metadata } from 'next'
import { Paytone_One, Montserrat, DM_Sans } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { BodyClassManager } from '@/components/BodyClassManager';
import { ThemeProvider } from '@/contexts/ThemeContext'
import { getHomePageMetadata } from '@/services/wordpress';
import GoogleTagManager, { GoogleTagManagerNoscript } from '@/components/GoogleTagManager';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import publicFrontendCopy from '@/utils/public-frontend-copy.json';

const paytoneOne = Paytone_One({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-paytone-one',
  display: 'swap',
})

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  // Valores por defecto explícitos (fuente de verdad para OG)
  const defaultTitle = 'Playful Agency - Agencia de E-commerce | Marketing Digital';
  const defaultDescription = publicFrontendCopy.home.metadataDescription;
  const defaultOgImage = 'https://playfulagency.com/og.jpg';
  
  try {
    const yoastData = await getHomePageMetadata();
    
    const metadata: Metadata = {
      title: yoastData.yoast_wpseo_title || defaultTitle,
      description: yoastData.yoast_wpseo_metadesc || defaultDescription,
      metadataBase: new URL('https://playfulagency.com'),
      openGraph: {
        title: yoastData.yoast_wpseo_og_title || yoastData.yoast_wpseo_title || defaultTitle,
        description: yoastData.yoast_wpseo_og_description || yoastData.yoast_wpseo_metadesc || defaultDescription,
        type: 'website',
        locale: 'es_ES',
        siteName: 'Playful Agency',
        images: [{
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: 'Playful Agency - Agencia de E-commerce',
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: yoastData.yoast_wpseo_og_title || yoastData.yoast_wpseo_title || defaultTitle,
        description: yoastData.yoast_wpseo_og_description || yoastData.yoast_wpseo_metadesc || defaultDescription,
        images: [defaultOgImage],
      },
    };
    
    return metadata;
    
  } catch (error) {
    console.error('Error generando metadatos:', error);
    
    // Fallback con metadata completa
    return {
      title: defaultTitle,
      description: defaultDescription,
      metadataBase: new URL('https://playfulagency.com'),
      openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        type: 'website',
        locale: 'es_ES',
        siteName: 'Playful Agency',
        images: [{
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: 'Playful Agency - Agencia de E-commerce',
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDescription,
        images: [defaultOgImage],
      },
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || '';
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {gtmId && <GoogleTagManager gtmId={gtmId} />}
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </head>
      <body className={`${paytoneOne.variable} ${montserrat.variable} ${dmSans.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider>
          <BodyClassManager />
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  )
}
