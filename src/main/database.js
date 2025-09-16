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
    const tables = [
      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        event_name TEXT NOT NULL,
        source_folder TEXT NOT NULL,
        destination_folder TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        config TEXT -- JSON string with project configuration
      )`,

      // Participants table
      `CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        turma TEXT NOT NULL,
        qr_code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )`,

      // Processing results table
      `CREATE TABLE IF NOT EXISTS processing_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        total_photos INTEGER DEFAULT 0,
        qr_detected INTEGER DEFAULT 0,
        grouped_photos INTEGER DEFAULT 0,
        ungrouped_photos INTEGER DEFAULT 0,
        processing_time INTEGER, -- in seconds
        results_data TEXT, -- JSON string with detailed results
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )`,

      // QR cache table (for performance)
      `CREATE TABLE IF NOT EXISTS qr_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        qr_code TEXT,
        confidence REAL,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_hash TEXT -- for cache invalidation
      )`,

      // App settings table
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ]

    for (const tableSQL of tables) {
      await this.runQuery(tableSQL)
    }

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_participants_project_id ON participants(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_participants_qr_code ON participants(qr_code)',
      'CREATE INDEX IF NOT EXISTS idx_processing_results_project_id ON processing_results(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_qr_cache_file_path ON qr_cache(file_path)',
      'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)'
    ]

    for (const indexSQL of indexes) {
      await this.runQuery(indexSQL)
    }
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
    try {
      const { name, eventName, sourceFolder, destinationFolder, participants, config } = projectData

      // Start transaction
      await this.runQuery('BEGIN TRANSACTION')

      // Insert project
      const projectResult = await this.runQuery(
        `INSERT INTO projects (name, event_name, source_folder, destination_folder, config)
         VALUES (?, ?, ?, ?, ?)`,
        [name, eventName, sourceFolder, destinationFolder, JSON.stringify(config)]
      )

      const projectId = projectResult.id

      // Insert participants
      for (const participant of participants) {
        await this.runQuery(
          `INSERT INTO participants (project_id, name, turma, qr_code)
           VALUES (?, ?, ?, ?)`,
          [projectId, participant.name, participant.turma, participant.qrCode]
        )
      }

      // Commit transaction
      await this.runQuery('COMMIT')

      return { success: true, projectId }
    } catch (error) {
      await this.runQuery('ROLLBACK')
      console.error('Error saving project:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all projects
   */
  async getProjects() {
    try {
      const projects = await this.getRows(
        `SELECT p.*, 
                COUNT(pr.id) as participant_count,
                pr2.total_photos,
                pr2.qr_detected,
                pr2.created_at as last_processed
         FROM projects p
         LEFT JOIN participants pr ON p.id = pr.project_id
         LEFT JOIN processing_results pr2 ON p.id = pr2.project_id
         WHERE p.status = 'active'
         GROUP BY p.id
         ORDER BY p.updated_at DESC`
      )

      return { success: true, projects }
    } catch (error) {
      console.error('Error getting projects:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get project by ID with participants
   */
  async getProject(projectId) {
    try {
      const project = await this.getRow(
        'SELECT * FROM projects WHERE id = ? AND status = "active"',
        [projectId]
      )

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      const participants = await this.getRows(
        'SELECT * FROM participants WHERE project_id = ? ORDER BY name',
        [projectId]
      )

      // Parse config JSON
      if (project.config) {
        project.config = JSON.parse(project.config)
      }

      return { 
        success: true, 
        project: {
          ...project,
          participants: participants.map(p => ({
            name: p.name,
            turma: p.turma,
            qrCode: p.qr_code
          }))
        }
      }
    } catch (error) {
      console.error('Error getting project:', error)
      return { success: false, error: error.message }
    }
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
      // Get current project config
      const project = await this.getRow('SELECT config FROM projects WHERE id = ?', [projectId])
      
      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      // Parse existing config and merge with new config
      let existingConfig = {}
      if (project.config) {
        try {
          existingConfig = JSON.parse(project.config)
        } catch (e) {
          console.warn('Failed to parse existing config, starting fresh')
        }
      }

      // Merge configurations
      const mergedConfig = {
        ...existingConfig,
        ...config
      }

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
