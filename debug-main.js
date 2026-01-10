console.log('=== Debug Main.js ===');
console.log('Process versions:', JSON.stringify(process.versions, null, 2));
console.log('Process type:', process.type);
console.log('__dirname:', __dirname);

console.log('\nRequiring electron...');
const electron = require('electron');

console.log('Electron type:', typeof electron);
console.log('Electron value:', electron);

if (typeof electron === 'object' && electron !== null) {
  console.log('Electron keys:', Object.keys(electron).slice(0, 20));
  console.log('electron.app:', electron.app);
  console.log('electron.BrowserWindow:', electron.BrowserWindow);

  if (electron.app) {
    electron.app.whenReady().then(() => {
      console.log('App ready!');
      const win = new electron.BrowserWindow({ width: 800, height: 600 });
      win.loadURL('data:text/html,<h1>Test</h1>');
      setTimeout(() => electron.app.quit(), 2000);
    });
  }
} else {
  console.error('ERROR: electron is not an object!');
  console.error('This means the Electron runtime is not properly initialized.');
}
