const { contextBridge, ipcRenderer } = require('electron')

/**
 * Preload Script for PhotoLab
 * 
 * Safely exposes Electron APIs to the renderer process.
 * Follows security best practices from agent_rules.md
 */

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  selectPhotosFolder: () => ipcRenderer.invoke('select-photos-folder'),
  
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  
  validateFolder: (folderPath) => ipcRenderer.invoke('validate-folder', folderPath),
  
  validateDestinationFolder: (folderPath) => ipcRenderer.invoke('validate-destination-folder', folderPath),
  
  validatePhotosFolder: (folderPath) => ipcRenderer.invoke('validate-photos-folder', folderPath),
  
  parseCSV: (filePath) => ipcRenderer.invoke('parse-csv', filePath),
  
  createDirectories: (basePath, eventName, participants) => 
    ipcRenderer.invoke('create-directories', basePath, eventName, participants),

  // File system utilities
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // App information
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // OCR operations (Phase 2)
  processPhotos: (config) => ipcRenderer.invoke('process-photos', config),
  
  checkPythonDependencies: () => ipcRenderer.invoke('check-python-dependencies'),
  
  assignPhotosToParticipant: (data) => ipcRenderer.invoke('assign-photos-to-participant', data),

  // Credentials
  generateCredentials: (data) => ipcRenderer.invoke('generate-credentials', data),
  printCredentials: (credentials) => ipcRenderer.invoke('print-credentials', credentials),
  saveCredentials: (credentials, eventName) => ipcRenderer.invoke('save-credentials', credentials, eventName),
  
  generateThumbnail: (photoPath) => ipcRenderer.invoke('generate-thumbnail', photoPath),
  
  // Save remaining ungrouped photos to destination/Não Agrupadas
  saveUngroupedPhotos: (data) => ipcRenderer.invoke('save-ungrouped-photos', data),
  
  // Database operations
  saveProject: (projectData) => ipcRenderer.invoke('save-project', projectData),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (projectId) => ipcRenderer.invoke('get-project', projectId),
  checkProjectExists: (projectName) => ipcRenderer.invoke('check-project-exists', projectName),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  clearDatabase: () => ipcRenderer.invoke('clear-database'),
  saveProcessingResults: (projectId, results) => ipcRenderer.invoke('save-processing-results', projectId, results),
  
  // App Settings
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  
  // QR Cache operations
  cacheQRResult: (filePath, qrCode, confidence, fileHash) => 
    ipcRenderer.invoke('cache-qr-result', filePath, qrCode, confidence, fileHash),
  getCachedQRResult: (filePath, fileHash) => 
    ipcRenderer.invoke('get-cached-qr-result', filePath, fileHash),
  
  // Project configuration
  updateProjectConfig: (projectId, config) => 
    ipcRenderer.invoke('update-project-config', projectId, config),
  
  // License verification (Phase 3)
  checkLicense: (userId) => ipcRenderer.invoke('check-license', userId),

  // Logging
  log: (level, message) => ipcRenderer.invoke('log', level, message),

  // Progress callbacks
  onProgress: (callback) => {
    const wrappedCallback = (event, data) => {
      console.log('Progress update received:', data)
      callback(event, data)
    }
    ipcRenderer.on('processing-progress', wrappedCallback)
    return () => ipcRenderer.removeListener('processing-progress', wrappedCallback)
  },

  onError: (callback) => {
    ipcRenderer.on('processing-error', callback)
    return () => ipcRenderer.removeListener('processing-error', callback)
  },

  // Event listeners
  on: (event, callback) => ipcRenderer.on(event, callback),
  removeListener: (event, callback) => ipcRenderer.removeListener(event, callback)
})

// Log that preload script has loaded
console.log('PhotoLab preload script loaded successfully')
