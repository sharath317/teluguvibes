/**
 * Collaboration and Relationship Graph Enrichment Script
 * 
 * Builds and updates the collaboration graph between actors, directors,
 * and other film industry entities.
 * 
 * Usage:
 *   npx ts-node scripts/enrich-collaborations.ts [--limit=N] [--dry]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  release_year: number | null;
  hero: string | null;
  heroine: string | null;
  director: string | null;
  music_director: string | null;
  avg_rating: number | null;
  is_blockbuster: boolean | null;
  box_office_category: string | null;
}

interface Collaboration {
  entity1_type: string;
  entity1_name: string;
  entity2_type: string;
  entity2_name: string;
  collaboration_count: number;
  movie_ids: string[];
  first_collab_year: number;
  last_collab_year: number;
  hit_rate: number;
  avg_rating: number;
  notable_films: string[];
}

type EntityType = 'actor' | 'director' | 'music_director';

// ============================================================
// COLLABORATION BUILDING
// ============================================================

function normalizeEntityName(name: string | null): string | null {
  if (!name) return null;
  // Basic normalization - can be enhanced
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isHit(movie: Movie): boolean {
  const hitCategories = ['industry-hit', 'blockbuster', 'super-hit', 'hit'];
  return (
    movie.is_blockbuster === true ||
    (movie.box_office_category && hitCategories.includes(movie.box_office_category)) ||
    (movie.avg_rating !== null && movie.avg_rating >= 3.5)
  );
}

interface CollabMap {
  [key: string]: {
    entity1_type: EntityType;
    entity1_name: string;
    entity2_type: EntityType;
    entity2_name: string;
    movies: Movie[];
  };
}

function buildCollaborationMap(movies: Movie[]): CollabMap {
  const collabMap: CollabMap = {};
  
  for (const movie of movies) {
    const entities: Array<{ type: EntityType; name: string | null }> = [
      { type: 'actor', name: movie.hero },
      { type: 'actor', name: movie.heroine },
      { type: 'director', name: movie.director },
      { type: 'music_director', name: movie.music_director },
    ];
    
    // Normalize and filter
    const validEntities = entities
      .filter(e => e.name)
      .map(e => ({ type: e.type, name: normalizeEntityName(e.name)! }));
    
    // Create pairs
    for (let i = 0; i < validEntities.length; i++) {
      for (let j = i + 1; j < validEntities.length; j++) {
        const e1 = validEntities[i];
        const e2 = validEntities[j];
        
        // Create consistent key (alphabetical ordering)
        const key = [
          `${e1.type}:${e1.name}`,
          `${e2.type}:${e2.name}`,
        ].sort().join('|');
        
        if (!collabMap[key]) {
          collabMap[key] = {
            entity1_type: e1.type < e2.type || (e1.type === e2.type && e1.name < e2.name) ? e1.type : e2.type,
            entity1_name: e1.type < e2.type || (e1.type === e2.type && e1.name < e2.name) ? e1.name : e2.name,
            entity2_type: e1.type < e2.type || (e1.type === e2.type && e1.name < e2.name) ? e2.type : e1.type,
            entity2_name: e1.type < e2.type || (e1.type === e2.type && e1.name < e2.name) ? e2.name : e1.name,
            movies: [],
          };
        }
        
        collabMap[key].movies.push(movie);
      }
    }
  }
  
  return collabMap;
}

function computeCollaborationStats(collab: { movies: Movie[] }): Omit<Collaboration, 'entity1_type' | 'entity1_name' | 'entity2_type' | 'entity2_name'> {
  const movies = collab.movies;
  const hits = movies.filter(isHit);
  
  const years = movies
    .map(m => m.release_year)
    .filter((y): y is number => y !== null)
    .sort((a, b) => a - b);
  
  const ratings = movies
    .map(m => m.avg_rating)
    .filter((r): r is number => r !== null);
  
  // Get top 3 films by rating
  const topFilms = [...movies]
    .filter(m => m.avg_rating !== null)
    .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
    .slice(0, 3)
    .map(m => m.title_en);
  
  return {
    collaboration_count: movies.length,
    movie_ids: movies.map(m => m.id),
    first_collab_year: years[0] || 0,
    last_collab_year: years[years.length - 1] || 0,
    hit_rate: movies.length > 0 ? Math.round((hits.length / movies.length) * 100) / 100 : 0,
    avg_rating: ratings.length > 0 
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 
      : 0,
    notable_films: topFilms,
  };
}

// ============================================================
// CAREER MILESTONES
// ============================================================

interface CareerMilestone {
  entity_type: EntityType;
  entity_name: string;
  milestone_type: string;
  movie_id: string;
  movie_title: string;
  year: number;
  description: string;
}

function extractCareerMilestones(movies: Movie[]): CareerMilestone[] {
  const milestones: CareerMilestone[] = [];
  const entityFilms: Map<string, Movie[]> = new Map();
  
  // Group movies by entity
  for (const movie of movies) {
    const entities: Array<{ type: EntityType; name: string | null }> = [
      { type: 'actor', name: movie.hero },
      { type: 'director', name: movie.director },
      { type: 'music_director', name: movie.music_director },
    ];
    
    for (const entity of entities) {
      if (!entity.name) continue;
      const key = `${entity.type}:${normalizeEntityName(entity.name)}`;
      if (!entityFilms.has(key)) {
        entityFilms.set(key, []);
      }
      entityFilms.get(key)!.push(movie);
    }
  }
  
  // Analyze each entity's career
  for (const [key, films] of entityFilms) {
    const [entityType, entityName] = key.split(':') as [EntityType, string];
    
    // Sort by year
    const sortedFilms = [...films].sort((a, b) => (a.release_year || 0) - (b.release_year || 0));
    
    if (sortedFilms.length === 0) continue;
    
    // Debut film
    const debut = sortedFilms[0];
    if (debut.release_year) {
      milestones.push({
        entity_type: entityType,
        entity_name: entityName,
        milestone_type: 'debut',
        movie_id: debut.id,
        movie_title: debut.title_en,
        year: debut.release_year,
        description: `Debut ${entityType === 'actor' ? 'film' : 'project'}`,
      });
    }
    
    // First hit
    const firstHit = sortedFilms.find(isHit);
    if (firstHit && firstHit !== debut && firstHit.release_year) {
      milestones.push({
        entity_type: entityType,
        entity_name: entityName,
        milestone_type: 'first_hit',
        movie_id: firstHit.id,
        movie_title: firstHit.title_en,
        year: firstHit.release_year,
        description: 'First commercial success',
      });
    }
    
    // Biggest blockbuster
    const blockbusters = sortedFilms.filter(m => 
      m.box_office_category === 'industry-hit' || 
      m.box_office_category === 'blockbuster'
    );
    if (blockbusters.length > 0) {
      const biggest = blockbusters.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))[0];
      if (biggest.release_year) {
        milestones.push({
          entity_type: entityType,
          entity_name: entityName,
          milestone_type: 'blockbuster',
          movie_id: biggest.id,
          movie_title: biggest.title_en,
          year: biggest.release_year,
          description: 'Major blockbuster',
        });
      }
    }
    
    // Milestone films (every 25th film for actors)
    if (entityType === 'actor' && sortedFilms.length >= 25) {
      const milestoneNumbers = [25, 50, 75, 100, 150, 200];
      for (const num of milestoneNumbers) {
        if (sortedFilms.length >= num) {
          const film = sortedFilms[num - 1];
          if (film.release_year) {
            milestones.push({
              entity_type: entityType,
              entity_name: entityName,
              milestone_type: 'milestone_film',
              movie_id: film.id,
              movie_title: film.title_en,
              year: film.release_year,
              description: `${num}th film`,
            });
          }
        }
      }
    }
  }
  
  return milestones;
}

// ============================================================
// MAIN ENRICHMENT
// ============================================================

async function enrichCollaborations(limit: number, dryRun: boolean): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║         COLLABORATION GRAPH ENRICHMENT                           ║
╚══════════════════════════════════════════════════════════════════╝
`));

  // Fetch movies
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, release_year, hero, heroine, director, music_director, avg_rating, is_blockbuster, box_office_category')
    .eq('is_published', true)
    .not('hero', 'is', null)
    .order('release_year', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error.message);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies to process!'));
    return;
  }

  console.log(chalk.gray(`Analyzing ${movies.length} movies for collaborations\n`));

  if (dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  // Build collaboration map
  console.log(chalk.blue('📊 Building collaboration map...'));
  const collabMap = buildCollaborationMap(movies as Movie[]);
  
  const collaborations: Collaboration[] = [];
  for (const key of Object.keys(collabMap)) {
    const collab = collabMap[key];
    if (collab.movies.length >= 2) { // Only track 2+ collaborations
      const stats = computeCollaborationStats(collab);
      collaborations.push({
        entity1_type: collab.entity1_type,
        entity1_name: collab.entity1_name,
        entity2_type: collab.entity2_type,
        entity2_name: collab.entity2_name,
        ...stats,
      });
    }
  }
  
  console.log(chalk.gray(`Found ${collaborations.length} significant collaborations\n`));

  // Sort by collaboration count
  collaborations.sort((a, b) => b.collaboration_count - a.collaboration_count);

  // Extract career milestones
  console.log(chalk.blue('🎯 Extracting career milestones...'));
  const milestones = extractCareerMilestones(movies as Movie[]);
  console.log(chalk.gray(`Found ${milestones.length} career milestones\n`));

  if (dryRun) {
    // Show top collaborations
    console.log(chalk.cyan('\n🤝 Top 10 Collaborations:'));
    collaborations.slice(0, 10).forEach((c, i) => {
      const ratingStr = c.avg_rating ? c.avg_rating.toFixed(1) : 'N/A';
      console.log(`   ${i + 1}. ${c.entity1_name} (${c.entity1_type}) ↔ ${c.entity2_name} (${c.entity2_type})`);
      console.log(`      Films: ${c.collaboration_count}, Hit Rate: ${(c.hit_rate * 100).toFixed(0)}%, Avg Rating: ${ratingStr}`);
      console.log(`      Notable: ${c.notable_films.join(', ')}`);
    });
    
    // Show sample milestones
    console.log(chalk.cyan('\n🏆 Sample Milestones:'));
    milestones.slice(0, 10).forEach(m => {
      console.log(`   ${m.entity_name} (${m.entity_type}) - ${m.milestone_type}: ${m.movie_title} (${m.year})`);
    });
    
    return;
  }

  // Insert collaborations
  console.log(chalk.blue('\n💾 Saving collaborations...'));
  let collabInserted = 0;
  let collabFailed = 0;

  for (const collab of collaborations) {
    const { error: insertError } = await supabase
      .from('collaborations')
      .upsert({
        entity1_type: collab.entity1_type,
        entity1_name: collab.entity1_name,
        entity2_type: collab.entity2_type,
        entity2_name: collab.entity2_name,
        collaboration_count: collab.collaboration_count,
        movie_ids: collab.movie_ids,
        first_collab_year: collab.first_collab_year,
        last_collab_year: collab.last_collab_year,
        hit_rate: collab.hit_rate,
        avg_rating: collab.avg_rating,
        notable_films: collab.notable_films,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'entity1_type,entity1_name,entity2_type,entity2_name',
      });

    if (insertError) {
      collabFailed++;
      if (collabFailed < 5) {
        console.error(chalk.red(`  ❌ Failed: ${insertError.message}`));
      }
    } else {
      collabInserted++;
    }
  }

  // Insert milestones
  console.log(chalk.blue('\n💾 Saving career milestones...'));
  let milestonesInserted = 0;
  let milestonesFailed = 0;

  for (const milestone of milestones) {
    const { error: insertError } = await supabase
      .from('career_milestones')
      .upsert({
        entity_type: milestone.entity_type,
        entity_name: milestone.entity_name,
        milestone_type: milestone.milestone_type,
        movie_id: milestone.movie_id,
        movie_title: milestone.movie_title,
        year: milestone.year,
        description: milestone.description,
      }, {
        onConflict: 'entity_type,entity_name,milestone_type,year',
      });

    if (insertError) {
      milestonesFailed++;
    } else {
      milestonesInserted++;
    }
  }

  console.log(chalk.green(`\n✅ Enrichment complete!`));
  console.log(chalk.gray(`   Collaborations: ${collabInserted} inserted, ${collabFailed} failed`));
  console.log(chalk.gray(`   Milestones: ${milestonesInserted} inserted, ${milestonesFailed} failed`));

  // Show stats
  const actorDirector = collaborations.filter(c => 
    (c.entity1_type === 'actor' && c.entity2_type === 'director') ||
    (c.entity1_type === 'director' && c.entity2_type === 'actor')
  ).length;
  const actorActor = collaborations.filter(c => 
    c.entity1_type === 'actor' && c.entity2_type === 'actor'
  ).length;
  const actorMusic = collaborations.filter(c => 
    (c.entity1_type === 'actor' && c.entity2_type === 'music_director') ||
    (c.entity1_type === 'music_director' && c.entity2_type === 'actor')
  ).length;

  console.log(chalk.cyan('\n📊 Collaboration Types:'));
  console.log(chalk.gray(`   Actor-Director: ${actorDirector}`));
  console.log(chalk.gray(`   Actor-Actor: ${actorActor}`));
  console.log(chalk.gray(`   Actor-Music Director: ${actorMusic}`));
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '1000');
const dryRun = args.includes('--dry') || args.includes('--dry-run');

enrichCollaborations(limit, dryRun).catch(console.error);

