// totp.js

// Base32 decoding map
const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32toHex(base32) {
  let bits = "";
  let hex = "";

  base32 = base32.replace(/=+$/, ""); // Remove padding

  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    bits += val.toString(2).padStart(5, "0");
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.substr(i, 4), 2).toString(16);
  }

  return hex;
}

function leftpad(str, len, pad = "0") {
  return str.length >= len ? str : pad.repeat(len - str.length) + str;
}

async function generateTOTP(secret, timeStep = 30) {
  const key = base32toHex(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = leftpad(Math.floor(epoch / timeStep).toString(16), 16);

  const keyBytes = hexToBytes(key);
  const counterBytes = hexToBytes(counter);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const hmac = await crypto.subtle.sign("HMAC", cryptoKey, counterBytes);
  const hmacBytes = new Uint8Array(hmac);
  const offset = hmacBytes[hmacBytes.length - 1] & 0xf;
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    (hmacBytes[offset + 1] << 16) |
    (hmacBytes[offset + 2] << 8) |
    hmacBytes[offset + 3];

  return (code % 1e6).toString().padStart(6, "0");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
