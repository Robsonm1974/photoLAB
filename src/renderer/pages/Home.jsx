import React, { useState, useCallback } from 'react'
import { AlertCircle, Play, CheckCircle } from 'lucide-react'
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
 */
const Home = ({ projectData, setProjectData, onNavigation }) => {
  // Local state for validation and UI feedback
  const [validationErrors, setValidationErrors] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Update project data
  const updateProjectData = useCallback((field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [setProjectData])

  // Validate all required fields
  const validateProject = () => {
    const errors = []
    
    if (!projectData.sourceFolder) {
      errors.push('Selecione a pasta de origem com as fotos')
    }
    
    if (!projectData.csvFile) {
      errors.push('Carregue o arquivo CSV com a lista de participantes')
    }
    
    if (!projectData.eventName?.trim()) {
      errors.push('Informe o nome do evento')
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  // Handle project start
  const handleStartProject = useCallback(async () => {
    if (!validateProject()) {
      return
    }
    
    try {
      setIsProcessing(true)
      
      // Get base path from source folder
      const basePath = projectData.sourceFolder
      
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
      
      // Save project to database
      const projectToSave = {
        name: projectData.eventName,
        eventName: projectData.eventName,
        sourceFolder: projectData.sourceFolder,
        destinationFolder: eventFolderPath,
        participants: projectData.participants,
        config: {
          createdDirectories: result.results.created,
          errors: result.results.errors
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
  const isProjectReady = projectData.sourceFolder && 
                        projectData.csvFile && 
                        projectData.eventName?.trim() &&
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
        {/* Step 1: Source Folder Selection */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
              1
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Pasta de Origem
            </h2>
            {projectData.sourceFolder && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          
          <FolderSelector
            selectedFolder={projectData.sourceFolder}
            onFolderSelected={(folder) => updateProjectData('sourceFolder', folder)}
            label="Selecione a pasta contendo as fotos do evento"
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
              updateProjectData('csvFile', file)
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

      {/* Project Summary & Start Button */}
      {isProjectReady && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            Projeto Configurado ✓
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-700 mb-4">
            <div>
              <strong>Pasta:</strong> {projectData.sourceFolder?.split('\\').pop()}
            </div>
            <div>
              <strong>Participantes:</strong> {projectData.participants?.length || 0}
            </div>
            <div>
              <strong>Evento:</strong> {projectData.eventName}
            </div>
          </div>
          
          <button
            onClick={handleStartProject}
            disabled={isProcessing}
            className="btn-primary flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>
              {isProcessing ? 'Criando Estrutura...' : 'Iniciar Projeto'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Home
