const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const DatabaseManager = require('./database')
const QRCode = require('qrcode')

/**
 * PhotoLab Main Process - MVP VERSION
 * 
 * Handles Electron app lifecycle and IPC communications.
 * Removed: QR code processing and photo grouping functionality
 */

// Keep a global reference of the window object
let mainWindow
let databaseManager

// Environment check
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/**
 * Create the main application window
 */
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow workers in development
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    titleBarStyle: 'default'
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../build/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Initialize database
 */
async function initializeDatabase() {
  try {
    databaseManager = new DatabaseManager()
    await databaseManager.initialize()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

// App event handlers
app.whenReady().then(async () => {
  await initializeDatabase()
  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers - MVP VERSION (removed processing handlers)

// Folder and file selection
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecionar Pasta'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, filePaths: result.filePaths }
    }
    
    return { success: false, error: 'No folder selected' }
  } catch (error) {
    console.error('Error selecting folder:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('select-file', async (event, filters = []) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters.length > 0 ? filters : [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      title: 'Selecionar Arquivo'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, filePaths: result.filePaths }
    }
    
    return { success: false, error: 'No file selected' }
  } catch (error) {
    console.error('Error selecting file:', error)
    return { success: false, error: error.message }
  }
})

// Folder validation
ipcMain.handle('validate-folder', async (event, folderPath) => {
  try {
    const stats = await fs.stat(folderPath)
    if (!stats.isDirectory()) {
      return { valid: false, message: 'Path is not a directory' }
    }
    
    // Check if folder is writable
    try {
      await fs.access(folderPath, fs.constants.W_OK)
      return { valid: true, message: 'Folder validated successfully' }
    } catch {
      return { valid: false, message: 'Directory is not writable' }
    }
  } catch (error) {
    return { valid: false, message: 'Directory does not exist or is not accessible' }
  }
})

ipcMain.handle('validate-destination-folder', async (event, folderPath) => {
  try {
    const stats = await fs.stat(folderPath)
    if (!stats.isDirectory()) {
      return { valid: false, message: 'Path is not a directory' }
    }
    
    // Check if folder is writable
    try {
      await fs.access(folderPath, fs.constants.W_OK)
      return { valid: true, message: 'Destination folder validated successfully' }
    } catch {
      return { valid: false, message: 'Directory is not writable' }
    }
  } catch (error) {
    return { valid: false, message: 'Directory does not exist or is not accessible' }
  }
})

// CSV parsing
ipcMain.handle('parse-csv', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return { success: false, error: 'CSV file must have at least a header and one data row' }
    }
    
    // Parse header
    const header = lines[0].split(/[,;]/).map(h => h.trim())
    
    // Validate header - more flexible matching
    const requiredColumns = ['Nome', 'Turma', 'QR Code']
    const missingColumns = []
    
    for (const requiredCol of requiredColumns) {
      const found = header.some(h => {
        const headerLower = h.toLowerCase().trim()
        const requiredLower = requiredCol.toLowerCase().trim()
        
        // Exact match or contains match
        return headerLower === requiredLower || 
               headerLower.includes(requiredLower) ||
               requiredLower.includes(headerLower)
      })
      
      if (!found) {
        missingColumns.push(requiredCol)
      }
    }
    
    if (missingColumns.length > 0) {
      return { 
        success: false, 
        error: `Colunas obrigatórias ausentes: ${missingColumns.join(', ')}. Encontradas: ${header.join(', ')}` 
      }
    }
    
    // Parse data rows - map columns by header names
    const participants = []
    
    // Find column indices
    const nameIndex = header.findIndex(h => 
      h.toLowerCase().includes('nome') || h.toLowerCase().includes('name')
    )
    const turmaIndex = header.findIndex(h => 
      h.toLowerCase().includes('turma') || h.toLowerCase().includes('class')
    )
    const qrIndex = header.findIndex(h => 
      h.toLowerCase().includes('qr') || h.toLowerCase().includes('code')
    )
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[,;]/).map(v => v.trim())
      
      if (values.length >= 3 && 
          nameIndex >= 0 && values[nameIndex] && 
          turmaIndex >= 0 && values[turmaIndex] && 
          qrIndex >= 0 && values[qrIndex]) {
        participants.push({
          name: values[nameIndex],
          turma: values[turmaIndex],
          qrCode: values[qrIndex]
        })
      }
    }
    
    if (participants.length === 0) {
      return { success: false, error: 'No valid participants found in CSV' }
    }
    
    return { 
      success: true, 
      data: participants,
      total: participants.length,
      header 
    }
  } catch (error) {
    console.error('Error parsing CSV:', error)
    return { success: false, error: error.message }
  }
})

/**
 * Sanitize folder name to be safe for filesystem
 * Preserves Portuguese accents and special characters
 */
function sanitizeFolderName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove only invalid filesystem characters
    .replace(/\s+/g, ' ')         // Normalize spaces
    .trim()                       // Remove leading/trailing spaces
}

// Directory creation with proper structure
ipcMain.handle('create-directories', async (event, basePath, eventName, participants) => {
  try {
    // Sanitize event name
    const sanitizedEventName = sanitizeFolderName(eventName)
    const eventDir = path.join(basePath, sanitizedEventName)
    
    // Create main event directory
    await fs.mkdir(eventDir, { recursive: true })
    
    // Group participants by turma (class)
    const participantsByClass = {}
    for (const participant of participants) {
      const turma = participant.turma || participant.class || 'Sem Turma'
      if (!participantsByClass[turma]) {
        participantsByClass[turma] = []
      }
      participantsByClass[turma].push(participant)
    }
    
    const createdDirectories = []
    const errors = []
    
    // Create directories for each class
    for (const [turma, classParticipants] of Object.entries(participantsByClass)) {
      try {
        // Sanitize turma name
        const sanitizedTurma = sanitizeFolderName(turma)
        const turmaDir = path.join(eventDir, sanitizedTurma)
        
        // Create turma directory
        await fs.mkdir(turmaDir, { recursive: true })
        createdDirectories.push(turmaDir)
        
        // Create participant directories within each turma
        for (const participant of classParticipants) {
          try {
            // Sanitize participant name and create folder name
            const sanitizedName = sanitizeFolderName(participant.name)
            const participantFolderName = `${sanitizedName} - ${participant.qrCode}`
            const participantDir = path.join(turmaDir, participantFolderName)
            
            // Create participant directory
            await fs.mkdir(participantDir, { recursive: true })
            createdDirectories.push(participantDir)
            
            console.log(`Created directory: ${participantDir}`)
          } catch (participantError) {
            const errorMsg = `Error creating directory for ${participant.name}: ${participantError.message}`
            errors.push(errorMsg)
            console.error(errorMsg)
          }
        }
      } catch (turmaError) {
        const errorMsg = `Error creating turma directory for ${turma}: ${turmaError.message}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }
    
    return { 
      success: true, 
      eventDir,
      createdDirectories,
      errors,
      structure: {
        eventName: sanitizedEventName,
        classes: Object.keys(participantsByClass),
        totalParticipants: participants.length,
        totalDirectories: createdDirectories.length
      }
    }
  } catch (error) {
    console.error('Error creating directory structure:', error)
    return { success: false, error: error.message }
  }
})

// Utility handlers
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath)
    return { success: true }
  } catch (error) {
    console.error('Error opening folder:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('generate-thumbnail', async (event, photoPath) => {
  try {
    // For MVP, just return the original path
    // In a full implementation, this would generate actual thumbnails
    return { success: true, thumbnailPath: photoPath }
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return { success: false, error: error.message }
  }
})

// Credentials generation
// Helper function to convert local path to file:// URL
const toFileURL = (filePath) => {
  if (!filePath) return ''
  // Convert Windows paths to file:// URLs
  const normalizedPath = filePath.replace(/\\/g, '/')
  return `file:///${normalizedPath}`
}

ipcMain.handle('generate-credentials', async (event, { participants, eventName, config, destinationFolder }) => {
  try {
    const QRCode = require('qrcode')
    const path = require('path')
    const fs = require('fs').promises
    const { BrowserWindow } = require('electron')
    const sizeOf = require('image-size')
    
    // Create Credentials folder inside the project folder
    const credentialsFolder = path.join(destinationFolder, 'Credenciais')
    console.log('Creating credentials folder:', credentialsFolder)
    await fs.mkdir(credentialsFolder, { recursive: true })
    console.log('Credentials folder created successfully')
    
    const credentials = []
    const generatedFiles = []
    
    // Get photographer URL from config
    const photographerUrl = config.photographerUrl?.text || 'https://www.photo.app/fotografo/nomedotenant'
    
    // Detect background image dimensions and calculate scale factors
    // 10cm x 15cm at 72 DPI = 283x425 pixels (preview)
    // 10cm x 15cm at 72 DPI = 850x1276 pixels (final render - 3x scale)
    let backgroundWidth = 850   // 283 * 3 = 850px (final render)
    let backgroundHeight = 1276 // 425 * 3 = 1276px (final render)
    let scaleX = 3  // 3x scale factor
    let scaleY = 3  // 3x scale factor
    
    // Check if we have a background image (either path or base64)
    if (config.backgroundImagePath || config.backgroundImageBase64) {
      try {
        if (config.backgroundImageBase64) {
          // Use base64 image for dimensions
          console.log('Using base64 image for background')
          // For base64, we'll use 3x scale dimensions (850x1276px)
          backgroundWidth = 850   // 283 * 3 = 850px (final render)
          backgroundHeight = 1276 // 425 * 3 = 1276px (final render)
          scaleX = 3  // 3x scale factor
          scaleY = 3  // 3x scale factor
        } else {
          console.log('Detecting background dimensions for:', config.backgroundImagePath)
          const dimensions = sizeOf(config.backgroundImagePath)
          backgroundWidth = dimensions.width
          backgroundHeight = dimensions.height
          scaleX = backgroundWidth / 283  // Scale from preview to actual
          scaleY = backgroundHeight / 425 // Scale from preview to actual
          console.log(`Background dimensions: ${backgroundWidth}x${backgroundHeight}`)
          console.log(`Scale factors: ${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}y`)
        }
      } catch (error) {
        console.warn('Could not detect background dimensions, using defaults:', error.message)
        console.log('Background path:', config.backgroundImagePath)
        console.log('Using default dimensions')
        backgroundWidth = 850   // 283 * 3 = 850px (final render)
        backgroundHeight = 1276 // 425 * 3 = 1276px (final render)
        scaleX = 3  // 3x scale factor
        scaleY = 3  // 3x scale factor
      }
    } else {
      console.log('No background image provided')
    }
    
    for (const participant of participants) {
      console.log(`Generating credential for: ${participant.name}`)
      console.log('Config received:', {
        backgroundImagePath: config.backgroundImagePath,
        backgroundImageBase64: config.backgroundImageBase64 ? 'Present' : 'Not present',
        qrCode: config.qrCode,
        name: config.name,
        turma: config.turma,
        photographerUrl: config.photographerUrl,
        qrCodeText: config.qrCodeText
      })
      console.log(`Using dimensions: ${backgroundWidth}x${backgroundHeight}`)
      console.log(`Scale factors: ${scaleX}x, ${scaleY}y`)
      
      // Build complete QR Code URL: photographerUrl/participante/QRCode
      const qrCodeUrl = `${photographerUrl}/participante/${participant.qrCode}`
      
      // Generate QR Code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: config.qrCode?.size || 144,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      // Create HTML for credential with real dimensions and scaled positions
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              width: ${backgroundWidth}px;
              height: ${backgroundHeight}px;
              background: white;
              font-family: Arial, sans-serif;
              position: relative;
              overflow: hidden;
            }
            .credential {
              width: ${backgroundWidth}px;
              height: ${backgroundHeight}px;
              position: relative;
              background: white;
              ${config.backgroundImageBase64 ? `background-image: url('${config.backgroundImageBase64}'); background-size: cover; background-position: center; background-repeat: no-repeat;` : config.backgroundImagePath ? `background-image: url('file://${config.backgroundImagePath.replace(/\\/g, '/')}'); background-size: cover; background-position: center; background-repeat: no-repeat;` : ''}
            }
            .qr-code {
              position: absolute;
              left: ${(config.qrCode?.x || 93) * scaleX}px;
              top: ${(config.qrCode?.y || 105) * scaleY}px;
              width: ${(config.qrCode?.size || 144) * scaleX}px;
              height: ${(config.qrCode?.size || 144) * scaleY}px;
            }
            .name {
              position: absolute;
              left: ${(config.name?.x || 88) * scaleX}px;
              top: ${(config.name?.y || 288) * scaleY}px;
              font-size: ${Math.round((config.name?.fontSize || 12) * scaleY)}px;
              font-family: ${config.name?.fontFamily || 'Arial'};
              color: ${config.name?.color || '#000000'};
              font-weight: bold;
            }
            .turma {
              position: absolute;
              left: ${(config.turma?.x || 129) * scaleX}px;
              top: ${(config.turma?.y || 311) * scaleY}px;
              font-size: ${Math.round((config.turma?.fontSize || 12) * scaleY)}px;
              font-family: ${config.turma?.fontFamily || 'Arial'};
              color: ${config.turma?.color || '#666666'};
            }
            .photographer-url {
              position: absolute;
              left: ${(config.photographerUrl?.x || 104) * scaleX}px;
              top: ${(config.photographerUrl?.y || 342) * scaleY}px;
              font-size: ${Math.round((config.photographerUrl?.fontSize || 11) * scaleY)}px;
              font-family: ${config.photographerUrl?.fontFamily || 'Arial'};
              color: ${config.photographerUrl?.color || '#0066CC'};
            }
            .qr-code-text {
              position: absolute;
              left: ${(config.qrCodeText?.x || 104) * scaleX}px;
              top: ${(config.qrCodeText?.y || 370) * scaleY}px;
              font-size: ${Math.round((config.qrCodeText?.fontSize || 11) * scaleY)}px;
              font-family: ${config.qrCodeText?.fontFamily || 'Arial'};
              color: ${config.qrCodeText?.color || '#000000'};
            }
          </style>
        </head>
        <body>
          <div class="credential">
            <img src="${qrCodeDataUrl}" class="qr-code" alt="QR Code">
            <div class="name">${participant.name || ''}</div>
            <div class="turma">${participant.class || participant.turma || ''}</div>
            <div class="photographer-url">${photographerUrl}</div>
            <div class="qr-code-text">${participant.qrCode || ''}</div>
          </div>
        </body>
        </html>
      `
      
      // Create temporary HTML file
      const tempHtmlPath = path.join(credentialsFolder, `temp_${participant.qrCode}.html`)
      await fs.writeFile(tempHtmlPath, htmlContent, 'utf8')
      
      // Create hidden browser window for rendering with real dimensions
      const renderWindow = new BrowserWindow({
        width: backgroundWidth,
        height: backgroundHeight,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false
        }
      })
      
      // Load HTML and capture screenshot
      await renderWindow.loadFile(tempHtmlPath)
      renderWindow.setContentSize(backgroundWidth, backgroundHeight)
     
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Capture screenshot
      const screenshot = await renderWindow.capturePage()
      
      // Save as PNG - format: "nome do aluno_QR1234567.png"
      const sanitizedName = participant.name.replace(/[<>:"/\\|?*]/g, '') // Remove only invalid filename chars
      const fileName = `${sanitizedName}_${participant.qrCode}.png`
      const filePath = path.join(credentialsFolder, fileName)
      
      await fs.writeFile(filePath, screenshot.toPNG())
      
      // Clean up
      renderWindow.close()
      await fs.unlink(tempHtmlPath)
      
      console.log(`Credential saved: ${filePath}`)
      generatedFiles.push(filePath)
      
      // Create credential data
      const credential = {
        name: participant.name,
        class: participant.class,
        qrCode: participant.qrCode,
        qrCodeUrl: qrCodeUrl,
        qrCodeDataUrl: qrCodeDataUrl,
        eventName: eventName,
        filePath: filePath,
        generatedAt: new Date().toISOString()
      }
      
      credentials.push(credential)
    }
    
    console.log(`Generated ${generatedFiles.length} credential files`)
    
    return { 
      success: true, 
      credentials,
      outputDirectory: credentialsFolder,
      generatedFiles: generatedFiles,
      message: `${credentials.length} credenciais geradas com sucesso!`
    }
  } catch (error) {
    console.error('Error generating credentials:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('print-credentials', async (event, credentials, eventName) => {
  try {
    // For MVP, just return success
    // In a full implementation, this would handle printing
    return { success: true }
  } catch (error) {
    console.error('Error printing credentials:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-credentials', async (event, credentials, eventName, destinationFolder) => {
  try {
    const credentialsDir = path.join(destinationFolder, eventName, 'credentials')
    await fs.mkdir(credentialsDir, { recursive: true })
    
    // Save individual credential files
    for (const credential of credentials) {
      const filename = `credential_${credential.name.replace(/[^a-zA-Z0-9]/g, '_')}_${credential.qrCode}.html`
      const filePath = path.join(credentialsDir, filename)
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Credencial - ${credential.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .credential { border: 2px solid #333; padding: 20px; text-align: center; }
            .name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .class { font-size: 18px; color: #666; margin-bottom: 10px; }
            .qr { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="credential">
            <div class="name">${credential.name}</div>
            <div class="class">${credential.class}</div>
            <div class="qr">QR Code: ${credential.qrCode}</div>
            <div>Evento: ${eventName}</div>
          </div>
        </body>
        </html>
      `
      
      await fs.writeFile(filePath, htmlContent, 'utf-8')
    }
    
    return { success: true, credentialsDir }
  } catch (error) {
    console.error('Error saving credentials:', error)
    return { success: false, error: error.message }
  }
})

// Project management
ipcMain.handle('save-project', async (event, projectData) => {
  try {
    const projectId = await databaseManager.saveProject(projectData)
    return { success: true, projectId }
  } catch (error) {
    console.error('Error saving project:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-projects', async () => {
  try {
    const result = await databaseManager.getProjects()
    return result // Retorna diretamente o resultado do database
  } catch (error) {
    console.error('Error getting projects:', error)
    return { success: false, error: error.message }
  }
})

// Database management
ipcMain.handle('clear-database', async () => {
  try {
    const result = await databaseManager.clearAllData()
    return result
  } catch (error) {
    console.error('Error clearing database:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-project', async (event, projectId) => {
  try {
    console.log('get-project handler called with ID:', projectId)
    const result = await databaseManager.getProject(projectId)
    console.log('get-project handler result:', result)
    return result
  } catch (error) {
    console.error('Error getting project:', error)
    return { success: false, error: error.message }
  }
})

// Check if project exists by name
ipcMain.handle('check-project-exists', async (event, projectName) => {
  try {
    const projects = await databaseManager.getProjects()
    if (projects.success) {
      const existingProject = projects.projects.find(p => p.name === projectName)
      return { 
        success: true, 
        exists: !!existingProject,
        project: existingProject || null
      }
    }
    return { success: false, exists: false }
  } catch (error) {
    console.error('Error checking project existence:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    await databaseManager.deleteProject(projectId)
    return { success: true }
  } catch (error) {
    console.error('Error deleting project:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-project-config', async (event, projectId, config) => {
  try {
    await databaseManager.updateProjectConfig(projectId, config)
    return { success: true }
  } catch (error) {
    console.error('Error updating project config:', error)
    return { success: false, error: error.message }
  }
})

// Photos folder selection
ipcMain.handle('select-photos-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecionar Pasta das Fotos Originais'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, filePaths: result.filePaths }
    }
    
    return { success: false, error: 'No folder selected' }
  } catch (error) {
    console.error('Error selecting photos folder:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('validate-photos-folder', async (event, folderPath) => {
  try {
    const stats = await fs.stat(folderPath)
    if (!stats.isDirectory()) {
      return { valid: false, message: 'Path is not a directory' }
    }
    
    // Check if folder is readable
    try {
      await fs.access(folderPath, fs.constants.R_OK)
      
      // Count image files
      const files = await fs.readdir(folderPath)
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'].includes(ext)
      })
      
      return { 
        valid: true, 
        message: `Photos folder validated successfully`,
        fileCount: imageFiles.length
      }
    } catch {
      return { valid: false, message: 'Directory is not readable' }
    }
  } catch (error) {
    return { valid: false, message: 'Directory does not exist or is not accessible' }
  }
})

// App Settings handlers
ipcMain.handle('get-setting', async (event, key) => {
  try {
    const result = await databaseManager.getSetting(key)
    return result
  } catch (error) {
    console.error('Error getting setting:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-setting', async (event, key, value) => {
  try {
    const result = await databaseManager.setSetting(key, value)
    return result
  } catch (error) {
    console.error('Error setting setting:', error)
    return { success: false, error: error.message }
  }
})