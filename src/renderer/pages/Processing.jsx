import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Folder, ArrowLeft } from 'lucide-react'

/**
 * Processing Page Component
 * 
 * Shows the status after directory structure creation
 * Will be expanded in Phase 2 for OCR processing
 */
const Processing = ({ onNavigation, projectData }) => {
  const [status, setStatus] = useState('completed') // For now, assume structure was created

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Estrutura de Diretórios Criada
        </h1>
        <p className="text-gray-600">
          A estrutura de pastas foi criada com sucesso
        </p>
      </div>

      {/* Success Status */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Fase 1 Concluída ✓
            </h2>
            <p className="text-gray-600">
              Estrutura de pastas criada baseada na lista de participantes
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-green-800 mb-2">
            O que foi criado:
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Pasta principal do evento</li>
            <li>• Subpastas por turma</li>
            <li>• Pastas individuais para cada participante</li>
            <li>• Estrutura: /Evento/Turma/Participante-QRCode/</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">
            📋 Próximos Passos (Fase 2):
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Implementar detecção de QR codes (OCR)</li>
            <li>• Agrupar fotos por sequência temporal</li>
            <li>• Interface para correção manual</li>
            <li>• Cópia e renomeação automática das fotos</li>
          </ul>
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
          onClick={async () => {
            if (projectData?.createdFolderPath) {
              try {
                await window.electronAPI.openFolder(projectData.createdFolderPath)
              } catch (error) {
                alert('Erro ao abrir pasta: ' + error.message)
              }
            } else {
              alert('Caminho da pasta não encontrado')
            }
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Folder className="w-4 h-4" />
          <span>Abrir Pasta Criada</span>
        </button>
      </div>

      {/* Development Status */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">
              Status de Desenvolvimento
            </h4>
            <p className="text-sm text-yellow-700 mt-1">
              <strong>Fase 1 - MVP Core:</strong> ✅ Concluída<br />
              <strong>Fase 2 - OCR Processing:</strong> 🔄 Próxima etapa<br />
              <strong>Fase 3 - Licenciamento:</strong> ⏳ Aguardando<br />
              <strong>Fase 4 - Relatórios:</strong> ⏳ Aguardando
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Processing
