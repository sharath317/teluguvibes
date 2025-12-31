/**
 * Test Script: Celebrity Image Validation
 *
 * This script tests the image fetching system against our celebrity database
 * to ensure celebrities are correctly matched with TMDB images.
 */

import { extractCelebrityName } from '../lib/telugu-celebrities';

// Test articles covering various celebrity categories
const TEST_ARTICLES = [
  // MEGA FAMILY
  { title: 'చిరంజీవి కొత్త సినిమా అప్‌డేట్', category: 'Mega Family' },
  { title: 'పవన్ కల్యాణ్ ఆసక్తికర ప్రకటన', category: 'Mega Family' },
  { title: 'రామ్ చరణ్ హాలీవుడ్ ప్రాజెక్ట్ వార్తలు', category: 'Mega Family' },
  { title: 'అల్లు అర్జున్ పుష్ప 2 షూటింగ్ అప్‌డేట్', category: 'Mega Family' },
  { title: 'వరుణ్ తేజ్ కొత్త లుక్ విడుదల', category: 'Mega Family' },

  // NANDAMURI FAMILY
  { title: 'జూనియర్ ఎన్టీఆర్ వార్ 2 అప్‌డేట్', category: 'Nandamuri Family' },
  { title: 'బాలకృష్ణ 109వ సినిమా ప్రకటన', category: 'Nandamuri Family' },
  { title: 'కల్యాణ్ రామ్ ఆక్షన్ మూవీ ఆఫర్', category: 'Nandamuri Family' },

  // AKKINENI FAMILY
  { title: 'నాగార్జున బిగ్ బాస్ సీజన్ 8 హోస్ట్', category: 'Akkineni Family' },
  { title: 'నాగచైతన్య సమంత విడాకులు తర్వాత', category: 'Akkineni Family' },
  { title: 'అఖిల్ అక్కినేని కొత్త సినిమా', category: 'Akkineni Family' },

  // TOP HEROES
  { title: 'మహేష్ బాబు SSMB29 షూటింగ్ అప్‌డేట్', category: 'Top Heroes' },
  { title: 'ప్రభాస్ సాలార్ 2 వార్తలు', category: 'Top Heroes' },
  { title: 'విజయ్ దేవరకొండ VD12 అనౌన్స్‌మెంట్', category: 'Top Heroes' },
  { title: 'రవి తేజ మాస్ ఎంటర్‌టైనర్ మూవీ', category: 'Top Heroes' },
  { title: 'నాని హీరో ప్రాజెక్ట్ అప్‌డేట్', category: 'Top Heroes' },

  // TOP HEROINES
  { title: 'సమంత నయా ప్రాజెక్ట్ అనౌన్స్', category: 'Top Heroines' },
  { title: 'రష్మిక మండన్నా హాలీవుడ్ డెబ్యూ', category: 'Top Heroines' },
  { title: 'పూజా హెగ్డే రాధేశ్యామ్ 2 వార్తలు', category: 'Top Heroines' },
  { title: 'అనుష్క శెట్టి కమ్‌బ్యాక్ మూవీ', category: 'Top Heroines' },
  { title: 'సాయి పల్లవి డాన్స్ వీడియో వైరల్', category: 'Top Heroines' },
  { title: 'కీర్తి సురేష్ వెబ్ సిరీస్ డీల్', category: 'Top Heroines' },
  { title: 'శ్రీలీల కొత్త సినిమా సంతకం', category: 'Top Heroines' },
  { title: 'కాజల్ అగర్వాల్ బేబీ ఆనౌన్స్', category: 'Top Heroines' },

  // DIRECTORS
  { title: 'రాజమౌళి కొత్త ప్రాజెక్ట్ అనౌన్స్', category: 'Directors' },
  { title: 'సుకుమార్ పుష్ప 3 ప్లాన్స్', category: 'Directors' },
  { title: 'త్రివిక్రమ్ శ్రీనివాస్ కొత్త స్క్రిప్ట్', category: 'Directors' },
  { title: 'కొరటాల శివ ఆక్షన్ థ్రిల్లర్', category: 'Directors' },
  { title: 'రామ్‌గోపాల్ వర్మ వివాదాస్పద వ్యాఖ్యలు', category: 'Directors' },

  // MUSIC DIRECTORS
  { title: 'దేవిశ్రీ ప్రసాద్ కొత్త ఆల్బమ్', category: 'Music Directors' },
  { title: 'తమన్ హాలీవుడ్ కంపోజర్ ఆఫర్', category: 'Music Directors' },
  { title: 'అనిరుద్ రవిచందర్ కాన్సర్ట్ టూర్', category: 'Music Directors' },
  { title: 'కీరవాణి ఆస్కార్ తర్వాత ప్రాజెక్ట్', category: 'Music Directors' },

  // SINGERS
  { title: 'చిన్మయి శ్రీపాద కొత్త సాంగ్ రిలీజ్', category: 'Singers' },
  { title: 'మంగ్లీ జానపద పాట వైరల్', category: 'Singers' },
  { title: 'సిద్ శ్రీరామ్ లైవ్ కాన్సర్ట్', category: 'Singers' },

  // COMEDIANS
  { title: 'బ్రహ్మానందం హెల్త్ అప్‌డేట్', category: 'Comedians' },
  { title: 'సునీల్ కమ్‌బ్యాక్ మూవీ', category: 'Comedians' },
  { title: 'వెన్నెల కిషోర్ కొత్త కామెడీ షో', category: 'Comedians' },

  // BIGG BOSS
  { title: 'శ్రీముఖి కొత్త షో హోస్ట్', category: 'Bigg Boss' },
  { title: 'కౌశల్ మండ ఫాన్స్ మీట్', category: 'Bigg Boss' },
  { title: 'షణ్ముఖ్ జస్వంత్ వెబ్ సిరీస్', category: 'Bigg Boss' },

  // POLITICIANS
  { title: 'కేసీఆర్ మహా సభ ప్రకటన', category: 'Politicians' },
  { title: 'జగన్ ముఖ్యమంత్రి నిర్ణయం', category: 'Politicians' },
  { title: 'చంద్రబాబు ఎన్నికల ప్రచారం', category: 'Politicians' },
  { title: 'పవన్ కళ్యాణ్ జనసేన ర్యాలీ', category: 'Politicians' },

  // CRICKETERS
  { title: 'విరాట్ కోహ్లీ సెంచరీ వార్తలు', category: 'Cricketers' },
  { title: 'ధోనీ ఐపీఎల్ రిటైర్మెంట్', category: 'Cricketers' },
  { title: 'రోహిత్ శర్మ కెప్టెన్సీ', category: 'Cricketers' },

  // SPORTS
  { title: 'పీవీ సింధు ఒలింపిక్స్ మెడల్', category: 'Sports' },
  { title: 'సైనా నెహ్వాల్ బ్యాడ్మింటన్ టోర్నీ', category: 'Sports' },
  { title: 'సానియా మిర్జా రిటైర్మెంట్ వార్తలు', category: 'Sports' },

  // CROSS-INDUSTRY
  { title: 'రజనీకాంత్ కూలీ నంబర్ 1 రీమేక్', category: 'Cross-Industry' },
  { title: 'కమల్ హాసన్ తెలుగు సినిమా', category: 'Cross-Industry' },
  { title: 'తళపతి విజయ్ తెలుగు డబ్', category: 'Cross-Industry' },
  { title: 'యష్ కేజీఎఫ్ 3 అనౌన్స్', category: 'Cross-Industry' },

  // GOLDEN ERA
  { title: 'మహానటి సావిత్రి జయంతి వేడుకలు', category: 'Golden Era' },
  { title: 'ఎన్టీఆర్ గారి వర్ధంతి', category: 'Golden Era' },
  { title: 'ఏఎన్ఆర్ క్లాసిక్ మూవీ రిస్టోర్', category: 'Golden Era' },

  // TV PERSONALITIES
  { title: 'సుమ కనకాల కొత్త షో', category: 'TV Personalities' },
  { title: 'అనసూయ భరద్వాజ్ ఫ్యాషన్ షో', category: 'TV Personalities' },
  { title: 'రశ్మీ గౌతమ్ వెడ్డింగ్ వార్తలు', category: 'TV Personalities' },

  // YOUTUBERS
  { title: 'మై విలేజ్ షో కొత్త వీడియో వైరల్', category: 'YouTubers' },
  { title: 'వివా హర్ష కామెడీ స్కిట్', category: 'YouTubers' },
  { title: 'నిహారిక కొణిదెల వ్లాగ్', category: 'YouTubers' },
];

// Function to test each article
async function testCelebrityImages() {
  console.log('🎬 TELUGU CELEBRITY IMAGE VALIDATION TEST');
  console.log('==========================================\n');

  const results: {
    category: string;
    title: string;
    celebrity: string | null;
    status: 'PASS' | 'FAIL';
  }[] = [];

  for (const article of TEST_ARTICLES) {
    const celebrity = extractCelebrityName(article.title);

    results.push({
      category: article.category,
      title: article.title.substring(0, 40) + (article.title.length > 40 ? '...' : ''),
      celebrity,
      status: celebrity ? 'PASS' : 'FAIL',
    });
  }

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];

  let totalPass = 0;
  let totalFail = 0;

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passCount = categoryResults.filter(r => r.status === 'PASS').length;
    const failCount = categoryResults.filter(r => r.status === 'FAIL').length;

    totalPass += passCount;
    totalFail += failCount;

    console.log(`\n📂 ${category}`);
    console.log('─'.repeat(60));

    for (const result of categoryResults) {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      const celebName = result.celebrity || 'NOT FOUND';
      console.log(`${statusIcon} ${result.title}`);
      console.log(`   → Celebrity: ${celebName}`);
    }

    console.log(`\n   Category Score: ${passCount}/${categoryResults.length}`);
  }

  console.log('\n');
  console.log('==========================================');
  console.log('📊 FINAL RESULTS');
  console.log('==========================================');
  console.log(`Total Articles Tested: ${results.length}`);
  console.log(`✅ Passed: ${totalPass}`);
  console.log(`❌ Failed: ${totalFail}`);
  console.log(`📈 Success Rate: ${((totalPass / results.length) * 100).toFixed(1)}%`);

  if (totalFail > 0) {
    console.log('\n⚠️  Failed Articles (Need Name Mapping):');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.title}`);
    });
  }

  return results;
}

// Run the test
testCelebrityImages();
