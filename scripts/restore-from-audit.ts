/**
 * Restore Deleted Movies from Audit Data
 * 
 * Reads AUDITED-MOVIES.json and restores movies that were incorrectly deleted
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuditedMovie {
  slug: string;
  title: string;
  year: number | null;
  hero: string | null;
  director: string | null;
  tmdb_rating: number | null;
  original_rating: number | null;
  adjusted_rating: number;
  category: string;
  cult: boolean;
  change: string;
  reason: string;
}

interface AuditData {
  summary: {
    total_movies: number;
    category_distribution: Record<string, number>;
  };
  movies: {
    masterpiece: AuditedMovie[];
    'must-watch': AuditedMovie[];
    'mass-classic': AuditedMovie[];
    'highly-recommended': AuditedMovie[];
    watchable: AuditedMovie[];
    'one-time-watch': AuditedMovie[];
  };
}

async function restoreFromAudit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 RESTORING DELETED MOVIES FROM AUDIT DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }

  // Load audit data
  console.log('📚 Loading audit data...');
  const auditData: AuditData = JSON.parse(
    fs.readFileSync('docs/AUDITED-MOVIES.json', 'utf-8')
  );

  // Flatten all movies from audit
  const allAuditMovies: AuditedMovie[] = [
    ...auditData.movies.masterpiece,
    ...auditData.movies['must-watch'],
    ...auditData.movies['mass-classic'],
    ...auditData.movies['highly-recommended'],
    ...auditData.movies.watchable,
    ...auditData.movies['one-time-watch'],
  ];

  console.log(`📊 Found ${allAuditMovies.length} movies in audit data`);
  console.log('');

  // Get current movies in database
  console.log('📚 Fetching current movies from database...');
  let currentSlugs: Set<string> = new Set();
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('movies')
      .select('slug')
      .eq('language', 'Telugu')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching movies:', error);
      break;
    }
    if (!data || data.length === 0) break;
    data.forEach(m => currentSlugs.add(m.slug));
    offset += limit;
  }

  console.log(`📊 Found ${currentSlugs.size} movies currently in database`);
  console.log('');

  // Find missing movies
  const missingMovies = allAuditMovies.filter(m => !currentSlugs.has(m.slug));
  console.log(`🔍 Found ${missingMovies.length} movies to restore`);
  console.log('');

  if (missingMovies.length === 0) {
    console.log('✅ No movies need to be restored!');
    return;
  }

  // Filter out obvious person names (more conservative this time)
  const personNamePatterns = [
    /^[a-z]+-[a-z]+-2024$/, // Only 2024 two-word patterns (likely directors)
    /^[a-z]+-2024$/, // Single name + 2024
  ];

  const obviousPersonNames = new Set([
    'ravi-basara-2024', 'venky-atluri-2024', 'prasanth-varma-2024',
    'harish-shankar-2024', 'parasuram-2024', 'srinu-vaitla-2024',
    'trivikram-srinivas-2024', 'sukumar-2024', 'boyapati-srinu-2024'
  ]);

  const moviesToRestore = missingMovies.filter(m => {
    // Skip obvious person names
    if (obviousPersonNames.has(m.slug)) return false;
    
    // Skip if title contains comma (likely cast list)
    if (m.title && m.title.includes(',')) return false;
    
    return true;
  });

  console.log(`📊 After filtering person names: ${moviesToRestore.length} movies to restore`);
  console.log('');

  // Show sample of movies to restore
  console.log('Sample movies to restore:');
  moviesToRestore.slice(0, 30).forEach(m => {
    console.log(`  - ${m.title} (${m.year}) [${m.category}] - ${m.adjusted_rating}`);
  });
  console.log('');

  if (dryRun) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DRY RUN COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Would restore: ${moviesToRestore.length} movies`);
    console.log('  Run without --dry-run to apply changes');
    return;
  }

  // Restore movies
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 RESTORING MOVIES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let restored = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 50;
  const batches = Math.ceil(moviesToRestore.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const batch = moviesToRestore.slice(i * batchSize, (i + 1) * batchSize);
    
    for (const movie of batch) {
      try {
        // Check if movie already exists (might have been added)
        const { data: existing } = await supabase
          .from('movies')
          .select('id')
          .eq('slug', movie.slug)
          .single();

        if (existing) {
          // Update existing movie with audit data
          const { error: updateError } = await supabase
            .from('movies')
            .update({
              our_rating: movie.adjusted_rating,
              verdict: movie.category,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            errors++;
          } else {
            skipped++; // Already exists, just updated
          }
          continue;
        }

        // Insert new movie
        const newMovie = {
          slug: movie.slug,
          title_en: movie.title,
          release_year: movie.year,
          hero: movie.hero,
          director: movie.director,
          avg_rating: movie.tmdb_rating,
          our_rating: movie.adjusted_rating,
          verdict: movie.category,
          language: 'Telugu',
          is_blockbuster: movie.category === 'mass-classic' || movie.category === 'masterpiece',
          is_classic: movie.cult || (movie.year && movie.year < 1990),
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('movies')
          .insert(newMovie);

        if (insertError) {
          if (insertError.code === '23505') {
            skipped++; // Duplicate
          } else {
            console.error(`Error inserting ${movie.slug}:`, insertError.message);
            errors++;
          }
        } else {
          restored++;
        }
      } catch (err) {
        console.error(`Exception for ${movie.slug}:`, err);
        errors++;
      }
    }

    // Progress update
    const processed = Math.min((i + 1) * batchSize, moviesToRestore.length);
    const pct = ((processed / moviesToRestore.length) * 100).toFixed(1);
    process.stdout.write(`\r📊 Progress: ${processed}/${moviesToRestore.length} (${pct}%) | Restored: ${restored} | Skipped: ${skipped} | Errors: ${errors}`);
  }

  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESTORE COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Restored: ${restored}`);
  console.log(`  Skipped (already exists): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log('');
  console.log('✅ Restore complete!');
}

restoreFromAudit();


