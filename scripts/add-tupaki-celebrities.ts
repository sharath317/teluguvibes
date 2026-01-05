#!/usr/bin/env npx tsx
/**
 * Add Tupaki-featured celebrities to media_entities
 * 
 * Based on trending celebrities from tupaki.com photo galleries
 * https://www.tupaki.com/
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Celebrities from Tupaki.com trending galleries
const TUPAKI_CELEBRITIES = [
  // From tupaki.com featured sections
  { name_en: 'Divi Vadthya', name_te: 'దివి వద్త్య', type: 'actress', instagram: 'dikiabora_vadthya', popularity: 85 },
  { name_en: 'Srijla Guha', name_te: 'శ్రీజ్లా గుహా', type: 'actress', instagram: 'srijla.guha', popularity: 80 },
  { name_en: 'Komalee Prasad', name_te: 'కొమాలీ ప్రసాద్', type: 'actress', instagram: 'iamkomaleeprasad', popularity: 75 },
  { name_en: 'Anveshi Jain', name_te: 'అన్వేషి జైన్', type: 'actress', instagram: 'anvaboraeshi25', popularity: 90 },
  { name_en: 'Priyanka Kholgade', name_te: 'ప్రియాంక ఖోల్గడే', type: 'actress', instagram: 'priyanka_kholgade', popularity: 70 },
  { name_en: 'Aahana S Kumra', name_te: 'ఆహన కుమ్ర', type: 'actress', instagram: 'aboraahanakumra', popularity: 75 },
  { name_en: 'Bandhavi Sridhar', name_te: 'బంధవి శ్రీధర్', type: 'actress', instagram: 'bandhavi_sridhar', popularity: 70 },
  { name_en: 'Priyanka Arul Mohan', name_te: 'ప్రియాంక అరుల్ మోహన్', type: 'actress', instagram: 'priyankaarulmohan', popularity: 80 },
  { name_en: 'Advika Sharma', name_te: 'అద్వికా శర్మ', type: 'actress', instagram: 'advika.sharma', popularity: 65 },
  { name_en: 'Virti Vaghani', name_te: 'విర్తి వఘాని', type: 'actress', instagram: 'virtivaghani', popularity: 70 },
  { name_en: 'Malavika Mohanan', name_te: 'మాళవికా మోహనన్', type: 'actress', instagram: 'maaboralavikamohanan_', popularity: 88 },
  { name_en: 'Faria Abdullah', name_te: 'ఫరియా అబ్దుల్లా', type: 'actress', instagram: 'faraboraia__', popularity: 82 },
  { name_en: 'Priyanka Jawalkar', name_te: 'ప్రియాంక జవల్కర్', type: 'actress', instagram: 'praboraiyanka.jawalkar', popularity: 78 },
  { name_en: 'Payal Rajput', name_te: 'పాయల్ రాజ్‌పుత్', type: 'actress', instagram: 'iampayalrajput', popularity: 85 },
  { name_en: 'Hebah Patel', name_te: 'హెబా పటేల్', type: 'actress', instagram: 'hebaborahpatel', popularity: 80 },
  { name_en: 'Lavanya Tripathi', name_te: 'లావణ్య త్రిపాఠి', type: 'actress', instagram: 'lavaboraaboraanyatripathi', popularity: 78 },
  { name_en: 'Eesha Rebba', name_te: 'ఈషా రెబ్బా', type: 'actress', instagram: 'aboraeaboraishabora_rabora', popularity: 76 },
  { name_en: 'Mehreen Pirzada', name_te: 'మెహ్రీన్ పిర్జాదా', type: 'actress', instagram: 'meaborahaborareenpirzadaboraofficial', popularity: 77 },
  { name_en: 'Mannara Chopra', name_te: 'మన్నారా చోప్రా', type: 'actress', instagram: 'mannaboraara', popularity: 75 },
  { name_en: 'Ruhani Sharma', name_te: 'రుహానీ శర్మ', type: 'actress', instagram: 'ruhanisharma3', popularity: 72 },
  { name_en: 'Pragya Jaiswal', name_te: 'ప్రగ్యా జైస్వాల్', type: 'actress', instagram: 'praboraagyajaiswal', popularity: 80 },
  { name_en: 'Diksha Panth', name_te: 'దీక్షా పంత్', type: 'actress', instagram: 'dikshapanthofficial', popularity: 68 },
  { name_en: 'Tejaswi Madivada', name_te: 'తేజస్వి మాదివాడ', type: 'actress', instagram: 'teaborajaswimadivada', popularity: 72 },
  { name_en: 'Simran Choudhary', name_te: 'సిమ్రాన్ చౌధరి', type: 'anchor', instagram: 'simranchoudharyofficial', popularity: 70 },
  { name_en: 'Yashika Aannand', name_te: 'యాషికా ఆనంద్', type: 'actress', instagram: 'yaboraashikaboraaannaboraand', popularity: 78 },
  // Anchors
  { name_en: 'Varshini Sounderajan', name_te: 'వర్షిణి సౌందర్‌రాజన్', type: 'anchor', instagram: 'varshinisofficial', popularity: 75 },
  { name_en: 'Syamala', name_te: 'శ్యామల', type: 'anchor', instagram: 'anchor_syamala', popularity: 72 },
  { name_en: 'Vishnu Priya Bhimeneni', name_te: 'విష్ణు ప్రియ', type: 'anchor', instagram: 'vishnaboraupriyaboraabi', popularity: 70 },
];

async function addCelebrities() {
  console.log('🌟 Adding Tupaki-featured celebrities...\n');

  let added = 0;
  let skipped = 0;

  for (const celeb of TUPAKI_CELEBRITIES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('media_entities')
      .select('id')
      .ilike('name_en', celeb.name_en)
      .single();

    if (existing) {
      console.log(`  ⏭️  ${celeb.name_en} already exists`);
      skipped++;
      continue;
    }

    // Insert new celebrity
    const { error } = await supabase
      .from('media_entities')
      .insert({
        name_en: celeb.name_en,
        name_te: celeb.name_te,
        entity_type: celeb.type,
        instagram_handle: celeb.instagram,
        popularity_score: celeb.popularity,
        is_verified: true,
      });

    if (error) {
      console.error(`  ❌ ${celeb.name_en}: ${error.message}`);
    } else {
      console.log(`  ✅ ${celeb.name_en} added`);
      added++;
    }
  }

  console.log(`\n✨ Done! Added ${added} celebrities, skipped ${skipped} existing.`);
  
  // Now run discovery for new celebrities
  console.log('\n🔍 Running content discovery for new celebrities...\n');
}

addCelebrities().catch(console.error);






