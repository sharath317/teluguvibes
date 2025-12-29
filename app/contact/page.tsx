'use client';

import { useState } from 'react';
import { Metadata } from 'next';

// Note: Metadata should be in a separate file or use generateMetadata for client components
// export const metadata: Metadata = {
//   title: 'Contact Us | TeluguVibes',
//   description: 'Contact TeluguVibes - Get in touch with our team for tips, collaborations, or feedback.',
// };

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    // In production, send to your API endpoint
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-[#eab308] mb-8">
          Contact Us
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-[#141414] rounded-xl p-6 md:p-8 border border-[#262626]">
            <h2 className="text-xl font-semibold text-white mb-6">
              Send us a message
            </h2>

            {submitStatus === 'success' && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                <p className="text-green-400">
                  ✅ Thank you for your message! We&apos;ll get back to you soon.
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-400">
                  ❌ Something went wrong. Please try again.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#a3a3a3] mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:border-[#eab308] focus:outline-none transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#a3a3a3] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:border-[#eab308] focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-[#a3a3a3] mb-2">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-[#eab308] focus:outline-none transition-colors"
                >
                  <option value="">Select a subject</option>
                  <option value="news-tip">📰 News Tip</option>
                  <option value="feedback">💬 Feedback</option>
                  <option value="collaboration">🤝 Collaboration</option>
                  <option value="advertising">📢 Advertising</option>
                  <option value="bug-report">🐛 Report a Bug</option>
                  <option value="other">📝 Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#a3a3a3] mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:border-[#eab308] focus:outline-none transition-colors resize-none"
                  placeholder="Your message..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#eab308] text-black font-semibold py-3 rounded-lg hover:bg-[#ca9b07] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            {/* Direct Contact */}
            <div className="bg-[#141414] rounded-xl p-6 border border-[#262626]">
              <h2 className="text-xl font-semibold text-white mb-4">
                📧 Direct Contact
              </h2>
              <div className="space-y-4 text-[#a3a3a3]">
                <div>
                  <p className="text-sm text-[#737373]">General Inquiries</p>
                  <a href="mailto:hello@teluguvibes.com" className="text-[#eab308] hover:underline">
                    hello@teluguvibes.com
                  </a>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">News Tips</p>
                  <a href="mailto:tips@teluguvibes.com" className="text-[#eab308] hover:underline">
                    tips@teluguvibes.com
                  </a>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">Advertising</p>
                  <a href="mailto:ads@teluguvibes.com" className="text-[#eab308] hover:underline">
                    ads@teluguvibes.com
                  </a>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-[#141414] rounded-xl p-6 border border-[#262626]">
              <h2 className="text-xl font-semibold text-white mb-4">
                🌐 Social Media
              </h2>
              <div className="space-y-3">
                {[
                  { name: 'Twitter / X', icon: '𝕏', handle: '@teluguvibes', href: '#' },
                  { name: 'Instagram', icon: '📸', handle: '@teluguvibes', href: '#' },
                  { name: 'YouTube', icon: '▶️', handle: 'TeluguVibes', href: '#' },
                  { name: 'Telegram', icon: '📱', handle: 't.me/teluguvibes', href: '#' },
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#0a0a0a] transition-colors"
                  >
                    <span className="text-xl">{social.icon}</span>
                    <div>
                      <p className="text-white text-sm">{social.name}</p>
                      <p className="text-[#737373] text-sm">{social.handle}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-[#141414] rounded-xl p-6 border border-[#262626]">
              <h2 className="text-xl font-semibold text-white mb-4">
                ❓ Quick FAQ
              </h2>
              <div className="space-y-4 text-[#a3a3a3]">
                <div>
                  <p className="font-medium text-white text-sm">How can I submit a news tip?</p>
                  <p className="text-sm">Email us at tips@teluguvibes.com or use the form above.</p>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Do you accept guest posts?</p>
                  <p className="text-sm">Yes! Contact us for collaboration opportunities.</p>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">How can I report incorrect information?</p>
                  <p className="text-sm">Email hello@teluguvibes.com with details and we&apos;ll review it.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

