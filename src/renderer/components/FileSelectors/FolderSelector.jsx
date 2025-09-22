import React, { useState, useCallback } from 'react'
import { Folder, AlertCircle, CheckCircle, Image } from 'lucide-react'

/**
 * Folder Selector Component
 * 
 * Allows users to select source folder containing photos.
 * Validates folder exists and contains JPG files.
 * Follows patterns from agent_rules.md
 */
const FolderSelector = ({ selectedFolder, onFolderSelected, label, validatePhotos = true }) => {
  // Component state
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [error, setError] = useState(null)

  // Handle folder selection
  const handleFolderSelect = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setValidationResult(null)

      // Call Electron API to open folder dialog
      if (!window.electronAPI) {
        throw new Error('Electron API não disponível')
      }

      const result = await window.electronAPI.selectFolder()
      
      if (!result.filePaths || result.filePaths.length === 0) {
        // User cancelled
        return
      }

      const folderPath = result.filePaths[0]

      // Only validate photos if validatePhotos is true
      if (validatePhotos) {
        const validation = await window.electronAPI.validateFolder(folderPath)
        
        if (!validation.valid) {
          setError(validation.message)
          return
        }

        setValidationResult(validation)
      } else {
        // Use destination folder validation (no JPG check)
        const validation = await window.electronAPI.validateDestinationFolder(folderPath)
        
        if (!validation.valid) {
          setError(validation.message)
          return
        }
      }

      onFolderSelected(folderPath)
      
    } catch (error) {
      console.error('Folder selection error:', error)
      setError('Erro ao selecionar pasta. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [onFolderSelected, validatePhotos])


  // Reset selection
  const handleReset = useCallback(() => {
    onFolderSelected(null)
    setValidationResult(null)
    setError(null)
  }, [onFolderSelected])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          {label}
        </label>
        
        {/* Folder Selection Button */}
        <button
          onClick={handleFolderSelect}
          disabled={isLoading}
          className={`w-full flex items-center justify-center space-x-3 p-4 border-2 border-dashed rounded-lg transition-colors duration-200 ${
            selectedFolder 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Folder className={`w-6 h-6 ${selectedFolder ? 'text-green-600' : 'text-gray-500'}`} />
          <span className={`font-medium ${selectedFolder ? 'text-green-700' : 'text-gray-600'}`}>
            {isLoading 
              ? 'Verificando pasta...' 
              : selectedFolder 
                ? 'Pasta selecionada' 
                : 'Clique para selecionar pasta'
            }
          </span>
        </button>
      </div>

      {/* Selected Folder Info */}
      {selectedFolder && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Pasta Selecionada</span>
              </div>
              <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                {selectedFolder}
              </p>
              
              {validationResult && validatePhotos && (
                <div className="flex items-center space-x-2 mt-2">
                  <Image className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    {validationResult.message}
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 ml-4"
            >
              Alterar
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Erro na seleção</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text - Only show for photos validation */}
      {validatePhotos && (
        <p className="text-xs text-gray-500">
          Selecione a pasta que contém as fotos originais do evento. 
          A pasta deve conter arquivos JPG ou JPEG.
        </p>
      )}
    </div>
  )
}

export default FolderSelector
