/**
 * Celebrities Page
 *
 * Shows all Telugu cinema celebrities.
 */

import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { Star, Users, Film, Music, Clapperboard } from 'lucide-react';

interface Celebrity {
  id: string;
  slug: string;
  name_en: string;
  name_te?: string;
  occupation?: string;
  image_url?: string;
  popularity_score?: number;
}

export const revalidate = 3600;

export const metadata = {
  title: 'సెలబ్రిటీలు | TeluguVibes',
  description: 'తెలుగు సినిమా సెలబ్రిటీలు - నటులు, నటీమణులు, దర్శకులు, సంగీత దర్శకులు',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OCCUPATION_TABS = [
  { key: 'all', label: 'అందరూ', labelEn: 'All', icon: Users },
  { key: 'actor', label: 'నటులు', labelEn: 'Actors', icon: Film },
  { key: 'actress', label: 'నటీమణులు', labelEn: 'Actresses', icon: Star },
  { key: 'director', label: 'దర్శకులు', labelEn: 'Directors', icon: Clapperboard },
  { key: 'music_director', label: 'సంగీతం', labelEn: 'Music', icon: Music },
];

async function getCelebrities(occupation?: string) {
  let query = supabase
    .from('celebrities')
    .select('*')
    .order('popularity_score', { ascending: false })
    .limit(50);

  if (occupation && occupation !== 'all') {
    query = query.ilike('occupation', `%${occupation}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching celebrities:', error);
    return [];
  }

  return data || [];
}

interface PageProps {
  searchParams: Promise<{ occupation?: string }>;
}

export default async function CelebritiesPage({ searchParams }: PageProps) {
  const { occupation } = await searchParams;
  const celebrities = await getCelebrities(occupation);

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero */}
      <section className="py-12 border-b" style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            🌟 తెలుగు సెలబ్రిటీలు
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            తెలుగు సినిమా లెజెండ్స్ నుండి న్యూ జెన్ స్టార్స్ వరకు
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Occupation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {OCCUPATION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = (occupation || 'all') === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === 'all' ? '/celebrities' : `/celebrities?occupation=${tab.key}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Celebrities Grid */}
        {celebrities.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {celebrities.map((celebrity) => (
              <CelebrityCard key={celebrity.id} celebrity={celebrity} />
            ))}
          </div>
        ) : (
          <EmptyState occupation={occupation} />
        )}
      </div>
    </main>
  );
}

function CelebrityCard({ celebrity }: { celebrity: Celebrity }) {
  const imageUrl = celebrity.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(celebrity.name_en)}&background=random&size=200`;

  return (
    <Link
      href={`/celebrity/${celebrity.slug || celebrity.id}`}
      className="group relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-orange-500 transition-all"
    >
      <div className="aspect-[3/4] relative">
        <Image
          src={imageUrl}
          alt={celebrity.name_en}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white font-bold text-sm truncate group-hover:text-orange-400 transition-colors">
          {celebrity.name_te || celebrity.name_en}
        </h3>
        <p className="text-gray-400 text-xs truncate">
          {celebrity.occupation || 'Actor'}
        </p>
        {celebrity.popularity_score > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-yellow-400">{celebrity.popularity_score}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ occupation }: { occupation?: string }) {
  return (
    <div className="text-center py-16">
      <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">సెలబ్రిటీలు కనుగొనబడలేదు</h2>
      <p className="text-gray-400 mb-6">
        {occupation
          ? `"${occupation}" వర్గంలో ఏ సెలబ్రిటీలు లేరు`
          : 'డేటాబేస్ లో సెలబ్రిటీలు లేరు'}
      </p>
      <Link
        href="/admin/celebrities"
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        Add Celebrities
      </Link>
    </div>
  );
}
