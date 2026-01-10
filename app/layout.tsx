import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "తెలుగు పోర్టల్ | Telugu Portal - Entertainment Hub",
  description: "Telugu entertainment news, movie reviews, celebrity gossip, and more. తెలుగు వినోద వార్తలు, సినిమా సమీక్షలు, సెలబ్రిటీ గాసిప్.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="te" className="dark" suppressHydrationWarning>
      <head>
        {/* Inline script to apply saved theme before first paint - prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme && ['dark', 'light', 'vibrant'].includes(theme)) {
                    document.documentElement.classList.remove('dark', 'light', 'vibrant');
                    document.documentElement.classList.add(theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: 'var(--bg-primary)' }}
      >
        <LanguageProvider>
          <SiteHeader />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
