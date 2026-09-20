// Encryption/decryption using PIN — AES-256-GCM, key derived via PBKDF2.
// Output: base64(salt[16] | iv[12] | ciphertext). Legacy XOR .enc files
// still decrypt via the fallback in decrypt().
class CryptoManager {
  static async encrypt(data, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(pin, salt);
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(data))
    );
    const buf = new Uint8Array(28 + ct.byteLength);
    buf.set(salt, 0);
    buf.set(iv, 16);
    buf.set(new Uint8Array(ct), 28);
    let bin = "";
    for (const b of buf) bin += String.fromCharCode(b);
    return btoa(bin);
  }

  static async decrypt(payload, pin) {
    try {
      const buf = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
      const key = await this.deriveKey(pin, buf.slice(0, 16));
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: buf.slice(16, 28) },
        key,
        buf.slice(28)
      );
      return JSON.parse(new TextDecoder().decode(plain));
    } catch {
      return this.legacyDecrypt(payload, pin);
    }
  }

  static async deriveKey(pin, salt) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Legacy XOR scheme (pre-AES .enc exports). Kept for import compatibility.
  static legacyDecrypt(payload, pin) {
    try {
      const pinHash = this.hashPin(pin);
      const encrypted = atob(payload);
      const decrypted = this.xorEncrypt(encrypted, pinHash);
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error("Invalid PIN or corrupted data");
    }
  }

  static hashPin(pin) {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16).padStart(8, "0");
  }

  static xorEncrypt(text, key) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }
}

// Export to file
function exportToFile(data, filename) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import from file
function importFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.enc';
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}
