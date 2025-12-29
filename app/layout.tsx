import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { Newspaper, Menu } from 'lucide-react';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    <html lang="te">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-[#ededed] min-h-screen`}
      >
        {/* Header */}
        <header className="bg-[#141414] border-b border-[#262626]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <Newspaper className="w-8 h-8 text-[#eab308]" />
                <span className="text-xl font-bold text-white group-hover:text-[#eab308] transition-colors">
                  తెలుగు వార్తలు
                </span>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/hot"
                  className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-full text-sm hover:opacity-90 transition-opacity"
                >
                  🔥 హాట్
                </Link>
                <NavLink href="/category/gossip">గాసిప్</NavLink>
                <NavLink href="/category/sports">స్పోర్ట్స్</NavLink>
                <NavLink href="/category/politics">రాజకీయాలు</NavLink>
                <NavLink href="/category/entertainment">వినోదం</NavLink>
              </nav>

              {/* Mobile menu button */}
              <button className="md:hidden p-2 hover:bg-[#262626] rounded-lg transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="bg-[#141414] border-t border-[#262626] mt-12">
          <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-4 gap-8">
              {/* About */}
              <div>
                <h4 className="font-bold text-[#eab308] mb-4">తెలుగు వార్తలు గురించి</h4>
                <p className="text-sm text-[#737373]">
                  తాజా తెలుగు వార్తలు, గాసిప్, స్పోర్ట్స్, వినోదం - అన్ని వార్తలు ఒకే చోట.
                </p>
              </div>

              {/* Categories */}
              <div>
                <h4 className="font-bold text-white mb-4">విభాగాలు</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/category/gossip" className="text-[#737373] hover:text-[#eab308]">గాసిప్</Link></li>
                  <li><Link href="/category/sports" className="text-[#737373] hover:text-[#eab308]">స్పోర్ట్స్</Link></li>
                  <li><Link href="/category/politics" className="text-[#737373] hover:text-[#eab308]">రాజకీయాలు</Link></li>
                  <li><Link href="/category/entertainment" className="text-[#737373] hover:text-[#eab308]">వినోదం</Link></li>
                </ul>
              </div>

              {/* Links */}
              <div>
                <h4 className="font-bold text-white mb-4">లింకులు</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/about" className="text-[#737373] hover:text-[#eab308]">మా గురించి</Link></li>
                  <li><Link href="/contact" className="text-[#737373] hover:text-[#eab308]">సంప్రదించండి</Link></li>
                  <li><Link href="/privacy" className="text-[#737373] hover:text-[#eab308]">గోప్యతా విధానం</Link></li>
                </ul>
              </div>

              {/* Social */}
              <div>
                <h4 className="font-bold text-white mb-4">మమ్మల్ని ఫాలో అవ్వండి</h4>
                <div className="flex gap-4">
                  <SocialLink href="#" label="Facebook" />
                  <SocialLink href="#" label="Twitter" />
                  <SocialLink href="#" label="Instagram" />
                  <SocialLink href="#" label="YouTube" />
                </div>
              </div>
            </div>

            <div className="border-t border-[#262626] mt-8 pt-8 text-center text-sm text-[#737373]">
              © {new Date().getFullYear()} తెలుగు వార్తలు. అన్ని హక్కులు రిజర్వ్ చేయబడ్డాయి.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[#ededed] hover:text-[#eab308] font-medium transition-colors"
    >
      {children}
    </Link>
  );
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="w-10 h-10 bg-[#262626] hover:bg-[#eab308] hover:text-black rounded-full flex items-center justify-center transition-colors"
      aria-label={label}
    >
      {label[0]}
    </a>
  );
}
