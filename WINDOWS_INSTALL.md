# Windows Installation Instructions

## Files to Send

Send **ONE** of the following files to your Windows user:

### Option 1: Full Installer (Recommended)
**File:** `Address Label Manager Setup 1.0.0.exe` (95 MB)

**Installation:**
1. Double-click `Address Label Manager Setup 1.0.0.exe`
2. Windows may show a security warning (since the app is not signed)
   - Click "More info" then "Run anyway"
3. The installer will automatically install the app
4. The app will launch when installation is complete
5. A desktop shortcut will be created

**Location:** The app installs to `%LOCALAPPDATA%\Programs\address-label-manager\`

### Option 2: Portable Version
**File:** `Address Label Manager 1.0.0.exe` (95 MB)

**Installation:**
1. No installation required - this is a portable executable
2. Place the .exe file wherever you want (Desktop, Documents, etc.)
3. Double-click to run
4. Windows may show a security warning (since the app is not signed)
   - Click "More info" then "Run anyway"

**Benefits:**
- Can run from a USB drive
- No installation needed
- Can be moved anywhere

## Which Version to Choose?

- **Full Installer:** Best for most users. Creates Start Menu entries and desktop shortcuts.
- **Portable:** Best if you want to run from a USB drive or don't have admin rights.

## File Locations

Both installer files are located in:
`/Users/eric_epstein/side_projects/address_labels/dist/`

## Windows Security Warning

Since the app is not digitally signed, Windows Defender SmartScreen will show a warning. This is normal for unsigned apps. To run:
1. Click "More info" when the warning appears
2. Click "Run anyway"

## System Requirements

- Windows 10 or later
- Intel or AMD 64-bit processor (standard Windows PCs)

## Default Contacts

The app stores default contacts at:
`%APPDATA%\address-label-manager\default-contacts.json`

This file will persist across updates and can be backed up.
