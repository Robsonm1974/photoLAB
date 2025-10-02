const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs').promises
const { app } = require('electron')

/**
 * PhotoLab Database Manager
 * 
 * Handles all database operations for project persistence.
 * Uses SQLite for local data storage.
 */
class DatabaseManager {
  constructor() {
    this.db = null
    this.dbPath = null
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      // Create app data directory if it doesn't exist
      const userDataPath = app.getPath('userData')
      const dbDir = path.join(userDataPath, 'database')
      
      await fs.mkdir(dbDir, { recursive: true })
      
      this.dbPath = path.join(dbDir, 'photolab.db')
      
      // Open database connection
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err)
          throw err
        }
        console.log('Connected to SQLite database:', this.dbPath)
      })

      // Create tables
      await this.createTables()
      
      return { success: true, dbPath: this.dbPath }
    } catch (error) {
      console.error('Database initialization error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Create database tables
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      const createProjectsTable = `
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          event_name TEXT NOT NULL,
          source_folder TEXT, -- Pasta de destino (onde criar estrutura)
          destination_folder TEXT, -- Pasta de destino (onde criar estrutura)
          photos_folder TEXT NOT NULL, -- Pasta das fotos originais
          participants TEXT, -- JSON string com lista de participantes
          config TEXT, -- JSON string com configurações do projeto
          status TEXT DEFAULT 'active', -- active, completed, archived
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      const createProcessingResultsTable = `
        CREATE TABLE IF NOT EXISTS processing_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          stage TEXT NOT NULL, -- qr_detection, grouping, copying, completed
          results TEXT, -- JSON string com resultados
          status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )
      `
      
      const createQRCacheTable = `
        CREATE TABLE IF NOT EXISTS qr_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT NOT NULL,
          file_hash TEXT NOT NULL,
          qr_code TEXT,
          confidence REAL,
          detection_method TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(file_path, file_hash)
        )
      `
      
      const createCredentialsTable = `
        CREATE TABLE IF NOT EXISTS credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          participant_name TEXT NOT NULL,
          qr_code TEXT NOT NULL,
          turma TEXT,
          file_path TEXT,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )
      `
      
      const createTemplatesTable = `
        CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL, -- anuario, natalino, formatura, etc
          template_data TEXT, -- JSON string com configurações do template
          preview_image TEXT, -- Caminho para imagem de preview
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      const createTemplateResultsTable = `
        CREATE TABLE IF NOT EXISTS template_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          template_id INTEGER NOT NULL,
          participant_id TEXT NOT NULL,
          output_file_path TEXT,
          status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
          FOREIGN KEY (template_id) REFERENCES templates (id) ON DELETE CASCADE
        )
      `
      
      const createAppSettingsTable = `
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      // Execute all table creation queries
      const queries = [
        createProjectsTable,
        createProcessingResultsTable,
        createQRCacheTable,
        createCredentialsTable,
        createTemplatesTable,
        createTemplateResultsTable,
        createAppSettingsTable
      ]
      
      let completed = 0
      let hasError = false
      
      queries.forEach((query, index) => {
        this.db.run(query, (err) => {
          if (err) {
            console.error(`Error creating table ${index + 1}:`, err)
            hasError = true
            reject(err)
          } else {
            completed++
            console.log(`Table ${index + 1} created successfully`)
            
            if (completed === queries.length && !hasError) {
              console.log('All database tables created successfully')
              resolve()
            }
          }
        })
      })
    })
  }

  /**
   * Run a SQL query
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID, changes: this.changes })
        }
      })
    })
  }

  /**
   * Get a single row
   */
  getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  /**
   * Get multiple rows
   */
  getRows(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  /**
   * Save a new project
   */
  async saveProject(projectData) {
    return new Promise((resolve, reject) => {
      try {
        const {
          name,
          eventName,
          sourceFolder,
          destinationFolder,
          photosFolder,
          participants,
          config
        } = projectData
        
        const participantsJson = JSON.stringify(participants || [])
        const configJson = JSON.stringify(config || {})
        
        console.log('Saving project with data:', {
          name,
          eventName,
          sourceFolder,
          destinationFolder,
          photosFolder,
          participants: participants?.length || 0,
          config: Object.keys(config || {})
        })
        
        const query = `
          INSERT INTO projects (
            name, event_name, source_folder, destination_folder, 
            photos_folder, participants, config, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `
        
        this.db.run(query, [
          name,
          eventName,
          sourceFolder || null,
          destinationFolder,
          photosFolder,
          participantsJson,
          configJson
        ], function(err) {
          if (err) {
            console.error('Error saving project:', err)
            reject(err)
          } else {
            console.log(`Project saved with ID: ${this.lastID}`)
            resolve({
              success: true,
              projectId: this.lastID
            })
          }
        })
      } catch (error) {
        console.error('Error in saveProject:', error)
        reject(error)
      }
    })
  }

  /**
   * Get all projects
   */
  async getProjects() {
    return new Promise((resolve, reject) => {
      try {
        // Simple query without complex JOINs
        const query = `
          SELECT * FROM projects 
          WHERE status = 'active'
          ORDER BY updated_at DESC
        `
        
        this.db.all(query, [], (err, rows) => {
          if (err) {
            console.error('Error getting projects:', err)
            reject(err)
          } else {
            // Parse JSON fields
            const projects = rows.map(row => {
              try {
                const participants = row.participants ? JSON.parse(row.participants) : []
                return {
                  ...row,
                  participants: participants,
                  config: row.config ? JSON.parse(row.config) : {},
                  participant_count: participants.length
                }
              } catch (parseError) {
                console.warn('Error parsing project data:', parseError)
                return {
                  ...row,
                  participants: [],
                  config: {},
                  participant_count: 0
                }
              }
            })
            
            console.log(`Retrieved ${projects.length} projects`)
            resolve({
              success: true,
              projects: projects
            })
          }
        })
      } catch (error) {
        console.error('Error in getProjects:', error)
        reject(error)
      }
    })
  }

  /**
   * Get project by ID with participants
   */
  async getProject(projectId) {
    console.log('getProject called with ID:', projectId)
    return new Promise((resolve, reject) => {
      try {
        const query = `
          SELECT * FROM projects 
          WHERE id = ? AND status = 'active'
        `
        
        this.db.get(query, [projectId], (err, row) => {
          if (err) {
            console.error('Error getting project:', err)
            reject(err)
          } else if (!row) {
            resolve({
              success: false,
              error: 'Project not found'
            })
          } else {
            try {
              console.log('Raw project data from database:', row)
              console.log('Raw project data keys:', Object.keys(row || {}))
              console.log('Raw project data values:', {
                id: row?.id,
                name: row?.name,
                event_name: row?.event_name,
                destination_folder: row?.destination_folder,
                photos_folder: row?.photos_folder,
                participants: row?.participants,
                config: row?.config
              })
              
              const project = {
                ...row,
                participants: row.participants ? JSON.parse(row.participants) : [],
                config: row.config ? JSON.parse(row.config) : {}
              }
              
              console.log('Config from database (raw):', row.config)
              console.log('Config from database (parsed):', project.config)
              console.log('Config type:', typeof project.config)
              console.log('Config is empty object:', JSON.stringify(project.config) === '{}')
              
              console.log('Parsed project data:', project)
              console.log('Parsed project data keys:', Object.keys(project || {}))
              console.log('Parsed project data values:', {
                id: project?.id,
                name: project?.name,
                event_name: project?.event_name,
                destination_folder: project?.destination_folder,
                photos_folder: project?.photos_folder,
                participants: project?.participants?.length || 0,
                config: Object.keys(project?.config || {})
              })
              
              resolve({
                success: true,
                project: project
              })
            } catch (parseError) {
              console.error('Error parsing project data:', parseError)
              resolve({
                success: false,
                error: 'Error parsing project data'
              })
            }
          }
        })
      } catch (error) {
        console.error('Error in getProject:', error)
        reject(error)
      }
    })
  }

  /**
   * Save processing results
   */
  async saveProcessingResults(projectId, results) {
    try {
      const {
        totalImages,
        qrDetected,
        groupedPhotos,
        ungroupedPhotos,
        processingTime,
        detailedResults
      } = results

      await this.runQuery(
        `INSERT INTO processing_results 
         (project_id, total_photos, qr_detected, grouped_photos, ungrouped_photos, processing_time, results_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          totalImages,
          qrDetected,
          groupedPhotos,
          ungroupedPhotos,
          processingTime,
          JSON.stringify(detailedResults)
        ]
      )

      // Update project timestamp
      await this.runQuery(
        'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [projectId]
      )

      return { success: true }
    } catch (error) {
      console.error('Error saving processing results:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Cache QR detection result
   */
  async cacheQRResult(filePath, qrCode, confidence, fileHash) {
    try {
      await this.runQuery(
        `INSERT OR REPLACE INTO qr_cache (file_path, qr_code, confidence, file_hash)
         VALUES (?, ?, ?, ?)`,
        [filePath, qrCode, confidence, fileHash]
      )
      return { success: true }
    } catch (error) {
      console.error('Error caching QR result:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get cached QR result
   */
  async getCachedQRResult(filePath, fileHash) {
    try {
      const result = await this.getRow(
        'SELECT * FROM qr_cache WHERE file_path = ? AND file_hash = ?',
        [filePath, fileHash]
      )
      return { success: true, result }
    } catch (error) {
      console.error('Error getting cached QR result:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    try {
      await this.runQuery('UPDATE projects SET status = "deleted" WHERE id = ?', [projectId])
      return { success: true }
    } catch (error) {
      console.error('Error deleting project:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clear all database data (for development/reset)
   */
  async clearAllData() {
    try {
      // Delete all data from all tables
      await this.runQuery('DELETE FROM template_results')
      await this.runQuery('DELETE FROM credentials')
      await this.runQuery('DELETE FROM qr_cache')
      await this.runQuery('DELETE FROM processing_results')
      await this.runQuery('DELETE FROM templates')
      await this.runQuery('DELETE FROM projects')
      
      console.log('All database data cleared successfully')
      return { success: true }
    } catch (error) {
      console.error('Error clearing database:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get app setting
   */
  async getSetting(key) {
    try {
      const result = await this.getRow('SELECT value FROM app_settings WHERE key = ?', [key])
      return { success: true, value: result?.value }
    } catch (error) {
      console.error('Error getting setting:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Set app setting
   */
  async setSetting(key, value) {
    try {
      await this.runQuery(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, value]
      )
      return { success: true }
    } catch (error) {
      console.error('Error setting setting:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update project configuration
   */
  async updateProjectConfig(projectId, config) {
    try {
      console.log('updateProjectConfig called with:', { projectId, config })
      
      // Get current project config
      const project = await this.getRow('SELECT config FROM projects WHERE id = ?', [projectId])
      console.log('Current project config from DB:', project)
      
      if (!project) {
        console.log('Project not found for ID:', projectId)
        return { success: false, error: 'Project not found' }
      }

      // Parse existing config and merge with new config
      let existingConfig = {}
      if (project.config) {
        try {
          existingConfig = JSON.parse(project.config)
          console.log('Parsed existing config:', existingConfig)
        } catch (e) {
          console.warn('Failed to parse existing config, starting fresh')
        }
      }

      // Merge configurations
      const mergedConfig = {
        ...existingConfig,
        ...config
      }
      console.log('Merged config to save:', mergedConfig)

      // Update project with merged config
      await this.runQuery(
        'UPDATE projects SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(mergedConfig), projectId]
      )

      return { success: true }
    } catch (error) {
      console.error('Error updating project config:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Migrate localStorage credentials config to database
   */
  async migrateLocalStorageConfigs() {
    try {
      // This would be called from the renderer process
      // For now, just return success
      return { success: true, message: 'Migration completed' }
    } catch (error) {
      console.error('Error migrating localStorage configs:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err)
        } else {
          console.log('Database connection closed')
        }
      })
    }
  }
}

module.exports = DatabaseManager
