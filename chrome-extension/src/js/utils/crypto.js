// Simple encryption/decryption using PIN
class CryptoManager {
  static encrypt(data, pin) {
    const pinHash = this.hashPin(pin);
    const dataStr = JSON.stringify(data);
    const encrypted = this.xorEncrypt(dataStr, pinHash);
    return btoa(encrypted);
  }

  static decrypt(encryptedData, pin) {
    try {
      const pinHash = this.hashPin(pin);
      const encrypted = atob(encryptedData);
      const decrypted = this.xorDecrypt(encrypted, pinHash);
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Invalid PIN or corrupted data');
    }
  }

  static hashPin(pin) {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16).padStart(8, '0');
  }

  static xorEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }

  static xorDecrypt(text, key) {
    return this.xorEncrypt(text, key); // XOR is symmetric
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
