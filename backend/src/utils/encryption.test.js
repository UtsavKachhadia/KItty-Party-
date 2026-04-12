import assert from 'assert';
import crypto from 'crypto';
import { encrypt, decrypt } from './encryption.js';

function runTests() {
  console.log('Running encryption utility tests...');
  
  const originalText = 'my-super-secret-token-12345';
  // Generate a valid 32-byte hex key for testing
  const secretKey = crypto.randomBytes(16).toString('hex'); // 32 characters hex

  try {
    // Test 1: Full round-trip
    const encryptedData = encrypt(originalText, secretKey);
    assert.ok(encryptedData.iv, 'IV should exist');
    assert.ok(encryptedData.encryptedData, 'Encrypted data should exist');
    assert.ok(encryptedData.authTag, 'AuthTag should exist');
    
    assert.notStrictEqual(encryptedData.encryptedData, originalText, 'Encrypted data should not match plaintext');

    const decryptedText = decrypt(encryptedData, secretKey);
    assert.strictEqual(decryptedText, originalText, 'Decrypted text should match original plaintext');

    console.log('✅ Round-trip encrypt/decrypt passed.');

    // Test 2: Invalid authTag (tampered payload)
    const tamperedData = {
      ...encryptedData,
      authTag: crypto.randomBytes(16).toString('hex') // Wrong authTag
    };

    let tamperedFailed = false;
    try {
      decrypt(tamperedData, secretKey);
    } catch (err) {
      tamperedFailed = true;
      assert.match(err.message, /Decryption failed/, 'Should throw decryption error');
    }
    assert.ok(tamperedFailed, 'Tampered data should fail decryption');
    console.log('✅ Tampered payload detection passed.');

    // Test 3: Invalid secret key length
    try {
      encrypt(originalText, 'invalid-key-length');
      assert.fail('Should not allow invalid secret key');
    } catch (err) {
      assert.match(err.message, /Invalid secret key/, 'Should throw invalid key error');
    }
    console.log('✅ Invalid secret key detection passed.');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  }
}

// Enable running this file directly with node
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
