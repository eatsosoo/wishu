const { generateKeyPairSync } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const path = require('node:path');

const subject = process.argv[2];
if (!subject || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) {
  console.error('Usage: node scripts/generate-web-push-keys.cjs mailto:you@example.com');
  process.exit(1);
}
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const key = privateKey.export({ format: 'jwk' });
const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(key.x, 'base64url'), Buffer.from(key.y, 'base64url')]).toString('base64url');
const destination = path.resolve(__dirname, '../.env.web-push.local');
writeFileSync(destination, `WEB_PUSH_VAPID_PUBLIC_KEY=${publicKey}\nWEB_PUSH_VAPID_PRIVATE_KEY=${key.d}\nWEB_PUSH_VAPID_SUBJECT=${subject}\n`, { flag: 'wx', mode: 0o600 });
console.log(`Saved private configuration to ${destination}. Keep this file private; existing keys are never overwritten.`);
console.log(`Set this public build variable in Vercel:\nEXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=${publicKey}`);
