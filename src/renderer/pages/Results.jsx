import React, { useState, useCallback, useEffect } from 'react'
import { 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Users, 
  Image, 
  FolderOpen, 
  Download,
  RefreshCw,
  UserPlus,
  FileImage,
  ArrowRight
} from 'lucide-react'
import PhotoThumbnail from '../components/PhotoThumbnail'

const Results = ({ projectData, processingResults, onNavigation }) => {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [ungroupedPhotos, setUngroupedPhotos] = useState([])
  const [showManualGrouping, setShowManualGrouping] = useState(false)
  const [selectedUngroupedPhotos, setSelectedUngroupedPhotos] = useState([])
  const [targetParticipant, setTargetParticipant] = useState('')

  useEffect(() => {
    if (processingResults?.photo_grouping?.ungrouped_photos) {
      setUngroupedPhotos(processingResults.photo_grouping.ungrouped_photos)
    }
  }, [processingResults])

  const handleOpenFolder = useCallback(async () => {
    if (projectData?.createdFolderPath) {
      try {
        await window.electronAPI.openFolder(projectData.createdFolderPath)
      } catch (error) {
        console.error('Error opening folder:', error)
      }
    }
  }, [projectData])

  const handleViewPhotos = useCallback(async (groupPath) => {
    if (groupPath) {
      try {
        await window.electronAPI.openFolder(groupPath)
      } catch (error) {
        console.error('Error opening group folder:', error)
      }
    }
  }, [])

  const handleManualGrouping = useCallback(() => {
    setShowManualGrouping(true)
  }, [])

  const handleAssignPhotos = useCallback(async () => {
    if (!targetParticipant || selectedUngroupedPhotos.length === 0) {
      return
    }

    try {
      // Call API to move photos to participant folder
      const result = await window.electronAPI.assignPhotosToParticipant({
        photos: selectedUngroupedPhotos,
        participant: targetParticipant,
        destinationFolder: projectData.createdFolderPath
      })

      if (result.success) {
        // Remove assigned photos from ungrouped list
        setUngroupedPhotos(prev => 
          prev.filter(photo => !selectedUngroupedPhotos.includes(photo))
        )
        setSelectedUngroupedPhotos([])
        setTargetParticipant('')
        setShowManualGrouping(false)
      }
    } catch (error) {
      console.error('Error assigning photos:', error)
    }
  }, [selectedUngroupedPhotos, targetParticipant, projectData])

  if (!processingResults) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
        <h2 className="text-xl font-semibold mb-2">Nenhum resultado disponível</h2>
        <p className="text-gray-600 mb-4">Execute o processamento OCR primeiro.</p>
        <button
          onClick={() => onNavigation('processing')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Ir para Processamento
        </button>
      </div>
    )
  }

  const { processing_summary, photo_grouping } = processingResults
  const groups = photo_grouping?.groups || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resultados do Processamento</h1>
          <p className="text-gray-600">Projeto: {projectData?.eventName}</p>
        </div>
        <button
          onClick={handleOpenFolder}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <FolderOpen size={20} />
          Abrir Pasta do Projeto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Image className="text-blue-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-blue-800">{processing_summary?.total_images || 0}</p>
              <p className="text-sm text-blue-600">Fotos Processadas</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-green-800">{processing_summary?.qr_detected || 0}</p>
              <p className="text-sm text-green-600">QR Codes Detectados</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-3">
            <Users className="text-purple-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-purple-800">{processing_summary?.groups_created || 0}</p>
              <p className="text-sm text-purple-600">Grupos Criados</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-orange-800">{processing_summary?.ungrouped_photos || 0}</p>
              <p className="text-sm text-orange-600">Fotos Não Agrupadas</p>
            </div>
          </div>
        </div>

        {processingResults?.photo_copying && (
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-3">
              <Download className="text-indigo-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-indigo-800">
                  {(processingResults.photo_copying?.summary?.total_copied || 
                    processingResults.photo_copying?.copied_files?.length || 0)}
                </p>
                <p className="text-sm text-indigo-600">Fotos Copiadas</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Groups */}
      {groups && Object.keys(groups).length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="text-blue-600" size={24} />
            Grupos Criados ({Object.keys(groups).length})
          </h2>
          
          <div className="space-y-4">
            {Object.entries(groups).map(([participantName, group], index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{participantName}</h3>
                    <p className="text-gray-600 text-sm">
                      Turma: {group.participant?.turma || 'N/A'} | QR: {group.participant?.qrCode || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {group.photos?.length || 0} fotos
                    </span>
                    <button
                      onClick={() => handleViewPhotos(group.folder_path)}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                    >
                      <Eye size={16} />
                      Ver Fotos
                    </button>
                  </div>
                </div>
                
                {/* Photo thumbnails preview */}
                <div className="flex gap-2 overflow-x-auto">
                  {(group.photos || []).slice(0, 5).map((photo, photoIndex) => (
                    <PhotoThumbnail
                      key={photoIndex}
                      photo={photo}
                      size="md"
                      clickable={true}
                      onClick={() => {
                        // You can implement a modal here to view full size
                        console.log('Clicked photo:', photo)
                      }}
                      className="flex-shrink-0"
                    />
                  ))}
                  {(group.photos?.length || 0) > 5 && (
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">+{(group.photos?.length || 0) - 5}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ungrouped Photos */}
      {ungroupedPhotos && ungroupedPhotos.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="text-orange-600" size={24} />
              Fotos Não Agrupadas ({ungroupedPhotos.length})
            </h2>
            <button
              onClick={handleManualGrouping}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <UserPlus size={20} />
              Agrupar Manualmente
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ungroupedPhotos.map((photo, index) => (
              <div
                key={index}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedUngroupedPhotos.includes(photo)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (showManualGrouping) {
                    setSelectedUngroupedPhotos(prev => 
                      prev.includes(photo)
                        ? prev.filter(p => p !== photo)
                        : [...prev, photo]
                    )
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <PhotoThumbnail
                    photo={photo}
                    size="sm"
                    clickable={false}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {typeof photo === 'string' ? 
                        (photo.split('\\').pop() || photo.split('/').pop()) : 
                        (photo.file_name || photo.path?.split('\\').pop() || photo.path?.split('/').pop() || 'Unknown')
                      }
                    </p>
                    <p className="text-sm text-gray-500">
                      {photo.code || photo.qr_code ? `QR: ${photo.code || photo.qr_code}` : 'Sem QR detectado'}
                      {photo.reason && ` (${photo.reason})`}
                    </p>
                  </div>
                  {showManualGrouping && selectedUngroupedPhotos.includes(photo) && (
                    <CheckCircle className="text-blue-600" size={20} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Manual Grouping Panel */}
          {showManualGrouping && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold mb-3">Agrupar Fotos Selecionadas</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">
                    Participante de Destino
                  </label>
                  <select
                    value={targetParticipant}
                    onChange={(e) => setTargetParticipant(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">Selecione um participante...</option>
                    {projectData?.participants?.map((participant, index) => (
                      <option key={index} value={participant.name}>
                        {participant.name} ({participant.turma})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAssignPhotos}
                    disabled={!targetParticipant || selectedUngroupedPhotos.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ArrowRight size={16} />
                    Mover ({selectedUngroupedPhotos.length})
                  </button>
                  <button
                    onClick={() => {
                      setShowManualGrouping(false)
                      setSelectedUngroupedPhotos([])
                      setTargetParticipant('')
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => onNavigation('home')}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Novo Projeto
        </button>
        <button
          onClick={() => onNavigation('processing')}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <RefreshCw size={20} />
          Reprocessar
        </button>
      </div>
    </div>
  )
}

export default Results
