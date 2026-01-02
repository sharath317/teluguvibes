import type { Metadata } from 'next';
import { Inter, Poppins, Noto_Sans_Telugu } from 'next/font/google';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { DedicationsWidget } from '@/components/DedicationsWidget';
import { SkipLink } from '@/components/a11y/SkipLink';
import { LanguageProvider } from '@/lib/i18n';
import './globals.css';

// English fonts - Modern & Clean
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

// Telugu font - Noto Sans Telugu (Best for readability)
const notoSansTelugu = Noto_Sans_Telugu({
  weight: ['400', '500', '600', '700'],
  subsets: ['telugu'],
  variable: '--font-telugu',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'తెలుగు వార్తలు | Telugu Entertainment Portal',
    template: '%s | తెలుగు వార్తలు',
  },
  description: 'తాజా తెలుగు వార్తలు, గాసిప్, స్పోర్ట్స్, వినోదం - అన్ని వార్తలు ఒకే చోట',
  keywords: ['telugu news', 'telugu gossip', 'telugu sports', 'telugu entertainment', 'hyderabad news'],
  authors: [{ name: 'Telugu Portal' }],
  openGraph: {
    type: 'website',
    locale: 'te_IN',
    siteName: 'తెలుగు వార్తలు',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="te" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} ${notoSansTelugu.variable} font-telugu antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen`}
      >
        <LanguageProvider>
          {/* Skip Link for Accessibility */}
          <SkipLink targetId="main-content" text="Skip to main content" />

          {/* Header - Semantic landmark */}
          <header role="banner">
            <Header />
          </header>

          {/* Main content - Semantic landmark */}
          <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
            {children}
          </main>

          {/* Dedications Widget - Bottom Left */}
          <DedicationsWidget position="bottom-left" />

        {/* Footer - Semantic landmark */}
        <footer role="contentinfo" className="bg-[var(--bg-secondary)] border-t border-[var(--border-secondary)] mt-12">
          <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-4 gap-8">
              {/* About */}
              <div>
                <h4 className="font-bold text-[var(--brand-primary)] mb-4">తెలుగు వార్తలు గురించి</h4>
                <p className="text-sm text-[var(--text-tertiary)]">
                  తాజా తెలుగు వార్తలు, గాసిప్, స్పోర్ట్స్, వినోదం - అన్ని వార్తలు ఒకే చోట.
                </p>
              </div>

              {/* Categories */}
              <nav aria-label="Footer categories">
                <h4 className="font-bold text-[var(--text-primary)] mb-4">విభాగాలు</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/reviews" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">🎬 మూవీ రివ్యూలు</Link></li>
                  <li><Link href="/hot" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">🔥 హాట్ మీడియా</Link></li>
                  <li><Link href="/category/gossip" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">గాసిప్</Link></li>
                  <li><Link href="/category/sports" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">స్పోర్ట్స్</Link></li>
                  <li><Link href="/category/entertainment" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">వినోదం</Link></li>
                </ul>
              </nav>

              {/* Links */}
              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-4">లింకులు</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/about" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">మా గురించి</Link></li>
                  <li><Link href="/contact" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">సంప్రదించండి</Link></li>
                  <li><Link href="/privacy" className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">గోప్యతా విధానం</Link></li>
                </ul>
              </div>

              {/* Social */}
              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-4">మమ్మల్ని ఫాలో అవ్వండి</h4>
                <div className="flex gap-4">
                  <SocialLink href="#" label="Facebook" />
                  <SocialLink href="#" label="Twitter" />
                  <SocialLink href="#" label="Instagram" />
                  <SocialLink href="#" label="YouTube" />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-secondary)] mt-8 pt-8 text-center text-sm text-[var(--text-tertiary)]">
              © {new Date().getFullYear()} తెలుగు వార్తలు. అన్ని హక్కులు రిజర్వ్ చేయబడ్డాయి.
            </div>
          </div>
        </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="w-10 h-10 bg-[var(--bg-tertiary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-full flex items-center justify-center transition-colors"
      aria-label={label}
    >
      {label[0]}
    </a>
  );
}
