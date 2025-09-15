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
  ArrowRight,
  Edit3
} from 'lucide-react'
import PhotoThumbnail from '../components/PhotoThumbnail'

const Results = ({ projectData, processingResults, onNavigation }) => {
  const [selectedGroup, setSelectedGroup] = useState(null)
  // Estado local para edição de grupos (não altera página inicial)
  const [groupsState, setGroupsState] = useState({})
  const [editingGroupKey, setEditingGroupKey] = useState(null)
  const [selectedGroupPhotos, setSelectedGroupPhotos] = useState([])
  const [ungroupedPhotos, setUngroupedPhotos] = useState([])
  const [showManualGrouping, setShowManualGrouping] = useState(false)
  const [selectedUngroupedPhotos, setSelectedUngroupedPhotos] = useState([])
  const [targetParticipant, setTargetParticipant] = useState('')
  // Viewer state (visualização grande de imagens)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerList, setViewerList] = useState([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerImage, setViewerImage] = useState('')
  const [viewerLoading, setViewerLoading] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)

  useEffect(() => {
    if (processingResults?.photo_grouping?.ungrouped_photos) {
      setUngroupedPhotos(processingResults.photo_grouping.ungrouped_photos)
    }
    if (processingResults?.photo_grouping?.groups) {
      setGroupsState(processingResults.photo_grouping.groups)
    }
  }, [processingResults])

  // Helpers de edição
  const photoKey = (p) => (p?.file_path || p?.path || p?.file_name || p?.fileName || '') + '|' + (p?.modified_time || '')
  const isSamePhoto = (a, b) => photoKey(a) === photoKey(b)

  const handleEditGroup = useCallback((groupKey) => {
    if (editingGroupKey === groupKey) {
      setEditingGroupKey(null)
      setSelectedGroupPhotos([])
    } else {
      setEditingGroupKey(groupKey)
      setSelectedGroupPhotos([])
    }
  }, [editingGroupKey])

  const toggleSelectPhotoInGroup = useCallback((groupKey, photo) => {
    if (editingGroupKey !== groupKey) return
    setSelectedGroupPhotos((prev) => {
      const exists = prev.find((p) => isSamePhoto(p, photo))
      if (exists) {
        return prev.filter((p) => !isSamePhoto(p, photo))
      }
      return [...prev, photo]
    })
  }, [editingGroupKey])

  const handleMoveSelectedToUngrouped = useCallback(() => {
    if (!editingGroupKey || selectedGroupPhotos.length === 0) return
    const group = groupsState[editingGroupKey]
    if (!group) return

    const remaining = (group.photos || []).filter((p) => !selectedGroupPhotos.find((sp) => isSamePhoto(sp, p)))
    const moved = (group.photos || []).filter((p) => selectedGroupPhotos.find((sp) => isSamePhoto(sp, p)))

    setGroupsState((prev) => ({
      ...prev,
      [editingGroupKey]: { ...group, photos: remaining }
    }))
    setUngroupedPhotos((prev) => [...moved, ...prev])
    setSelectedGroupPhotos([])
    setEditingGroupKey(null)
  }, [editingGroupKey, selectedGroupPhotos, groupsState])

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

  // Pequena correção visual para textos com mojibake (ex.: JoÃ£o -> João)
  const fixEncoding = useCallback((text) => {
    if (!text || typeof text !== 'string') return text
    // Se contiver padrões típicos, tenta reparar Latin1->UTF8
    if (/[ÃÂ�]/.test(text)) {
      try {
        // escape() gera bytes Latin1; decodeURIComponent decodifica em UTF-8
        return decodeURIComponent(escape(text))
      } catch (e) {
        return text
      }
    }
    return text
  }, [])

  // Helpers para visualizar imagem grande
  const getPhotoPath = useCallback((photo) => {
    if (!photo) return ''
    if (typeof photo === 'string') return photo
    return (
      photo.file_path || photo.path || photo.source || photo.destination || photo.original_path || ''
    )
  }, [])

  const openViewer = useCallback((list, index) => {
    setViewerList(list)
    setViewerIndex(index)
    setViewerOpen(true)
  }, [])

  const closeViewer = useCallback(() => {
    setViewerOpen(false)
  }, [])

  const prevPhoto = useCallback(() => {
    setViewerIndex((i) => (i > 0 ? i - 1 : i))
  }, [])

  const nextPhoto = useCallback(() => {
    setViewerIndex((i) => (i < viewerList.length - 1 ? i + 1 : i))
  }, [viewerList])

  useEffect(() => {
    if (!viewerOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeViewer()
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerOpen, closeViewer, prevPhoto, nextPhoto])

  // Load full-size image for viewer using safe data URL via preload (avoids file:// restriction)
  useEffect(() => {
    const load = async () => {
      if (!viewerOpen || viewerList.length === 0) return
      const current = viewerList[viewerIndex]
      const path = getPhotoPath(current)
      if (!path) { setViewerImage(''); return }
      setViewerLoading(true)
      try {
        const res = await window.electronAPI.generateThumbnail(path)
        if (res?.success && res?.dataUrl) {
          setViewerImage(res.dataUrl)
        } else {
          setViewerImage('')
        }
      } catch (e) {
        setViewerImage('')
      } finally {
        setViewerLoading(false)
      }
    }
    load()
  }, [viewerOpen, viewerIndex, viewerList, getPhotoPath])

  const handleFinalize = useCallback(async () => {
    try {
      setIsFinalizing(true)
      // Apenas salvar as não agrupadas no destino/EventName/Não Agrupadas
      const payload = {
        destinationFolder: projectData?.createdFolderPath,
        ungroupedPhotos,
        eventName: projectData?.eventName
      }
      const res = await window.electronAPI.saveUngroupedPhotos(payload)
      if (!res?.success) throw new Error(res?.error || 'Falha ao salvar não agrupadas')
      alert('Finalizado. Fotos não agrupadas salvas.')
    } catch (e) {
      console.error(e)
      alert('Falha ao finalizar processamento.')
    } finally {
      setIsFinalizing(false)
    }
  }, [projectData, groupsState, ungroupedPhotos])

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
  const groups = groupsState || {}

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
            {Object.entries(groups).map(([groupKey, group], index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{groupKey}</h3>
                    {(() => {
                      const displayName = fixEncoding(group.participant?.name || group.participant_name || 'N/A')
                      const displayTurma = fixEncoding(group.participant?.turma || group.turma || 'N/A')
                      const displayQR = group.participant?.qrCode || group.qr_code || 'N/A'
                      return (
                        <p className="text-gray-600 text-sm">({displayName}, {displayTurma}/QR {displayQR})</p>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {group.photos?.length || 0} fotos
                    </span>
                    {/* Botão Ver Fotos removido conforme solicitado */}
                    <button
                      onClick={() => handleEditGroup(groupKey)}
                      className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${editingGroupKey===groupKey ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <Edit3 size={16} />
                      {editingGroupKey===groupKey ? 'Concluir Edição' : 'Editar'}
                    </button>
                    {editingGroupKey===groupKey && (
                      <button
                        onClick={handleMoveSelectedToUngrouped}
                        disabled={selectedGroupPhotos.length===0}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${selectedGroupPhotos.length===0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                      >
                        <ArrowRight size={16} />
                        Mover para Desagrupadas
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Photo thumbnails preview */}
                <div className="flex gap-2 overflow-x-auto">
                  {(group.photos || []).map((photo, photoIndex) => {
                    const selected = editingGroupKey===groupKey && selectedGroupPhotos.find((p)=>isSamePhoto(p, photo))
                    return (
                      <div
                        key={photoIndex}
                        className={`relative flex-shrink-0 rounded ${selected ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => {
                          if (editingGroupKey===groupKey) {
                            toggleSelectPhotoInGroup(groupKey, photo)
                          } else {
                            openViewer(group.photos, photoIndex)
                          }
                        }}
                      >
                        <PhotoThumbnail
                          photo={photo}
                          size="md"
                          clickable={true}
                        />
                        {selected && (
                          <CheckCircle className="text-blue-600 absolute -top-2 -right-2 bg-white rounded-full" size={20} />
                        )}
                      </div>
                    )
                  })}
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
                  } else {
                    openViewer(ungroupedPhotos, index)
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
                        {fixEncoding(participant.name)} — QR: {participant.qrCode || 'N/A'}
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

      {/* Image Viewer Modal */}
      {viewerOpen && viewerList.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <button
            className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded px-3 py-1"
            onClick={closeViewer}
          >
            Fechar ✕
          </button>
          <button
            className={`absolute left-4 text-white bg-black/40 hover:bg-black/60 rounded px-3 py-1 ${viewerIndex===0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            onClick={prevPhoto}
            disabled={viewerIndex===0}
          >
            ◀
          </button>
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {viewerLoading && (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            )}
            {!viewerLoading && viewerImage && (
              <img
                src={viewerImage}
                alt="Preview"
                className="object-contain w-full h-full"
              />
            )}
            {!viewerLoading && !viewerImage && (
              <div className="text-white opacity-80">Não foi possível carregar a imagem</div>
            )}
          </div>
          <button
            className={`absolute right-4 text-white bg-black/40 hover:bg-black/60 rounded px-3 py-1 ${viewerIndex>=viewerList.length-1 ? 'opacity-40 cursor-not-allowed' : ''}`}
            onClick={nextPhoto}
            disabled={viewerIndex>=viewerList.length-1}
          >
            ▶
          </button>
        </div>
      )}

      {/* Finalizar processamento */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleFinalize}
          disabled={isFinalizing}
          className={`px-4 py-2 rounded text-white ${isFinalizing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isFinalizing ? 'Finalizando...' : 'Salvar e Copiar Fotos'}
        </button>
      </div>

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
