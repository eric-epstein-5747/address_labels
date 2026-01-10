const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  readWordFile: (filePath) => ipcRenderer.invoke('read-word-file', filePath),
  saveWordFile: (contacts, filePath) => ipcRenderer.invoke('save-word-file', { contacts, filePath }),
  saveAsWordFile: (contacts) => ipcRenderer.invoke('save-as-word-file', contacts)
});
