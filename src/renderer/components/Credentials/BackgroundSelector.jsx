import React, { useState, useCallback } from 'react'
import { 
  Image, 
  Upload, 
  X, 
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

/**
 * BackgroundSelector Component
 * 
 * Allows users to select and preview background images for credentials.
 * Supports local image upload with preview functionality.
 */
const BackgroundSelector = ({ onBackgroundSelect, currentBackground }) => {
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, etc.)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('O arquivo é muito grande. Tamanho máximo: 10MB')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setSelectedImage(file)

      // Read file as base64 for preview and get file path
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64Data = e.target.result
        // Send both base64 for preview and file path for persistence
        // Note: file.path is not available in browser, so we'll use the full path from the file input
        const fullPath = file.webkitRelativePath || file.name
        onBackgroundSelect(file.name, base64Data, fullPath)
        setIsLoading(false)
      }
      reader.onerror = () => {
        setError('Erro ao ler o arquivo. Tente novamente.')
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing image:', error)
      setError('Erro ao processar a imagem. Tente novamente.')
      setIsLoading(false)
    }
  }, [onBackgroundSelect])

  const handleRemoveImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedImage(null)
    setError(null)
    onBackgroundSelect('', null, '')
  }, [previewUrl, onBackgroundSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const event = { target: { files: [file] } }
      handleFileSelect(event)
    }
  }, [handleFileSelect])

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          error 
            ? 'border-red-300 bg-red-50' 
            : previewUrl 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Processando imagem...</p>
          </div>
        ) : previewUrl ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Imagem selecionada</span>
            </div>
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview do background"
                className="max-w-full max-h-48 rounded border shadow-sm"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {selectedImage?.name}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Selecione uma imagem de background
              </p>
              <p className="text-sm text-gray-600">
                Arraste e solte uma imagem aqui ou clique para selecionar
              </p>
            </div>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="background-upload"
              />
              <label
                htmlFor="background-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <Image className="w-4 h-4 mr-2" />
                Selecionar Imagem
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Formatos suportados: JPG, PNG, GIF. Tamanho máximo: 10MB
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Current Background Info */}
      {currentBackground && !previewUrl && (
        <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
          <Eye className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            Background atual: {currentBackground}
          </span>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Dicas para o background:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use imagens com resolução alta (300 DPI recomendado)</li>
          <li>• O formato da credencial é 10x15cm (vertical)</li>
          <li>• Evite elementos muito escuros que possam interferir no texto</li>
          <li>• Considere deixar espaço para os elementos (QR code, nome, turma)</li>
        </ul>
      </div>
    </div>
  )
}

export default BackgroundSelector



