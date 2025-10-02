import React, { useState, useCallback, useEffect } from 'react'
import { 
  ArrowLeft, 
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
    
    // Elements positioning (100mm x 150mm = 283x425px @ 72 DPI)
    qrCode: {
      enabled: true,
      x: 93, // Posição ajustada para 283x425px
      y: 105,
      size: 144, // Tamanho ajustado para 283x425px
      content: 'https://www.photo.app/fotografo/nomedotenant/QR1234567' // Will be replaced with actual participant QR
    },
    name: {
      enabled: true,
      x: 88, // Posição conforme especificação
      y: 288,
      fontSize: 12, // 12px conforme especificação
      fontFamily: 'Arial',
      color: '#000000'
    },
    turma: {
      enabled: true,
      x: 129, // Posição conforme especificação
      y: 311,
      fontSize: 12, // 12px conforme especificação
      fontFamily: 'Arial',
      color: '#666666'
    },
    photographerUrl: {
      enabled: true,
      x: 104, // Posição conforme especificação
      y: 342,
      fontSize: 11, // 11pt conforme especificação
      fontFamily: 'Arial',
      color: '#0066CC',
      text: 'https://photom.app'
    },
    qrCodeText: {
      enabled: true,
      x: 104, // Posição conforme especificação
      y: 370,
      fontSize: 11, // 11pt conforme especificação
      fontFamily: 'Arial',
      color: '#000000',
      text: 'QR1234567' // Will be replaced with actual participant QR
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
  const [globalPhotographerUrl, setGlobalPhotographerUrl] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(true)

  // Load global photographer URL on component mount
  useEffect(() => {
    loadGlobalPhotographerUrl()
  }, [])

  // Set preview participant when project data changes
  useEffect(() => {
    if (projectData?.participants && projectData.participants.length > 0) {
      setPreviewParticipant(projectData.participants[0])
    }
  }, [projectData?.participants])

  const loadGlobalPhotographerUrl = useCallback(async () => {
    try {
      setIsLoadingUrl(true)
      const result = await window.electronAPI.getSetting('photographer_url')
      if (result.success && result.value) {
        setGlobalPhotographerUrl(result.value)
        // Update the credentials config with the global URL
        setCredentialsConfig(prev => ({
          ...prev,
          photographerUrl: {
            ...prev.photographerUrl,
            text: result.value
          }
        }))
      }
    } catch (error) {
      console.error('Error loading photographer URL:', error)
    } finally {
      setIsLoadingUrl(false)
    }
  }, [])

  const handlePhotographerUrlChange = useCallback((newUrl) => {
    setGlobalPhotographerUrl(newUrl)
    setCredentialsConfig(prev => ({
      ...prev,
      photographerUrl: {
        ...prev.photographerUrl,
        text: newUrl
      }
    }))
  }, [])

  // Load saved credentials configuration when project is loaded
  useEffect(() => {
    const loadSavedConfig = async () => {
      if (projectData?.projectId) {
        try {
          // Try to load from database first
          if (window.electronAPI.getProject) {
            const result = await window.electronAPI.getProject(projectData.projectId)
            console.log('Loading project config:', result)
            console.log('Project data:', result.project)
            console.log('Config exists:', !!result.project?.config)
            console.log('Config value:', result.project?.config)
            if (result.success) {
              const config = result.project.config || {}
              console.log('Project config found:', config)
              console.log('Config keys:', Object.keys(config))
              console.log('Has backgroundImagePath:', !!config.backgroundImagePath)
              console.log('Has qrCode:', !!config.qrCode)
              console.log('Has name:', !!config.name)
              
              if (config.credentialsConfig) {
                console.log('Loading credentials config:', config.credentialsConfig)
                setCredentialsConfig(prev => ({
                  ...prev,
                  ...config.credentialsConfig
                }))
                console.log('Loaded saved credentials configuration from database')
                return
              } else if (config.backgroundImagePath || config.qrCode || config.name) {
                // Direct config structure (without credentialsConfig wrapper)
                console.log('Loading direct credentials config:', config)
                setCredentialsConfig(prev => ({
                  ...prev,
                  ...config
                }))
                console.log('Loaded direct credentials configuration from database')
                return
              } else {
                console.log('No credentials config found in project config')
              }
            } else {
              console.log('No project config found or result not successful')
            }
          }
          
          // Fallback: try to load from localStorage
          const tempKey = `photolab_credentials_config_${projectData.projectId}`
          const savedConfig = localStorage.getItem(tempKey)
          if (savedConfig) {
            try {
              const config = JSON.parse(savedConfig)
              console.log('Loading from localStorage:', config)
              if (config.credentialsConfig) {
                setCredentialsConfig(prev => ({
                  ...prev,
                  ...config.credentialsConfig
                }))
                console.log('Loaded saved credentials configuration from localStorage')
              } else {
                // Direct config structure
                setCredentialsConfig(prev => ({
                  ...prev,
                  ...config
                }))
                console.log('Loaded direct config from localStorage')
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

  const handleBackgroundSelect = useCallback((imageName, imageData, imagePath) => {
    setCredentialsConfig(prev => ({
      ...prev,
      backgroundImage: imageData, // Base64 for preview
      backgroundImagePath: imagePath || imageName, // File path for persistence
      backgroundImageBase64: imageData // Keep base64 for preview even after reload
    }))
  }, [])

  const handleGenerateCredentials = useCallback(async () => {
    if (!projectData?.participants || projectData.participants.length === 0) {
      alert('Nenhum participante encontrado. Por favor, configure o projeto primeiro.')
      return
    }

    if (!projectData?.createdFolderPath) {
      alert('Pasta de destino não encontrada. Por favor, crie a estrutura do projeto primeiro.')
      return
    }

    setIsGenerating(true)
    try {
      // Generate credentials using Electron API
      const result = await window.electronAPI.generateCredentials({
        participants: projectData.participants,
        eventName: projectData.eventName,
        config: credentialsConfig,
        destinationFolder: projectData.createdFolderPath  // Usar a pasta de destino
      })

      if (result.success) {
        console.log('Generation result:', result)
        console.log('Output directory:', result.outputDirectory)
        console.log('Generated files:', result.generatedFiles)
        setGeneratedCredentials(result.credentials)
        alert(`${result.credentials.length} credenciais geradas com sucesso!\n\nSalvas em: ${result.outputDirectory}\n\nArquivos gerados: ${result.generatedFiles?.length || 0} arquivos PNG`)
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


  const handleSaveCredentialsConfig = useCallback(async () => {
    if (!projectData?.projectId) {
      alert('Projeto não encontrado. Salve o projeto primeiro.')
      return
    }

    try {
      // Save credentials configuration to database (include backgroundImageBase64 for generation)
      const { backgroundImage, ...configWithoutPreviewBase64 } = credentialsConfig
      const configToSave = {
        ...configWithoutPreviewBase64,
        savedAt: new Date().toISOString()
      }

      console.log('Saving credentials config:', configToSave)
      console.log('Project ID:', projectData.projectId)
      console.log('Full credentialsConfig before save:', credentialsConfig)

      let result

      // Always save to localStorage first as backup
      try {
        const tempKey = `photolab_credentials_config_${projectData.projectId}`
        localStorage.setItem(tempKey, JSON.stringify(configToSave))
        console.log('Saved to localStorage as backup')
      } catch (localError) {
        console.error('Error saving to localStorage:', localError)
      }

      // Try the new function first
      if (window.electronAPI.updateProjectConfig) {
        console.log('Using updateProjectConfig function')
        result = await window.electronAPI.updateProjectConfig(projectData.projectId, configToSave)
        console.log('Update result:', result)
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
                {/* Photographer URL Configuration */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">URL do Fotógrafo</h3>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={globalPhotographerUrl}
                      onChange={(e) => handlePhotographerUrlChange(e.target.value)}
                      placeholder="https://www.photo.app/fotografo/nomedotenant"
                      className="w-full input-field"
                      disabled={isLoadingUrl}
                    />
                    <p className="text-xs text-gray-600">
                      Esta URL será usada para gerar QR codes nas credenciais. 
                      Formato: https://www.photo.app/fotografo/[nomedotenant]/[QR Code]
                    </p>
                  </div>
                </div>

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

