# Authentoire - TOTP Authenticator Chrome Extension

A secure, local-only TOTP (Time-based One-Time Password) generator developed by Smartoire.

## Features

### 🔐 Security & Privacy
- **Local-only storage** - No data sent to external servers
- **PIN encryption** - Export/import with PIN protection
- **No tracking** - Completely offline functionality
- **Secure backup** - Encrypted data export

### 📱 Core Functionality
- **TOTP generation** - RFC 6238 compliant time-based codes
- **QR code scanning** - Easy setup via QR codes
- **Multiple accounts** - Support for unlimited TOTP entries
- **URL filtering** - Automatic filtering by current website
- **Quick copy** - One-click code copying to clipboard

### 🎯 Management Features
- **Search functionality** - Find TOTPs by title or username
- **Alphabetical sorting** - Organized by title, then username
- **Duplicate detection** - Prevents duplicate TOTP entries
- **Duplicate button** - Quick copy of existing entries
- **Edit/Delete** - Full CRUD operations
- **Bulk export/import** - Encrypted backup and restore

### 🎨 User Interface
- **Clean popup** - Minimal, distraction-free design
- **Management dashboard** - Full-featured management page
- **Real-time updates** - Live countdown timers
- **Visual feedback** - Copy confirmation and error handling
- **Keyboard shortcuts** - ESC to close modals

## Installation

1. **Download** the latest release
2. **Open Chrome** → `chrome://extensions/`
3. **Enable Developer mode** → Toggle "Developer mode"
4. **Load unpacked** → Click "Load unpacked" and select the extension folder
5. **Pin extension** → Click the puzzle icon and "Pin"

## Usage

### Popup (Quick Access)
1. **Click** the Authentoire icon in your toolbar
2. **View codes** - TOTPs filtered by current website
3. **Copy code** - Click any TOTP entry to copy
4. **Auto-refresh** - Codes update every 30 seconds

### Management Page
1. **Open management** - Click "Manage" in popup header
2. **Add TOTPs** - Use QR scan or manual entry
3. **Search** - Find specific accounts quickly
4. **Edit/Delete** - Full account management
5. **Export/Import** - Backup and restore your data

## File Structure

```
chrome-extension/
├── manifest.json           # Extension configuration
├── src/
│   ├── Authentoire.html   # Popup interface
│   ├── management.html     # Management dashboard
│   ├── css/
│   │   ├── Authentoire.css  # Popup styles
│   │   └── management.css   # Management styles
│   └── js/
│       ├── main/
│       │   └── Authentoire.js  # Popup logic
│       ├── management.js     # Management logic
│       └── utils/
│           ├── jsQR.js         # QR code library
│           ├── totp.js         # TOTP generation
│           └── crypto.js        # Encryption utilities
└── icons/
    └── A-Authentoire.png  # Extension icon
```

## Configuration

### TOTP Entry Structure
Each TOTP entry contains:
- **title** - Display name for the account
- **username** - Associated email/username (optional)
- **secret** - TOTP secret key (encrypted storage)
- **prefixes** - URL patterns for automatic filtering
- **enabled** - Toggle for individual TOTPs

### URL Prefixes
Define website patterns to automatically show relevant TOTPs:
```
github.com
gitlab.com
https://example.com/login
```

## Security

### Data Storage
- **Chrome Storage API** - Local browser storage only
- **Encrypted format** - Secrets stored with basic encryption
- **No network access** - Zero data transmission
- **PIN protection** - Export/import requires PIN

### Backup Strategy
1. **Regular exports** - Weekly encrypted backups recommended
2. **Secure PIN** - Use memorable but secure PIN (4+ chars)
3. **Multiple locations** - Store backups in different places
4. **Test restores** - Verify backup integrity periodically

## Development

### Technologies Used
- **Vanilla JavaScript** - No external frameworks
- **Chrome Extensions API** - Storage and tabs
- **jsQR library** - QR code scanning
- **CSS3** - Modern styling with animations
- **HTML5** - Semantic markup structure

### Building from Source
1. **Clone repository** - `git clone [repository-url]`
2. **Install dependencies** - No external dependencies required
3. **Load in Chrome** - Developer mode → Load unpacked
4. **Test functionality** - Verify all features work

## Troubleshooting

### Common Issues
- **TOTP not syncing** - Check device time settings
- **QR scan failing** - Ensure clear image and good lighting
- **Import failing** - Verify correct PIN and file format
- **Codes not showing** - Check URL prefixes match current site

### Debug Mode
Open Chrome DevTools (F12) and check the Console tab for:
- Error messages
- QR scan logs
- Storage operations
- Performance metrics

## Contributing

### Development Setup
1. **Fork repository** - Create your own copy
2. **Create branch** - `git checkout -b feature-name`
3. **Make changes** - Follow existing code style
4. **Test thoroughly** - Verify all functionality
5. **Submit PR** - Describe changes clearly

### Code Style
- **ES6+ features** - Modern JavaScript syntax
- **Modular structure** - Separate utility files
- **Error handling** - Comprehensive try-catch blocks
- **Performance** - Efficient DOM manipulation

## License

This project is proprietary software developed by Smartoire. All rights reserved.

## Support

For issues, feature requests, or questions:
- **Documentation** - Check this README first
- **Debug logs** - Include console output in reports
- **Steps to reproduce** - Detailed bug reports appreciated

## Version History

### v1.1 (Current)
- Added export/import with PIN encryption
- Enhanced duplicate detection
- Improved search and sorting
- Added duplicate button
- ESC key support for modals

### v1.0
- Initial release
- Basic TOTP functionality
- QR code scanning
- Management dashboard
- Local storage only

---

**Authentoire** - Secure TOTP authentication made simple.
