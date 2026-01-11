const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { Document, Packer, Table, TableCell, TableRow, Paragraph, TextRun, WidthType, AlignmentType, VerticalAlign } = require('docx');
const { JSDOM } = require('jsdom');

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
            const text = cell.textContent.trim();
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

// Shared function to save contacts to Word file
async function saveContactsToWord(contacts, filePath) {
  // Avery 5160 specifications (in TWIPs: 1 inch = 1440 TWIPs)
  const labelsPerRow = 3;
  const rowsPerPage = 10;
  const labelsPerPage = 30;

  // Avery 5160: 2.625" width x 1" height
  const labelWidth = 2.625 * 1440; // 3780 TWIPs
  const labelHeight = 1 * 1440; // 1440 TWIPs

  const sections = [];
  let contactIndex = 0;

  while (contactIndex < contacts.length) {
    const tableRows = [];

    // Create 10 rows for this page
    for (let row = 0; row < rowsPerPage && contactIndex < contacts.length; row++) {
      const cells = [];

      // Create 3 cells per row
      for (let col = 0; col < labelsPerRow; col++) {
        if (contactIndex < contacts.length) {
          const contact = contacts[contactIndex];
          const lines = contact.fullAddress.split('\n');

          const paragraphs = lines.map(line =>
            new Paragraph({
              text: line,
              spacing: { after: 50 },
              style: 'Normal'
            })
          );

          cells.push(
            new TableCell({
              children: paragraphs.length > 0 ? paragraphs : [new Paragraph('')],
              width: { size: labelWidth, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              margins: {
                top: 50,
                bottom: 50,
                left: 100,
                right: 100
              }
            })
          );
          contactIndex++;
        } else {
          // Empty cell
          cells.push(
            new TableCell({
              children: [new Paragraph('')],
              width: { size: labelWidth, type: WidthType.DXA }
            })
          );
        }
      }

      tableRows.push(new TableRow({
        children: cells,
        height: { value: labelHeight, rule: 'exact' }
      }));
    }

    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    });

    sections.push({
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
