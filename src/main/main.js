const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { spawn } = require('child_process')
const DatabaseManager = require('./database')
const QRCode = require('qrcode')

/**
 * PhotoLab Main Process
 * 
 * Handles Electron app lifecycle and IPC communications.
 * Follows architecture patterns from project_rules.md
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
      preload: path.join(__dirname, 'preload.js')
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

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * App event handlers
 */
app.whenReady().then(async () => {
  console.log('App is ready, initializing database...')
  
  // Initialize database
  databaseManager = new DatabaseManager()
  const dbInit = await databaseManager.initialize()
  
  if (!dbInit.success) {
    console.error('Failed to initialize database:', dbInit.error)
    // Don't exit, continue without database for now
  } else {
    console.log('Database initialized successfully:', dbInit.dbPath)
  }

  createWindow()

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
  })
})

/**
 * IPC Handlers for File System Operations
 */

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecionar Pasta de Origem',
      buttonLabel: 'Selecionar'
    })
    
    return result
  } catch (error) {
    console.error('Error selecting folder:', error)
    throw error
  }
})

// Handle file selection
ipcMain.handle('select-file', async (event, filters = []) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Selecionar Arquivo',
      buttonLabel: 'Abrir',
      filters: filters
    })
    
    return result
  } catch (error) {
    console.error('Error selecting file:', error)
    throw error
  }
})

// Validate folder and count JPG files
ipcMain.handle('validate-folder', async (event, folderPath) => {
  try {
    const stats = await fs.stat(folderPath)
    
    if (!stats.isDirectory()) {
      return { 
        valid: false, 
        message: 'O caminho selecionado não é uma pasta' 
      }
    }

    // Read folder contents
    const files = await fs.readdir(folderPath)
    
    // Filter JPG files
    const jpgFiles = files.filter(file => 
      /\.(jpg|jpeg)$/i.test(file)
    )

    if (jpgFiles.length === 0) {
      return { 
        valid: false, 
        message: 'Nenhum arquivo JPG encontrado na pasta selecionada' 
      }
    }

    return { 
      valid: true, 
      message: `Encontrados ${jpgFiles.length} arquivos JPG`,
      fileCount: jpgFiles.length,
      files: jpgFiles
    }
  } catch (error) {
    return { 
      valid: false, 
      message: `Erro ao acessar pasta: ${error.message}` 
    }
  }
})

// Validate destination folder (without JPG validation) - NEW
ipcMain.handle('validate-destination-folder', async (event, folderPath) => {
  try {
    const stats = await fs.stat(folderPath)
    
    if (!stats.isDirectory()) {
      return { 
        valid: false, 
        message: 'O caminho selecionado não é uma pasta' 
      }
    }

    return { 
      valid: true, 
      message: 'Pasta de destino válida'
    }
  } catch (error) {
    return { 
      valid: false, 
      message: `Erro ao acessar pasta: ${error.message}` 
    }
  }
})

// Read and parse CSV file
ipcMain.handle('parse-csv', async (event, filePath) => {
  try {
    // Read raw bytes to decide encoding (avoid mojibake like "JoÃ£o")
    const buffer = await fs.readFile(filePath)

    // Helper to detect common mojibake patterns when UTF-8 is misread
    const looksMojibake = (text) => {
      const suspicious = (text.match(/[ÃÂ][\x80-\xBF]/g) || []).length
      return suspicious > 0
    }

    // Decode preferring UTF-8 (remove BOM), fallback to latin1 if mojibake
    let csvData = buffer.toString('utf8')
    if (csvData.charCodeAt(0) === 0xFEFF) {
      csvData = csvData.slice(1)
    }
    if (looksMojibake(csvData)) {
      csvData = buffer.toString('latin1')
    }
    
    console.log('CSV file read successfully:', filePath)
    console.log('Raw CSV data length:', csvData.length)
    console.log('First 200 chars:', csvData.substring(0, 200))
    
    if (!csvData || csvData.trim().length === 0) {
      return {
        success: false,
        error: 'Arquivo CSV está vazio ou não pôde ser lido'
      }
    }
    
    // Normalize line endings and split
    const normalizedData = csvData.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedData.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    console.log('Total lines found:', lines.length)
    console.log('First line:', lines[0])
    
    if (lines.length === 0) {
      return {
        success: false,
        error: 'Nenhuma linha de dados encontrada no arquivo CSV'
      }
    }
    
    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0]
    const commaCount = (firstLine.match(/,/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length
    const delimiter = semicolonCount > commaCount ? ';' : ','
    
    console.log('Detected delimiter:', delimiter)
    
    // Parse headers
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/['"]/g, ''))
    console.log('Headers found:', headers)
    
    // Check if we have the required headers (flexible matching)
    const requiredPatterns = [
      ['name', 'nome'], 
      ['turma', 'class', 'classe'], 
      ['qr', 'code', 'qrcode']
    ]
    
    const missingHeaders = []
    requiredPatterns.forEach((patterns, index) => {
      const found = headers.some(h => 
        patterns.some(pattern => h.toLowerCase().includes(pattern.toLowerCase()))
      )
      if (!found) {
        missingHeaders.push(patterns[0])
      }
    })
    
    if (missingHeaders.length > 0) {
      console.log('Required headers missing. Found:', headers)
      console.log('Missing patterns:', missingHeaders)
      return {
        success: false,
        error: `Colunas obrigatórias não encontradas. Esperado: name/nome, turma, qr/code. Encontrado: ${headers.join(', ')}`
      }
    }
    
    // Map headers to standard field names
    const fieldMapping = {}
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase()
      if (lowerHeader.includes('nome') || lowerHeader.includes('name')) {
        fieldMapping.name = header
      } else if (lowerHeader.includes('turma') || lowerHeader.includes('class')) {
        fieldMapping.turma = header
      } else if (lowerHeader.includes('qr') || lowerHeader.includes('code')) {
        fieldMapping.qrCode = header
      }
    })
    
    console.log('Field mapping:', fieldMapping)
    
    // Parse data rows
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      
      const values = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''))
      const rawRow = {}
      const standardRow = {}
      
      // Create both raw and standardized row
      headers.forEach((header, index) => {
        rawRow[header] = values[index] || ''
      })
      
      // Map to standard field names
      standardRow.name = rawRow[fieldMapping.name] || ''
      standardRow.turma = rawRow[fieldMapping.turma] || ''
      standardRow.qrCode = rawRow[fieldMapping.qrCode] || ''
      
      // Only add rows that have at least a name
      if (standardRow.name && standardRow.name.trim()) {
        data.push(standardRow)
      }
    }

    console.log('Parsed data rows:', data.length)
    console.log('First data row:', data[0])

    return {
      success: true,
      data: data,
      headers: headers,
      delimiter: delimiter,
      totalLines: lines.length
    }
  } catch (error) {
    console.error('Error parsing CSV:', error)
    return {
      success: false,
      error: `Erro ao processar arquivo CSV: ${error.message}`
    }
  }
})

// Create directory structure
ipcMain.handle('create-directories', async (event, basePath, eventName, participants) => {
  const results = {
    created: [],
    errors: []
  }

  try {
    for (const participant of participants) {
      const sanitizedName = sanitizeFileName(participant.name)
      const folderName = `${sanitizedName} - ${participant.qrCode}`
      const fullPath = path.join(
        basePath,
        sanitizeFileName(eventName),
        sanitizeFileName(participant.turma),
        folderName
      )

      try {
        await fs.mkdir(fullPath, { recursive: true })
        results.created.push(fullPath)
      } catch (error) {
        results.errors.push({
          participant: participant.name,
          error: error.message
        })
      }
    }

    return { success: true, results }
  } catch (error) {
    console.error('Directory creation error:', error)
    return { success: false, error: error.message }
  }
})

/**
 * Utility Functions
 */

// Open folder in file explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath)
    return { success: true }
  } catch (error) {
    console.error('Error opening folder:', error)
    return { success: false, error: error.message }
  }
})

// Process photos with QR detection and grouping (Phase 2)
// Generate thumbnail for photo
ipcMain.handle('generate-thumbnail', async (event, photoPath) => {
  try {
    console.log('Generating thumbnail for:', photoPath)
    
    // Check if file exists using async method
    try {
      await fs.access(photoPath)
    } catch (accessError) {
      console.log('File not found:', photoPath)
      return { success: false, error: 'File not found' }
    }
    
    // Read the image file and convert to base64
    const imageBuffer = await fs.readFile(photoPath)
    const base64 = imageBuffer.toString('base64')
    const mimeType = photoPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    
    console.log('Thumbnail generated successfully for:', photoPath)
    return {
      success: true,
      dataUrl: `data:${mimeType};base64,${base64}`
    }
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return { success: false, error: error.message }
  }
})

// Finalize processing: run only the copy stage with current grouping results
// Save only ungrouped photos to destination (without reprocessing)
ipcMain.handle('save-ungrouped-photos', async (event, { destinationFolder, ungroupedPhotos, eventName }) => {
  try {
    if (!destinationFolder) return { success: false, error: 'Destination folder missing' }
    const ungroupedFolder = path.join(destinationFolder, eventName || 'Evento', 'Não Agrupadas')
    await fs.mkdir(ungroupedFolder, { recursive: true })

    const moved = []
    const errors = []
    for (const photo of ungroupedPhotos || []) {
      try {
        const sourcePath = typeof photo === 'string' ? photo : (photo.file_path || photo.path)
        if (!sourcePath) continue
        const fileName = path.basename(sourcePath)
        const destPath = path.join(ungroupedFolder, fileName)
        await fs.copyFile(sourcePath, destPath)
        moved.push({ from: sourcePath, to: destPath })
      } catch (e) {
        errors.push({ photo, error: e.message })
      }
    }

    return { success: errors.length === 0, moved, errors }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Função utilitária para renderizar HTML offscreen e salvar como PNG
async function renderCredentialToPng(html, outputPath) {
  const { BrowserWindow } = require('electron')
  
  const width = 283
  const height = 425
  
  const win = new BrowserWindow({
    show: false,
    width: width,
    height: height,
    useContentSize: true,
    backgroundColor: '#ffffffff',
    webPreferences: { 
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  
  // Forçar zoom = 1
  win.webContents.setVisualZoomLevelLimits(1, 1)
  win.webContents.setZoomFactor(1)
  
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    
    // Esperar fontes carregarem em vez de setTimeout
    await win.webContents.executeJavaScript('document.fonts ? document.fonts.ready : Promise.resolve()')
    
    // Capturar a página com dimensões específicas
    const image = await win.webContents.capturePage({
      x: 0,
      y: 0,
      width: width,
      height: height
    })
    const buffer = image.toPNG()
    
    await fs.writeFile(outputPath, buffer)
    return outputPath
  } finally {
    await win.destroy()
  }
}

// Generate credential HTML with CSS (10x15cm format)
async function generateCredentialHTML({ participant, eventName, qrCodeDataURL, config }) {
  // Sistema de coordenadas em pixels fixos
  const baseWidth = 283
  const baseHeight = 425
  
  const backgroundStyle = config.backgroundImage 
    ? `background-image: url('${config.backgroundImage}'); background-size: cover; background-position: center;`
    : 'background-color: #FFFFFF;'
  
  // Valores em pixels (iguais para width e height do QR)
  const qrSizePx = config.qrCode?.size || 144
  const qrLeftPx = config.qrCode?.x || 93
  const qrTopPx = config.qrCode?.y || 105
  
  const nameLeftPx = config.name?.x || 96
  const nameTopPx = config.name?.y || 288
  const nameFontPt = config.name?.fontSize || 12
  
  const turmaLeftPx = config.turma?.x || 12
  const turmaTopPx = config.turma?.y || 84
  const turmaFontPt = config.turma?.fontSize || 10
  
  const urlLeftPx = config.photographerUrl?.x || 12
  const urlTopPx = config.photographerUrl?.y || 96
  const urlFontPt = config.photographerUrl?.fontSize || 8
  
  const eventLeftPx = config.eventName?.x || 12
  const eventTopPx = config.eventName?.y || 120
  const eventFontPt = config.eventName?.fontSize || 9
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Credencial - ${participant.name}</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            width: 283px;
            height: 425px;
            ${backgroundStyle}
            font-family: Arial, sans-serif;
            position: relative;
            overflow: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .credential-container {
            width: 100%;
            height: 100%;
            position: relative;
        }
        
        .qr-code {
            position: absolute;
            width: ${qrSizePx}px;
            height: ${qrSizePx}px;
            left: ${qrLeftPx}px;
            top: ${qrTopPx}px;
            aspect-ratio: 1 / 1;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
        
        .participant-name {
            position: absolute;
            left: ${nameLeftPx}px;
            top: ${nameTopPx}px;
            color: ${config.name?.color || '#000000'};
            font-size: ${nameFontPt}pt;
            font-family: ${config.name?.fontFamily || 'Arial'};
            font-weight: bold;
        }
        
        .participant-turma {
            position: absolute;
            left: ${turmaLeftPx}px;
            top: ${turmaTopPx}px;
            color: ${config.turma?.color || '#666666'};
            font-size: ${turmaFontPt}pt;
            font-family: ${config.turma?.fontFamily || 'Arial'};
        }
        
        .photographer-url {
            position: absolute;
            left: ${urlLeftPx}px;
            top: ${urlTopPx}px;
            color: ${config.photographerUrl?.color || '#0066CC'};
            font-size: ${urlFontPt}pt;
            font-family: ${config.photographerUrl?.fontFamily || 'Arial'};
        }
        
        .event-name {
            position: absolute;
            left: ${eventLeftPx}px;
            top: ${eventTopPx}px;
            color: ${config.eventName?.color || '#333333'};
            font-size: ${eventFontPt}pt;
            font-family: ${config.eventName?.fontFamily || 'Arial'};
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="credential-container">
        ${config.qrCode?.enabled ? `<img src="${qrCodeDataURL}" class="qr-code" alt="QR Code ${participant.qrCode}" />` : ''}
        ${config.name?.enabled ? `<div class="participant-name">${participant.name}</div>` : ''}
        ${config.turma?.enabled ? `<div class="participant-turma">${participant.turma}</div>` : ''}
        ${config.photographerUrl?.enabled ? `<div class="photographer-url">${config.photographerUrl.text || 'https://photomanager.com'}</div>` : ''}
        ${config.eventName?.enabled ? `<div class="event-name">${eventName}</div>` : ''}
    </div>
</body>
</html>`
}

// Generate credentials for participants
ipcMain.handle('generate-credentials', async (event, { participants, eventName, config, destinationFolder }) => {
  try {
    console.log('Generating credentials for', participants.length, 'participants')
    
    // Use destination folder if provided, otherwise fallback to current directory
    const baseFolder = destinationFolder || process.cwd()
    const outputDir = path.join(baseFolder, 'credenciais_geradas')
    await fs.mkdir(outputDir, { recursive: true })
    
    const generatedCredentials = []
    
    for (const participant of participants) {
      try {
        // Generate QR code as data URL (ajustado para 72 DPI)
        const qrCodeSize = config.qrCode?.size || 144 // 600 * (283/1181) ≈ 144
        const qrCodeDataURL = await QRCode.toDataURL(participant.qrCode, {
          width: qrCodeSize,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        
        // Generate credential HTML
        const credentialHTML = await generateCredentialHTML({
          participant,
          eventName,
          qrCodeDataURL,
          config
        })
        
        // Nome do arquivo PNG
        const safeName = participant.name.replace(/[^a-zA-Z0-9]/g, '_')
        const fileName = `credential_${safeName}_${participant.qrCode}.png`
        const filePath = path.join(outputDir, fileName)
        
        // Renderizar e salvar como PNG
        await renderCredentialToPng(credentialHTML, filePath)
        
        generatedCredentials.push({
          id: participant.qrCode,
          name: participant.name,
          turma: participant.turma,
          qrCode: participant.qrCode,
          eventName: eventName,
          filePath: filePath,
          generatedAt: new Date().toISOString(),
          config: config
        })
        
        console.log(`Credential saved: ${filePath}`)
      } catch (error) {
        console.error(`Error generating credential for ${participant.name}:`, error)
      }
    }
    
    return {
      success: true,
      credentials: generatedCredentials,
      message: `${generatedCredentials.length} credenciais salvas como imagens`,
      outputDirectory: outputDir
    }
  } catch (error) {
    console.error('Error generating credentials:', error)
    return { success: false, error: error.message }
  }
})

// Generate HTML for printing all credentials
function generateCredentialsPrintHTML(credentials, eventName) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Credenciais - ${eventName}</title>
    <style>
        @page { 
            size: A4; 
            margin: 5mm; 
        }
        
        body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
        }
        
        .grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 5mm; 
        }
        
        .cell { 
            width: 100mm; 
            height: 150mm; 
            page-break-inside: avoid; 
        }
        
        .cell img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            display: block; 
        }
    </style>
</head>
<body>
    <div class="grid">
        ${credentials.map(c => `
            <div class="cell">
                <img src="file://${c.filePath}" alt="${c.name}">
            </div>`).join('')}
    </div>
    <script>window.onload=()=>setTimeout(()=>print(),800)</script>
</body>
</html>`
}

// Print credentials
ipcMain.handle('print-credentials', async (event, credentials, eventName) => {
  try {
    console.log('Printing', credentials.length, 'credentials')
    
    // Create HTML with the generated images
    const htmlContent = generateCredentialsPrintHTML(credentials, eventName)
    
    // Create temporary HTML file
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    
    const tempHtmlPath = path.join(tempDir, `credentials_print_${Date.now()}.html`)
    await fs.writeFile(tempHtmlPath, htmlContent, 'utf8')
    
    // Open in browser for printing
    await shell.openPath(tempHtmlPath)
    
    // Clean up after delay
    setTimeout(async () => {
      try {
        await fs.unlink(tempHtmlPath)
      } catch (e) {
        console.warn('Could not delete temp file:', e.message)
      }
    }, 10000)
    
    return {
      success: true,
      message: `Abrindo ${credentials.length} credenciais para impressão`
    }
  } catch (error) {
    console.error('Error printing credentials:', error)
    return { success: false, error: error.message }
  }
})

// Save credentials as images
ipcMain.handle('save-credentials', async (event, credentials, eventName, destinationFolder) => {
  try {
    console.log('Confirming', credentials.length, 'credentials are saved as PNG images')
    
    // Use destination folder if provided
    const baseFolder = destinationFolder || process.cwd()
    const outputFolder = path.join(baseFolder, 'credenciais_geradas')
    
    // Verify that the PNG files exist
    const savedFiles = []
    for (const credential of credentials) {
      if (credential.filePath) {
        try {
          await fs.access(credential.filePath)
          savedFiles.push(credential.filePath)
        } catch (e) {
          console.warn(`PNG file not found: ${credential.filePath}`)
        }
      }
    }
    
    return {
      success: true,
      filePath: outputFolder,
      savedFiles: savedFiles,
      message: `${savedFiles.length} credenciais PNG confirmadas em: ${outputFolder}`
    }
  } catch (error) {
    console.error('Error confirming credentials:', error)
    return { success: false, error: error.message }
  }
})

// Handle manual photo assignment
ipcMain.handle('assign-photos-to-participant', async (event, { photos, participant, destinationFolder }) => {
  try {
    const participantFolder = path.join(destinationFolder, participant)
    
    // Ensure participant folder exists
    await fs.mkdir(participantFolder, { recursive: true })
    
    const results = {
      success: true,
      moved: [],
      errors: []
    }
    
    for (const photo of photos) {
      try {
        // Handle both string paths and photo objects
        const photoPath = typeof photo === 'string' ? photo : (photo.path || photo.file_path)
        if (!photoPath) {
          console.error('Invalid photo path:', photo)
          continue
        }
        
        const fileName = path.basename(photoPath)
        const destPath = path.join(participantFolder, fileName)
        
        // Copy file to participant folder
        await fs.copyFile(photoPath, destPath)
        results.moved.push({ from: photoPath, to: destPath })
        
        console.log(`Moved photo ${fileName} to ${participant} folder`)
      } catch (error) {
        const photoPath = typeof photo === 'string' ? photo : (photo.path || photo.file_path || 'unknown')
        console.error(`Error moving photo ${photoPath}:`, error)
        results.errors.push({ photo: photoPath, error: error.message })
      }
    }
    
    results.success = results.errors.length === 0
    return results
    
  } catch (error) {
    console.error('Error in assign-photos-to-participant:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle('process-photos', async (event, config) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting photo processing with config:', config)
      
      // Create temporary config file
      const tempConfigPath = path.join(__dirname, '..', 'python', 'temp_config.json')
      
      // Write config to temp file
      fs.writeFile(tempConfigPath, JSON.stringify(config, null, 2))
        .then(() => {
          // Get Python script path
          const pythonScriptPath = path.join(__dirname, '..', 'python', 'main.py')
          
          // Spawn Python process
          const pythonProcess = spawn('python', [pythonScriptPath, tempConfigPath], {
            cwd: path.join(__dirname, '..', 'python'),
            stdio: ['pipe', 'pipe', 'pipe']
          })
          
          let outputData = ''
          let errorData = ''
          
          // Collect stdout
          pythonProcess.stdout.on('data', (data) => {
            const output = data.toString()
            outputData += output
            
            // Try to parse progress updates (lines that start with specific markers)
            const lines = output.split('\n')
            for (const line of lines) {
              if (line.includes('[QR_DETECTION]') || line.includes('[GROUPING]')) {
                // Send progress update to renderer
                event.sender.send('processing-progress', {
                  stage: line.includes('[QR_DETECTION]') ? 'qr_detection' : 'grouping',
                  message: line
                })
              }
            }
          })
          
          // Collect stderr
          pythonProcess.stderr.on('data', (data) => {
            const output = data.toString()
            errorData += output
            console.error('Python stderr:', output)
            
            // Send progress updates based on stderr logs
            if (output.includes('Step 1:') || output.includes('Detecting QR codes')) {
              event.sender.send('processing-progress', {
                stage: 'qr_detection',
                message: 'Detectando QR codes...',
                percentage: 10
              })
            } else if (output.includes('Step 2:') || output.includes('Grouping photos')) {
              event.sender.send('processing-progress', {
                stage: 'grouping',
                message: 'Agrupando fotos...',
                percentage: 50
              })
            } else if (output.includes('Step 3:') || output.includes('Copying photos')) {
              event.sender.send('processing-progress', {
                stage: 'copying',
                message: 'Copiando fotos...',
                percentage: 75
              })
            } else if (output.includes('QR detected')) {
              event.sender.send('processing-progress', {
                stage: 'qr_detection',
                message: output.trim(),
                percentage: 25
              })
            } else if (output.includes('Copied') && output.includes('folder')) {
              event.sender.send('processing-progress', {
                stage: 'copying',
                message: output.trim(),
                percentage: 85
              })
            }
          })
          
          // Handle process completion
          pythonProcess.on('close', async (code) => {
            try {
              // Clean up temp config file
              await fs.unlink(tempConfigPath).catch(() => {}) // Ignore errors
              
              if (code === 0) {
                // Success - extract JSON from output
                try {
                  const jsonMatch = outputData.match(/==JSON_START==([\s\S]*?)==JSON_END==/);
                  if (jsonMatch && jsonMatch[1]) {
                    const jsonData = jsonMatch[1].trim();
                    const result = JSON.parse(jsonData);
                    console.log('Photo processing completed successfully');
                    resolve(result);
                  } else {
                    console.error('No JSON markers found in output');
                    console.log('Raw output:', outputData);
                    resolve({
                      success: false,
                      error: 'No valid JSON result found in output',
                      raw_output: outputData
                    });
                  }
                } catch (parseError) {
                  console.error('Error parsing Python JSON:', parseError);
                  console.log('Raw output:', outputData);
                  resolve({
                    success: false,
                    error: 'Failed to parse processing results',
                    raw_output: outputData,
                    parse_error: parseError.message
                  });
                }
              } else {
                // Error
                console.error('Python process failed with code:', code)
                console.error('Error output:', errorData)
                resolve({
                  success: false,
                  error: `Processing failed with exit code ${code}`,
                  details: errorData,
                  raw_output: outputData
                })
              }
            } catch (cleanupError) {
              console.error('Cleanup error:', cleanupError)
              resolve({
                success: false,
                error: 'Process completed but cleanup failed',
                details: cleanupError.message
              })
            }
          })
          
          // Handle process errors
          pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error)
            resolve({
              success: false,
              error: 'Failed to start photo processing',
              details: error.message
            })
          })
          
        })
        .catch((writeError) => {
          console.error('Failed to write config file:', writeError)
          resolve({
            success: false,
            error: 'Failed to create configuration file',
            details: writeError.message
          })
        })
        
    } catch (error) {
      console.error('Photo processing setup error:', error)
      resolve({
        success: false,
        error: 'Failed to setup photo processing',
        details: error.message
      })
    }
  })
})

// Check Python dependencies
ipcMain.handle('check-python-dependencies', async () => {
  return new Promise((resolve) => {
    try {
      // Check if Python is available
      const pythonProcess = spawn('python', ['--version'], { stdio: 'pipe' })
      
      let output = ''
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      pythonProcess.stderr.on('data', (data) => {
        output += data.toString()
      })
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          // Python available, check dependencies
          checkPythonPackages(resolve, output)
        } else {
          resolve({
            success: false,
            error: 'Python not found or not working',
            details: output
          })
        }
      })
      
      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: 'Python not found',
          details: error.message
        })
      })
      
    } catch (error) {
      resolve({
        success: false,
        error: 'Failed to check Python',
        details: error.message
      })
    }
  })
})

// Helper function to check Python packages
function checkPythonPackages(resolve, pythonVersion) {
  const requiredPackages = ['opencv-python', 'pyzbar', 'numpy']
  const checkProcess = spawn('python', ['-c', 
    `import sys; packages = ['cv2', 'pyzbar', 'numpy']; 
     results = []; 
     for pkg in packages: 
       try: 
         __import__(pkg); results.append(f'{pkg}:OK') 
       except ImportError: 
         results.append(f'{pkg}:MISSING'); 
     print('\\n'.join(results))`
  ], { stdio: 'pipe' })
  
  let output = ''
  
  checkProcess.stdout.on('data', (data) => {
    output += data.toString()
  })
  
  checkProcess.on('close', (code) => {
    const results = output.trim().split('\n')
    const missing = results.filter(r => r.includes('MISSING')).map(r => r.split(':')[0])
    
    resolve({
      success: missing.length === 0,
      python_version: pythonVersion.trim(),
      required_packages: requiredPackages,
      missing_packages: missing,
      package_status: results
    })
  })
  
  checkProcess.on('error', () => {
    resolve({
      success: false,
      error: 'Failed to check Python packages',
      python_version: pythonVersion.trim()
    })
  })
}

/**
 * Database IPC Handlers
 */

// Save project
ipcMain.handle('save-project', async (event, projectData) => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.saveProject(projectData)
    return result
  } catch (error) {
    console.error('Error in save-project handler:', error)
    return { success: false, error: error.message }
  }
})

// Get all projects
ipcMain.handle('get-projects', async () => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.getProjects()
    return result
  } catch (error) {
    console.error('Error in get-projects handler:', error)
    return { success: false, error: error.message }
  }
})

// Get project by ID
ipcMain.handle('get-project', async (event, projectId) => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.getProject(projectId)
    return result
  } catch (error) {
    console.error('Error in get-project handler:', error)
    return { success: false, error: error.message }
  }
})

// Save processing results
ipcMain.handle('save-processing-results', async (event, projectId, results) => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.saveProcessingResults(projectId, results)
    return result
  } catch (error) {
    console.error('Error in save-processing-results handler:', error)
    return { success: false, error: error.message }
  }
})

// Delete project
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.deleteProject(projectId)
    return result
  } catch (error) {
    console.error('Error in delete-project handler:', error)
    return { success: false, error: error.message }
  }
})

// Cache QR result
ipcMain.handle('cache-qr-result', async (event, filePath, qrCode, confidence, fileHash) => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.cacheQRResult(filePath, qrCode, confidence, fileHash)
    return result
  } catch (error) {
    console.error('Error in cache-qr-result handler:', error)
    return { success: false, error: error.message }
  }
})

// Get cached QR result
ipcMain.handle('get-cached-qr-result', async (event, filePath, fileHash) => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.getCachedQRResult(filePath, fileHash)
    return result
  } catch (error) {
    console.error('Error in get-cached-qr-result handler:', error)
    return { success: false, error: error.message }
  }
})

// Update project configuration
ipcMain.handle('update-project-config', async (event, projectId, config) => {
  try {
    if (!databaseManager) {
      return { success: false, error: 'Database not initialized' }
    }
    const result = await databaseManager.updateProjectConfig(projectId, config)
    return result
  } catch (error) {
    console.error('Error in update-project-config handler:', error)
    return { success: false, error: error.message }
  }
})

/**
 * Utility Functions
 */

// Generate HTML content for credentials printing
function generateCredentialsHTML(credentials, eventName) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Credenciais - ${eventName}</title>
    <style>
        @page {
            size: A4;
            margin: 1cm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .credentials-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            max-width: 100%;
        }
        
        .credential {
            border: 2px solid #333;
            padding: 15px;
            text-align: center;
            background: white;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
        }
        
        .credential-header {
            font-size: 14px;
            font-weight: bold;
            color: #666;
            margin-bottom: 10px;
        }
        
        .qr-code {
            width: 80px;
            height: 80px;
            margin: 10px auto;
            background: #f0f0f0;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #666;
        }
        
        .participant-name {
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
            color: #333;
        }
        
        .participant-class {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .event-name {
            font-size: 12px;
            color: #999;
            margin-top: auto;
        }
        
        .photographer-url {
            font-size: 10px;
            color: #0066CC;
            margin-top: 5px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 10px;
            }
            
            .credentials-container {
                gap: 15px;
            }
            
            .credential {
                min-height: 180px;
            }
        }
    </style>
</head>
<body>
    <div class="credentials-container">
        ${credentials.map(credential => `
            <div class="credential">
                <div class="credential-header">CREDENCIAL DE PARTICIPAÇÃO</div>
                <div class="qr-code">QR: ${credential.qrCode}</div>
                <div class="participant-name">${credential.name}</div>
                <div class="participant-class">${credential.turma}</div>
                <div class="event-name">${eventName}</div>
                <div class="photographer-url">https://photomanager.com</div>
            </div>
        `).join('')}
    </div>
    
    <script>
        // Auto-print when page loads
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 1000);
        };
    </script>
</body>
</html>`
  
  return html
}

// Sanitize file names for cross-platform compatibility
function sanitizeFileName(fileName) {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

// Handle photos folder selection - NEW
ipcMain.handle('select-photos-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecionar Pasta das Fotos Originais',
      buttonLabel: 'Selecionar Pasta'
    })
    
    return result
  } catch (error) {
    console.error('Error selecting photos folder:', error)
    throw error
  }
})

// Validate photos folder - NEW
ipcMain.handle('validate-photos-folder', async (event, folderPath) => {
  try {
    const stats = await fs.stat(folderPath)
    
    if (!stats.isDirectory()) {
      return { 
        valid: false, 
        message: 'O caminho selecionado não é uma pasta' 
      }
    }

    // Read folder contents
    const files = await fs.readdir(folderPath)
    
    // Filter JPG files
    const jpgFiles = files.filter(file => 
      /\.(jpg|jpeg)$/i.test(file)
    )

    if (jpgFiles.length === 0) {
      return { 
        valid: false, 
        message: 'Nenhum arquivo JPG encontrado na pasta selecionada' 
      }
    }

    return { 
      valid: true, 
      message: `Encontrados ${jpgFiles.length} arquivos JPG`,
      fileCount: jpgFiles.length,
      files: jpgFiles
    }
  } catch (error) {
    return { 
      valid: false, 
      message: `Erro ao acessar pasta: ${error.message}` 
    }
  }
})

// Cleanup database on app quit
app.on('before-quit', () => {
  if (databaseManager) {
    databaseManager.close()
  }
})
