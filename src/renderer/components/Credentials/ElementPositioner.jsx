import React, { useState, useCallback } from 'react'
import { 
  QrCode, 
  Type, 
  GraduationCap, 
  Link,
  Move,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react'

/**
 * ElementPositioner Component
 * 
 * Allows users to configure the position, size, and style of credential elements.
 * Provides real-time preview of element positioning.
 */
const ElementPositioner = ({ config, onConfigChange }) => {
  const [selectedElement, setSelectedElement] = useState('qrCode')
  const [previewMode, setPreviewMode] = useState(true)

  const elements = [
    {
      key: 'qrCode',
      label: 'QR Code',
      icon: QrCode,
      description: 'Código QR do participante'
    },
    {
      key: 'name',
      label: 'Nome',
      icon: Type,
      description: 'Nome do participante'
    },
    {
      key: 'turma',
      label: 'Turma',
      icon: GraduationCap,
      description: 'Turma do participante'
    },
    {
      key: 'photographerUrl',
      label: 'URL do Fotógrafo',
      icon: Link,
      description: 'URL do site do fotógrafo'
    }
  ]

  const handleElementToggle = useCallback((elementKey) => {
    const currentEnabled = config[elementKey]?.enabled
    onConfigChange(elementKey, 'enabled', !currentEnabled)
  }, [config, onConfigChange])

  const handlePositionChange = useCallback((elementKey, property, value) => {
    onConfigChange(elementKey, property, parseInt(value) || 0)
  }, [onConfigChange])

  const handleStyleChange = useCallback((elementKey, property, value) => {
    onConfigChange(elementKey, property, value)
  }, [onConfigChange])

  const resetElementPosition = useCallback((elementKey) => {
    const defaultPositions = {
      qrCode: { x: 93, y: 105, size: 144 }, // Ajustado para 283x425px
      name: { x: 96, y: 288, fontSize: 12 },
      turma: { x: 12, y: 84, fontSize: 10 },
      photographerUrl: { x: 12, y: 96, fontSize: 8 }
    }
    
    const defaults = defaultPositions[elementKey]
    if (defaults) {
      Object.entries(defaults).forEach(([prop, value]) => {
        onConfigChange(elementKey, prop, value)
      })
    }
  }, [onConfigChange])

  const renderElementControls = (element) => {
    const elementConfig = config[element.key]
    if (!elementConfig) return null

    return (
      <div className="space-y-4">
        {/* Element Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <element.icon className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="font-medium text-gray-900">{element.label}</h3>
              <p className="text-sm text-gray-600">{element.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleElementToggle(element.key)}
              className={`p-2 rounded-lg transition-colors ${
                elementConfig.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {elementConfig.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => resetElementPosition(element.key)}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Resetar posição"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {elementConfig.enabled && (
          <div className="space-y-3 pl-8">
            {/* Position Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posição X (px)
                </label>
                <input
                  type="number"
                  value={elementConfig.x || 0}
                  onChange={(e) => handlePositionChange(element.key, 'x', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="283"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posição Y (px)
                </label>
                <input
                  type="number"
                  value={elementConfig.y || 0}
                  onChange={(e) => handlePositionChange(element.key, 'y', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="425"
                />
              </div>
            </div>

            {/* Size Controls */}
            {element.key === 'qrCode' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tamanho (px)
                </label>
                <input
                  type="number"
                  value={elementConfig.size || 144}
                  onChange={(e) => handlePositionChange(element.key, 'size', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  min="50"
                  max="200"
                />
              </div>
            )}

            {/* Font Size Controls */}
            {['name', 'turma', 'photographerUrl'].includes(element.key) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tamanho da Fonte (px)
                </label>
                <input
                  type="number"
                  value={elementConfig.fontSize || 12}
                  onChange={(e) => handleStyleChange(element.key, 'fontSize', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  min="8"
                  max="72"
                />
              </div>
            )}

            {/* Color Controls */}
            {['name', 'turma', 'photographerUrl'].includes(element.key) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={elementConfig.color || '#000000'}
                    onChange={(e) => handleStyleChange(element.key, 'color', e.target.value)}
                    className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={elementConfig.color || '#000000'}
                    onChange={(e) => handleStyleChange(element.key, 'color', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="#000000"
                  />
                </div>
              </div>
            )}

            {/* Text Content for Photographer URL */}
            {element.key === 'photographerUrl' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Fotógrafo
                </label>
                <input
                  type="text"
                  value={elementConfig.text || ''}
                  onChange={(e) => handleStyleChange(element.key, 'text', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="https://photomanager.com"
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preview Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Configuração dos Elementos</h3>
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            previewMode
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Move className="w-4 h-4" />
          <span>{previewMode ? 'Modo Preview' : 'Modo Edição'}</span>
        </button>
      </div>

      {/* Elements List */}
      <div className="space-y-4">
        {elements.map((element) => (
          <div
            key={element.key}
            className={`border rounded-lg p-4 transition-colors ${
              selectedElement === element.key
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {renderElementControls(element)}
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Como usar:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Posição X/Y:</strong> Coordenadas em pixels (0,0 = canto superior esquerdo)</li>
          <li>• <strong>Tamanho:</strong> Para QR code, tamanho em pixels. Para texto, tamanho da fonte em pontos</li>
          <li>• <strong>Cor:</strong> Use códigos hexadecimais (#000000) ou selecione com o seletor</li>
          <li>• <strong>Dimensões da credencial:</strong> 100mm x 150mm (283x425 pixels @ 72 DPI)</li>
        </ul>
      </div>
    </div>
  )
}

export default ElementPositioner



