/**
 * Test script untuk Vercel deployment
 * Jalankan: node test-vercel.js
 */

console.log('🧪 Testing Vercel Deployment...\n');

let success = 0;
let failed = 0;

// Test 1: Load api/index.js
try {
  const apiIndex = require('./api/index');
  console.log('✅ api/index.js - Loaded successfully');
  success++;
} catch (e) {
  console.error('❌ api/index.js -', e.message);
  failed++;
}

// Test 2: Load api/vercel.js
try {
  const apiVercel = require('./api/vercel');
  console.log('✅ api/vercel.js - Loaded successfully');
  success++;
} catch (e) {
  console.error('❌ api/vercel.js -', e.message);
  failed++;
}

// Test 3: Load routes/anime-vercel.js
try {
  const routes = require('./routes/anime-vercel');
  console.log('✅ routes/anime-vercel.js - Loaded successfully');
  success++;
} catch (e) {
  console.error('❌ routes/anime-vercel.js -', e.message);
  failed++;
}

// Test 4: Load services/scraper-vercel.js
try {
  const scraper = require('./services/scraper-vercel');
  console.log('✅ services/scraper-vercel.js - Loaded successfully');
  success++;
} catch (e) {
  console.error('❌ services/scraper-vercel.js -', e.message);
  failed++;
}

// Test 5: Check vercel.json
try {
  const vercelConfig = require('./vercel.json');
  if (vercelConfig.version && vercelConfig.routes) {
    console.log('✅ vercel.json - Valid configuration');
    success++;
  } else {
    console.error('❌ vercel.json - Invalid configuration');
    failed++;
  }
} catch (e) {
  console.error('❌ vercel.json -', e.message);
  failed++;
}

// Test 6: Check package.json
try {
  const pkg = require('./package.json');
  if (pkg.dependencies && pkg.dependencies.express) {
    console.log('✅ package.json - Has required dependencies');
    success++;
  } else {
    console.error('⚠️  package.json - Missing dependencies');
  }
} catch (e) {
  console.error('❌ package.json -', e.message);
  failed++;
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${success} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! Ready to deploy to Vercel!\n');
  console.log('Next steps:');
  console.log('1. git add .');
  console.log('2. git commit -m "Ready for Vercel"');
  console.log('3. git push origin main');
  console.log('4. Deploy at https://vercel.com/new\n');
} else {
  console.log('❌ Some tests failed. Please fix the errors above.\n');
  process.exit(1);
}
