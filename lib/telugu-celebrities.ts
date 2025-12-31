/**
 * Comprehensive Telugu Celebrity Database
 * Includes actors, actresses, directors, music directors, singers, producers, comedians, and more
 *
 * Last Updated: December 2024
 */

// ============================================================
// TELUGU TO ENGLISH NAME MAPPINGS
// ============================================================

export const TELUGU_NAME_MAP: Record<string, string> = {
  // ============================================================
  // LEGENDARY ACTORS - GOLDEN ERA (1930s-1970s)
  // ============================================================
  'ఎన్టీఆర్': 'NTR Sr',
  'ఎన్.టి.రామారావు': 'NTR Sr',
  'నందమూరి తారకరామారావు': 'NTR Sr',
  'ఏఎన్ఆర్': 'Akkineni Nageswara Rao',
  'అక్కినేని నాగేశ్వరరావు': 'Akkineni Nageswara Rao',
  'నాగేశ్వరరావు': 'Akkineni Nageswara Rao',
  'ఘంటసాల': 'Ghantasala',
  'ఘంటసాల వెంకటేశ్వరరావు': 'Ghantasala',
  'ఎస్వీ రంగారావు': 'SV Ranga Rao',
  'ఎస్.వి.రంగారావు': 'SV Ranga Rao',
  'రేలంగి': 'Relangi',
  'రేలంగి వెంకటరామయ్య': 'Relangi',
  'రామారావు': 'Ramana Rao',
  'సావిత్రి': 'Savitri',
  'మహానటి సావిత్రి': 'Savitri',
  'మహానటి': 'Savitri',
  'భానుమతి': 'Bhanumathi',
  'భానుమతి రామకృష్ణ': 'Bhanumathi',
  'అంజలీదేవి': 'Anjali Devi',
  'గిరిజ': 'Girija',
  'కృష్ణకుమారి': 'Krishna Kumari',
  'దేవిక': 'Devika',
  'షావుకారు జానకి': 'Showkar Janaki',
  'పుష్పవల్లి': 'Pushpavalli',
  'సూర్యకాంతం': 'Suryakantham',
  'హేమలత': 'Hemalatha',
  'రాజసులోచన': 'Rajasulochana',
  'సంధ్యా': 'Sandhya',
  'సత్యనారాయణ': 'Satyanarayana',
  'కైకాల సత్యనారాయణ': 'Kaikala Satyanarayana',
  'గుమ్మడి వెంకటేశ్వరరావు': 'Gummadi',
  'గుమ్మడి': 'Gummadi',
  'నాగభూషణం': 'Nagabhushanam',
  'నాగయ్య': 'Nagaiah',
  'చిత్తూరు నాగయ్య': 'Chittoor Nagaiah',
  'ముక్కామల': 'Mukkamala',
  'ముక్కామల కృష్ణమూర్తి': 'Mukkamala',
  'రాజనాల': 'Rajanala',
  'రాజనాల కాళేశ్వరరావు': 'Rajanala',
  'పద్మనాభం': 'Padmanabham',
  'అల్లు రామలింగయ్య': 'Allu Ramalingaiah',
  'రామలింగయ్య': 'Allu Ramalingaiah',
  'వంగర వెంకట సుబ్బయ్య': 'Vangara',
  'రావు గోపాలరావు': 'Rao Gopal Rao',
  'గోపాలరావు': 'Rao Gopal Rao',
  'ధూళిపాల': 'Dhulipala',
  'ధూళిపాల సీతారామశాస్త్రి': 'Dhulipala',
  'చలం': 'Chalam',
  'ప్రభాకర్ రెడ్డి': 'Prabhakar Reddy',
  'మిక్కిలినేని': 'Mikkilineni',

  // ============================================================
  // LEGENDARY ACTORS - SILVER ERA (1970s-1990s)
  // ============================================================
  'కృష్ణ': 'Superstar Krishna',
  'సూపర్ స్టార్ కృష్ణ': 'Superstar Krishna',
  'ఘట్టమనేని కృష్ణ': 'Superstar Krishna',
  'శోభన్ బాబు': 'Sobhan Babu',
  'కృష్ణంరాజు': 'Krishnam Raju',
  'రెబల్ స్టార్ కృష్ణంరాజు': 'Krishnam Raju',
  'రెబల్ స్టార్': 'Krishnam Raju',
  'జగ్గయ్య': 'Jaggayya',
  'కాంతారావు': 'Kanta Rao',
  'రామానాయుడు': 'D Ramanaidu',
  'డి రామానాయుడు': 'D Ramanaidu',
  'దాసరి నారాయణరావు': 'Dasari Narayana Rao',
  'దాసరి': 'Dasari Narayana Rao',
  'విజయనిర్మల': 'Vijaya Nirmala',
  'జమున': 'Jamuna',
  'వాణిశ్రీ': 'Vanisri',
  'జయసుధ': 'Jayasudha',
  'జయప్రద': 'Jayaprada',
  'శ్రీదేవి': 'Sridevi',
  'శ్రీదేవి కపూర్': 'Sridevi',
  'సిల్క్ స్మిత': 'Silk Smitha',
  'భారతి': 'Bharathi',
  'లక్ష్మి': 'Lakshmi',
  'విజయశాంతి': 'Vijayashanti',
  'రమ్యకృష్ణ': 'Ramya Krishna',
  'రమ్యకృష్ణన్': 'Ramya Krishna',
  'నగ్మా': 'Nagma',
  'మీనా': 'Meena',
  'షర్మిలా': 'Sharmila',
  'లలిత': 'Lalitha',
  'పద్మిని': 'Padmini',
  'రాధిక': 'Radhika',
  'రాధిక శరత్‌కుమార్': 'Radhika Sarathkumar',
  'శరత్ కుమార్': 'Sarathkumar',
  'జ్యోతి లక్ష్మి': 'Jyothi Lakshmi',
  'హారతి': 'Aarti Agarwal',
  'సౌందర్య': 'Soundarya',
  'దివ్యభారతి': 'Divya Bharti',
  'రోజా': 'Roja',
  'రాంబా': 'Rambha',
  'సింధు': 'Sindhu',
  'సింధు తులాని': 'Sindhu Tulani',
  'అనూరాధ': 'Anuradha',
  'అంబికా': 'Ambika',
  'రాధా': 'Radha',

  // ============================================================
  // 80s-90s HEROES
  // ============================================================
  'శ్రీధర్': 'Sridhaar',
  'సుమన్': 'Suman',
  'సుమన్ తలవార్': 'Suman',
  'రాజశేఖర్': 'Rajasekhar',
  'డా. రాజశేఖర్': 'Rajasekhar',
  'జీవా': 'Jeeva',
  'భాను చందర్': 'Bhanu Chander',
  'వెంకటేష్ దగ్గుబాటి': 'Venkatesh',
  'శ్రీకాంత్': 'Srikanth',
  'జగపతి బాబు': 'Jagapathi Babu',
  'జగపతిబాబు': 'Jagapathi Babu',
  'అబ్బాస్': 'Abbas',
  'ప్రసాంత్': 'Prashanth',
  'పృథ్వీరాజ్': 'Prithviraj',
  'అర్జున్': 'Arjun',
  'అర్జున్ సర్జా': 'Arjun Sarja',
  'సాయికుమార్': 'Saikumar',
  'సాయి కుమార్': 'Saikumar',
  'ముఖేష్ రిషి': 'Mukesh Rishi',
  'సయాజీ షిందే': 'Sayaji Shinde',
  'అశీష్ విద్యార్థి': 'Ashish Vidyarthi',
  'నాసర్': 'Nassar',
  'నాజర్': 'Nassar',
  'ప్రకాష్ రాజ్': 'Prakash Raj',
  'ప్రకాశ్ రాజ్': 'Prakash Raj',
  'సత్యరాజ్': 'Satyaraj',

  // ============================================================
  // MEGA FAMILY
  // ============================================================
  'చిరంజీవి': 'Chiranjeevi',
  'మెగాస్టార్ చిరంజీవి': 'Chiranjeevi',
  'పవన్ కల్యాణ్': 'Pawan Kalyan',
  'పవన్': 'Pawan Kalyan',
  'పవర్ స్టార్': 'Pawan Kalyan',
  'రామ్ చరణ్': 'Ram Charan',
  'చరణ్': 'Ram Charan',
  'మెగా పవర్ స్టార్': 'Ram Charan',
  'వరుణ్ తేజ్': 'Varun Tej',
  'సాయి ధరమ్ తేజ్': 'Sai Dharam Tej',
  'అల్లు అర్జున్': 'Allu Arjun',
  'బన్నీ': 'Allu Arjun',
  'స్టైలిష్ స్టార్': 'Allu Arjun',
  'అల్లు శిరీష్': 'Allu Sirish',
  'శిరీష్': 'Allu Sirish',
  'నాగబాబు': 'Nagababu',
  'నాగ బాబు': 'Nagababu',
  'అల్లు అరవింద్': 'Allu Aravind',
  'అల్లు బాబీ': 'Allu Bobby',

  // ============================================================
  // NANDAMURI FAMILY
  // ============================================================
  'జూనియర్ ఎన్టీఆర్': 'Jr NTR',
  'ఎన్టీఆర్ జూనియర్': 'Jr NTR',
  'తారక్': 'Jr NTR',
  'యంగ్ టైగర్': 'Jr NTR',
  'బాలకృష్ణ': 'Nandamuri Balakrishna',
  'బాలయ్య': 'Nandamuri Balakrishna',
  'నందమూరి బాలకృష్ణ': 'Nandamuri Balakrishna',
  'కల్యాణ్ రామ్': 'Nandamuri Kalyan Ram',
  'నందమూరి కల్యాణ్ రామ్': 'Nandamuri Kalyan Ram',
  'హరికృష్ణ': 'Harikrishna',
  'మోహన్ బాబు': 'Mohan Babu',
  'మంచు మోహన్ బాబు': 'Mohan Babu',
  'మంచు విష్ణు': 'Manchu Vishnu',
  'విష్ణు మంచు': 'Manchu Vishnu',
  'మంచు మనోజ్': 'Manchu Manoj',
  'మనోజ్ మంచు': 'Manchu Manoj',
  'మంచు లక్ష్మి': 'Manchu Lakshmi',

  // ============================================================
  // AKKINENI FAMILY
  // ============================================================
  'నాగార్జున': 'Nagarjuna',
  'కింగ్ నాగార్జున': 'Nagarjuna',
  'అక్కినేని నాగార్జున': 'Nagarjuna',
  'నాగచైతన్య': 'Naga Chaitanya',
  'చై': 'Naga Chaitanya',
  'యువ సమ్రాట్': 'Naga Chaitanya',
  'అఖిల్ అక్కినేని': 'Akhil Akkineni',
  'అఖిల్': 'Akhil Akkineni',
  'సుమంత్': 'Sumanth',
  'సుమంత్ అశ్విన్': 'Sumanth Ashwin',

  // ============================================================
  // DAGGUBATI FAMILY
  // ============================================================
  'వెంకటేష్': 'Venkatesh',
  'విక్టరీ వెంకటేష్': 'Venkatesh',
  'రానా దగ్గుబాటి': 'Rana Daggubati',
  'రానా': 'Rana Daggubati',
  'సురేష్ బాబు': 'Suresh Babu',
  'దగ్గుబాటి సురేష్ బాబు': 'Suresh Babu',

  // ============================================================
  // TOP HEROES (2000s-Present)
  // ============================================================
  'మహేష్ బాబు': 'Mahesh Babu',
  'మహేష్': 'Mahesh Babu',
  'సూపర్ స్టార్ మహేష్': 'Mahesh Babu',
  'ప్రభాస్': 'Prabhas',
  'డార్లింగ్ ప్రభాస్': 'Prabhas',
  'రెబల్ స్టార్ ప్రభాస్': 'Prabhas',
  'విజయ్ దేవరకొండ': 'Vijay Deverakonda',
  'విజయ్': 'Vijay Deverakonda',
  'రౌడీ': 'Vijay Deverakonda',
  'నాని': 'Nani',
  'నేచురల్ స్టార్': 'Nani',
  'రవి తేజ': 'Ravi Teja',
  'మాస్ మహారాజా': 'Ravi Teja',
  'నితిన్': 'Nithin',
  'నితిన్ రెడ్డి': 'Nithin',
  'శర్వానంద్': 'Sharwanand',
  'సిద్దార్థ': 'Siddharth',
  'సుధీర్ బాబు': 'Sudheer Babu',
  'నవీన్ పోలిశెట్టి': 'Naveen Polishetty',
  'రాజ్ తరుణ్': 'Raj Tarun',
  'అడవి శేష్': 'Adivi Sesh',
  'శేష్': 'Adivi Sesh',
  'విశ్వక్ సేన్': 'Vishwak Sen',
  'నాగ శౌర్య': 'Naga Shaurya',
  'సందీప్ కిషన్': 'Sundeep Kishan',
  'బెల్లంకొండ శ్రీనివాస్': 'Bellamkonda Sreenivas',
  'అశోక్ గల్లా': 'Ashok Galla',
  'కార్తికేయ': 'Karthikeya',
  'నిఖిల్': 'Nikhil Siddharth',
  'నిఖిల్ సిద్ధార్థ': 'Nikhil Siddharth',
  'సత్యదేవ్': 'Satyadev',
  'ప్రియదర్శి': 'Priyadarshi',
  'రాహుల్ రామకృష్ణ': 'Rahul Ramakrishna',
  'నవీన్ చంద్ర': 'Naveen Chandra',
  'విజయ్ సేతుపతి': 'Vijay Sethupathi',
  'ధనుష్': 'Dhanush',
  'ఫహద్ ఫాజిల్': 'Fahadh Faasil',
  'సూర్య': 'Suriya',
  'విక్రమ్': 'Vikram',
  'కార్తి': 'Karthi',

  // ============================================================
  // TOP HEROINES
  // ============================================================
  'సమంత': 'Samantha Ruth Prabhu',
  'సమంతా': 'Samantha Ruth Prabhu',
  'సామ్': 'Samantha Ruth Prabhu',
  'రష్మిక': 'Rashmika Mandanna',
  'రష్మిక మండన్నా': 'Rashmika Mandanna',
  'నేషనల్ క్రష్': 'Rashmika Mandanna',
  'పూజా హెగ్డే': 'Pooja Hegde',
  'పూజా': 'Pooja Hegde',
  'అనుష్క': 'Anushka Shetty',
  'అనుష్క శెట్టి': 'Anushka Shetty',
  'తమన్నా': 'Tamannaah Bhatia',
  'తమన్నా భాటియా': 'Tamannaah Bhatia',
  'సాయి పల్లవి': 'Sai Pallavi',
  'కీర్తి సురేష్': 'Keerthy Suresh',
  'కాజల్': 'Kajal Aggarwal',
  'కాజల్ అగర్వాల్': 'Kajal Aggarwal',
  'రకుల్': 'Rakul Preet Singh',
  'రకుల్ ప్రీత్ సింగ్': 'Rakul Preet Singh',
  'శ్రీలీల': 'Sreeleela',
  'నయనతార': 'Nayanthara',
  'లేడీ సూపర్ స్టార్': 'Nayanthara',
  'త్రిష': 'Trisha',
  'త్రిషా కృష్ణన్': 'Trisha',
  'హన్సిక': 'Hansika Motwani',
  'శ్రుతి హాసన్': 'Shruti Haasan',
  'కియారా అద్వానీ': 'Kiara Advani',
  'మలవిక మోహనన్': 'Malavika Mohanan',
  'కృతీ శెట్టి': 'Krithi Shetty',
  'కృతి శెట్టి': 'Krithi Shetty',
  'మృణాల్ ఠాకూర్': 'Mrunal Thakur',
  'శ్రద్ధా శ్రీనాథ్': 'Shraddha Srinath',
  'లావణ్య త్రిపాఠి': 'Lavanya Tripathi',
  'రాశీ ఖన్నా': 'Raashi Khanna',
  'రిత్విక సింగ్': 'Ritika Singh',
  'రెజీనా': 'Regina Cassandra',
  'రెజీనా కాసాండ్రా': 'Regina Cassandra',
  'నభా నటేష్': 'Nabha Natesh',
  'అమలా పాల్': 'Amala Paul',
  'అంజలి': 'Anjali',
  'భూమిక': 'Bhumika Chawla',
  'ఐశ్వర్య రాజేష్': 'Aishwarya Rajesh',
  'శ్రియా శరన్': 'Shriya Saran',
  'ఇలియానా': 'Ileana D Cruz',
  'ఇలియానా డిక్రూజ్': 'Ileana D Cruz',
  'అదా శర్మ': 'Adah Sharma',
  'పాయల్ రాజ్‌పుత్': 'Payal Rajput',
  'మీర జాస్మిన్': 'Meera Jasmine',
  'జెన్నెలియా': 'Genelia D Souza',
  'జెన్నెలియా డిసౌజా': 'Genelia D Souza',
  'నిత్య మేనన్': 'Nithya Menen',

  // ============================================================
  // DIRECTORS - LEGENDARY (Pre-2000)
  // ============================================================
  'బి విట్టలాచార్య': 'B Vittalacharya',
  'విట్టలాచార్య': 'B Vittalacharya',
  'బిఎన్ రెడ్డి': 'BN Reddy',
  'బి నరసింహారెడ్డి': 'BN Reddy',
  'ఎల్వీ ప్రసాద్': 'LV Prasad',
  'బాపు': 'Bapu',
  'బాపు గారు': 'Bapu',
  'సత్తిరాజు లక్ష్మీనారాయణ': 'Bapu',
  'రాఘవేంద్రరావు': 'K Raghavendra Rao',
  'కే రాఘవేంద్రరావు': 'K Raghavendra Rao',
  'కాళ్యాణి విశ్వనాథ్': 'K Vishwanath',
  'కోడండరామి రెడ్డి': 'Kodandarami Reddy',
  'ఏ కోడండరామి రెడ్డి': 'A Kodandarami Reddy',
  'వంశీ': 'Vamsy',
  'వంశీ డైరెక్టర్': 'Vamsy',
  'మణిరత్నం': 'Mani Ratnam',
  'జంధ్యాల': 'Jandhyala',
  'జంధ్యాల సుబ్రహ్మణ్యశాస్త్రి': 'Jandhyala',
  'రేలంగి నరసింహారావు': 'Relangi Narasimha Rao',
  'వంశీ పైడిపల్లి సీనియర్': 'Vamshi Senior',
  'ఈవీవీ సత్యనారాయణ': 'EVV Satyanarayana',
  'ఈవీవీ': 'EVV Satyanarayana',
  'శ్రీను వైట్ల సీనియర్': 'Srinivasa Rao Tatineni',
  'తాతినేని రామారావు': 'Tatineni Rama Rao',
  'సింగీతం శ్రీనివాసరావు': 'Singeetham Srinivasa Rao',
  'వి మధుసూదన్ రావు': 'V Madhusudhana Rao',
  'పీ పుల్లయ్య': 'P Pullaiah',
  'గుడవల్లి రామబ్రహ్మం': 'Gudavalli Ramabrahmam',
  'హెచ్ఎం రెడ్డి': 'HM Reddy',
  'కె ఎస్ ప్రకాశరావు': 'KS Prakash Rao',
  'ఆదుర్తి సుబ్బారావు': 'Adurthi Subba Rao',

  // ============================================================
  // DIRECTORS - MODERN (2000+)
  // ============================================================
  'రాజమౌళి': 'SS Rajamouli',
  'ఎస్ఎస్ రాజమౌళి': 'SS Rajamouli',
  'సుకుమార్': 'Sukumar',
  'సుకుమార్ బండ్లా': 'Sukumar',
  'త్రివిక్రమ్ శ్రీనివాస్': 'Trivikram Srinivas',
  'త్రివిక్రమ్': 'Trivikram Srinivas',
  'గుణశేఖర్': 'Gunasekhar',
  'కొరటాల శివ': 'Koratala Siva',
  'రామ్‌గోపాల్ వర్మ': 'Ram Gopal Varma',
  'రామ్ గోపాల్ వర్మ': 'Ram Gopal Varma',
  'ఆర్జీవీ': 'Ram Gopal Varma',
  'వర్మ': 'Ram Gopal Varma',
  'పూరి జగన్నాథ్': 'Puri Jagannadh',
  'పూరి': 'Puri Jagannadh',
  'బోయపాటి శ్రీను': 'Boyapati Srinu',
  'బోయపాటి': 'Boyapati Srinu',
  'హరీష్ శంకర్': 'Harish Shankar',
  'అనిల్ రావిపూడి': 'Anil Ravipudi',
  'వంశీ పైడిపల్లి': 'Vamshi Paidipally',
  'ప్రశాంత్ నీల్': 'Prashanth Neel',
  'గోపీచంద్ మాళవీయ': 'Gopichand Malineni',
  'శ్రీను వైట్ల': 'Sreenu Vaitla',
  'వినాయక్': 'VV Vinayak',
  'వీవీ వినాయక్': 'VV Vinayak',
  'మురుగదాస్': 'AR Murugadoss',
  'శంకర్': 'Shankar',
  'ఎస్ శంకర్': 'Shankar',
  'గౌతమ్ తిన్ననూరి': 'Gowtam Tinnanuri',
  'శేఖర్ కమ్ముల': 'Sekhar Kammula',
  'నాగ అశ్విన్': 'Nag Ashwin',
  'వేణు శ్రీరామ్': 'Venu Sriram',
  'వేణు ఉడుగుల': 'Venu Udugula',
  'పరశురామ్': 'Parasuram',
  'సంతోష్ శ్రీనివాస్': 'Santhosh Srinivas',
  'మరుతి': 'Maruthi',
  'వెంకీ అట్లూరి': 'Venky Atluri',
  'సుజీత్': 'Sujeeth',
  'సుధ కొంగర': 'Sudha Kongara',
  'సంతోష్ నారాయణన్': 'Santhosh Narayanan',
  'బాలకృష్ణ కొంగర': 'Balakrishna Kola',
  'బొమ్మరిల్లు భాస్కర్': 'Bhaskar',
  'సందీప్ రెడ్డి వంగా': 'Sandeep Reddy Vanga',
  'సందీప్ వంగ': 'Sandeep Reddy Vanga',
  'తేజ': 'Teja',
  'మేహర్ రమేష్': 'Meher Ramesh',
  'సుందర్ సి': 'Sundar C',
  'ముథయ్య': 'Muthaiah',
  'ప్రవీణ్ శట్టారు': 'Praveen Sattaru',
  'కృష్ణకాంత్': 'Krishna Kanth',
  'బుచ్చిబాబు సాన': 'Buchi Babu Sana',
  'వెణ్ణెల కిషోర్ డైరెక్టర్': 'Vennela Kishore Director',
  'రాహుల్ సంకృత్యన్': 'Rahul Sankrityan',
  'సురేందర్ రెడ్డి': 'Surender Reddy',
  'దేవి ప్రసాద్': 'Devi Prasad',
  'కిరణ్ కొర్రపాటి': 'Kiran Korrapati',
  'హను రాఘవపూడి': 'Hanu Raghavapudi',

  // ============================================================
  // MUSIC DIRECTORS - LEGENDARY
  // ============================================================
  'పెండ్యాల నాగేశ్వరరావు': 'Pendyala Nageswara Rao',
  'టి చలపతిరావు': 'T Chalapathi Rao',
  'సాలూరు రాజేశ్వరరావు': 'Saluri Rajeswara Rao',
  'సాలూరు': 'Saluri Rajeswara Rao',
  'ఆదినారాయణరావు': 'Aadinarayana Rao',
  'కోదండపాణి': 'Kodandapani',
  'మాస్టర్ వేణు': 'Master Venu',
  'ఇళయరాజా': 'Ilaiyaraaja',
  'రాజా': 'Ilaiyaraaja',
  'ఇసై ఙ్ఞాని': 'Ilaiyaraaja',
  'కీరవాణి': 'MM Keeravani',
  'ఎంఎం కీరవాణి': 'MM Keeravani',
  'కొడూరి మరక్కతమణి కీరవాణి': 'MM Keeravani',
  'చక్రి': 'Chakri',
  'కోటి': 'Koti',
  'విద్యాసాగర్': 'Vidyasagar',
  'మణిశర్మ': 'Mani Sharma',
  'ఆర్పీ పట్నాయక్': 'RP Patnaik',
  'వందేమాతరం శ్రీనివాస్': 'Vandemataram Srinivas',

  // ============================================================
  // MUSIC DIRECTORS - MODERN
  // ============================================================
  'దేవిశ్రీ ప్రసాద్': 'Devi Sri Prasad',
  'డీఎస్‌పీ': 'Devi Sri Prasad',
  'రాక్‌స్టార్ డీఎస్‌పీ': 'Devi Sri Prasad',
  'తమన్ ఎస్': 'SS Thaman',
  'తమన్': 'SS Thaman',
  'ఎస్ఎస్ తమన్': 'SS Thaman',
  'అనిరుద్ రవిచందర్': 'Anirudh Ravichander',
  'అనిరుద్': 'Anirudh Ravichander',
  'రాక్‌స్టార్ అనిరుద్': 'Anirudh Ravichander',
  'ఏఆర్ రెహమాన్': 'AR Rahman',
  'రెహమాన్': 'AR Rahman',
  'ఎ.ఆర్. రెహమాన్': 'AR Rahman',
  'మిక్కీ జె మేయర్': 'Mickey J Meyer',
  'హారిస్ జయరాజ్': 'Harris Jayaraj',
  'యువన్ శంకర్ రాజా': 'Yuvan Shankar Raja',
  'యువన్': 'Yuvan Shankar Raja',
  'జిబ్రాన్': 'Gibran',
  'విశాల్ శేఖర్': 'Vishal-Shekhar',
  'సచిన్-జిగర్': 'Sachin-Jigar',
  'అమిత్ త్రివేది': 'Amit Trivedi',
  'హిప్ హాప్ తమిళా': 'Hip Hop Tamizha',
  'ఆదియన్': 'Adiyan',
  'జస్టిన్ ప్రభాకరన్': 'Justin Prabhakaran',
  'సిద్ శ్రీరామ్': 'Sid Sriram',
  'శ్రీ రామ్ చంద్ర': 'Sri Rama Chandra',
  'అజయ్-అతుల్': 'Ajay-Atul',
  'గీతం శ్రీరామ్': 'Geetham Sriram',
  'వివేక్ సాగర్': 'Vivek Sagar',
  'కాలభైరవ': 'Kaala Bhairava',
  'హేషామ్ అబ్దుల్ వహాబ్': 'Hesham Abdul Wahab',
  'రోల్ రిదా': 'Roll Rida',
  'రమన్ భరద్వాజ్': 'Raman Bharadwaj',
  'రోకీ బై': 'Rockii Bhai',

  // ============================================================
  // SINGERS - LEGENDARY
  // ============================================================
  'ఘంటసాల గాయకుడు': 'Ghantasala Singer',
  'ఎస్పీ బాలసుబ్రహ్మణ్యం': 'SP Balasubrahmanyam',
  'ఎస్పీబీ': 'SP Balasubrahmanyam',
  'బాలు': 'SP Balasubrahmanyam',
  'బాలు గారు': 'SP Balasubrahmanyam',
  'ఎస్పీ శైలజ': 'SP Sailaja',
  'శైలజ': 'SP Sailaja',
  'పి సుశీల': 'P Susheela',
  'సుశీల': 'P Susheela',
  'ఎస్ జానకి': 'S Janaki',
  'జానకి': 'S Janaki',
  'జానకి అమ్మ': 'S Janaki',
  'లీల': 'Leela',
  'జిక్కి': 'Jikki',
  'కేజే యేసుదాస్': 'KJ Yesudas',
  'యేసుదాస్': 'KJ Yesudas',
  'కేఎస్ చిత్ర': 'KS Chithra',
  'చిత్ర': 'KS Chithra',
  'కెఎస్ చిత్ర': 'KS Chithra',
  'ఎంఎస్ సుబ్బలక్ష్మి': 'MS Subbulakshmi',
  'మంగళంపల్లి బాలమురళీకృష్ణ': 'Balamurali Krishna',
  'బాలమురళీకృష్ణ': 'Balamurali Krishna',
  'ఎస్పీ చరణ్': 'SP Charan',
  'హరిహరన్': 'Hariharan',
  'మనో': 'Mano',
  'ఉదిత్ నారాయణ్': 'Udit Narayan',
  'కుమార్ సాను': 'Kumar Sanu',
  'అల్కా యాగ్నిక్': 'Alka Yagnik',
  'లతా మంగేష్కర్': 'Lata Mangeshkar',
  'ఆశా భోస్లే': 'Asha Bhosle',

  // ============================================================
  // SINGERS - MODERN
  // ============================================================
  'చిన్మయి': 'Chinmayi Sripaada',
  'చిన్మయి శ్రీపాద': 'Chinmayi Sripaada',
  'మంగ్లీ': 'Mangli',
  'మంగ్లీ గాయని': 'Mangli',
  'శ్రేయా ఘోషల్': 'Shreya Ghoshal',
  'సుచిత్ర': 'Suchitra',
  'సుచిత్ర కార్తీక్': 'Suchitra Karthik',
  'సునీత': 'Sunitha',
  'సునీత ఉపద్రష్ట': 'Sunitha Upadrashta',
  'కార్తీక్': 'Karthik',
  'శంకర్ మహదేవన్': 'Shankar Mahadevan',
  'సోను నిగమ్': 'Sonu Nigam',
  'అరిజిత్ సింగ్': 'Arijit Singh',
  'బడ్షా': 'Badshah',
  'హనీ సింగ్': 'Yo Yo Honey Singh',
  'నీతి మోహన్': 'Neeti Mohan',
  'మమత మోహన్ దాస్': 'Mamta Mohandas',
  'హరినీ': 'Harini',
  'సింగర్ మాళవిక': 'Singer Malavika',
  'సిద్ శ్రీరామ్ సింగర్': 'Sid Sriram',
  'అనూప్ రూబెన్స్': 'Anup Rubens',
  'రాహుల్ నంబియార్': 'Rahul Nambiar',
  'విజయ్ ప్రకాశ్': 'Vijay Prakash',
  'ఉన్ని కృష్ణన్': 'Unni Krishnan',
  'శ్రీకాంత్ సింగర్': 'Sreekant Singer',
  'రీమా సింగర్': 'Reema Singer',
  'అనితా సింగర్': 'Anitha Singer',
  'సాధన సర్గమ్': 'Sadhana Sargam',
  'కవిత కృష్ణమూర్తి': 'Kavita Krishnamurti',
  'అన్వేషా': 'Anwesha',
  'గీత మాధురి': 'Geetha Madhuri',
  'ఊర్వశి రాటేల': 'Urvashi Rautela',
  'జొన్నవిత్తుల': 'Jonnavithula',
  'సిరివెన్నెల': 'Sirivennela',
  'సిరివెన్నెల సీతారామశాస్త్రి': 'Sirivennela Sitaramasastri',
  'వేటూరి సుందర రామ్మూర్తి': 'Veturi',
  'వేటూరి': 'Veturi',
  'ఆత్రేయ': 'Acharya Athreya',
  'కొసరాజు': 'Kosaraju',
  'భువన చంద్ర': 'Bhuvana Chandra',
  'సురేష్ బొట్ల': 'Suresh Bobbili',
  'చంద్రబోస్': 'Chandrabose',
  'రామజోగయ్య శాస్త్రి': 'Ramajogayya Sastry',
  'అనంత శ్రీరామ్': 'Anantha Sriram',
  'బలదేవ్': 'Baladev',
  'కితక్': 'Kittu Vissapragada',

  // ============================================================
  // COMEDIANS
  // ============================================================
  'బ్రహ్మానందం': 'Brahmanandam',
  'బ్రహ్మీ': 'Brahmanandam',
  'అలీ': 'Ali',
  'సునీల్': 'Sunil',
  'ఎంఎస్ నారాయణ': 'MS Narayana',
  'ధర్మవరపు సుబ్రహ్మణ్యం': 'Dharmavarapu Subramanyam',
  'వేణుమాధవ్': 'Venu Madhav',
  'జయప్రకాశ్ రెడ్డి': 'Jayaprakash Reddy',
  'జేపీ': 'Jayaprakash Reddy',
  'ప్రభాస్ శ్రీను': 'Prabhas Sreenu',
  'షకలక శంకర్': 'Shakalaka Shankar',
  'సప్తగిరి': 'Saptagiri',
  'పోసాని కృష్ణమురళి': 'Posani Krishna Murali',
  'పోసాని': 'Posani Krishna Murali',
  'తనికెళ్ల భరణి': 'Tanikella Bharani',
  'రఘుబాబు': 'Raghu Babu',
  'థాగుబోతు రమేష్': 'Thagubothu Ramesh',
  'వెన్నెల కిషోర్': 'Vennela Kishore',
  'సత్య': 'Satya',
  'హైపర్ ఆది': 'Hyper Aadi',
  'ఆది': 'Hyper Aadi',
  'రాజేంద్ర ప్రసాద్ కమెడియన్': 'Rajendra Prasad',
  'సుధాకర్ కమెడియన్': 'Sudhakar',
  'లక్ష్మి కమెడియన్': 'Lakshmi',
  'కోవై సరళ': 'Kovai Sarala',
  'హేమ కమెడియన్': 'Hema',

  // ============================================================
  // PRODUCERS
  // ============================================================
  'సూర్య దేవర నాగ వంశీ': 'Naga Vamsi',
  'ప్రసాద్ వి పొట్లూరి': 'Prasad V Potluri',
  'పివిపి సినిమా': 'Prasad V Potluri',
  'భగ్యశ్రీ ప్రొడక్షన్స్': 'Bhagyashree Productions',
  'మైత్రి మూవీ మేకర్స్': 'Mythri Movie Makers',
  'హారికా & హస్సినే క్రియేషన్స్': 'Haarika Hassine Creations',

  // ============================================================
  // POLITICIANS - TELANGANA
  // ============================================================
  'కేసీఆర్': 'K Chandrashekar Rao',
  'కేసిఆర్': 'K Chandrashekar Rao',
  'కెసిఆర్': 'K Chandrashekar Rao',
  'చంద్రశేఖర్ రావు': 'K Chandrashekar Rao',
  'కె చంద్రశేఖర్ రావు': 'K Chandrashekar Rao',
  'కేటీఆర్': 'KT Rama Rao',
  'కేటీ రామారావు': 'KT Rama Rao',
  'కల్వకుంట్ల తారక రామారావు': 'KT Rama Rao',
  'రేవంత్ రెడ్డి': 'Revanth Reddy',
  'ఏ రేవంత్ రెడ్డి': 'Revanth Reddy',
  'హరీష్ రావు': 'Harish Rao',
  'టి హరీష్ రావు': 'Harish Rao',
  'ఈటల రాజేందర్': 'Etela Rajender',
  'ఈటెల రాజేందర్': 'Etela Rajender',
  'కవిత': 'K Kavitha',
  'కే కవిత': 'K Kavitha',
  'కల్వకుంట్ల కవిత': 'K Kavitha',
  'భూమా అఖిల ప్రియ': 'Bhuma Akhila Priya',
  'మల్లారెడ్డి': 'Malla Reddy',
  'కొమటిరెడ్డి వెంకట్ రెడ్డి': 'Komatireddy Venkat Reddy',
  'కొమటిరెడ్డి రాజ్‌గోపాల్ రెడ్డి': 'Komatireddy Raj Gopal Reddy',
  'ఉత్తమ్ కుమార్ రెడ్డి': 'Uttam Kumar Reddy',
  'సబితా ఇంద్రారెడ్డి': 'Sabitha Indra Reddy',
  'జగదీశ్వర్ రెడ్డి': 'Jagadishwar Reddy',
  'తలసాని శ్రీనివాస్ యాదవ్': 'Talasani Srinivas Yadav',
  'కేటీఆర్ భార్య శైలిమ': 'Shailima Rao',
  'కడియం శ్రీహరి': 'Kadiyam Srihari',
  'పొన్నం ప్రభాకర్': 'Ponnam Prabhakar',
  'జీవన్ రెడ్డి': 'Jeevan Reddy',
  'బండి సంజయ్': 'Bandi Sanjay',
  'బండి సంజయ్ కుమార్': 'Bandi Sanjay Kumar',
  'కిషన్ రెడ్డి': 'Kishan Reddy',
  'జి కిషన్ రెడ్డి': 'G Kishan Reddy',
  'అసదుద్దీన్ ఓవైసీ': 'Asaduddin Owaisi',
  'ఓవైసీ': 'Asaduddin Owaisi',
  'అక్బరుద్దీన్ ఓవైసీ': 'Akbaruddin Owaisi',
  'మాజీ మంత్రి': 'Former Minister',

  // ============================================================
  // POLITICIANS - ANDHRA PRADESH
  // ============================================================
  'చంద్రబాబు': 'N Chandrababu Naidu',
  'చంద్రబాబు నాయుడు': 'N Chandrababu Naidu',
  'ఎన్ చంద్రబాబు నాయుడు': 'N Chandrababu Naidu',
  'సీబీఎన్': 'N Chandrababu Naidu',
  'జగన్': 'YS Jagan Mohan Reddy',
  'జగన్మోహన్ రెడ్డి': 'YS Jagan Mohan Reddy',
  'వైఎస్ జగన్': 'YS Jagan Mohan Reddy',
  'వైఎస్ జగన్మోహన్ రెడ్డి': 'YS Jagan Mohan Reddy',
  'లోకేష్': 'Nara Lokesh',
  'నారా లోకేష్': 'Nara Lokesh',
  'పవన్ కళ్యాణ్ రాజకీయం': 'Pawan Kalyan Politics',
  'జనసేన చీఫ్': 'Pawan Kalyan',
  'బాబు': 'N Chandrababu Naidu',
  'వైఎస్ఆర్': 'YS Rajasekhara Reddy',
  'వైఎస్ రాజశేఖర్ రెడ్డి': 'YS Rajasekhara Reddy',
  'రాజశేఖర రెడ్డి': 'YS Rajasekhara Reddy',
  'వైఎస్ వివేకానంద రెడ్డి': 'YS Vivekananda Reddy',
  'వివేకానంద రెడ్డి': 'YS Vivekananda Reddy',
  'వైఎస్ భారతి': 'YS Bharathi',
  'శర్మిల': 'YS Sharmila',
  'వైఎస్ శర్మిల': 'YS Sharmila',
  'బొత్స సత్యనారాయణ': 'Botsa Satyanarayana',
  'అంబటి రాంబాబు': 'Ambati Rambabu',
  'కోడలి నాని': 'Kodali Nani',
  'రోజా రాజకీయవేత్త': 'RK Roja',
  'ఆర్కే రోజా': 'RK Roja',
  'విడదల రజని': 'Vidadala Rajini',
  'పేర్ని నాని': 'Perni Nani',
  'గుడివాడ అమర్నాథ్': 'Gudivada Amarnath',
  'ధర్మాన కృష్ణదాస్': 'Dharmana Krishnadas',
  'మేకపాటి గౌతమ్ రెడ్డి': 'Mekapati Goutham Reddy',
  'అచ్చెన్నాయుడు': 'Atchannaidu',
  'దేవినేని ఉమామహేశ్వరరావు': 'Devineni Uma',
  'దేవినేని ఉమ': 'Devineni Uma',
  'కొల్లు రవీంద్ర': 'Kollu Ravindra',
  'గల్లా జయదేవ్': 'Galla Jayadev',
  'నారా బ్రహ్మణి': 'Nara Brahmani',
  'ఎన్ టీ రామారావు జూనియర్ రాజకీయం': 'Jr NTR Politics',

  // ============================================================
  // POLITICIANS - NATIONAL
  // ============================================================
  'మోడీ': 'Narendra Modi',
  'నరేంద్ర మోడీ': 'Narendra Modi',
  'ప్రధాని మోడీ': 'Narendra Modi',
  'రాహుల్ గాంధీ': 'Rahul Gandhi',
  'సోనియా గాంధీ': 'Sonia Gandhi',
  'ప్రియాంక గాంధీ': 'Priyanka Gandhi',
  'అమిత్ షా': 'Amit Shah',
  'జేపీ నడ్డా': 'JP Nadda',
  'నితిన్ గడ్కరీ': 'Nitin Gadkari',
  'రాజ్‌నాథ్ సింగ్': 'Rajnath Singh',
  'యోగి ఆదిత్యనాథ్': 'Yogi Adityanath',
  'మమతా బెనర్జీ': 'Mamata Banerjee',
  'అరవింద్ కేజ్రీవాల్': 'Arvind Kejriwal',
  'కేజ్రీవాల్': 'Arvind Kejriwal',
  'మల్లికార్జున్ ఖర్గే': 'Mallikarjun Kharge',
  'ద్రౌపది ముర్ము': 'Droupadi Murmu',
  'రాష్ట్రపతి': 'President of India',
  'ప్రధానమంత్రి': 'Prime Minister',

  // ============================================================
  // POLITICIANS - HISTORIC TELUGU LEADERS
  // ============================================================
  'విజయశాంతి రాజకీయవేత్త': 'Vijayashanti Politician',
  'చిరంజీవి రాజకీయం': 'Chiranjeevi politics',
  'ప్రజారాజ్యం': 'Praja Rajyam',
  'ఎన్టీఆర్ రాజకీయం': 'NTR Politics',
  'పీవీ నరసింహారావు': 'PV Narasimha Rao',
  'పివి': 'PV Narasimha Rao',
  'పీవీఆర్': 'PV Narasimha Rao',
  'మర్రి చెన్నారెడ్డి': 'Marri Chenna Reddy',
  'ఎన్టీ రామారావు ముఖ్యమంత్రి': 'NTR as CM',
  'కాసు బ్రహ్మానందరెడ్డి': 'Kasu Brahmananda Reddy',
  'టి అంజయ్య': 'T Anjaiah',
  'జలగం వెంగళరావు': 'Jalagam Vengal Rao',
  'భవనం వెంకట్రామ్': 'Bhavanam Venkatram',
  'నాదెండ్ల భాస్కరరావు': 'Nadendla Bhaskara Rao',
  'కోట్ల విజయభాస్కరరెడ్డి': 'Kotla Vijaya Bhaskara Reddy',
  'నేదురుమల్లి జనార్దన్ రెడ్డి': 'Nedurumalli Janardhana Reddy',
  'చంద్రబాబు రాజకీయం': 'Chandrababu Politics',
  'రోశయ్య': 'K Rosaiah',
  'కె రోశయ్య': 'K Rosaiah',
  'కిరణ్ కుమార్ రెడ్డి': 'Kiran Kumar Reddy',
  'ఎన్ కిరణ్ కుమార్ రెడ్డి': 'N Kiran Kumar Reddy',

  // ============================================================
  // CRICKETERS
  // ============================================================
  'విరాట్ కోహ్లీ': 'Virat Kohli',
  'కోహ్లీ': 'Virat Kohli',
  'ధోనీ': 'MS Dhoni',
  'మహేంద్ర సింగ్ ధోనీ': 'MS Dhoni',
  'ఎంఎస్ ధోనీ': 'MS Dhoni',
  'రోహిత్ శర్మ': 'Rohit Sharma',
  'హిట్మ్యాన్': 'Rohit Sharma',
  'బుమ్రా': 'Jasprit Bumrah',
  'జస్ప్రిత్ బుమ్రా': 'Jasprit Bumrah',
  'హార్దిక్ పాండ్య': 'Hardik Pandya',
  'పాండ్య': 'Hardik Pandya',
  'రిషభ్ పంత్': 'Rishabh Pant',
  'పంత్': 'Rishabh Pant',
  'కేఎల్ రాహుల్': 'KL Rahul',
  'శుభ్మన్ గిల్': 'Shubman Gill',
  'గిల్': 'Shubman Gill',
  'శ్రేయస్ అయ్యర్': 'Shreyas Iyer',
  'సూర్యకుమార్ యాదవ్': 'Suryakumar Yadav',
  'ఎస్కేవై': 'Suryakumar Yadav',
  'రవీంద్ర జడేజా': 'Ravindra Jadeja',
  'జడేజా': 'Ravindra Jadeja',
  'అశ్విన్': 'R Ashwin',
  'రవిచంద్రన్ అశ్విన్': 'R Ashwin',
  'సచిన్': 'Sachin Tendulkar',
  'సచిన్ టెండూల్కర్': 'Sachin Tendulkar',
  'గంగూలీ': 'Sourav Ganguly',
  'ద్రావిడ్': 'Rahul Dravid',
  'కుంబ్లే': 'Anil Kumble',
  'శ్రీశాంత్': 'Sreesanth',
  'యువరాజ్': 'Yuvraj Singh',
  'యువరాజ్ సింగ్': 'Yuvraj Singh',
  'హర్భజన్': 'Harbhajan Singh',
  'డేవిడ్ వార్నర్': 'David Warner',
  'వార్నర్': 'David Warner',
  'విలియమ్సన్': 'Kane Williamson',
  'స్టీవ్ స్మిత్': 'Steve Smith',
  'బాబర్ ఆజం': 'Babar Azam',

  // ============================================================
  // TV PERSONALITIES
  // ============================================================
  'సుమ': 'Suma Kanakala',
  'సుమ కనకాల': 'Suma Kanakala',
  'నాగినీడు': 'Nagineedu',
  'రవి': 'Ravi Anchor',
  'ఆంకర్ రవి': 'Ravi Anchor',
  'ఆంకర్ ప్రదీప్': 'Pradeep Machiraju',
  'ప్రదీప్ మచిరాజు': 'Pradeep Machiraju',
  'ఆంకర్ లాస్య': 'Lasya',
  'లాస్య': 'Lasya',
  'రశ్మీ గౌతమ్': 'Rashmi Gautam',
  'రశ్మీ': 'Rashmi Gautam',
  'అనసూయ': 'Anasuya Bharadwaj',
  'అనసూయ భరద్వాజ్': 'Anasuya Bharadwaj',
  'శ్యామల': 'Anchor Shyamala',
  'జబర్దస్త్': 'Jabardasth',
  'అలీ జబర్దస్త్': 'Jabardasth',
  'సుదిగాలి సుధీర్': 'Sudigali Sudheer',
  'చంద్రమౌళి': 'Chandramouli',
  'చలాకి చంద్రమౌళి': 'Chalaki Chanti',

  // ============================================================
  // BUSINESS & TECH
  // ============================================================
  'రతన్ టాటా': 'Ratan Tata',
  'టాటా': 'Ratan Tata',
  'ముఖేష్ అంబానీ': 'Mukesh Ambani',
  'అంబానీ': 'Mukesh Ambani',
  'గౌతమ్ అదానీ': 'Gautam Adani',
  'అదానీ': 'Gautam Adani',
  'సుందర్ పిచాయ్': 'Sundar Pichai',
  'సత్య నాడెళ్ల': 'Satya Nadella',
  'ఎలన్ మస్క్': 'Elon Musk',
  'మస్క్': 'Elon Musk',

  // ============================================================
  // YOUTUBERS & DIGITAL CREATORS
  // ============================================================
  'మహేష్ మచిడి': 'Mahesh Machidi',
  'శ్రీనివాస్ అయ్యర్': 'My Village Show',
  'మై విలేజ్ షో': 'My Village Show',
  'వివా హర్ష': 'Viva Harsha',
  'వివా': 'Viva',
  'దేథాడి హరీష్': 'Dethadi Haresh',
  'దేథాడి': 'Dethadi',
  'టీమ్ మాంగో': 'Team Mango',
  'పింక్ విల్లా తెలుగు': 'Pinkvilla Telugu',
  'ఉపాసన కామినేని': 'Upasana Kamineni',
  'ఉపాసన': 'Upasana Kamineni',
  'తెలుగు టెక్ టుబ్': 'Telugu Tech Tub',
  'డబ్ స్మ్యాష్ లక్ష్మి': 'Dubsmash Lakshmi',
  'జబర్దస్త్ అవినాష్': 'Avinash',
  'జబర్దస్త్ కొట్టి': 'Jabardasth Kotti',

  // ============================================================
  // WEB SERIES ACTORS
  // ============================================================
  'ఆకాష్ పూరి': 'Akash Puri',
  'నవీన్ నేని': 'Naveen Neni',
  'శ్వేత బసు ప్రసాద్': 'Shweta Basu Prasad',
  'శ్వేత బసు': 'Shweta Basu Prasad',

  // ============================================================
  // BIGG BOSS TELUGU CONTESTANTS
  // ============================================================
  'కౌశల్': 'Kaushal Manda',
  'కౌశల్ మండ': 'Kaushal Manda',
  'కౌశల్ ఆర్మీ': 'Kaushal Army',
  'శ్రీముఖి': 'Sreemukhi',
  'సిరి హానుమంతు': 'Siri Hanmanth',
  'సిరి బిగ్ బాస్': 'Siri Hanmanth',
  'షణ్ముఖ్ జస్వంత్': 'Shanmukh Jaswanth',
  'షణ్ముఖ్': 'Shanmukh Jaswanth',
  'సోహెల్': 'Sohel',
  'అఖిల్ సార్తాక్': 'Akhil Sarthak',
  'మోనాల్ గజ్జర్': 'Monal Gajjar',
  'మోనాల్': 'Monal Gajjar',
  'అరియానా గ్లోరీ': 'Ariyana Glory',
  'అరియానా': 'Ariyana Glory',
  'దివి': 'Divi Vadthya',
  'దివి వద్త్య': 'Divi Vadthya',
  'మేఘా': 'Megha Chowdary',
  'ఆశు': 'Ashu Reddy',
  'ఆశు రెడ్డి': 'Ashu Reddy',
  'శ్రీ రపాక': 'Shree Rapaka',
  'తెజస్వి': 'Tejaswi Madivada',
  'తెజస్వి మాడివాడ': 'Tejaswi Madivada',
  'హారిక': 'Harika Bigg Boss',
  'అభిజీత్': 'Abhijeet',
  'నాగార్జున బిగ్ బాస్': 'Nagarjuna Host',

  // ============================================================
  // TV SERIAL ACTORS
  // ============================================================
  'పావని': 'Pavani',
  'కార్తీక దీపం పావని': 'Karthika Deepam Pavani',
  'శ్రావణి': 'Shravani Serial',
  'నందిని సీరియల్': 'Nandini Serial Actress',
  'నవ్య': 'Navya Serial',
  'హిమబిందు': 'Himabindu',

  // ============================================================
  // STAND-UP COMEDIANS & RJS
  // ============================================================
  'ఆర్జే శివ': 'RJ Shiva',
  'ఆర్జే సూర్య': 'RJ Surya',
  'ఆర్జే మహేష్': 'RJ Mahesh',
  'బిగ్ ఎఫ్ఎం తెలుగు': 'Big FM Telugu',
  'రేడియో మిర్చి': 'Radio Mirchi Telugu',

  // ============================================================
  // JOURNALISTS & NEWS ANCHORS
  // ============================================================
  'రాజినీకాంత్': 'Rajinikanth TV9',
  'టీవీ9 రవిప్రకాష్': 'Ravi Prakash TV9',
  'రవిప్రకాష్': 'Ravi Prakash',
  'మురళీకృష్ణ': 'Murali Krishna ABN',
  'ఏబీఎన్ మురళి': 'Murali Krishna ABN',
  'రాధాకృష్ణ': 'Radhakrishna NTV',
  'టీవీ5 సమ్బశివరావు': 'Sambasiva Rao TV5',
  'సమ్బశివరావు': 'Sambasiva Rao',
  'సాక్షి టీవీ': 'Sakshi TV',
  'ఈటీవీ': 'ETV',
  'జీ తెలుగు': 'Zee Telugu',
  'మా టీవీ': 'Maa TV',
  'స్టార్ మా': 'Star Maa',

  // ============================================================
  // SOCIAL MEDIA INFLUENCERS
  // ============================================================
  'నిహారిక కొణిదెల': 'Niharika Konidela',
  'నిహారిక': 'Niharika Konidela',
  'దీక్షా పాండే': 'Deeksha Panday',

  // ============================================================
  // CROSS-INDUSTRY ACTORS (Tamil/Kannada in Telugu)
  // ============================================================
  'రజనీకాంత్': 'Rajinikanth',
  'కమల్ హాసన్': 'Kamal Haasan',
  'కమలహాసన్': 'Kamal Haasan',
  'అజిత్': 'Ajith Kumar',
  'అజిత్ కుమార్': 'Ajith Kumar',
  'తళపతి విజయ్': 'Thalapathy Vijay',
  'విజయ్ తళపతి': 'Thalapathy Vijay',
  'శివకార్తికేయన్': 'Sivakarthikeyan',
  'జయం రవి': 'Jayam Ravi',
  'విశాల్': 'Vishal',
  'ఆర్య': 'Arya',
  'సింబు': 'Simbu',
  'ఎస్టీఆర్': 'STR Simbu',
  'యష్': 'Yash',
  'రాకింగ్ స్టార్ యష్': 'Rocking Star Yash',
  'పునీత్ రాజ్‌కుమార్': 'Puneeth Rajkumar',
  'దర్శన్': 'Darshan',
  'కిచ్చా సుదీప్': 'Kiccha Sudeep',
  'రక్షిత్ శెట్టి': 'Rakshit Shetty',
  'మోహన్‌లాల్': 'Mohanlal',
  'మమ్ముట్టి': 'Mammootty',
  'దుల్కర్ సల్మాన్': 'Dulquer Salmaan',
  'దుల్కర్': 'Dulquer Salmaan',
  'టోవినో థామస్': 'Tovino Thomas',
  'ప్రితివిరాజ్ సుకుమారన్': 'Prithviraj Sukumaran',
  'జ్యోతిక': 'Jyothika',

  // ============================================================
  // SPORTS (BEYOND CRICKET)
  // ============================================================
  'పీవీ సింధు': 'PV Sindhu',
  'సింధు బ్యాడ్మింటన్': 'PV Sindhu',
  'సైనా నెహ్వాల్': 'Saina Nehwal',
  'సైనా': 'Saina Nehwal',
  'కిదంబి శ్రీకాంత్': 'Kidambi Srikanth',
  'మేరీ కోమ్': 'Mary Kom',
  'నీరజ్ చోప్రా': 'Neeraj Chopra',
  'మిరాబాయి చాను': 'Mirabai Chanu',
  'వినేష్ ఫోగట్': 'Vinesh Phogat',
  'సానియా మిర్జా': 'Sania Mirza',
  'సానియా': 'Sania Mirza',
  'సురేష్ రైనా': 'Suresh Raina',
  'రైనా': 'Suresh Raina',
  'అంబటి రాయుడు': 'Ambati Rayudu',
  'రాయుడు': 'Ambati Rayudu',
  'హనుమ విహారి': 'Hanuma Vihari',
  'విహారి': 'Hanuma Vihari',
  'వీవీఎస్ లక్ష్మణ్': 'VVS Laxman',
  'లక్ష్మణ్': 'VVS Laxman',

  // ============================================================
  // TOLLYWOOD CHOREOGRAPHERS
  // ============================================================
  'ప్రభుదేవా': 'Prabhu Deva',
  'ప్రభు దేవా': 'Prabhu Deva',
  'రాజు సుందరం': 'Raju Sundaram',
  'బ్రిందా': 'Brinda',
  'శేఖర్ మాస్టర్': 'Sekhar Master',
  'జాణీ మాస్టర్': 'Jani Master',
  'జాణి మాస్టర్': 'Jani Master',
  'లారెన్స్': 'Lawrence',
  'రాఘవ లారెన్స్': 'Raghava Lawrence',
  'గణేష్ ఆచార్య': 'Ganesh Acharya',

  // ============================================================
  // CINEMATOGRAPHERS
  // ============================================================
  'సెంథిల్ కుమార్': 'Senthil Kumar',
  'కేకే సెంథిల్ కుమార్': 'KK Senthil Kumar',
  'రత్నవేలు': 'Rathnavelu',
  'పీసీ శ్రీరామ్': 'PC Sreeram',
  'సంతోష్ శివన్': 'Santosh Sivan',
  'రాసూల్ ఎల్లోర్': 'Rasool Ellore',
  'పీఎస్ వినోద్': 'PS Vinod',

  // ============================================================
  // EDITORS
  // ============================================================
  'కోటగిరి వెంకటేశ్వరరావు': 'Kotagiri Venkateswara Rao',
  'నవీన్ నూలి': 'Naveen Nooli',
  'శ్రీకర్ ప్రసాద్': 'Sreekar Prasad',

  // ============================================================
  // STUNT DIRECTORS
  // ============================================================
  'పీటర్ హీన్స్': 'Peter Hein',
  'రామ్-లక్ష్మణ్': 'Ram Lakshman',
  'అనల్ అరసు': 'Anal Arasu',

  // ============================================================
  // MORE MODERN HEROES (2010s-2020s)
  // ============================================================
  'శశాంక్': 'Shashank',
  'తరుణ్': 'Tarun',
  'ఉదయ్ కిరణ్': 'Uday Kiran',
  'సిద్దార్థ్ రాజ్': 'Siddharth',
  'జీవా హీరో': 'Jiiva',
  'విశ్వ': 'Vishwa',
  'హర్ష': 'Harsha',
  'తనిష్': 'Tanish',
  'అల్లరి నరేష్': 'Allari Naresh',
  'నరేష్': 'Allari Naresh',
  'సంపత్ నంది': 'Sampath Nandi',

  // ============================================================
  // MORE HEROINES (Complete Coverage)
  // ============================================================
  'తాప్సీ': 'Taapsee Pannu',
  'తాప్సీ పన్ను': 'Taapsee Pannu',
  'ప్రియామణి': 'Priyamani',
  'ప్రియ మణి': 'Priyamani',
  'నందితా దాస్': 'Nandita Das',
  'రమ్య': 'Ramya',
  'మమతా మోహన్ దాస్': 'Mamta Mohandas',
  'రీమా సేన్': 'Rimi Sen',
  'భామా': 'Bhama',
  'అసిన్': 'Asin',
  'అసిన్ తోట్టుంకల్': 'Asin Thottumkal',
  'స్నేహ': 'Sneha',
  'స్నేహా': 'Sneha',
  'సింధు మేనన్': 'Sindhu Menon',
  'సింధూ తులాని': 'Sindhu Tolani',
  'ఛార్మి': 'Charmi',
  'ఛార్మీ': 'Charmi',
  'మాధవి లత': 'Madhavi Latha',
  'మధుశాలిని': 'Madhu Shalini',
  'షీలా': 'Sheela',
  'అనీషా అంబరోస్': 'Aneesha Ambrose',
  'సిమ్రాన్': 'Simran',
  'సిమ్రన్ భాగ్గా': 'Simran Bagga',
  'జెనీలియా': 'Genelia',
  'నిషా అగర్వాల్': 'Nisha Agarwal',
  'వాణి కపూర్': 'Vaani Kapoor',
  'ఆలియా భట్': 'Alia Bhatt',
  'దీపికా పడుకోన్': 'Deepika Padukone',
  'దీపిక': 'Deepika Padukone',
  'కరీనా కపూర్': 'Kareena Kapoor',
  'కత్రినా కైఫ్': 'Katrina Kaif',
  'అనుష్కా శర్మ': 'Anushka Sharma',
  'ప్రియాంక చోప్రా': 'Priyanka Chopra',
  'శ్రద్ధా కపూర్': 'Shraddha Kapoor',

  // ============================================================
  // MORE DIRECTORS
  // ============================================================
  'భీమ్‌నేని శ్రీనివాసరావు': 'Bheemaneni Srinivasa Rao',
  'కృష్ణ వంశీ': 'Krishna Vamsi',
  'మాధురవాడ': 'Muthyala Subbaiah',
  'కె.ఎస్.రవికుమార్': 'KS Ravikumar',
  'వినయక్': 'Vinayak',
  'ధర్మవరపు': 'Dharma',
  'నాదెండ్ల వంశీ': 'Nadendla Vamsy',
  'అక్కినేని నాగేశ్వరరావు డైరెక్టర్': 'ANR Director',
  'బి.వి.రెడ్డి': 'BV Reddy',
  'ఎల్.వి.ప్రసాద్ డైరెక్టర్': 'LV Prasad',
  'భరతన్': 'Bharathan',
  'బాలచందర్': 'K Balachander',
  'కె. బాలచందర్': 'K Balachander',
  'భగ్యరాజ్': 'Bhagyaraj',
  'వెట్రిమారన్': 'Vetrimaaran',
  'లోకేష్ కనగరాజ్': 'Lokesh Kanagaraj',
  'అట్లీ': 'Atlee',
  'అట్లీ కుమార్': 'Atlee',
  'నేల్సన్ దిలీప్ కుమార్': 'Nelson Dilipkumar',

  // ============================================================
  // MORE MUSIC DIRECTORS & COMPOSERS
  // ============================================================
  'విద్యాసాగర్ కంపోజర్': 'Vidyasagar',
  'శ్రావణ్భర్గవ్': 'Shravan',
  'నందేమూరి': 'Nandamuri',
  'వి.హరికృష్ణ': 'V Harikrishna',
  'గురు కిరణ్': 'Gurukiran',
  'దేవ గిల్': 'Dev Gill',
  'ప్రవీణ్ లక్కరాజు': 'Praveen Lakkaraju',
  'రత్న శ్రీ': 'Ratna Sree',
  'రామన్ భారద్వాజ్': 'Raman Bharadwaj',
  'శేఖర్ చంద్ర': 'Sekhar Chandra',
  'సురేష్ బొబ్బిలి': 'Suresh Bobbili',
  'అశ్వని దత్': 'Ashwini Dutt',

  // ============================================================
  // MORE SINGERS
  // ============================================================
  'ఉషా సింగర్': 'Usha',
  'కోసల్య': 'Kousalya',
  'రంజిత్ సింగర్': 'Ranjith',
  'దీపూ': 'Deepu',
  'హేమచంద్ర సింగర్': 'Hema Chandra',
  'అంజనా సౌమ్య': 'Anjana Sowmya',
  'దామిని భట్లా': 'Damini Bhatla',
  'సత్య యామిని': 'Satya Yamini',
  'హరికా నారాయణ్': 'Harika Narayan',
  'మౌనిక యాదవ్': 'Mounika Yadav',
  'సాహితీ చాగంటి': 'Sahithi Chaganti',
  'రమ్య బెహ్రా': 'Ramya Behara',
  'అదితి భవరాజు': 'Aditi Bhavaraju',
  'ఎల్వి రేవంత్': 'LV Revanth',
  'మంగ్లి సింగర్': 'Mangli',
  'చిన్మయి సింగర్': 'Chinmayi',

  // ============================================================
  // OTHERS
  // ============================================================
  'నందిని': 'Nandini actress',
  'శివాజీ': 'Sivaji actor',
  'భాగ్యశ్రీ': 'Bhagyashree',
  'సురేష్ ప్రొడక్షన్స్': 'Suresh Productions',
};

// ============================================================
// KNOWN CELEBRITIES LIST (For matching)
// ============================================================

export const TELUGU_CELEBRITIES: string[] = [
  // ============================================================
  // GOLDEN ERA LEGENDS (1930s-1970s)
  // ============================================================
  'NTR Sr', 'Akkineni Nageswara Rao', 'Ghantasala', 'SV Ranga Rao', 'Relangi',
  'Savitri', 'Bhanumathi', 'Anjali Devi', 'Krishna Kumari', 'Showkar Janaki',
  'Suryakantham', 'Rajasulochana', 'Gummadi', 'Nagabhushanam', 'Chittoor Nagaiah',
  'Mukkamala', 'Rajanala', 'Padmanabham', 'Allu Ramalingaiah', 'Rao Gopal Rao',
  'Dhulipala', 'Kaikala Satyanarayana',

  // ============================================================
  // SILVER ERA LEGENDS (1970s-1990s)
  // ============================================================
  'Superstar Krishna', 'Sobhan Babu', 'Krishnam Raju', 'Jaggayya', 'Kanta Rao',
  'D Ramanaidu', 'Dasari Narayana Rao', 'Vijaya Nirmala', 'Jamuna', 'Vanisri',
  'Jayasudha', 'Jayaprada', 'Sridevi', 'Silk Smitha', 'Vijayashanti',
  'Ramya Krishna', 'Soundarya', 'Divya Bharti', 'Roja', 'Rambha', 'Meena',
  'Radhika Sarathkumar', 'Suman', 'Rajasekhar', 'Bhanu Chander',

  // ============================================================
  // MEGA FAMILY
  // ============================================================
  'Chiranjeevi', 'Pawan Kalyan', 'Ram Charan', 'Varun Tej', 'Sai Dharam Tej',
  'Allu Arjun', 'Allu Sirish', 'Nagababu', 'Allu Aravind', 'Allu Bobby',

  // ============================================================
  // NANDAMURI FAMILY
  // ============================================================
  'Jr NTR', 'Nandamuri Balakrishna', 'Nandamuri Kalyan Ram', 'Harikrishna',
  'Mohan Babu', 'Manchu Vishnu', 'Manchu Manoj', 'Manchu Lakshmi',

  // ============================================================
  // AKKINENI FAMILY
  // ============================================================
  'Nagarjuna', 'Naga Chaitanya', 'Akhil Akkineni', 'Sumanth', 'Sumanth Ashwin',

  // ============================================================
  // DAGGUBATI FAMILY
  // ============================================================
  'Venkatesh', 'Rana Daggubati', 'Suresh Babu',

  // ============================================================
  // TOP HEROES (2000s+)
  // ============================================================
  'Mahesh Babu', 'Prabhas', 'Vijay Deverakonda', 'Nani', 'Ravi Teja', 'Nithin',
  'Sharwanand', 'Siddharth', 'Sudheer Babu', 'Naveen Polishetty', 'Raj Tarun',
  'Adivi Sesh', 'Vishwak Sen', 'Naga Shaurya', 'Sundeep Kishan',
  'Bellamkonda Sreenivas', 'Ashok Galla', 'Karthikeya', 'Nikhil Siddharth',
  'Satyadev', 'Priyadarshi', 'Rahul Ramakrishna', 'Naveen Chandra',
  'Jagapathi Babu', 'Prakash Raj', 'Satyaraj', 'Saikumar', 'Nassar',

  // ============================================================
  // PAN-INDIAN STARS
  // ============================================================
  'Vijay Sethupathi', 'Dhanush', 'Fahadh Faasil', 'Suriya', 'Vikram', 'Karthi',

  // ============================================================
  // TOP HEROINES (MODERN)
  // ============================================================
  'Samantha Ruth Prabhu', 'Rashmika Mandanna', 'Pooja Hegde', 'Anushka Shetty',
  'Tamannaah Bhatia', 'Sai Pallavi', 'Keerthy Suresh', 'Kajal Aggarwal',
  'Rakul Preet Singh', 'Sreeleela', 'Nayanthara', 'Trisha', 'Hansika Motwani',
  'Shruti Haasan', 'Kiara Advani', 'Malavika Mohanan', 'Krithi Shetty',
  'Mrunal Thakur', 'Shraddha Srinath', 'Lavanya Tripathi',
  'Raashi Khanna', 'Ritika Singh', 'Regina Cassandra', 'Nabha Natesh',
  'Amala Paul', 'Anjali', 'Bhumika Chawla', 'Aishwarya Rajesh', 'Shriya Saran',
  'Ileana D Cruz', 'Adah Sharma', 'Payal Rajput', 'Meera Jasmine',
  'Genelia D Souza', 'Nithya Menen',

  // ============================================================
  // DIRECTORS - LEGENDARY
  // ============================================================
  'B Vittalacharya', 'BN Reddy', 'LV Prasad', 'Bapu', 'K Raghavendra Rao',
  'K Vishwanath', 'A Kodandarami Reddy', 'Vamsy', 'Jandhyala',
  'EVV Satyanarayana', 'Singeetham Srinivasa Rao',

  // ============================================================
  // DIRECTORS - MODERN
  // ============================================================
  'SS Rajamouli', 'Sukumar', 'Trivikram Srinivas', 'Gunasekhar', 'Koratala Siva',
  'Ram Gopal Varma', 'Puri Jagannadh', 'Boyapati Srinu', 'Harish Shankar',
  'Anil Ravipudi', 'Vamshi Paidipally', 'Prashanth Neel', 'Gopichand Malineni',
  'Sreenu Vaitla', 'VV Vinayak', 'AR Murugadoss', 'Shankar', 'Mani Ratnam',
  'Gowtam Tinnanuri', 'Sekhar Kammula', 'Nag Ashwin', 'Venu Sriram',
  'Parasuram', 'Maruthi', 'Venky Atluri', 'Sujeeth', 'Sudha Kongara',
  'Sandeep Reddy Vanga', 'Teja', 'Buchi Babu Sana', 'Hanu Raghavapudi',

  // ============================================================
  // MUSIC DIRECTORS - LEGENDARY
  // ============================================================
  'Pendyala Nageswara Rao', 'Saluri Rajeswara Rao', 'T Chalapathi Rao',
  'Kodandapani', 'Master Venu', 'Ilaiyaraaja', 'MM Keeravani', 'Chakri',
  'Koti', 'Vidyasagar', 'Mani Sharma', 'RP Patnaik', 'Vandemataram Srinivas',

  // ============================================================
  // MUSIC DIRECTORS - MODERN
  // ============================================================
  'Devi Sri Prasad', 'SS Thaman', 'Anirudh Ravichander', 'AR Rahman',
  'Mickey J Meyer', 'Harris Jayaraj', 'Yuvan Shankar Raja', 'Gibran',
  'Sid Sriram', 'Vivek Sagar', 'Kaala Bhairava', 'Hesham Abdul Wahab',

  // ============================================================
  // SINGERS - LEGENDARY
  // ============================================================
  'Ghantasala', 'SP Balasubrahmanyam', 'SP Sailaja', 'P Susheela', 'S Janaki',
  'KJ Yesudas', 'KS Chithra', 'MS Subbulakshmi', 'Balamurali Krishna',
  'Hariharan', 'Mano', 'Udit Narayan', 'Kumar Sanu', 'Lata Mangeshkar',

  // ============================================================
  // SINGERS - MODERN
  // ============================================================
  'Chinmayi Sripaada', 'Mangli', 'Shreya Ghoshal', 'Sunitha Upadrashta',
  'Karthik', 'Shankar Mahadevan', 'Sonu Nigam', 'Arijit Singh',
  'Geetha Madhuri', 'Roll Rida', 'Vijay Prakash',

  // ============================================================
  // LYRICISTS
  // ============================================================
  'Sirivennela Sitaramasastri', 'Veturi', 'Acharya Athreya', 'Kosaraju',
  'Chandrabose', 'Ramajogayya Sastry', 'Anantha Sriram',

  // ============================================================
  // COMEDIANS
  // ============================================================
  'Brahmanandam', 'Ali', 'Sunil', 'MS Narayana', 'Dharmavarapu Subramanyam',
  'Venu Madhav', 'Jayaprakash Reddy', 'Prabhas Sreenu', 'Shakalaka Shankar',
  'Saptagiri', 'Posani Krishna Murali', 'Tanikella Bharani', 'Raghu Babu',
  'Thagubothu Ramesh', 'Vennela Kishore', 'Satya', 'Hyper Aadi',
  'Rajendra Prasad', 'Kovai Sarala',

  // ============================================================
  // PRODUCERS
  // ============================================================
  'Dil Raju', 'Allu Aravind', 'Bandla Ganesh', 'DVV Danayya', 'Naga Vamsi',
  'Shobu Yarlagadda', 'Y Ravi Shankar', 'Naveen Yerneni', 'Suresh Babu Daggubati',

  // ============================================================
  // POLITICIANS - TELANGANA
  // ============================================================
  'K Chandrashekar Rao', 'KT Rama Rao', 'Revanth Reddy', 'Harish Rao',
  'Etela Rajender', 'K Kavitha', 'Bandi Sanjay Kumar', 'G Kishan Reddy',
  'Asaduddin Owaisi', 'Akbaruddin Owaisi', 'Uttam Kumar Reddy',

  // ============================================================
  // POLITICIANS - ANDHRA PRADESH
  // ============================================================
  'N Chandrababu Naidu', 'YS Jagan Mohan Reddy', 'Nara Lokesh',
  'YS Rajasekhara Reddy', 'YS Sharmila', 'RK Roja', 'Botsa Satyanarayana',
  'Ambati Rambabu', 'Kodali Nani', 'Mekapati Goutham Reddy',

  // ============================================================
  // POLITICIANS - NATIONAL
  // ============================================================
  'Narendra Modi', 'Rahul Gandhi', 'Amit Shah', 'Yogi Adityanath',
  'Mamata Banerjee', 'Arvind Kejriwal', 'Mallikarjun Kharge',

  // ============================================================
  // POLITICIANS - HISTORIC
  // ============================================================
  'PV Narasimha Rao', 'Marri Chenna Reddy', 'T Anjaiah', 'K Rosaiah',
  'N Kiran Kumar Reddy', 'Kotla Vijaya Bhaskara Reddy',

  // ============================================================
  // CRICKETERS - CURRENT
  // ============================================================
  'Virat Kohli', 'Rohit Sharma', 'Jasprit Bumrah', 'Hardik Pandya',
  'Rishabh Pant', 'KL Rahul', 'Shubman Gill', 'Shreyas Iyer', 'Suryakumar Yadav',
  'Ravindra Jadeja', 'R Ashwin', 'Mohammed Shami', 'Kuldeep Yadav',

  // ============================================================
  // CRICKETERS - LEGENDS
  // ============================================================
  'MS Dhoni', 'Sachin Tendulkar', 'Sourav Ganguly', 'Rahul Dravid',
  'Anil Kumble', 'Sreesanth', 'Yuvraj Singh', 'Harbhajan Singh',
  'VVS Laxman', 'Virender Sehwag', 'Kapil Dev',

  // ============================================================
  // CRICKETERS - INTERNATIONAL
  // ============================================================
  'David Warner', 'Kane Williamson', 'Steve Smith', 'Babar Azam',
  'Ben Stokes', 'Joe Root', 'Pat Cummins', 'Mitchell Starc',

  // ============================================================
  // TV PERSONALITIES
  // ============================================================
  'Suma Kanakala', 'Nagineedu', 'Ravi Anchor', 'Pradeep Machiraju', 'Lasya',
  'Rashmi Gautam', 'Anasuya Bharadwaj', 'Anchor Shyamala', 'Sudigali Sudheer',

  // ============================================================
  // BUSINESS & TECH
  // ============================================================
  'Ratan Tata', 'Mukesh Ambani', 'Gautam Adani', 'Sundar Pichai',
  'Satya Nadella', 'Elon Musk', 'Jeff Bezos', 'Mark Zuckerberg',

  // ============================================================
  // YOUTUBERS & DIGITAL CREATORS
  // ============================================================
  'My Village Show', 'Viva Harsha', 'Dethadi', 'Team Mango',
  'Upasana Kamineni', 'Avinash', 'Niharika Konidela',

  // ============================================================
  // WEB SERIES & OTT ACTORS
  // ============================================================
  'Akash Puri', 'Shweta Basu Prasad',

  // ============================================================
  // BIGG BOSS TELUGU CONTESTANTS
  // ============================================================
  'Kaushal Manda', 'Sreemukhi', 'Siri Hanmanth', 'Shanmukh Jaswanth',
  'Sohel', 'Akhil Sarthak', 'Monal Gajjar', 'Ariyana Glory',
  'Divi Vadthya', 'Ashu Reddy', 'Tejaswi Madivada', 'Abhijeet',

  // ============================================================
  // NEWS & MEDIA
  // ============================================================
  'Ravi Prakash TV9', 'Murali Krishna ABN', 'Sambasiva Rao',

  // ============================================================
  // CROSS-INDUSTRY STARS
  // ============================================================
  'Rajinikanth', 'Kamal Haasan', 'Ajith Kumar', 'Thalapathy Vijay',
  'Sivakarthikeyan', 'Yash', 'Puneeth Rajkumar', 'Kiccha Sudeep',
  'Mohanlal', 'Mammootty', 'Dulquer Salmaan', 'Prithviraj Sukumaran',

  // ============================================================
  // SPORTS (BEYOND CRICKET)
  // ============================================================
  'PV Sindhu', 'Saina Nehwal', 'Kidambi Srikanth', 'Mary Kom',
  'Neeraj Chopra', 'Mirabai Chanu', 'Sania Mirza', 'VVS Laxman',
  'Ambati Rayudu', 'Hanuma Vihari', 'Suresh Raina',

  // ============================================================
  // CHOREOGRAPHERS
  // ============================================================
  'Prabhu Deva', 'Sekhar Master', 'Jani Master', 'Raghava Lawrence',

  // ============================================================
  // TECHNICIANS
  // ============================================================
  'KK Senthil Kumar', 'Rathnavelu', 'PC Sreeram', 'Santosh Sivan',
  'Kotagiri Venkateswara Rao', 'Naveen Nooli', 'Peter Hein',
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Extract celebrity name from text (supports Telugu and English)
 */
export function extractCelebrityName(text: string): string | null {
  // First check Telugu name mappings (more specific)
  for (const [teluguName, englishName] of Object.entries(TELUGU_NAME_MAP)) {
    if (text.includes(teluguName)) {
      return englishName;
    }
  }

  const lowerText = text.toLowerCase();

  // Check English celebrity names
  for (const celeb of TELUGU_CELEBRITIES) {
    // Check for exact match
    if (lowerText.includes(celeb.toLowerCase())) {
      return celeb;
    }

    // Check first name only for unique names
    const firstName = celeb.split(' ')[0];
    if (firstName.length >= 5 && lowerText.includes(firstName.toLowerCase())) {
      return celeb;
    }

    // Check last name for unique surnames
    const parts = celeb.split(' ');
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1];
      if (lastName.length >= 6 && lowerText.includes(lastName.toLowerCase())) {
        return celeb;
      }
    }
  }

  return null;
}

/**
 * Get all celebrities mentioned in text
 */
export function extractAllCelebrities(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  // Check Telugu names first
  for (const [teluguName, englishName] of Object.entries(TELUGU_NAME_MAP)) {
    if (text.includes(teluguName) && !found.includes(englishName)) {
      found.push(englishName);
    }
  }

  // Check English names
  for (const celeb of TELUGU_CELEBRITIES) {
    if (lowerText.includes(celeb.toLowerCase()) && !found.includes(celeb)) {
      found.push(celeb);
    }
  }

  return found;
}
