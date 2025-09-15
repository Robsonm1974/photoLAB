import React, { useState, useEffect, useCallback } from 'react'
import { 
  Camera, 
  Search, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  ArrowLeft, 
  Eye,
  Download,
  Folder,
  FolderOpen,
  FileText // New import for credentials
} from 'lucide-react'

/**
 * OCR Processing Page Component
 * 
 * Handles QR code detection and photo grouping (Phase 2).
 * Shows real-time progress and allows manual corrections.
 */
const OCRProcessing = ({ onNavigation, projectData, setProcessingResults }) => {
  // Processing state
  const [processingStage, setProcessingStage] = useState('setup') // setup, running, completed, error
  const [currentStep, setCurrentStep] = useState('qr_detection') // qr_detection, grouping, copying
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [localProcessingResults, setLocalProcessingResults] = useState(null)
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState([])
  const [pythonDepsStatus, setPythonDepsStatus] = useState(null)

  // Check Python dependencies on component mount
  useEffect(() => {
    checkPythonDependencies()
  }, [])

  const checkPythonDependencies = async () => {
    try {
      const result = await window.electronAPI.checkPythonDependencies()
      setPythonDepsStatus(result)
      
      if (!result.success) {
        setError(`Python dependencies missing: ${result.missing_packages?.join(', ') || 'Unknown error'}`)
      }
    } catch (error) {
      setError('Failed to check Python dependencies')
      setPythonDepsStatus({ success: false, error: 'Check failed' })
    }
  }

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
  }, [])

  const startProcessing = useCallback(async () => {
    if (!projectData?.sourceFolder || !projectData?.participants) {
      setError('Missing project data. Please go back and configure the project.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProcessingStage('running')
    setLogs([])
    
    addLog('Starting QR code detection and photo grouping...', 'info')
    
    try {
      // Prepare processing configuration
      const config = {
        source_folder: projectData.sourceFolder,
        destination_folder: projectData.createdFolderPath,
        participants: projectData.participants,
        event_name: projectData.eventName,
        options: {
          cache_results: true,
          verbose: true
        }
      }

      addLog(`Processing ${projectData.participants.length} participants from ${projectData.sourceFolder}`, 'info')

      // Setup progress listener
      const removeProgressListener = window.electronAPI.onProgress((event, progressInfo) => {
        setCurrentStep(progressInfo.stage || 'processing')
        
        // Update progress with percentage from main process
        setProgress({
          current: progressInfo.current || 0,
          total: progressInfo.total || 0,
          percentage: progressInfo.percentage || 0
        })
        
        // Add log message
        addLog(progressInfo.message || 'Processing...', 'info')
      })

      // Start processing with initial progress
      setProgress({ current: 0, total: 0, percentage: 5 })
      setCurrentStep('qr_detection')
      addLog('Iniciando processamento...', 'info')
      
      const result = await window.electronAPI.processPhotos(config)
      
      // Cleanup listener
      removeProgressListener()

      if (result.success) {
        // Final progress update
        setProgress({ current: 100, total: 100, percentage: 100 })
        addLog('Processamento concluído com sucesso!', 'success')
        
        setLocalProcessingResults(result)
        setProcessingStage('completed')
        addLog('Processing completed successfully!', 'success')
        addLog(`${result.processing_summary.qr_detected}/${result.processing_summary.total_images} photos had QR codes detected`, 'info')
        addLog(`${result.processing_summary.groups_created} participant groups created`, 'info')
        if (result.processing_summary.ungrouped_photos > 0) {
          addLog(`${result.processing_summary.ungrouped_photos} photos could not be grouped`, 'warning')
        }
        
        // Show copy results
        if (result.photo_copying) {
          if (result.photo_copying.success) {
            addLog(`${result.photo_copying.summary.total_copied} photos copied to participant folders`, 'success')
            if (result.photo_copying.summary.total_errors > 0) {
              addLog(`${result.photo_copying.summary.total_errors} copy errors occurred`, 'warning')
            }
          } else {
            addLog(`Photo copying failed: ${result.photo_copying.error}`, 'error')
          }
        }
        
        // Pass results to parent App component
        if (setProcessingResults) {
          setProcessingResults(result)
        }
        
        // Navigate to results page automatically after a short delay
        setTimeout(() => {
          onNavigation('results')
        }, 2000)
      } else {
        const errorDetails = []
        if (result.error) errorDetails.push(result.error)
        if (result.details) errorDetails.push(`Details: ${result.details}`)
        if (result.raw_output) {
          console.log('Raw Python output:', result.raw_output)
          addLog('Raw output logged to console', 'info')
        }
        throw new Error(errorDetails.join('. ') || 'Processing failed')
      }

    } catch (error) {
      console.error('Processing error:', error)
      setError(error.message || 'An unexpected error occurred')
      setProcessingStage('error')
      addLog(`Error: ${error.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [projectData, addLog])

  const renderSetupStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Processamento OCR - Fase 2
        </h1>
        <p className="text-gray-600">
          Detecção automática de QR codes e agrupamento de fotos
        </p>
      </div>

      {/* Project Summary */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo do Projeto</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Pasta origem:</strong><br />
            <span className="text-gray-600">{projectData?.sourceFolder?.split('\\').pop()}</span>
          </div>
          <div>
            <strong>Participantes:</strong><br />
            <span className="text-gray-600">{projectData?.participants?.length || 0}</span>
          </div>
          <div>
            <strong>Evento:</strong><br />
            <span className="text-gray-600">{projectData?.eventName}</span>
          </div>
        </div>
      </div>

      {/* Python Dependencies Status */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Status das Dependências</h2>
        {pythonDepsStatus ? (
          <div className="space-y-3">
            <div className={`flex items-center space-x-2 ${pythonDepsStatus.success ? 'text-green-700' : 'text-red-700'}`}>
              {pythonDepsStatus.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {pythonDepsStatus.success ? 'Todas as dependências OK' : 'Dependências faltando'}
              </span>
            </div>
            
            {pythonDepsStatus.python_version && (
              <p className="text-sm text-gray-600">
                <strong>Python:</strong> {pythonDepsStatus.python_version}
              </p>
            )}
            
            {pythonDepsStatus.missing_packages && pythonDepsStatus.missing_packages.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">
                  <strong>Pacotes faltando:</strong> {pythonDepsStatus.missing_packages.join(', ')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Execute: <code>pip install {pythonDepsStatus.missing_packages.join(' ')}</code>
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Verificando dependências...</p>
        )}
      </div>

      {/* Processing Steps Preview */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Etapas do Processamento</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Search className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium">1. Detecção de QR Codes</p>
              <p className="text-sm text-gray-600">Análise de todas as fotos JPG para encontrar QR codes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium">2. Agrupamento de Fotos</p>
              <p className="text-sm text-gray-600">Organização das fotos por participante baseado na sequência temporal</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium">3. Revisão e Correções</p>
              <p className="text-sm text-gray-600">Interface para correções manuais se necessário</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => onNavigation('home')}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          onClick={startProcessing}
          disabled={!pythonDepsStatus?.success || isProcessing}
          className="btn-primary flex items-center space-x-2"
        >
          <Play className="w-4 h-4" />
          <span>Iniciar Processamento OCR</span>
        </button>
      </div>
    </div>
  )

  const renderProcessingStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Processando Fotos...
        </h1>
        <p className="text-gray-600">
          Detecção de QR codes e agrupamento em andamento
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {currentStep === 'qr_detection' && 'Detectando QR Codes'}
              {currentStep === 'grouping' && 'Agrupando Fotos'}
              {currentStep === 'copying' && 'Copiando Arquivos'}
            </h3>
            <span className="text-sm text-gray-500">
              {progress.total > 0 && `${progress.current}/${progress.total}`}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage || 0}%` }}
            />
          </div>
          
          <div className="text-center text-sm text-gray-600">
            {progress.percentage || 0}% completo
          </div>
        </div>
      </div>

      {/* Live Log */}
      <div className="card">
        <h3 className="text-lg font-medium mb-3">Log de Atividades</h3>
        <div className="bg-gray-50 rounded border max-h-64 overflow-y-auto p-3 space-y-1">
          {logs.map((log, index) => (
            <div key={index} className={`text-xs flex items-start space-x-2 ${
              log.type === 'error' ? 'text-red-600' : 
              log.type === 'success' ? 'text-green-600' : 
              'text-gray-700'
            }`}>
              <span className="text-gray-400 min-w-0">{log.timestamp}</span>
              <span className="flex-1">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderCompletedStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Processamento Concluído ✓
        </h1>
        <p className="text-gray-600">
          QR codes detectados e fotos agrupadas com sucesso
        </p>
      </div>

      {/* Results Summary */}
      {localProcessingResults && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo dos Resultados</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {localProcessingResults.processing_summary.total_images}
              </div>
              <div className="text-sm text-gray-600">Fotos Processadas</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {localProcessingResults.processing_summary.qr_detected}
              </div>
              <div className="text-sm text-gray-600">QR Codes Detectados</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {localProcessingResults.processing_summary.groups_created}
              </div>
              <div className="text-sm text-gray-600">Grupos Criados</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {localProcessingResults.processing_summary.ungrouped_photos}
              </div>
              <div className="text-sm text-gray-600">Fotos Não Agrupadas</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => onNavigation('home')}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Novo Projeto</span>
        </button>

        <button
          onClick={() => onNavigation('credentials')}
          className="btn-primary flex items-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>Gerar Credenciais</span>
        </button>

        <button
          onClick={() => onNavigation('results')}
          className="btn-secondary flex items-center space-x-2"
        >
          <Eye className="w-4 h-4" />
          <span>Ver Resultados Detalhados</span>
        </button>

        {projectData?.createdFolderPath && (
          <button
            onClick={async () => {
              try {
                await window.electronAPI.openFolder(projectData.createdFolderPath)
              } catch (error) {
                console.error('Error opening folder:', error)
              }
            }}
            className="btn-secondary flex items-center space-x-2"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Abrir Pasta do Projeto</span>
          </button>
        )}
      </div>
    </div>
  )

  const renderErrorStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-2">
          Erro no Processamento
        </h1>
        <p className="text-gray-600">
          Ocorreu um problema durante o processamento OCR
        </p>
      </div>

      {/* Error Details */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-800 mb-2">Detalhes do Erro</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => onNavigation('home')}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </button>

        <button
          onClick={() => {
            setProcessingStage('setup')
            setError(null)
            checkPythonDependencies()
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Play className="w-4 h-4" />
          <span>Tentar Novamente</span>
        </button>
      </div>
    </div>
  )

  // Render based on processing stage
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {processingStage === 'setup' && renderSetupStage()}
        {processingStage === 'running' && renderProcessingStage()}
        {processingStage === 'completed' && renderCompletedStage()}
        {processingStage === 'error' && renderErrorStage()}
      </div>
    </div>
  )
}

export default OCRProcessing
