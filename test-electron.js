// Test file to verify Electron is working
console.log('Starting electron test...');
console.log('Process type:', process.type);
console.log('Process versions:', process.versions);

try {
  const electron = require('electron');
  console.log('Electron type:', typeof electron);
  console.log('Electron keys:', electron ? Object.keys(electron).slice(0, 10) : 'null');

  if (electron && electron.app) {
    console.log('✓ Electron app module found!');
    electron.app.whenReady().then(() => {
      console.log('✓ Electron is ready!');
      electron.app.quit();
    });
  } else {
    console.error('✗ Electron app module NOT found');
    console.error('Electron value:', electron);
  }
} catch (e) {
  console.error('Error loading electron:', e.message);
  console.error(e.stack);
}
