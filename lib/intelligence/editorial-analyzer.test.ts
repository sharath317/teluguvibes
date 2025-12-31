/**
 * EDITORIAL ANALYZER TEST CASES
 *
 * Validates correct output for Telugu entertainment scenarios.
 * Run with: npx tsx lib/intelligence/editorial-analyzer.test.ts
 */

import { analyzeEditorialIntent, type EditorialPlan } from './editorial-analyzer';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface TestCase {
  name: string;
  input: {
    topic: string;
    rawContent?: string;
    source?: string;
  };
  expected: {
    entity_type?: string;
    audience_emotion?: string;
    best_angle?: string;
    safety_risk?: string;
    should_have_hooks?: boolean;
  };
}

const TEST_CASES: TestCase[] = [
  // ============================================================
  // ACTOR BIRTHDAY
  // ============================================================
  {
    name: 'Actor Birthday - Senior Legend',
    input: {
      topic: 'చిరంజీవి 68వ పుట్టినరోజు వేడుకలు - అభిమానుల సంబరాలు',
      source: 'internal',
    },
    expected: {
      entity_type: 'actor',
      audience_emotion: 'celebration',
      best_angle: 'tribute',
      safety_risk: 'low',
      should_have_hooks: true,
    },
  },
  {
    name: 'Actor Birthday - Current Star',
    input: {
      topic: 'Allu Arjun birthday celebrations - Fans trend Pushpa 2',
      source: 'news',
    },
    expected: {
      audience_emotion: 'celebration',
      best_angle: 'tribute',
      safety_risk: 'low',
    },
  },

  // ============================================================
  // MOVIE FLOP ANALYSIS
  // ============================================================
  {
    name: 'Movie Flop Analysis',
    input: {
      topic: 'Adipurush Box Office Disaster - Why Prabhas Film Failed',
      rawContent: 'Adipurush earned only 400 crores against 500 crore budget. Critics slammed VFX quality.',
    },
    expected: {
      entity_type: 'movie',
      audience_emotion: 'sadness',
      best_angle: 'analysis',
      safety_risk: 'low',
    },
  },

  // ============================================================
  // IPL PLAYER COMEBACK
  // ============================================================
  {
    name: 'IPL Player Comeback',
    input: {
      topic: 'David Warner returns to Sunrisers Hyderabad - Fans excited for IPL 2024',
      source: 'news',
    },
    expected: {
      entity_type: 'ipl',
      audience_emotion: 'excitement',
      best_angle: 'viral',
      safety_risk: 'low',
    },
  },

  // ============================================================
  // OLD MOVIE RE-RELEASE
  // ============================================================
  {
    name: 'Old Movie Re-release',
    input: {
      topic: 'Mayabazar 4K re-release in theaters - Classic NTR-ANR movie',
      rawContent: '1957 classic Mayabazar digitally restored and releasing in 4K.',
    },
    expected: {
      audience_emotion: 'nostalgia',
      best_angle: 'nostalgia',
      safety_risk: 'low',
      should_have_hooks: true,
    },
  },

  // ============================================================
  // VIRAL INTERVIEW CLIP
  // ============================================================
  {
    name: 'Viral Interview Clip',
    input: {
      topic: 'Mahesh Babu controversial interview - "Bollywood should learn from us"',
      rawContent: 'Mahesh Babu said Bollywood cannot afford him and should learn from Telugu cinema.',
    },
    expected: {
      audience_emotion: 'controversy',
      best_angle: 'info', // Should be forced to info due to controversy
      safety_risk: 'medium',
    },
  },

  // ============================================================
  // DEATH ANNIVERSARY
  // ============================================================
  {
    name: 'Death Anniversary - Legend',
    input: {
      topic: 'NTR వర్ధంతి - నందమూరి తారక రామారావు స్మరణ',
      source: 'internal',
    },
    expected: {
      audience_emotion: 'sadness',
      best_angle: 'tribute',
      safety_risk: 'low',
      should_have_hooks: true,
    },
  },

  // ============================================================
  // OTT RELEASE
  // ============================================================
  {
    name: 'OTT Release Announcement',
    input: {
      topic: 'Salaar OTT release date announced - Prabhas movie on Netflix',
      source: 'news',
    },
    expected: {
      audience_emotion: 'excitement',
      best_angle: 'info',
      safety_risk: 'low',
    },
  },

  // ============================================================
  // CONTROVERSIAL PERSONAL TOPIC
  // ============================================================
  {
    name: 'Personal Controversy - High Risk',
    input: {
      topic: 'Actor divorce rumors - Alleged affair with co-star',
      rawContent: 'Unverified rumors about personal life.',
    },
    expected: {
      safety_risk: 'high',
      best_angle: 'info',
    },
  },
];

// ============================================================
// TEST RUNNER
// ============================================================

async function runTests() {
  console.log('🧪 Editorial Analyzer Test Suite\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Topic: "${testCase.input.topic.slice(0, 50)}..."`);

    try {
      const result = await analyzeEditorialIntent(testCase.input);

      const checks: { field: string; expected: any; actual: any; pass: boolean }[] = [];

      // Validate expected fields
      for (const [field, expected] of Object.entries(testCase.expected)) {
        if (field === 'should_have_hooks') {
          const actual = result.narrative_plan.hook.length > 0;
          checks.push({ field, expected, actual, pass: actual === expected });
        } else {
          const actual = (result as any)[field];
          checks.push({ field, expected, actual, pass: actual === expected });
        }
      }

      const allPassed = checks.every(c => c.pass);

      if (allPassed) {
        console.log(`   ✅ PASSED`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        for (const check of checks) {
          const icon = check.pass ? '✓' : '✗';
          console.log(`      ${icon} ${check.field}: expected "${check.expected}", got "${check.actual}"`);
        }
        failed++;
      }

      // Always show what was detected
      console.log(`   → Emotion: ${result.audience_emotion}, Angle: ${result.best_angle}, Risk: ${result.safety_risk}`);
      console.log(`   → Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      if (result.entity_metadata?.is_legend) console.log(`   → 🌟 Legend detected`);
      if (result.needs_human_review) console.log(`   → ⚠️ Needs human review`);

    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      failed++;
    }

    // Delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
runTests();
