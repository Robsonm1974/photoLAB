import React, { useState, useCallback } from 'react'
import { AlertCircle, Play, CheckCircle, Folder, Save } from 'lucide-react'
import FolderSelector from '../components/FileSelectors/FolderSelector'
import CSVUploader from '../components/FileSelectors/CSVUploader'

// Note: In a real app, we'd use Node.js path module via Electron API
// For now, we'll do a simple path join
const pathJoin = (basePath, eventName) => {
  return basePath + '\\' + eventName.replace(/[<>:"/\\|?*]/g, '_')
}

/**
 * Home Page Component
 * 
 * Main setup page where users configure their project.
 * Follows Phase 1 priorities from project_rules.md:
 * 1. Directory selection
 * 2. CSV upload and validation  
 * 3. Event name input
 * 4. Photos folder selection (NEW)
 */
const Home = ({ projectData, setProjectData, onNavigation }) => {
  // Local state for validation and UI feedback
  const [validationErrors, setValidationErrors] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Update project data
  const updateProjectData = useCallback((field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [setProjectData])

  // Handle photos folder selection
  const handleSelectPhotosFolder = useCallback(async () => {
    try {
      const result = await window.electronAPI.selectPhotosFolder()
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const selectedFolder = result.filePaths[0]
        updateProjectData('photosFolder', selectedFolder)
        
        // Validate folder has images
        const validation = await window.electronAPI.validatePhotosFolder(selectedFolder)
        if (!validation.valid) {
          setValidationErrors([validation.message])
        } else {
          setValidationErrors([])
          console.log(`Pasta de fotos selecionada: ${selectedFolder}`)
          console.log(`Encontradas ${validation.fileCount} imagens`)
        }
      }
    } catch (error) {
      console.error('Error selecting photos folder:', error)
      setValidationErrors(['Erro ao selecionar pasta de fotos'])
    }
  }, [updateProjectData])

  // Validate all required fields
  const validateProject = () => {
    const errors = []
    
    if (!projectData.destinationFolder) {
      errors.push('Selecione a pasta de destino para o projeto')
    }
    
    if (!projectData.csvFile) {
      errors.push('Carregue o arquivo CSV com a lista de participantes')
    }
    
    if (!projectData.eventName?.trim()) {
      errors.push('Informe o nome do evento')
    }

    if (!projectData.photosFolder) {
      errors.push('Selecione a pasta contendo as fotos a serem processadas')
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  // Handle save project configuration
  const handleSaveProject = useCallback(async () => {
    if (!validateProject()) {
      return
    }
    
    try {
      setIsSaving(true)
      setSaveMessage('')
      
      // Prepare project data for saving
      const projectToSave = {
        name: projectData.eventName,
        eventName: projectData.eventName,
        destinationFolder: projectData.destinationFolder,
        photosFolder: projectData.photosFolder,
        participants: projectData.participants,
        config: {
          csvFileName: projectData.csvFile?.name || 'participantes.csv',
          totalParticipants: projectData.participants?.length || 0,
          createdAt: new Date().toISOString()
        }
      }
      
      const saveResult = await window.electronAPI.saveProject(projectToSave)
      if (saveResult.success) {
        updateProjectData('projectId', saveResult.projectId)
        setSaveMessage('✅ Projeto salvo com sucesso!')
        console.log('Project saved successfully with ID:', saveResult.projectId)
        
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('❌ Erro ao salvar projeto: ' + saveResult.error)
        console.warn('Failed to save project:', saveResult.error)
      }
    } catch (error) {
      console.error('Error saving project:', error)
      setSaveMessage('❌ Erro ao salvar projeto. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }, [projectData, updateProjectData])

  // Handle project start
  const handleStartProject = useCallback(async () => {
    if (!validateProject()) {
      return
    }
    
    try {
      setIsProcessing(true)
      
      // Get base path from destination folder
      const basePath = projectData.destinationFolder
      
      // Create directory structure
      const result = await window.electronAPI.createDirectories(
        basePath,
        projectData.eventName,
        projectData.participants
      )
      
      if (!result.success) {
        setValidationErrors([`Erro ao criar estrutura: ${result.error}`])
        return
      }
      
      // Log success
      console.log('Directory structure created successfully:', result.results)
      
      // Store the created structure path in project data
      const eventFolderPath = pathJoin(basePath, projectData.eventName)
      updateProjectData('createdFolderPath', eventFolderPath)
      updateProjectData('creationResults', result.results)
      
      // Save project to database with updated info
      const projectToSave = {
        name: projectData.eventName,
        eventName: projectData.eventName,
        destinationFolder: projectData.destinationFolder,
        photosFolder: projectData.photosFolder,
        participants: projectData.participants,
        config: {
          createdDirectories: result.results.created,
          errors: result.results.errors,
          csvFileName: projectData.csvFile?.name || 'participantes.csv',
          totalParticipants: projectData.participants?.length || 0,
          createdAt: new Date().toISOString()
        }
      }
      
      const saveResult = await window.electronAPI.saveProject(projectToSave)
      if (saveResult.success) {
        updateProjectData('projectId', saveResult.projectId)
        console.log('Project saved successfully with ID:', saveResult.projectId)
      } else {
        console.warn('Failed to save project:', saveResult.error)
      }
      
      // Navigate to processing page
      onNavigation('processing')
    } catch (error) {
      console.error('Error starting project:', error)
      setValidationErrors(['Erro ao iniciar o projeto. Tente novamente.'])
    } finally {
      setIsProcessing(false)
    }
  }, [projectData, onNavigation])

  // Check if all required fields are completed
  const isProjectReady = projectData.destinationFolder && 
                        projectData.csvFile && 
                        projectData.eventName?.trim() &&
                        projectData.photosFolder &&
                        projectData.participants?.length > 0

  // Check if project can be saved (at least basic info)
  const canSaveProject = projectData.eventName?.trim() && 
                        projectData.destinationFolder && 
                        projectData.participants?.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configurar Novo Projeto
        </h1>
        <p className="text-gray-600">
          Configure os parâmetros do seu evento para organizar as fotos automaticamente
        </p>
      </div>

      {/* Configuration Steps */}
      <div className="grid gap-6">
        {/* Step 1: Destination Folder Selection */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
              1
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Pasta de Destino
            </h2>
            {projectData.destinationFolder && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          
          <FolderSelector
            selectedFolder={projectData.destinationFolder}
            onFolderSelected={(folder) => updateProjectData('destinationFolder', folder)}
            label="Selecione onde criar a estrutura organizada do projeto"
            validatePhotos={false}
          />
        </div>

        {/* Step 2: CSV Upload */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
              2
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Lista de Participantes
            </h2>
            {projectData.csvFile && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          
          <CSVUploader
            csvFile={projectData.csvFile}
            participants={projectData.participants}
            onCSVUploaded={(file, participants) => {
              updateProjectData('csvFile', file) // file já é um objeto com name e path
              updateProjectData('participants', participants)
            }}
          />
        </div>

        {/* Step 3: Event Name */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
              3
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Nome do Evento
            </h2>
            {projectData.eventName?.trim() && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              Nome do evento (será usado para criar a pasta principal)
            </label>
            <input
              type="text"
              value={projectData.eventName || ''}
              onChange={(e) => updateProjectData('eventName', e.target.value)}
              placeholder="Ex: Festa Junina 2024"
              className="w-full input-field"
            />
          </div>
        </div>

        {/* Step 4: Photos Folder Selection - NEW */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
              4
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Pasta das Fotos Originais
            </h2>
            {projectData.photosFolder && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">
              Selecione a pasta contendo as fotos a serem processadas
            </label>
            
            <button
              onClick={handleSelectPhotosFolder}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
            >
              <Folder className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">
                {projectData.photosFolder ? 
                  `📁 ${projectData.photosFolder.split('\\').pop()}` : 
                  'Clique para selecionar pasta das fotos'
                }
              </span>
            </button>
            
            {projectData.photosFolder && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <strong>Pasta selecionada:</strong><br />
                <code className="text-xs break-all">{projectData.photosFolder}</code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Corrija os seguintes problemas:
              </h3>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">{saveMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Save Button */}
        {canSaveProject && (
          <button
            onClick={handleSaveProject}
            disabled={isSaving}
            className="btn-secondary flex items-center justify-center space-x-2 flex-1"
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving ? 'Salvando...' : 'Salvar Projeto'}
            </span>
          </button>
        )}

        {/* Start Project Button */}
        {isProjectReady && (
          <button
            onClick={handleStartProject}
            disabled={isProcessing}
            className="btn-primary flex items-center justify-center space-x-2 flex-1"
          >
            <Play className="w-4 h-4" />
            <span>
              {isProcessing ? 'Criando Estrutura...' : 'Iniciar Projeto'}
            </span>
          </button>
        )}
      </div>

      {/* Project Summary */}
      {isProjectReady && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            Projeto Configurado ✓
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
            <div>
              <strong>Destino:</strong> {projectData.destinationFolder?.split('\\').pop()}
            </div>
            <div>
              <strong>Participantes:</strong> {projectData.participants?.length || 0}
            </div>
            <div>
              <strong>Evento:</strong> {projectData.eventName}
            </div>
            <div>
              <strong>Fotos:</strong> {projectData.photosFolder?.split('\\').pop()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home