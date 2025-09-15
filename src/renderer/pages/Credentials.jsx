import React, { useState, useCallback } from 'react'
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Eye, 
  Settings,
  User,
  QrCode,
  GraduationCap,
  FileText
} from 'lucide-react'

/**
 * Credentials Generation Page
 * 
 * Allows photographers to generate and print credentials for participants
 * before the photo session.
 */
const Credentials = ({ projectData, onNavigation }) => {
  const [credentialsConfig, setCredentialsConfig] = useState({
    includeQRCode: true,
    includePhoto: false,
    includeEventInfo: true,
    includeClassInfo: true,
    paperSize: 'A4',
    orientation: 'portrait',
    fontSize: 'medium',
    showBorder: true,
    showLogo: true
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState(null)

  const handleConfigChange = useCallback((key, value) => {
    setCredentialsConfig(prev => ({
      ...prev,
      [key]: value
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
      const result = await window.electronAPI.printCredentials(generatedCredentials)
      if (result.success) {
        alert('Credenciais enviadas para impressão!')
      } else {
        alert(`Erro ao imprimir: ${result.error}`)
      }
    } catch (error) {
      console.error('Error printing credentials:', error)
      alert(`Erro inesperado: ${error.message}`)
    }
  }, [generatedCredentials])

  const handleSaveCredentials = useCallback(async () => {
    if (!generatedCredentials) {
      alert('Nenhuma credencial gerada. Gere as credenciais primeiro.')
      return
    }

    try {
      const result = await window.electronAPI.saveCredentials(generatedCredentials, projectData.eventName)
      if (result.success) {
        alert(`Credenciais salvas em: ${result.filePath}`)
      } else {
        alert(`Erro ao salvar: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving credentials:', error)
      alert(`Erro inesperado: ${error.message}`)
    }
  }, [generatedCredentials, projectData.eventName])

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações das Credenciais
            </h2>
            
            <div className="space-y-4">
              {/* Content Options */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Conteúdo</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={credentialsConfig.includeQRCode}
                      onChange={(e) => handleConfigChange('includeQRCode', e.target.checked)}
                      className="mr-2"
                    />
                    <QrCode className="w-4 h-4 mr-1" />
                    Incluir QR Code
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={credentialsConfig.includeEventInfo}
                      onChange={(e) => handleConfigChange('includeEventInfo', e.target.checked)}
                      className="mr-2"
                    />
                    <FileText className="w-4 h-4 mr-1" />
                    Incluir informações do evento
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={credentialsConfig.includeClassInfo}
                      onChange={(e) => handleConfigChange('includeClassInfo', e.target.checked)}
                      className="mr-2"
                    />
                    <GraduationCap className="w-4 h-4 mr-1" />
                    Incluir informações da turma
                  </label>
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
                      className="form-select"
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orientação
                    </label>
                    <select
                      value={credentialsConfig.orientation}
                      onChange={(e) => handleConfigChange('orientation', e.target.value)}
                      className="form-select"
                    >
                      <option value="portrait">Retrato</option>
                      <option value="landscape">Paisagem</option>
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
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={credentialsConfig.showLogo}
                      onChange={(e) => handleConfigChange('showLogo', e.target.checked)}
                      className="mr-2"
                    />
                    Mostrar logo
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview and Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Pré-visualização
            </h2>
            
            {generatedCredentials ? (
              <div className="space-y-4">
                <div className="bg-gray-100 p-4 rounded border">
                  <h3 className="font-semibold text-lg">Lorena Martins</h3>
                  <p className="text-gray-600">5 ano</p>
                  {credentialsConfig.includeQRCode && (
                    <div className="mt-2 p-2 bg-white rounded border inline-block">
                      <div className="w-16 h-16 bg-gray-300 rounded flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-gray-600" />
                      </div>
                    </div>
                  )}
                  {credentialsConfig.includeEventInfo && (
                    <p className="text-sm text-gray-500 mt-2">
                      Evento: {projectData?.eventName}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {generatedCredentials.length} credenciais geradas
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Gere as credenciais para ver a pré-visualização</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações</h2>
            
            <div className="space-y-3">
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

