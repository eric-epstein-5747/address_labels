# Address Label Manager

A cross-platform desktop application for managing address labels stored in Microsoft Word documents. Automatically alphabetizes contacts by last name and provides a convenient UI for adding, deleting, and organizing your address list.

## Features

- Read and parse both .doc and .docx Word files
- Intelligent last name extraction and alphabetization
  - Handles "The Smiths" (sorts under "S")
  - Handles "John & Jane Doe" (sorts under "Doe")
  - Handles "Smith Family" (sorts under "Smith")
  - Strips titles like Mr., Mrs., Dr., etc.
- Clean, modern UI for viewing and managing contacts
- Search/filter contacts
- Add new contacts with a convenient form
- Delete multiple contacts at once
- Save changes back to Word format
- Export to Avery 5160 label format (30 labels per page, 3 columns x 10 rows)
- Cross-platform: Works on Windows and Linux

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Setup

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

## Usage

### Running the Application

To run the app in development mode:
```bash
npm start
```

### Using the Application

1. Click "Open Address File" to load an existing .doc or .docx file
2. Contacts will be automatically parsed and alphabetized by last name
3. Each contact shows its sort key (e.g., "The Smiths" shows "sorts as: SMITHS")
4. Use the search box to filter contacts
5. Click "Add Contact" to add a new contact
6. Select contacts (click or use checkbox) and click "Delete Selected" to remove them
7. Click "Save" to save changes to the original file
8. Click "Save As" to save to a new file

### Contact Format

The app reads and writes contacts in **Avery 5160 label format** - a Word table with 3 columns and 10 rows per page (30 labels per page). Each table cell contains one contact's address.

**Example table cell:**
```
The Smiths
123 Main Street
Springfield, IL 62701
```

When you open an existing Word file with address labels, the app extracts each contact from the table cells, alphabetizes them, and allows you to edit. When you save, it creates a new properly formatted Avery 5160 label document.

The app also supports reading plain text documents where contacts are separated by blank lines as a fallback format.

## Building Installers

### For Linux

To build a Linux installer:
```bash
npm run build:linux
```

This will create:
- AppImage file (universal Linux executable)
- .deb package (for Debian/Ubuntu)

Output will be in the `dist/` directory.

### For Windows

To build a Windows installer:
```bash
npm run build:win
```

This will create:
- NSIS installer (.exe)
- Portable executable

Output will be in the `dist/` directory.

### For Both Platforms

To build for both platforms at once:
```bash
npm run build:all
```

## Installing the Built Application

### Linux

**AppImage:**
1. Make the AppImage executable: `chmod +x Address-Label-Manager-*.AppImage`
2. Run it: `./Address-Label-Manager-*.AppImage`

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i address-label-manager_*.deb
```

### Windows

**NSIS Installer:**
1. Double-click the `.exe` installer
2. Follow the installation wizard

**Portable:**
1. Extract the portable zip
2. Run `Address Label Manager.exe`

## Technical Details

### Built With

- Electron - Cross-platform desktop framework
- mammoth - .doc and .docx file parsing
- officegen - Word document generation
- Native HTML/CSS/JavaScript - UI

### Project Structure

```
address_labels/
├── main.js          # Electron main process
├── preload.js       # Electron preload script
├── renderer.js      # Frontend logic
├── index.html       # UI structure
├── styles.css       # UI styling
├── package.json     # Dependencies and build config
└── data/           # Your address files (not included in builds)
```

## Troubleshooting

### "Cannot read .doc file"

The .doc format is an older binary format. While the app attempts to read it, very old .doc files may not parse correctly. Try opening the file in Microsoft Word and saving it as .docx.

### "Contacts not parsing correctly"

Make sure contacts are separated by blank lines in the Word document. Each contact should have:
- Line 1: Name
- Line 2+: Address lines

### Build fails on Linux/Windows

Make sure you have all required system dependencies for electron-builder. See the [electron-builder documentation](https://www.electron.build/) for platform-specific requirements.

## License

MIT
