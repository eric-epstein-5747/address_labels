console.log('Loading electron...');
const electron = require('electron');
console.log('Electron loaded, type:', typeof electron);

if (typeof electron === 'object') {
  const { app, BrowserWindow } = electron;
  console.log('App:', typeof app);
  console.log('BrowserWindow:', typeof BrowserWindow);

  if (app) {
    app.whenReady().then(() => {
      console.log('Electron ready!');
      setTimeout(() => app.quit(), 1000);
    });
  }
} else {
  console.error('Electron is not an object, it is:', typeof electron);
  console.error('Value:', electron);
}
