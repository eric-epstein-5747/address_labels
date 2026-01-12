# Address Label Manager - Distribution Guide

## Files to Distribute

### For Windows Users

Send **ONE** of these files (both are ~94 MB):

1. **`Address Label Manager Setup 1.0.0.exe`** (Recommended)
   - Full installer with Start Menu and desktop shortcuts
   - Location: `dist/Address Label Manager Setup 1.0.0.exe`

2. **`Address Label Manager 1.0.0.exe`** (Portable)
   - No installation required, can run from USB drive
   - Location: `dist/Address Label Manager 1.0.0.exe`

**Instructions:** See [WINDOWS_INSTALL.md](WINDOWS_INSTALL.md)

### For macOS Users

Send **ONE** of these files:

1. **`Address Label Manager-1.0.0-arm64.dmg`** (Recommended - ~114 MB)
   - Standard macOS disk image installer
   - Location: `dist/Address Label Manager-1.0.0-arm64.dmg`

2. **`Address Label Manager-1.0.0-arm64-mac.zip`** (Alternative - ~114 MB)
   - ZIP archive containing the app
   - Location: `dist/Address Label Manager-1.0.0-arm64-mac.zip`

**Installation:**
1. Open the DMG file (or unzip the ZIP)
2. Drag "Address Label Manager" to Applications folder
3. On first launch, right-click and select "Open" (due to unsigned app)
4. Click "Open" in the security dialog

**Instructions:** See [README.md](README.md#macOS)

### For Linux Users

**To build Linux packages (not built yet):**
```bash
npm run build:linux
```

This will create:
- **AppImage** - Universal Linux executable (no installation required)
- **.deb package** - For Debian/Ubuntu systems

**Installation:**

**AppImage:**
1. Make executable: `chmod +x address-label-manager-*.AppImage`
2. Run: `./address-label-manager-*.AppImage`

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i address-label-manager_*.deb
```

**Instructions:** See [README.md](README.md#Linux)

## Quick Summary

| Platform | File to Send | Size | Type | Built |
|----------|-------------|------|------|-------|
| Windows (Intel/AMD) | `Address Label Manager Setup 1.0.0.exe` | 94 MB | Installer | ✅ Yes |
| Windows (Intel/AMD) | `Address Label Manager 1.0.0.exe` | 94 MB | Portable | ✅ Yes |
| macOS (Apple Silicon) | `Address Label Manager-1.0.0-arm64.dmg` | 110 MB | Disk Image | ✅ Yes |
| macOS (Apple Silicon) | `Address Label Manager-1.0.0-arm64-mac.zip` | 106 MB | ZIP Archive | ✅ Yes |
| Linux | `address-label-manager-*.AppImage` | TBD | AppImage | ❌ Not built |
| Linux (Debian/Ubuntu) | `address-label-manager_*.deb` | TBD | .deb package | ❌ Not built |

## Important Notes

### Security Warnings

Both Windows and macOS will show security warnings because the apps are not digitally signed:

- **Windows:** Click "More info" → "Run anyway"
- **macOS:** Right-click the app → "Open" → "Open" in dialog

This is normal for unsigned applications.

### Code Signing (Optional)

To avoid security warnings, you would need to:
- **Windows:** Purchase a code signing certificate ($100-400/year)
- **macOS:** Enroll in Apple Developer Program ($99/year) and notarize the app

For personal/internal distribution, unsigned apps work fine with the workarounds above.

## File Locations

All distribution files are in:
```
/Users/eric_epstein/side_projects/address_labels/dist/
```

## What's Included in the App

- Load and save Word documents (.doc and .docx)
- Avery 5160 label format (3 columns x 10 rows)
- Smart name parsing with manual overrides
- Full contact editing
- Default contacts that auto-load on startup
- Search and filter contacts
- Alphabetical sorting by last name

## Support

For issues or questions, users should refer to:
- [README.md](README.md) - Full documentation
- [WINDOWS_INSTALL.md](WINDOWS_INSTALL.md) - Windows-specific instructions

## Version Information

- Version: 1.0.0
- Electron: 39.2.7
- Build Date: January 2026
