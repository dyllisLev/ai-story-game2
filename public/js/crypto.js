const PBKDF2_ITERATIONS = 210000;

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new TypeError(`Invalid hex string`);
  }
  return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
}

async function pbkdf2Derive(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial, 256
  );
  return bytesToHex(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await pbkdf2Derive(password, salt);
  return `${bytesToHex(salt)}:${hashHex}`;
}

export async function computeHashWithSalt(password, saltHex) {
  const hashHex = await pbkdf2Derive(password, hexToBytes(saltHex));
  return `${saltHex}:${hashHex}`;
}
