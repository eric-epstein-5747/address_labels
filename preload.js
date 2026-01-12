const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  readWordFile: (filePath) => ipcRenderer.invoke('read-word-file', filePath),
  saveWordFile: (contacts, filePath) => ipcRenderer.invoke('save-word-file', { contacts, filePath }),
  saveAsWordFile: (contacts) => ipcRenderer.invoke('save-as-word-file', contacts),
  loadDefaultContacts: () => ipcRenderer.invoke('load-default-contacts'),
  saveDefaultContacts: (contacts) => ipcRenderer.invoke('save-default-contacts', contacts),
  hasDefaultContacts: () => ipcRenderer.invoke('has-default-contacts')
});
