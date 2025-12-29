import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | TeluguVibes',
  description: 'Privacy Policy for TeluguVibes - Telugu Entertainment News Portal',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-[#eab308] mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-invert max-w-none space-y-8 text-[#ededed]">
          <p className="text-[#737373]">
            Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="text-[#a3a3a3] leading-relaxed">
              Welcome to TeluguVibes (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your
              personal information and your right to privacy. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you visit our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p className="text-[#a3a3a3] leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-[#a3a3a3] space-y-2">
              <li>Name and email address when you create an account</li>
              <li>Comments and content you post on our platform</li>
              <li>Communication data when you contact us</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-[#a3a3a3] leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-[#a3a3a3] space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Send you updates and news (with your consent)</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent security incidents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Cookies and Tracking</h2>
            <p className="text-[#a3a3a3] leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our website and
              hold certain information. Cookies are files with a small amount of data which may include
              an anonymous unique identifier. You can instruct your browser to refuse all cookies or
              to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Third-Party Services</h2>
            <p className="text-[#a3a3a3] leading-relaxed mb-4">
              We may employ third-party companies and services, including:
            </p>
            <ul className="list-disc list-inside text-[#a3a3a3] space-y-2">
              <li>Google Analytics for website analytics</li>
              <li>Google AdSense for displaying advertisements</li>
              <li>Social media platforms for sharing features</li>
              <li>Authentication providers for login services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Data Security</h2>
            <p className="text-[#a3a3a3] leading-relaxed">
              The security of your data is important to us. We use commercially acceptable means to
              protect your personal information, but remember that no method of transmission over the
              Internet or method of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p className="text-[#a3a3a3] leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-[#a3a3a3] space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-[#a3a3a3] leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you are a parent or guardian
              and you are aware that your child has provided us with personal data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
            <p className="text-[#a3a3a3] leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Contact Us</h2>
            <p className="text-[#a3a3a3] leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-[#eab308] mt-2">
              Email: privacy@teluguvibes.com
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

