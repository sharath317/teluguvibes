import { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, Sparkles, Shield, Users, Zap, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'TeluguVibes - Premium Telugu Entertainment & Culture Portal serving 80+ million Telugu speakers worldwide.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-yellow-500/20 rounded-2xl">
              <Newspaper className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            తెలుగు వైబ్స్ గురించి
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            TeluguVibes is a premium Telugu entertainment and culture portal built to serve the 
            <span className="text-yellow-500 font-bold"> 80+ million Telugu-speaking audience </span> 
            worldwide with viral, evergreen, and community-driven content.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-[#141414]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">మా లక్ష్యం</h2>
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-8">
            <p className="text-lg text-gray-300 leading-relaxed text-center">
              తెలుగు సంస్కృతి, సినిమా, వినోదం మరియు వార్తలను ప్రపంచవ్యాప్తంగా ఉన్న తెలుగు ప్రేక్షకులకు 
              చేరవేయడం మా ధ్యేయం. మేము AI-సహాయక సంపాదకీయ వర్క్‌ఫ్లోలు, లైసెన్స్ చేయబడిన మీడియా 
              మరియు చారిత్రక సాంస్కృతిక మేధస్సును కలిపి - చట్టబద్ధంగా, సమర్థంగా మరియు స్థిరంగా 
              కంటెంట్‌ను అందిస్తాము.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">మేము ఏమి అందిస్తాము</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Trending News"
              titleTe="ట్రెండింగ్ న్యూస్"
              description="Latest Telugu entertainment, gossip, sports, and political news updated throughout the day."
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="Hot Media"
              titleTe="హాట్ మీడియా"
              description="Trending photos, videos, and social media content from your favorite Telugu celebrities."
            />
            <FeatureCard
              icon={<Heart className="w-8 h-8" />}
              title="Cultural Heritage"
              titleTe="సాంస్కృతిక వారసత్వం"
              description="On This Day features celebrating Telugu cinema legends, historic moments, and nostalgia."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Community"
              titleTe="కమ్యూనిటీ"
              description="Engage with fellow Telugu entertainment enthusiasts through comments and discussions."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Original Content"
              titleTe="ఒరిజినల్ కంటెంట్"
              description="AI-assisted original Telugu articles, not copied content. Quality journalism you can trust."
            />
            <FeatureCard
              icon={<Newspaper className="w-8 h-8" />}
              title="Multi-Category"
              titleTe="బహుళ విభాగాలు"
              description="Gossip, Sports, Politics, Entertainment, Movies, TV, and more - all in one place."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-[#141414]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard number="80M+" label="Telugu Speakers" />
            <StatCard number="24/7" label="Content Updates" />
            <StatCard number="100%" label="Original Content" />
            <StatCard number="∞" label="Entertainment" />
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">మా విలువలు</h2>
          <div className="space-y-6">
            <ValueItem
              title="Quality Over Quantity"
              description="We prioritize well-researched, original content over clickbait. Every article is reviewed for accuracy and relevance."
            />
            <ValueItem
              title="Respect for Artists"
              description="We celebrate Telugu cinema and its artists with dignity. No negative gossip or speculation - only verified, respectful coverage."
            />
            <ValueItem
              title="Legal & Ethical"
              description="All content is sourced legally through official APIs and licensed media. We respect copyright and intellectual property."
            />
            <ValueItem
              title="Community First"
              description="Our moderation ensures a positive, family-friendly environment for all Telugu entertainment fans."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">మాతో కనెక్ట్ అవ్వండి</h2>
          <p className="text-gray-300 mb-8">
            Have suggestions, feedback, or want to collaborate? We'd love to hear from you!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/"
              className="px-8 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Explore Content
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  titleTe,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  titleTe: string;
  description: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors group">
      <div className="text-yellow-500 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
      <p className="text-yellow-500 text-sm mb-3">{titleTe}</p>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-yellow-500 mb-2">{number}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function ValueItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border-l-4 border-yellow-500">
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
