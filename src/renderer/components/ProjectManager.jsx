import React, { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Trash2, Calendar, Users, Image } from 'lucide-react'

/**
 * Project Manager Component
 * 
 * Manages saved projects and allows loading/creating new ones.
 */
const ProjectManager = ({ onProjectLoad, onNewProject }) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load projects on component mount
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const result = await window.electronAPI.getProjects()
      
      if (result.success) {
        setProjects(result.projects)
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
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

  const handleDeleteProject = useCallback(async (projectId) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) {
      return
    }

    try {
      const result = await window.electronAPI.deleteProject(projectId)
      
      if (result.success) {
        await loadProjects() // Reload list
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      setError('Erro ao excluir projeto')
    }
  }, [loadProjects])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando projetos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={loadProjects}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Projetos Salvos</h2>
        <button
          onClick={onNewProject}
          className="btn-primary flex items-center space-x-2"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Novo Projeto</span>
        </button>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum projeto encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            Crie seu primeiro projeto para começar a organizar fotos
          </p>
          <button
            onClick={onNewProject}
            className="btn-primary"
          >
            Criar Primeiro Projeto
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {project.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {project.event_name}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{project.participant_count} participantes</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Image className="w-4 h-4" />
                      <span>{project.total_photos || 0} fotos</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                    {project.last_processed && (
                      <div className="text-xs text-green-600">
                        Processado: {formatDate(project.last_processed)}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    {project.source_folder}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleLoadProject(project.id)}
                    className="btn-secondary text-sm"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Excluir projeto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProjectManager

