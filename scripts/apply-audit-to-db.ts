/**
 * Apply Audit Results to Database
 * 
 * Updates movies table with audited ratings and categories
 * Creates/updates movie_reviews with editorial data
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
    upgrades: number;
    downgrades: number;
    unchanged: number;
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

async function applyAuditToDatabase() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 APPLYING AUDIT DATA TO DATABASE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Load audit data
  const auditData: AuditData = JSON.parse(
    fs.readFileSync('docs/AUDITED-MOVIES.json', 'utf-8')
  );

  // Flatten all movies
  const allMovies: AuditedMovie[] = [
    ...auditData.movies.masterpiece,
    ...auditData.movies['must-watch'],
    ...auditData.movies['mass-classic'],
    ...auditData.movies['highly-recommended'],
    ...auditData.movies.watchable,
    ...auditData.movies['one-time-watch'],
  ];

  console.log(`📚 Loaded ${allMovies.length} audited movies`);
  console.log('');

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to database');
    console.log('');
  }

  let updated = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 50;
  const batches = Math.ceil(allMovies.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const batch = allMovies.slice(i * batchSize, (i + 1) * batchSize);
    
    for (const movie of batch) {
      try {
        // Find movie in database by slug
        const { data: dbMovie, error: findError } = await supabase
          .from('movies')
          .select('id, title_en, our_rating, verdict')
          .eq('slug', movie.slug)
          .single();

        if (findError || !dbMovie) {
          skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY] ${movie.title} (${movie.year}): ${movie.original_rating} → ${movie.adjusted_rating} [${movie.category}]${movie.cult ? ' 🔥' : ''}`);
          updated++;
          continue;
        }

        // Update movies table
        const { error: updateError } = await supabase
          .from('movies')
          .update({
            our_rating: movie.adjusted_rating,
            verdict: movie.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbMovie.id);

        if (updateError) {
          console.error(`Error updating movie ${movie.slug}:`, updateError.message);
          errors++;
          continue;
        }

        // Check if movie_review exists
        const { data: existingReview } = await supabase
          .from('movie_reviews')
          .select('id, dimensions_json')
          .eq('movie_id', dbMovie.id)
          .single();

        if (existingReview) {
          // Update existing review
          const currentDimensions = existingReview.dimensions_json || {};
          
          // Merge audit data into dimensions_json
          const updatedDimensions = {
            ...currentDimensions,
            _type: 'audited_review',
            verdict: {
              ...(currentDimensions.verdict || {}),
              category: movie.category,
              cult: movie.cult,
              final_rating: movie.adjusted_rating,
              audit_reason: movie.reason
            },
            cultural_impact: {
              ...(currentDimensions.cultural_impact || {}),
              cult_status: movie.cult
            },
            audit_metadata: {
              original_rating: movie.original_rating,
              adjusted_rating: movie.adjusted_rating,
              change_type: movie.change,
              reason: movie.reason,
              audited_at: new Date().toISOString()
            }
          };

          const { error: reviewUpdateError } = await supabase
            .from('movie_reviews')
            .update({
              dimensions_json: updatedDimensions,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingReview.id);

          if (reviewUpdateError) {
            console.error(`Error updating review for ${movie.slug}:`, reviewUpdateError.message);
            errors++;
            continue;
          }
          updated++;
        } else {
          // Create new review with audit data
          const newDimensions = {
            _type: 'audited_review',
            verdict: {
              category: movie.category,
              cult: movie.cult,
              final_rating: movie.adjusted_rating,
              audit_reason: movie.reason,
              en: `${movie.title} is a ${movie.category.replace('-', ' ')} Telugu film.`,
              te: ''
            },
            cultural_impact: {
              cult_status: movie.cult,
              legacy_status: movie.category === 'masterpiece' ? 'Iconic' : 
                             movie.category === 'must-watch' ? 'Significant' :
                             movie.category === 'mass-classic' ? 'Notable' : 'Moderate'
            },
            audit_metadata: {
              original_rating: movie.original_rating,
              adjusted_rating: movie.adjusted_rating,
              change_type: movie.change,
              reason: movie.reason,
              audited_at: new Date().toISOString()
            }
          };

          const { error: createError } = await supabase
            .from('movie_reviews')
            .insert({
              movie_id: dbMovie.id,
              dimensions_json: newDimensions,
              overall_rating: movie.adjusted_rating,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createError) {
            // Review might already exist with different data
            if (createError.code === '23505') {
              skipped++;
            } else {
              console.error(`Error creating review for ${movie.slug}:`, createError.message);
              errors++;
            }
            continue;
          }
          created++;
        }
      } catch (err) {
        console.error(`Exception processing ${movie.slug}:`, err);
        errors++;
      }
    }

    // Progress update
    const processed = Math.min((i + 1) * batchSize, allMovies.length);
    const pct = ((processed / allMovies.length) * 100).toFixed(1);
    process.stdout.write(`\r📊 Progress: ${processed}/${allMovies.length} (${pct}%) | Updated: ${updated} | Created: ${created} | Skipped: ${skipped} | Errors: ${errors}`);
  }

  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AUDIT APPLICATION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Total Processed: ${allMovies.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log('');

  if (dryRun) {
    console.log('⚠️  DRY RUN - Run without --dry-run to apply changes');
  } else {
    console.log('✅ Changes applied to database!');
  }
}

applyAuditToDatabase();


