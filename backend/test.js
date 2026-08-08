import assert from 'assert';
import { encrypt, decrypt, initDb, dbRun } from './db.js';
import { detectAnomaly } from './anomalyDetector.js';

async function runTests() {
  console.log('🧪 Starting Your Health Will Partner Automated Test Suite...\n');

  // Test 1: PHI encryption and decryption
  console.log('Testing AES-256-GCM data encryption...');
  const sensitiveNotes = 'Allergic to Penicillin. Underwent coronary bypass surgery in 2021.';
  const encrypted = encrypt(sensitiveNotes);
  
  assert.notStrictEqual(encrypted, sensitiveNotes, 'Encrypted output must not match plaintext');
  assert.ok(encrypted.includes(':'), 'Encrypted output should format as iv:tag:ciphertext');
  
  const decrypted = decrypt(encrypted);
  assert.strictEqual(decrypted, sensitiveNotes, 'Decrypted output must match original plaintext');
  console.log('✅ Encryption verification passed.\n');

  // Initialize DB for timeseries checks
  await initDb();

  // Test 2: Physiological Thresholds
  console.log('Testing Physiological Safety Thresholds...');
  
  const normalVitals = { heart_rate: 75, spo2: 98, temperature: 36.6 };
  const normalResult = await detectAnomaly(1, normalVitals);
  assert.strictEqual(normalResult.isAnomaly, false, 'Normal vitals should not trigger alert');

  const tachycardicVitals = { heart_rate: 155, spo2: 98 };
  const tachyResult = await detectAnomaly(1, tachycardicVitals);
  assert.strictEqual(tachyResult.isAnomaly, true, 'Heart rate > 150 must trigger Tachycardia');
  assert.strictEqual(tachyResult.anomalyType, 'Tachycardia');

  const hypoxicVitals = { heart_rate: 80, spo2: 88 };
  const hypoxicResult = await detectAnomaly(1, hypoxicVitals);
  assert.strictEqual(hypoxicResult.isAnomaly, true, 'SpO2 < 90% must trigger Hypoxia');
  assert.strictEqual(hypoxicResult.anomalyType, 'Hypoxia');

  console.log('✅ Static threshold checks passed.\n');

  // Test 3: Fall detection simulation
  console.log('Testing Fall Detection triggers...');
  const fallVitals = { heart_rate: 110, fall_detected: true };
  const fallResult = await detectAnomaly(1, fallVitals);
  assert.strictEqual(fallResult.isAnomaly, true, 'Fall flag must trigger Fall Detected alert');
  assert.strictEqual(fallResult.anomalyType, 'Fall Detected');
  console.log('✅ Fall detection checks passed.\n');

  // Test 4: Statistical standard deviation checks
  console.log('Testing Statistical Baseline (3-Sigma) Anomaly Checks...');
  
  // Wipe and populate mock timeseries table for test user 99
  await dbRun(`DELETE FROM vitals_timeseries WHERE user_id = 99`);
  
  // Insert 10 stable heart rate readings around 70 bpm
  for (let i = 0; i < 10; i++) {
    await dbRun(
      `INSERT INTO vitals_timeseries (user_id, heart_rate, timestamp) 
       VALUES (99, ?, datetime('now', ? || ' minutes'))`,
      [70 + (i % 2 ? 2 : -2), -i] // Readings bounce between 68 and 72
    );
  }

  // Current reading is 72 (normal, inside rolling average)
  const statsNormal = await detectAnomaly(99, { heart_rate: 72 });
  assert.strictEqual(statsNormal.isAnomaly, false, 'Slightly higher pulse within range should not alert');

  // Current reading is 110 (highly anomalous for this user whose average is 70 with minimal deviation)
  // Standard deviation is ~2 bpm. 3 * 6 (minimum stddev override) = 18. Average is 70. Upper boundary = 88.
  // 110 exceeds 88, so it should trigger a Statistical Anomaly!
  const statsAnomaly = await detectAnomaly(99, { heart_rate: 110 });
  assert.strictEqual(statsAnomaly.isAnomaly, true, 'Sudden jump outside 3-Sigma threshold should trigger statistical warning');
  assert.strictEqual(statsAnomaly.anomalyType, 'Statistical Anomaly');

  console.log('✅ Statistical rolling checks passed.\n');

  console.log('🎉 All automated tests completed successfully! 🎉');
}

runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
