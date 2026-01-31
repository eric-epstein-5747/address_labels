const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { Document, Packer, Table, TableCell, TableRow, Paragraph, TextRun, WidthType, AlignmentType, VerticalAlign, PageOrientation, convertInchesToTwip, BorderStyle, TableLayoutType, HeightRule } = require('docx');
const { JSDOM } = require('jsdom');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file selection
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Word Documents', extensions: ['doc', 'docx'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Handle reading Word file with table support
ipcMain.handle('read-word-file', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contacts = [];

    if (ext === '.doc') {
      // Use word-extractor for .doc files
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(filePath);
      const body = extracted.getBody();

      if (!body || body.trim().length === 0) {
        throw new Error('No content found in the .doc file. The file may be empty or corrupted.');
      }

      // Parse Avery label format (3 columns per row)
      // The format uses tabs to separate columns
      const lines = body.split('\n');
      let currentContact = '';

      for (const line of lines) {
        // Check if line contains tabs (indicating column separators)
        if (line.includes('\t')) {
          // Split by tabs to get different columns
          const parts = line.split('\t');

          // First part continues the current contact
          if (parts[0].trim()) {
            currentContact += (currentContact ? '\n' : '') + parts[0].trim();
          }

          // Save current contact if we have one
          if (currentContact.trim()) {
            contacts.push(currentContact.trim());
            currentContact = '';
          }

          // Process remaining parts as new contacts
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i].trim();
            if (part) {
              // This starts a new contact
              currentContact = part;
            }
          }
        } else if (line.trim()) {
          // No tabs - this line continues the current contact
          currentContact += (currentContact ? '\n' : '') + line.trim();
        } else {
          // Empty line - save current contact if we have one
          if (currentContact.trim()) {
            contacts.push(currentContact.trim());
            currentContact = '';
          }
        }
      }

      // Don't forget the last contact
      if (currentContact.trim()) {
        contacts.push(currentContact.trim());
      }
    } else if (ext === '.docx') {
      // Use mammoth for .docx files
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;

      if (!html || html.trim().length === 0) {
        throw new Error('Could not extract content from the .docx file. The file may be corrupted or in an unsupported format.');
      }

      // Parse HTML to extract table cells
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Find all table cells
      const tables = document.querySelectorAll('table');

      if (tables.length > 0) {
        // Process table-based format (Avery labels)
        tables.forEach(table => {
          const cells = table.querySelectorAll('td');
          cells.forEach(cell => {
            // Extract paragraphs and preserve line breaks
            const paragraphs = cell.querySelectorAll('p');
            let text;
            if (paragraphs.length > 0) {
              // Join paragraph contents with newlines to preserve address formatting
              const lines = Array.from(paragraphs).map(p => p.textContent.trim()).filter(l => l);
              text = lines.join('\n');
            } else {
              // Fallback to textContent if no paragraphs
              text = cell.textContent.trim();
            }
            if (text) {
              contacts.push(text);
            }
          });
        });
      } else {
        // Fallback: split by double newlines for plain text format
        const bodyElement = document.body;
        if (!bodyElement) {
          throw new Error('Could not parse the document structure. Please ensure this is a valid .docx file.');
        }

        const text = bodyElement.textContent;
        if (!text || text.trim().length === 0) {
          throw new Error('No text content found in the document. The file may be empty or corrupted.');
        }

        const blocks = text.split(/\n\s*\n+/);
        blocks.forEach(block => {
          const trimmed = block.trim();
          if (trimmed) {
            contacts.push(trimmed);
          }
        });
      }
    } else {
      throw new Error(`Unsupported file format: ${ext}. Please use .doc or .docx files.`);
    }

    if (contacts.length === 0) {
      throw new Error('No contacts found in the document. Please check the file format.');
    }

    return { success: true, contacts, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get path to template file (works both in dev and packaged app)
function getTemplatePath() {
  const templateName = 'Avery5160Template.docx';
  // Check if running in packaged app
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'templates', templateName);
  }
  // Development mode
  return path.join(__dirname, 'templates', templateName);
}

// Shared function to save contacts to Word file using template as scaffold
async function saveContactsToWord(contacts, filePath) {
  const labelsPerRow = 3;
  const rowsPerPage = 10;
  const labelsPerPage = labelsPerRow * rowsPerPage;

  // Avery 5160 exact specifications (all in TWIPs: 1 inch = 1440 TWIPs)
  // Page: 8.5" x 11" = 12240 x 15840 TWIPs
  // Side margins: 0.1875" = 270 TWIPs each
  // Available width: 12240 - 540 = 11700 TWIPs
  // Column width: 11700 / 3 = 3900 TWIPs per column
  // Row height: 1" = 1440 TWIPs

  const pageWidth = 12240;  // 8.5"
  const pageHeight = 15840; // 11"
  const topMargin = 720;    // 0.5"
  const bottomMargin = 720; // 0.5"
  const leftMargin = 270;   // 0.1875"
  const rightMargin = 270;  // 0.1875"

  const tableWidth = pageWidth - leftMargin - rightMargin; // 11700 TWIPs
  const columnWidth = Math.floor(tableWidth / labelsPerRow); // 3900 TWIPs
  const labelHeight = 1440; // 1"

  // Cell margins for padding inside each label
  const cellMarginTop = 72;    // 0.05"
  const cellMarginBottom = 72; // 0.05"
  const cellMarginLeft = 115;  // ~0.08"
  const cellMarginRight = 115; // ~0.08"

  const sections = [];
  const totalPages = Math.ceil(contacts.length / labelsPerPage);
  let contactIndex = 0;

  // No visible borders
  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  // Create pages
  for (let page = 0; page < Math.max(1, totalPages); page++) {
    const tableRows = [];

    // Create 10 rows for this page
    for (let row = 0; row < rowsPerPage; row++) {
      const cells = [];

      // Create 3 cells per row
      for (let col = 0; col < labelsPerRow; col++) {
        let cellChildren;

        if (contactIndex < contacts.length) {
          const contact = contacts[contactIndex];
          const lines = contact.fullAddress.split('\n');

          // Create paragraphs for each line of the address
          // Use 10pt font (size: 20 in half-points) to ensure content fits
          cellChildren = lines.map(line =>
            new Paragraph({
              children: [new TextRun({ text: line, size: 20, font: 'Arial' })],
              spacing: { after: 0, line: 240 }, // Single line spacing (240 = 12pt)
            })
          );

          if (cellChildren.length === 0) {
            cellChildren = [new Paragraph('')];
          }
          contactIndex++;
        } else {
          // Empty cell
          cellChildren = [new Paragraph('')];
        }

        cells.push(
          new TableCell({
            children: cellChildren,
            width: { size: columnWidth, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: {
              top: cellMarginTop,
              bottom: cellMarginBottom,
              left: cellMarginLeft,
              right: cellMarginRight
            },
            borders: noBorders
          })
        );
      }

      tableRows.push(new TableRow({
        children: cells,
        height: { value: labelHeight, rule: HeightRule.EXACT }
      }));
    }

    const table = new Table({
      rows: tableRows,
      layout: TableLayoutType.FIXED,
      width: { size: tableWidth, type: WidthType.DXA },
      columnWidths: [columnWidth, columnWidth, columnWidth]
    });

    sections.push({
      properties: {
        page: {
          margin: {
            top: topMargin,
            bottom: bottomMargin,
            left: leftMargin,
            right: rightMargin
          },
          size: {
            width: pageWidth,
            height: pageHeight,
            orientation: PageOrientation.PORTRAIT
          }
        }
      },
      children: [table]
    });
  }

  const doc = new Document({
    sections: sections
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// Handle saving contacts to Word file
ipcMain.handle('save-word-file', async (event, { contacts, filePath }) => {
  try {
    // Determine save path
    let savePath = filePath;
    if (!savePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'Word Documents', extensions: ['docx'] }],
        defaultPath: 'Address_Labels.docx'
      });

      if (result.canceled) {
        return { success: false, error: 'Save cancelled' };
      }
      savePath = result.filePath;
    }

    const savedPath = await saveContactsToWord(contacts, savePath);
    return { success: true, filePath: savedPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle save as
ipcMain.handle('save-as-word-file', async (event, contacts) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'Word Documents', extensions: ['docx'] }],
      defaultPath: 'Address_Labels.docx'
    });

    if (result.canceled) {
      return { success: false, error: 'Save cancelled' };
    }

    const savedPath = await saveContactsToWord(contacts, result.filePath);
    return { success: true, filePath: savedPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get default contacts file path
function getDefaultContactsPath() {
  return path.join(app.getPath('userData'), 'default-contacts.json');
}

// Load default contacts
ipcMain.handle('load-default-contacts', async () => {
  try {
    const defaultPath = getDefaultContactsPath();
    const data = await fs.readFile(defaultPath, 'utf8');
    const contacts = JSON.parse(data);
    return { success: true, contacts };
  } catch (error) {
    // File doesn't exist or can't be read - this is OK
    return { success: false, error: 'No default contacts file found' };
  }
});

// Save default contacts
ipcMain.handle('save-default-contacts', async (event, contacts) => {
  try {
    const defaultPath = getDefaultContactsPath();
    await fs.writeFile(defaultPath, JSON.stringify(contacts, null, 2), 'utf8');
    return { success: true, filePath: defaultPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check if default contacts exist
ipcMain.handle('has-default-contacts', async () => {
  try {
    const defaultPath = getDefaultContactsPath();
    await fs.access(defaultPath);
    return { success: true, exists: true };
  } catch (error) {
    return { success: true, exists: false };
  }
});
