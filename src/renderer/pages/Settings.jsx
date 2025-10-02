import React, { useState, useCallback, useEffect } from 'react'
import { AlertCircle, Trash2, Database, RefreshCw } from 'lucide-react'

/**
 * Settings Page Component
 * 
 * Provides application settings and maintenance options
 */
const Settings = ({ onNavigation }) => {
  const [isClearing, setIsClearing] = useState(false)
  const [clearMessage, setClearMessage] = useState('')
  const [photographerUrl, setPhotographerUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Load photographer URL on component mount
  useEffect(() => {
    loadPhotographerUrl()
  }, [])

  const loadPhotographerUrl = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await window.electronAPI.getSetting('photographer_url')
      if (result.success) {
        setPhotographerUrl(result.value || '')
      }
    } catch (error) {
      console.error('Error loading photographer URL:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSavePhotographerUrl = useCallback(async () => {
    try {
      setIsSaving(true)
      setSaveMessage('Salvando...')
      
      const result = await window.electronAPI.setSetting('photographer_url', photographerUrl)
      if (result.success) {
        setSaveMessage('✅ URL do fotógrafo salva com sucesso!')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage(`❌ Erro ao salvar: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving photographer URL:', error)
      setSaveMessage(`❌ Erro ao salvar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }, [photographerUrl])

  const handleClearDatabase = useCallback(async () => {
    const confirmMessage = 
      '⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados do aplicativo!\n\n' +
      'Isso inclui:\n' +
      '• Todos os projetos salvos\n' +
      '• Listas de participantes\n' +
      '• Configurações\n' +
      '• Cache de QR codes\n\n' +
      'Esta ação NÃO pode ser desfeita!\n\n' +
      'Tem certeza que deseja continuar?'

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setIsClearing(true)
      setClearMessage('Limpando database...')
      
      const result = await window.electronAPI.clearDatabase()
      
      if (result.success) {
        setClearMessage('✅ Database limpo com sucesso!')
        setTimeout(() => {
          setClearMessage('')
          // Reload the page to refresh the application
          window.location.reload()
        }, 2000)
      } else {
        setClearMessage(`❌ Erro ao limpar database: ${result.error}`)
      }
    } catch (error) {
      console.error('Error clearing database:', error)
      setClearMessage(`❌ Erro ao limpar database: ${error.message}`)
    } finally {
      setIsClearing(false)
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configurações
        </h1>
        <p className="text-gray-600">
          Gerencie as configurações e mantenha o aplicativo
        </p>
      </div>

      {/* Photographer URL Configuration */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Configurações do Fotógrafo
          </h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              URL do Fotógrafo
            </label>
            <div className="space-y-2">
              <input
                type="url"
                value={photographerUrl}
                onChange={(e) => setPhotographerUrl(e.target.value)}
                placeholder="https://www.photo.app/fotografo/nomedotenant"
                className="w-full input-field"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-600">
                Esta URL será usada para gerar QR codes nas credenciais. 
                Formato: https://www.photo.app/fotografo/[nomedotenant]
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Salvar Configuração
              </h3>
              <p className="text-sm text-gray-600">
                Salva a URL do fotógrafo para uso nas credenciais
              </p>
            </div>
            
            <button
              onClick={handleSavePhotographerUrl}
              disabled={isSaving || isLoading}
              className="btn-primary flex items-center space-x-2 px-4 py-2"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>
                {isSaving ? 'Salvando...' : 'Salvar URL'}
              </span>
            </button>
          </div>

          {saveMessage && (
            <div className={`p-3 rounded-lg ${
              saveMessage.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* Database Management */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Gerenciamento de Database
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Limpeza de Database
                </h3>
                <p className="text-sm text-yellow-700">
                  Use esta opção para limpar todos os dados do aplicativo. 
                  Isso é útil se você estiver enfrentando problemas ou quiser 
                  começar do zero.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Limpar Todos os Dados
              </h3>
              <p className="text-sm text-gray-600">
                Remove todos os projetos, configurações e dados do aplicativo
              </p>
            </div>
            
            <button
              onClick={handleClearDatabase}
              disabled={isClearing}
              className="btn-danger flex items-center space-x-2 px-4 py-2"
            >
              {isClearing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>
                {isClearing ? 'Limpando...' : 'Limpar Database'}
              </span>
            </button>
          </div>

          {clearMessage && (
            <div className={`p-3 rounded-lg ${
              clearMessage.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {clearMessage}
            </div>
          )}
        </div>
      </div>

      {/* Application Info */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Informações do Aplicativo
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Versão:</strong> 1.0.0
          </div>
          <div>
            <strong>Plataforma:</strong> Electron
          </div>
          <div>
            <strong>Database:</strong> SQLite
          </div>
          <div>
            <strong>Desenvolvido para:</strong> PhotoLab
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center">
        <button
          onClick={() => onNavigation('home')}
          className="btn-secondary flex items-center space-x-2 px-6 py-3"
        >
          <span>Voltar ao Início</span>
        </button>
      </div>
    </div>
  )
}

export default Settings
