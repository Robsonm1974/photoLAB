import React, { useState, useCallback, useEffect } from 'react'
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Eye, 
  Settings,
  User,
  QrCode,
  GraduationCap,
  FileText,
  Image,
  Move,
  Type,
  Link
} from 'lucide-react'
import BackgroundSelector from '../components/Credentials/BackgroundSelector'
import ElementPositioner from '../components/Credentials/ElementPositioner'
import CredentialPreview from '../components/Credentials/CredentialPreview'

/**
 * Credentials Generation Page
 * 
 * Allows photographers to generate and print credentials for participants
 * before the photo session.
 */
const Credentials = ({ projectData, onNavigation }) => {
  const [credentialsConfig, setCredentialsConfig] = useState({
    // Background
    backgroundImage: null,
    backgroundImagePath: '',
    
    // Elements positioning (10x15cm = 1181x1772px @ 300 DPI)
    qrCode: {
      enabled: true,
      x: 50,
      y: 50,
      size: 200,
      content: 'QR1234567' // Will be replaced with actual participant QR
    },
    name: {
      enabled: true,
      x: 50,
      y: 300,
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#000000'
    },
    turma: {
      enabled: true,
      x: 50,
      y: 350,
      fontSize: 18,
      fontFamily: 'Arial',
      color: '#666666'
    },
    photographerUrl: {
      enabled: true,
      x: 50,
      y: 400,
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#0066CC',
      text: 'https://photomanager.com'
    },
    
    // Layout
    paperSize: 'A4',
    orientation: 'portrait',
    credentialsPerPage: 4, // 2x2 layout
    showBorder: true
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState(null)
  const [previewParticipant, setPreviewParticipant] = useState(null)
  const [activeTab, setActiveTab] = useState('background') // background, elements, preview

  // Set preview participant when project data changes
  useEffect(() => {
    if (projectData?.participants && projectData.participants.length > 0) {
      setPreviewParticipant(projectData.participants[0])
    }
  }, [projectData?.participants])

  // Load saved credentials configuration when project is loaded
  useEffect(() => {
    const loadSavedConfig = async () => {
      if (projectData?.projectId) {
        try {
          // Try to load from database first
          if (window.electronAPI.getProject) {
            const result = await window.electronAPI.getProject(projectData.projectId)
            if (result.success && result.project.config) {
              const config = result.project.config
              if (config.credentialsConfig) {
                setCredentialsConfig(prev => ({
                  ...prev,
                  ...config.credentialsConfig
                }))
                console.log('Loaded saved credentials configuration from database')
                return
              }
            }
          }
          
          // Fallback: try to load from localStorage
          const tempKey = `photolab_credentials_config_${projectData.projectId}`
          const savedConfig = localStorage.getItem(tempKey)
          if (savedConfig) {
            try {
              const config = JSON.parse(savedConfig)
              if (config.credentialsConfig) {
                setCredentialsConfig(prev => ({
                  ...prev,
                  ...config.credentialsConfig
                }))
                console.log('Loaded saved credentials configuration from localStorage')
              }
            } catch (parseError) {
              console.error('Error parsing saved config from localStorage:', parseError)
            }
          }
        } catch (error) {
          console.error('Error loading saved credentials config:', error)
        }
      }
    }

    loadSavedConfig()
  }, [projectData?.projectId])

  const handleConfigChange = useCallback((key, value) => {
    setCredentialsConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleElementConfigChange = useCallback((elementType, property, value) => {
    setCredentialsConfig(prev => ({
      ...prev,
      [elementType]: {
        ...prev[elementType],
        [property]: value
      }
    }))
  }, [])

  const handleBackgroundSelect = useCallback((imagePath, imageData) => {
    setCredentialsConfig(prev => ({
      ...prev,
      backgroundImage: imageData,
      backgroundImagePath: imagePath
    }))
  }, [])

  const handleGenerateCredentials = useCallback(async () => {
    if (!projectData?.participants || projectData.participants.length === 0) {
      alert('Nenhum participante encontrado. Por favor, configure o projeto primeiro.')
      return
    }

    setIsGenerating(true)
    try {
      // Generate credentials using Electron API
      const result = await window.electronAPI.generateCredentials({
        participants: projectData.participants,
        eventName: projectData.eventName,
        config: credentialsConfig
      })

      if (result.success) {
        setGeneratedCredentials(result.credentials)
        alert(`${result.credentials.length} credenciais geradas com sucesso!`)
      } else {
        alert(`Erro ao gerar credenciais: ${result.error}`)
      }
    } catch (error) {
      console.error('Error generating credentials:', error)
      alert(`Erro inesperado: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }, [projectData, credentialsConfig])

  const handlePrintCredentials = useCallback(async () => {
    if (!generatedCredentials) {
      alert('Nenhuma credencial gerada. Gere as credenciais primeiro.')
      return
    }

    try {
      const result = await window.electronAPI.printCredentials(generatedCredentials, projectData.eventName)
      if (result.success) {
        alert(result.message)
      } else {
        alert(`Erro ao imprimir: ${result.error}`)
      }
    } catch (error) {
      console.error('Error printing credentials:', error)
      alert(`Erro inesperado: ${error.message}`)
    }
  }, [generatedCredentials, projectData.eventName])

  const handleSaveCredentials = useCallback(async () => {
    if (!generatedCredentials) {
      alert('Nenhuma credencial gerada. Gere as credenciais primeiro.')
      return
    }

    try {
      const result = await window.electronAPI.saveCredentials(
        generatedCredentials, 
        projectData.eventName, 
        projectData.sourceFolder
      )
      if (result.success) {
        alert(result.message)
      } else {
        alert(`Erro ao salvar: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving credentials:', error)
      alert(`Erro inesperado: ${error.message}`)
    }
  }, [generatedCredentials, projectData.eventName, projectData.sourceFolder])

  const handleSaveCredentialsConfig = useCallback(async () => {
    if (!projectData?.projectId) {
      alert('Projeto não encontrado. Salve o projeto primeiro.')
      return
    }

    try {
      // Save credentials configuration to database
      const configToSave = {
        credentialsConfig: credentialsConfig,
        savedAt: new Date().toISOString()
      }

      console.log('Saving credentials config:', configToSave)
      console.log('Project ID:', projectData.projectId)

      let result

      // Try the new function first
      if (window.electronAPI.updateProjectConfig) {
        console.log('Using updateProjectConfig function')
        result = await window.electronAPI.updateProjectConfig(projectData.projectId, configToSave)
      } else {
        // Fallback: save to localStorage temporarily
        console.log('updateProjectConfig not available, saving to localStorage as fallback')
        
        try {
          const tempKey = `photolab_credentials_config_${projectData.projectId}`
          localStorage.setItem(tempKey, JSON.stringify(configToSave))
          
          alert('Configuração salva temporariamente no navegador.\n\nPara salvar permanentemente no banco de dados, reinicie o aplicativo e tente novamente.')
          return
        } catch (localError) {
          console.error('Error saving to localStorage:', localError)
          alert('Erro ao salvar configuração. Reinicie o aplicativo e tente novamente.')
          return
        }
      }
      
      if (result.success) {
        alert('Configuração de credenciais salva com sucesso!')
      } else {
        alert(`Erro ao salvar configuração: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving credentials config:', error)
      alert(`Erro inesperado: ${error.message}`)
    }
  }, [credentialsConfig, projectData?.projectId])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerar Credenciais</h1>
          <p className="text-gray-600 mt-1">
            Configure e gere credenciais para a sessão de fotos
          </p>
        </div>
        <button
          onClick={() => onNavigation('processing')}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Processamento</span>
        </button>
      </div>

      {/* Project Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Informações do Projeto</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Evento:</span>
            <p className="text-blue-700">{projectData?.eventName || 'Não definido'}</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">Participantes:</span>
            <p className="text-blue-700">{projectData?.participants?.length || 0} pessoas</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">Pasta de Origem:</span>
            <p className="text-blue-700 truncate">{projectData?.sourceFolder || 'Não definida'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'background', label: 'Background', icon: Image },
            { id: 'elements', label: 'Elementos', icon: Move },
            { id: 'preview', label: 'Preview', icon: Eye }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {activeTab === 'background' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Image className="w-5 h-5" />
                Background da Credencial
              </h2>
              <BackgroundSelector
                onBackgroundSelect={handleBackgroundSelect}
                currentBackground={credentialsConfig.backgroundImagePath}
              />
            </div>
          )}

          {activeTab === 'elements' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Move className="w-5 h-5" />
                Posicionamento dos Elementos
              </h2>
              <ElementPositioner
                config={credentialsConfig}
                onConfigChange={handleElementConfigChange}
              />
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações Gerais
              </h2>
              
              <div className="space-y-4">
                {/* Layout Options */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Layout</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tamanho do Papel
                      </label>
                      <select
                        value={credentialsConfig.paperSize}
                        onChange={(e) => handleConfigChange('paperSize', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A4">A4</option>
                        <option value="A5">A5</option>
                        <option value="Letter">Letter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credenciais por Página
                      </label>
                      <select
                        value={credentialsConfig.credentialsPerPage}
                        onChange={(e) => handleConfigChange('credentialsPerPage', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={4}>4 (2x2)</option>
                        <option value={2}>2 (1x2)</option>
                        <option value={1}>1 (1x1)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Style Options */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Estilo</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={credentialsConfig.showBorder}
                        onChange={(e) => handleConfigChange('showBorder', e.target.checked)}
                        className="mr-2"
                      />
                      Mostrar borda
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview and Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Pré-visualização (10x15cm)
            </h2>
            
            <CredentialPreview
              config={credentialsConfig}
              participant={previewParticipant}
              eventName={projectData?.eventName}
            />
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações</h2>
            
            <div className="space-y-3">
              <button
                onClick={handleSaveCredentialsConfig}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Salvar Configuração</span>
              </button>

              <button
                onClick={handleGenerateCredentials}
                disabled={isGenerating}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Gerar Credenciais</span>
                  </>
                )}
              </button>

              {generatedCredentials && (
                <>
                  <button
                    onClick={handlePrintCredentials}
                    className="btn-secondary w-full flex items-center justify-center space-x-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Credenciais</span>
                  </button>

                  <button
                    onClick={handleSaveCredentials}
                    className="btn-secondary w-full flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Salvar como PDF</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Participantes ({projectData?.participants?.length || 0})
        </h2>
        
        {projectData?.participants && projectData.participants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectData.participants.map((participant, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{participant.name}</h3>
                    <p className="text-sm text-gray-600">{participant.turma}</p>
                    <p className="text-xs text-gray-500 font-mono">{participant.qrCode}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Nenhum participante encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Credentials

