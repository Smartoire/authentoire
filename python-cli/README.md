# Authentoire CLI

A powerful command-line interface for decoding QR codes and generating TOTP codes with interactive features. Part of the Authentoire suite for local-only 2FA management.

## 🌟 Features

### 🔐 Core Functionality
- **QR Code Decoding**: Extract OTP entries from QR code images
- **Interactive Mode**: Select from multiple OTP entries with live interface
- **Real-time Code Generation**: Live TOTP codes with countdown timers
- **QR Code Display**: Show QR codes as ASCII art in terminal
- **Configuration Integration**: Uses `../settings.toml` for settings
- **Keyboard Controls**: Interactive keyboard shortcuts for control

### 📱 Google Authenticator Integration
- **Export QR Codes**: Process Google Authenticator export images
- **Migration QR Support**: Handle bulk OTP imports (planned)
- **Individual OTP QR**: Single QR code processing
- **Multiple Detection Methods**: pyzbar with fallback options

## 🚀 Installation

### Prerequisites
- Python 3.7+
- Required Python packages (see below)

### Install Dependencies
```bash
# Install all required packages
pip install Pillow pyzbar qrcode keyboard pyotp toml

# Or install from project root
pip install -r ../requirements.txt
```

### System Requirements
- **Linux**: Full keyboard support
- **macOS**: Keyboard support (may require accessibility permissions)
- **Windows**: Keyboard support (may require admin privileges)

## 📋 Usage

### Basic Commands

#### **QR Code Decoding**
```bash
# Decode single QR code from image
python authentoire.py qr_code.png

# Output:
Decoded QR data: otpauth://totp/Google:user@gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=Google

Parsed OTP Entry:
  Name: user@gmail.com
  Issuer: Google
  Secret: JBSWY3DPEHPK3PXP
  Algorithm: SHA1
  Digits: 6
  Type: totp
```

#### **Interactive Mode (Recommended)**
```bash
# Interactive mode with live TOTP generation
python authentoire.py --interactive qr_codes.png

# Output:
📋 Found OTP Entries:
========================================
1. Google - user@gmail.com
2. GitHub - alice
3. Microsoft - work@company.com
========================================

Select entry (1-3) or 'q' to quit: 1

🚀 Starting code generation for: Google - user@gmail.com
Initializing...
```

#### **Test Mode**
```bash
# Test with sample data
python authentoire.py --test

# Output:
Using test QR data: otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example
```

### Interactive Mode Features

#### **Live Display**
```
==================================================
🔐 Google - user@gmail.com
==================================================
📱 QR Code:
███████████████████████████████████████
███████  ████████████  ████████████████
███████  ████████████  ████████████████
[... ASCII QR code display ...]
███████  ████████████  ████████████████

🔢 Current Code: 123456
⏰ Refreshes in: 23 seconds

Press SPACE to generate new code
Press 'q' to quit
Press 'r' to refresh QR code
==================================================
```

#### **Keyboard Controls**
- **SPACE**: Manual code refresh
- **q**: Quit application
- **r**: Refresh QR code display
- **Auto-refresh**: Updates every 30 seconds automatically

## 📱 Google Authenticator QR Code Extraction

### Supported QR Code Types

#### **Individual OTP QR Codes**
```
otpauth://totp/ServiceName:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ServiceName&algorithm=SHA1&digits=6
```

#### **Migration QR Codes** (Coming Soon)
```
otpauth-migration://offline?data=eyJkYXRhIjpbeyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20i...
```

### Extraction Workflow

#### **Step 1: Export from Google Authenticator**
1. Open Google Authenticator app
2. Go to Settings → Transfer accounts → Export accounts
3. Save the QR code image to your computer

#### **Step 2: Process with CLI**
```bash
# Interactive processing
python authentoire.py --interactive google_auth_export.png

# Select from multiple entries
📋 Found OTP Entries:
========================================
1. Google - user@gmail.com
2. GitHub - developer@company.com
3. Microsoft - admin@company.com
========================================

Select entry (1-3) or 'q' to quit: 1
```

#### **Step 3: Live TOTP Generation**
- Real-time 6-digit code generation
- 30-second countdown timer
- QR code display for easy transfer to other devices
- Keyboard shortcuts for control

### Technical Details

#### **QR Code Detection**
```python
# Uses pyzbar for reliable QR detection
from pyzbar import pyzbar
from PIL import Image

image = Image.open('qr_code.png')
decoded_objects = pyzbar.decode(image)
qr_data = decoded_objects[0].data.decode('utf-8')
```

#### **OTP URL Parsing**
```python
# Parse otpauth:// URL
import urllib.parse

parsed = urllib.parse.urlparse(qr_data)
params = urllib.parse.parse_qs(parsed.query)

# Extract components:
otp_entry = {
    'name': 'user@gmail.com',
    'issuer': 'Google',
    'secret': 'JBSWY3DPEHPK3PXP',
    'algorithm': 'SHA1',
    'digits': 6
}
```

#### **TOTP Generation**
```python
# Generate current TOTP code
import pyotp
import time

totp = pyotp.TOTP('JBSWY3DPEHPK3PXP')
current_code = totp.now()

# Calculate time remaining
time_remaining = 30 - (int(time.time()) % 30)
```

## ⚙️ Configuration

### Settings File
The CLI uses `../settings.toml` for configuration:

```toml
[debug]
debug_enabled = true
js_debug_enabled = true

[ui]
verbose_errors = true

[security]
pin_timeout_seconds = 300
```

### Environment Variables
- **Debug Mode**: Enable detailed logging
- **Verbose Errors**: Show detailed error messages
- **Performance**: Monitor performance metrics

## 🔧 Advanced Usage

### Batch Processing
```bash
# Process multiple QR images
for qr_file in *.png; do
    echo "Processing $qr_file..."
    python authentoire.py "$qr_file"
done
```

### Integration with Scripts
```python
# Python integration example
import subprocess
import json

def extract_otp_from_qr(qr_path):
    result = subprocess.run([
        'python', 'authentoire.py', qr_path
    ], capture_output=True, text=True)
    
    # Parse output for OTP data
    # ... custom parsing logic
    return otp_data
```

### Keyboard Shortcuts Reference
```
SPACE    - Generate new TOTP code immediately
q        - Quit the application
r        - Refresh QR code display
CTRL+C   - Emergency exit
```

## 🛠️ Development

### Running Tests
```bash
# Test basic functionality
python authentoire.py --test

# Test with sample QR codes
python authentoire.py --interactive sample_qr.png
```

### Debug Mode
Enable debug mode in `settings.toml`:
```toml
[debug]
debug_enabled = true
```

Debug output includes:
- QR detection details
- OTP parsing steps
- Time calculations
- Keyboard events

### Error Handling
- **Missing Dependencies**: Clear installation instructions
- **Invalid QR Codes**: Helpful error messages
- **File Not Found**: Path validation
- **Keyboard Issues**: Fallback instructions

## 🔒 Security Considerations

### Local-Only Operation
- No network requests
- No data transmission
- All processing happens locally

### Secret Protection
- Secrets are only displayed in terminal
- No persistent storage of secrets
- Memory cleared on exit

### Best Practices
- Use in secure terminal environment
- Clear terminal history after use
- Don't share QR code images
- Use strong PIN for web interface

## 🐛 Troubleshooting

### Common Issues

#### **Keyboard Not Working**
```bash
# Linux: Check permissions
sudo usermod -a -G input $USER

# macOS: Enable accessibility permissions
# System Preferences → Security & Privacy → Privacy → Accessibility

# Windows: Run as administrator
```

#### **QR Code Not Detected**
```bash
# Check image quality
python -c "from PIL import Image; print(Image.open('qr.png').size)"

# Try different detection methods
python authentoire.py --debug qr.png
```

#### **TOTP Code Incorrect**
```bash
# Verify system time
python -c "import time; print('Unix time:', int(time.time()))"

# Check secret format
python authentoire.py --test
```

### Debug Commands
```bash
# Enable verbose output
export DEBUG=1
python authentoire.py --interactive qr.png

# Check dependencies
python -c "import pyotp, qrcode, keyboard, pyzbar; print('All dependencies OK')"
```

## 📚 API Reference

### Command Line Interface
```bash
python authentoire.py [OPTIONS] <file>

Options:
  --test                    Run with test data
  --interactive <file>      Interactive mode with live TOTP
  --help                    Show help message
  --version                 Show version info
```

### Return Codes
- `0`: Success
- `1`: General error
- `2`: File not found
- `3`: Invalid QR code
- `4`: Missing dependencies

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd Authentoire/python-cli

# Install dependencies
pip install -r ../requirements.txt

# Run tests
python authentoire.py --test
```

### Code Style
```bash
# Format code
black authentoire.py

# Lint code
flake8 authentoire.py
```

## 📄 License

Part of the Authentoire project developed by Smartoire. See main project LICENSE for details.

## 🔗 Related Projects

- [Authentoire Web App](../python-flask/) - Flask web interface
- [Authentoire Rust Server](../rust-actix/) - High-performance backend
- [pyotp](https://github.com/pyauth/pyotp) - Python OTP library
- [pyzbar](https://github.com/NaturalHistoryMuseum/pyzbar) - QR code detection

---

**Authentoire CLI** - Your secure, local command-line TOTP solution.
