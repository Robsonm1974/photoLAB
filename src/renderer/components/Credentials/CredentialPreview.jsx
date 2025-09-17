import React, { useState, useEffect, useCallback } from 'react'
import { 
  QrCode, 
  Type, 
  GraduationCap, 
  Link,
  User,
  AlertCircle
} from 'lucide-react'

/**
 * CredentialPreview Component
 * 
 * Shows a real-time preview of the credential with current configuration.
 * Displays elements positioned according to user settings.
 */
const CredentialPreview = ({ config, participant, eventName }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)

  // Generate QR code data URL
  const generateQRCode = useCallback(async (text) => {
    if (!text) return null

    setIsGeneratingQR(true)
    try {
      // Use the qrcode library to generate QR code
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(text, {
        width: config.qrCode?.size || 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeDataUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setIsGeneratingQR(false)
    }
  }, [config.qrCode?.size])

  // Generate QR code when participant changes
  useEffect(() => {
    if (participant?.qrCode && config.qrCode?.enabled) {
      generateQRCode(participant.qrCode)
    }
  }, [participant?.qrCode, config.qrCode?.enabled, generateQRCode])

  // Credential dimensions: 100mm x 150mm = 283x425px @ 72 DPI
  // For preview, we'll scale it down to fit in the container
  const previewScale = 0.8
  const previewWidth = 283 * previewScale
  const previewHeight = 425 * previewScale

  const renderElement = (elementType, elementConfig) => {
    if (!elementConfig?.enabled) return null

    const style = {
      position: 'absolute',
      left: `${elementConfig.x * previewScale}px`,
      top: `${elementConfig.y * previewScale}px`,
      transform: 'translate(0, 0)'
    }

    switch (elementType) {
      case 'qrCode':
        return (
          <div key="qrCode" style={style}>
            {isGeneratingQR ? (
              <div 
                className="bg-gray-200 rounded flex items-center justify-center"
                style={{ 
                  width: `${elementConfig.size * previewScale}px`, 
                  height: `${elementConfig.size * previewScale}px` 
                }}
              >
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
              </div>
            ) : qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="rounded"
                style={{ 
                  width: `${elementConfig.size * previewScale}px`, 
                  height: `${elementConfig.size * previewScale}px` 
                }}
              />
            ) : (
              <div 
                className="bg-gray-200 rounded flex items-center justify-center"
                style={{ 
                  width: `${elementConfig.size * previewScale}px`, 
                  height: `${elementConfig.size * previewScale}px` 
                }}
              >
                <QrCode className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
        )

      case 'name':
        return (
          <div
            key="name"
            style={{
              ...style,
              fontSize: `${elementConfig.fontSize * previewScale}px`,
              fontFamily: elementConfig.fontFamily || 'Arial',
              color: elementConfig.color || '#000000',
              fontWeight: 'bold'
            }}
          >
            {participant?.name || 'Nome do Participante'}
          </div>
        )

      case 'turma':
        return (
          <div
            key="turma"
            style={{
              ...style,
              fontSize: `${elementConfig.fontSize * previewScale}px`,
              fontFamily: elementConfig.fontFamily || 'Arial',
              color: elementConfig.color || '#666666'
            }}
          >
            {participant?.turma || 'Turma'}
          </div>
        )

      case 'photographerUrl':
        return (
          <div
            key="photographerUrl"
            style={{
              ...style,
              fontSize: `${elementConfig.fontSize * previewScale}px`,
              fontFamily: elementConfig.fontFamily || 'Arial',
              color: elementConfig.color || '#0066CC'
            }}
          >
            {elementConfig.text || 'https://photomanager.com'}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div className="flex justify-center">
        <div 
          className="relative border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg"
          style={{ 
            width: `${previewWidth}px`, 
            height: `${previewHeight}px`,
            backgroundColor: '#ffffff'
          }}
        >
          {/* Background Image */}
          {config.backgroundImage && (
            <img
              src={config.backgroundImage}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Elements */}
          {renderElement('qrCode', config.qrCode)}
          {renderElement('name', config.name)}
          {renderElement('turma', config.turma)}
          {renderElement('photographerUrl', config.photographerUrl)}

          {/* Border */}
          {config.showBorder && (
            <div className="absolute inset-0 border-2 border-gray-400 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Preview Info */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          Dimensões: 100mm x 150mm (283x425px @ 72 DPI)
        </p>
        <p className="text-xs text-gray-500">
          Preview em escala reduzida para visualização
        </p>
      </div>

      {/* Participant Info */}
      {participant ? (
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">Participante de Preview:</h4>
          <div className="text-sm text-blue-800">
            <p><strong>Nome:</strong> {participant.name}</p>
            <p><strong>Turma:</strong> {participant.turma}</p>
            <p><strong>QR Code:</strong> {participant.qrCode}</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              Nenhum participante selecionado para preview
            </span>
          </div>
        </div>
      )}

      {/* Event Info */}
      {eventName && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-1">Evento:</h4>
          <p className="text-sm text-gray-700">{eventName}</p>
        </div>
      )}

      {/* Element Status */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${config.qrCode?.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-gray-600">QR Code</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${config.name?.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-gray-600">Nome</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${config.turma?.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-gray-600">Turma</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${config.photographerUrl?.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-gray-600">URL</span>
        </div>
      </div>
    </div>
  )
}

export default CredentialPreview



