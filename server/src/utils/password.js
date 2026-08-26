import argon2 from 'argon2';

const options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

export function hashPassword(plain) {
  return argon2.hash(plain, options);
}

export function verifyPassword(hash, plain) {
  return argon2.verify(hash, plain);
}

export async function needsRehash(hash) {
  try {
    return argon2.needsRehash(hash, options);
  } catch {
    return false;
  }
}
