#!/usr/bin/env node
const { hashPassword } = require('../src/utils/password');

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/generatePasswordHash.js "TuPassword123!"');
  process.exit(1);
}

const hash = hashPassword(password);
console.log(hash);
