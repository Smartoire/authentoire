import os
import base64

def generate_encryption_key():
    # Generate 32 random bytes (256 bits)
    key_bytes = os.urandom(32)
    # Encode in Base64 for easy storage
    key_b64 = base64.b64encode(key_bytes).decode('utf-8')
    return key_b64

if __name__ == "__main__":
    key = generate_encryption_key()
    print("Generated encryption key (Base64):")
    print(key)
