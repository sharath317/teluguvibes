/**
 * RelatedSectionsServer Component
 * 
 * Server-side version of RelatedSections for use in Server Components.
 * Shows all other sections from the same menu group.
 */

import Link from 'next/link';
import { 
  MORE_MENU_SECTIONS, 
  CATEGORY_META,
  type NavItem,
  type MenuSection 
} from '@/lib/config/navigation';

interface RelatedSectionsServerProps {
  /** Current section ID (e.g., 'tech', 'health', 'crime') */
  currentSectionId: string;
}

// Find which menu group a section belongs to
function findSectionGroup(sectionId: string): { group: MenuSection | null; items: NavItem[] } {
  for (const section of MORE_MENU_SECTIONS) {
    const found = section.items.find(item => item.id === sectionId);
    if (found) {
      return { group: section, items: section.items };
    }
  }
  return { group: null, items: [] };
}

// Generate sample content for each section
function generateSampleContent(sectionId: string, count: number = 4) {
  const meta = CATEGORY_META[sectionId];
  
  const sampleTitles: Record<string, string[]> = {
    glam: ['సమంత కొత్త ఫోటోషూట్', 'రష్మిక మందన్న వైరల్ లుక్', 'పూజా హెగ్డే స్టైల్', 'కాజల్ ఫ్యాషన్ ట్రెండ్'],
    viral: ['వైరల్ డాన్స్ వీడియో', 'సోషల్ మీడియా సెన్సేషన్', 'ఇంటర్నెట్ ట్రెండ్', 'ఫన్నీ వీడియో వైరల్'],
    celebrities: ['స్టార్ హీరో ఇంటర్వ్యూ', 'సెలబ్రిటీ వెడ్డింగ్ న్యూస్', 'యాక్టర్ బర్త్‌డే స్పెషల్', 'సెలబ్ వేకేషన్ ఫోటోస్'],
    movies: ['కొత్త మూవీ అప్‌డేట్', 'బాక్స్ ఆఫీస్ కలెక్షన్స్', 'మూవీ షూటింగ్ న్యూస్', 'ఫస్ట్ లుక్ రివీల్'],
    reviews: ['మూవీ రివ్యూ', 'వెబ్ సిరీస్ రేటింగ్', 'థియేటర్ రివ్యూ', 'OTT రిలీజ్ రివ్యూ'],
    photos: ['ఫోటో గ్యాలరీ', 'ఈవెంట్ ఫోటోస్', 'సెలబ్ ఫోటోషూట్', 'మూవీ లాంచ్ ఫోటోస్'],
    crime: ['సైబర్ క్రైమ్ కేసు', 'పోలీస్ ఆపరేషన్', 'మోసగాళ్ల అరెస్ట్', 'డ్రగ్స్ రాకెట్ భగ్నం'],
    world: ['అమెరికా న్యూస్', 'గ్లోబల్ సమ్మిట్', 'ఇంటర్నేషనల్ అప్‌డేట్స్', 'వరల్డ్ పాలిటిక్స్'],
    business: ['స్టాక్ మార్కెట్', 'బిజినెస్ న్యూస్', 'ఎకానమీ అప్‌డేట్', 'ఇన్వెస్ట్‌మెంట్ టిప్స్'],
    tech: ['AI టెక్నాలజీ', 'స్మార్ట్‌ఫోన్ న్యూస్', 'టెక్ ట్రెండ్స్', 'గాడ్జెట్ రివ్యూ'],
    editorial: ['ఎడిటోరియల్ కామెంట్', 'అభిప్రాయ వ్యాసం', 'విశ్లేషణ', 'నిపుణుల అభిప్రాయం'],
    health: ['హెల్త్ టిప్స్', 'ఫిట్‌నెస్ గైడ్', 'ఆయుర్వేద చిట్కాలు', 'మానసిక ఆరోగ్యం'],
    lifestyle: ['లైఫ్‌స్టైల్ ట్రెండ్స్', 'ఫ్యాషన్ టిప్స్', 'హోమ్ డెకర్', 'ట్రావెల్ గైడ్'],
    astrology: ['రాశి ఫలాలు', 'జ్యోతిష్య సలహా', 'గ్రహ స్థితి', 'వార ఫలాలు'],
    food: ['వంటకాల రెసిపీ', 'ఫుడ్ రివ్యూ', 'హెల్దీ రెసిపీలు', 'ట్రెడిషనల్ వంటలు'],
    videos: ['వీడియో న్యూస్', 'ఇంటర్వ్యూ క్లిప్స్', 'మూవీ ట్రైలర్స్', 'షార్ట్ వీడియోస్'],
    games: ['గేమ్ రివ్యూ', 'గేమింగ్ న్యూస్', 'మొబైల్ గేమ్స్', 'కన్సోల్ అప్‌డేట్స్'],
    memes: ['ఫన్నీ మీమ్స్', 'వైరల్ జోక్స్', 'సోషల్ మీడియా హ్యూమర్', 'ట్రెండింగ్ మీమ్స్'],
    quizzes: ['జనరల్ నాలెడ్జ్ క్విజ్', 'సినిమా క్విజ్', 'స్పోర్ట్స్ క్విజ్', 'హిస్టరీ క్విజ్'],
    stories: ['తెలుగు కథలు', 'ప్రేరణాదాయక కథ', 'జీవిత కథ', 'నీతి కథలు'],
    webSeries: ['వెబ్ సిరీస్ రివ్యూ', 'OTT రిలీజ్', 'సిరీస్ అప్‌డేట్', 'బింజ్ వాచ్ లిస్ట్'],
    jobs: ['జాబ్ అప్‌డేట్స్', 'గవర్నమెంట్ జాబ్స్', 'ఇంటర్వ్యూ టిప్స్', 'కెరీర్ గైడ్'],
  };

  const titles = sampleTitles[sectionId] || [
    `${meta?.name?.te || sectionId} న్యూస్ 1`,
    `${meta?.name?.te || sectionId} అప్‌డేట్ 2`,
    `${meta?.name?.te || sectionId} వార్త 3`,
    `${meta?.name?.te || sectionId} న్యూస్ 4`,
  ];

  return titles.slice(0, count).map((title, i) => ({
    id: `sample-${sectionId}-${i}`,
    title,
    image: `https://picsum.photos/seed/${sectionId}${i}/400/250`,
    time: `${(i + 1) * 2} గంటల క్రితం`,
  }));
}

export function RelatedSectionsServer({ currentSectionId }: RelatedSectionsServerProps) {
  const { group, items } = findSectionGroup(currentSectionId);
  
  // Filter out the current section
  const otherSections = items.filter(item => item.id !== currentSectionId);

  if (!group || otherSections.length === 0) {
    return null;
  }

  return (
    <div 
      className="border-t"
      style={{ borderColor: 'var(--border-primary)' }}
    >
      {/* Group Header */}
      <div 
        className="py-4 sm:py-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{group.emoji}</span>
            <div>
              <h2 
                className="text-lg sm:text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                మరిన్ని {group.title}
              </h2>
              <p 
                className="text-sm" 
                style={{ color: 'var(--text-tertiary)' }}
              >
                మరో {otherSections.length} సెక్షన్లు
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Sections */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="space-y-8 sm:space-y-12">
          {otherSections.map((item) => {
            const meta = CATEGORY_META[item.id] || {};
            const sampleContent = generateSampleContent(item.id, 4);

            return (
              <section
                key={item.id}
                id={`related-section-${item.id}`}
                className="scroll-mt-20 rounded-2xl overflow-hidden"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-primary)',
                }}
              >
                {/* Section Header */}
                <div 
                  className={`px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r ${meta.gradient || 'from-gray-500 to-gray-600'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl">{item.emoji}</span>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {item.label}
                      </h3>
                      {item.isNew && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/20 text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <Link
                      href={item.href}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      అన్నీ చూడండి →
                    </Link>
                  </div>
                </div>

                {/* Section Content Preview */}
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {sampleContent.map((content) => (
                      <Link
                        key={content.id}
                        href={item.href}
                        className="group block rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <img
                            src={content.image}
                            alt={content.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <h4 
                              className="text-xs sm:text-sm font-medium text-white line-clamp-2"
                            >
                              {content.title}
                            </h4>
                          </div>
                        </div>
                        <div className="p-2">
                          <span 
                            className="text-[10px] sm:text-xs"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {content.time}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RelatedSectionsServer;






