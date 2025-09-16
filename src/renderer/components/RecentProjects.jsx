import React, { useState, useEffect, useCallback } from 'react'
import { Clock, FolderOpen, Trash2 } from 'lucide-react'

/**
 * Recent Projects Component
 * 
 * Shows a list of recently accessed projects in the sidebar
 */
const RecentProjects = ({ onProjectLoad, onNewProject }) => {
  const [recentProjects, setRecentProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load recent projects on component mount
  useEffect(() => {
    loadRecentProjects()
  }, [])

  const loadRecentProjects = useCallback(async () => {
    try {
      setLoading(true)
      const result = await window.electronAPI.getProjects()
      
      if (result.success) {
        // Get only the 5 most recent projects
        const recent = result.projects.slice(0, 5)
        setRecentProjects(recent)
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Error loading recent projects:', error)
      setError('Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLoadProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.getProject(projectId)
      
      if (result.success) {
        onProjectLoad(result.project)
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Error loading project:', error)
      setError('Erro ao carregar projeto')
    }
  }, [onProjectLoad])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      return 'Hoje'
    } else if (diffDays === 2) {
      return 'Ontem'
    } else if (diffDays <= 7) {
      return `${diffDays - 1} dias atrás`
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      })
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600">
          <p>{error}</p>
          <button 
            onClick={loadRecentProjects}
            className="text-blue-600 hover:text-blue-800 mt-1"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (recentProjects.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center">
          <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-2">Nenhum projeto recente</p>
          <button
            onClick={onNewProject}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Criar novo projeto
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-1">
          <Clock className="w-4 h-4" />
          <span>Últimos Projetos</span>
        </h3>
        <button
          onClick={onNewProject}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Novo
        </button>
      </div>
      
      <div className="space-y-2">
        {recentProjects.map((project) => (
          <div 
            key={project.id}
            className="group p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleLoadProject(project.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {project.name}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {project.event_name}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {formatDate(project.updated_at)}
                  </span>
                  {project.participant_count > 0 && (
                    <span className="text-xs text-gray-400">
                      • {project.participant_count} participantes
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Tem certeza que deseja excluir este projeto?')) {
                    window.electronAPI.deleteProject(project.id).then(() => {
                      loadRecentProjects()
                    })
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 p-1 transition-opacity"
                title="Excluir projeto"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentProjects

