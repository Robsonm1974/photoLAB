const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { spawn } = require('child_process')

/**
 * PhotoLab Main Process
 * 
 * Handles Electron app lifecycle and IPC communications.
 * Follows architecture patterns from project_rules.md
 */

// Keep a global reference of the window object
let mainWindow

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
app.whenReady().then(() => {
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

// Read and parse CSV file
ipcMain.handle('parse-csv', async (event, filePath) => {
  try {
    // Try different encodings
    let csvData
    try {
      csvData = await fs.readFile(filePath, 'utf-8')
    } catch (utf8Error) {
      try {
        csvData = await fs.readFile(filePath, 'latin1')
      } catch (latin1Error) {
        csvData = await fs.readFile(filePath, 'ascii')
      }
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

// Generate credentials for participants
ipcMain.handle('generate-credentials', async (event, { participants, eventName, config }) => {
  try {
    console.log('Generating credentials for', participants.length, 'participants')
    
    // For now, return mock credentials data
    // In a real implementation, this would generate actual PDF/HTML credentials
    const credentials = participants.map(participant => ({
      id: participant.qrCode,
      name: participant.name,
      turma: participant.turma,
      qrCode: participant.qrCode,
      eventName: eventName,
      generatedAt: new Date().toISOString(),
      config: config
    }))
    
    return {
      success: true,
      credentials: credentials,
      message: `${credentials.length} credenciais geradas com sucesso`
    }
  } catch (error) {
    console.error('Error generating credentials:', error)
    return { success: false, error: error.message }
  }
})

// Print credentials
ipcMain.handle('print-credentials', async (event, credentials) => {
  try {
    console.log('Printing', credentials.length, 'credentials')
    
    // For now, just show a success message
    // In a real implementation, this would send to printer
    return {
      success: true,
      message: `${credentials.length} credenciais enviadas para impressão`
    }
  } catch (error) {
    console.error('Error printing credentials:', error)
    return { success: false, error: error.message }
  }
})

// Save credentials as PDF
ipcMain.handle('save-credentials', async (event, credentials, eventName) => {
  try {
    console.log('Saving', credentials.length, 'credentials as PDF')
    
    // For now, just show a success message
    // In a real implementation, this would generate and save PDF
    const fileName = `credenciais_${eventName}_${new Date().toISOString().split('T')[0]}.pdf`
    const filePath = path.join(process.cwd(), 'output', fileName)
    
    return {
      success: true,
      filePath: filePath,
      message: `Credenciais salvas em: ${filePath}`
    }
  } catch (error) {
    console.error('Error saving credentials:', error)
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
 * Utility Functions
 */

// Sanitize file names for cross-platform compatibility
function sanitizeFileName(fileName) {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}
