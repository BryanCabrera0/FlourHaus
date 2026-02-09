#!/usr/bin/env node
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-admin-password.mjs "your-password"');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
const encoded = `scrypt|${salt.toString('hex')}|${hash.toString('hex')}`;

console.log(encoded);
