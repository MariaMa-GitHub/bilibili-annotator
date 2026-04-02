// Run with: node tests/utils.test.js
// Simulates browser globals needed by the functions
global.crypto = require('crypto');

// Load the module (strip chrome-specific globals before loading)
const fs = require('fs');
eval(fs.readFileSync('shared/utils.js', 'utf8'));

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  PASS:', msg); passed++; }
  else { console.error('  FAIL:', msg); failed++; }
}

// extractBVId
console.log('\nextractBVId:');
assert(extractBVId('https://www.bilibili.com/video/BV1xx411c7mD') === 'BV1xx411c7mD', 'standard URL');
assert(extractBVId('https://www.bilibili.com/video/BV1xx411c7mD?p=2') === 'BV1xx411c7mD', 'URL with part param');
assert(extractBVId('https://www.bilibili.com/video/BV1xx411c7mD/') === 'BV1xx411c7mD', 'trailing slash');
assert(extractBVId('https://www.bilibili.com/') === null, 'non-video URL returns null');

// extractPartNumber
console.log('\nextractPartNumber:');
assert(extractPartNumber('https://www.bilibili.com/video/BV1xx?p=3') === 3, 'p=3');
assert(extractPartNumber('https://www.bilibili.com/video/BV1xx') === 1, 'no param defaults to 1');
assert(extractPartNumber('https://www.bilibili.com/video/BV1xx?p=1') === 1, 'p=1');

// formatTimestamp
console.log('\nformatTimestamp:');
assert(formatTimestamp(0) === '0:00', '0 seconds');
assert(formatTimestamp(65) === '1:05', '65 seconds');
assert(formatTimestamp(3661) === '1:01:01', '1 hour 1 min 1 sec');
assert(formatTimestamp(754) === '12:34', '12m 34s');

// parseTimestamp
console.log('\nparseTimestamp:');
assert(parseTimestamp('1:05') === 65, '1:05 → 65');
assert(parseTimestamp('12:34') === 754, '12:34 → 754');
assert(parseTimestamp('1:01:01') === 3661, '1:01:01 → 3661');
assert(parseTimestamp('') === 0, 'empty string → 0');

// normalizeTag
console.log('\nnormalizeTag:');
assert(normalizeTag('Gaming') === 'gaming', 'ASCII tag lowercased');
assert(normalizeTag('Python') === 'python', 'ASCII tag lowercased');
assert(normalizeTag('游戏') === '游戏', 'Chinese tag unchanged');
assert(normalizeTag('Python游戏') === 'Python游戏', 'mixed tag unchanged');
assert(normalizeTag('') === '', 'empty string');

// tokenize
console.log('\ntokenize:');
assert(JSON.stringify(tokenize('hello world')) === '["hello","world"]', 'splits on space');
assert(tokenize('你好世界').length > 0, 'Chinese text returns tokens');
assert(JSON.stringify(tokenize('A,B，C')) === '["a","b","c"]', 'splits on comma/ideographic comma');
assert(JSON.stringify(tokenize('')) === '[]', 'empty string returns []');

// generateUUID
console.log('\ngenerateUUID:');
const uuid = generateUUID();
assert(typeof uuid === 'string' && uuid.length === 36, 'returns 36-char string');
assert(/^[0-9a-f-]+$/.test(uuid), 'only hex and dashes');
assert(generateUUID() !== generateUUID(), 'generates unique values');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
