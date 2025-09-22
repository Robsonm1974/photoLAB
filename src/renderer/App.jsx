import React, { useState, useCallback } from 'react'
import { Folder, FileText, Settings, CheckCircle } from 'lucide-react'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Processing from './pages/Processing'
import OCRProcessing from './pages/OCRProcessing'
import Results from './pages/Results'
import Credentials from './pages/Credentials' // New import
import ProjectManager from './components/ProjectManager'

/**
 * Main Application Component
 * 
 * Manages the overall application state and routing.
 * Following the established patterns from agent_rules.md
 */
const App = () => {
  // Application state
  const [currentPage, setCurrentPage] = useState('home')
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [projectData, setProjectData] = useState({
    sourceFolder: null,
    csvFile: null,
    eventName: '',
    participants: [],
    createdFolderPath: null,
    creationResults: null,
    projectId: null
  })
  const [processingResults, setProcessingResults] = useState(null)

  // Navigation handler
  const handleNavigation = (page) => {
    if (page === 'projects') {
      setShowProjectManager(true)
    } else {
      setShowProjectManager(false)
      setCurrentPage(page)
    }
  }

  // Project management handlers
  const handleLoadProject = useCallback((project) => {
    console.log('Loading project data:', {
      id: project.id,
      name: project.name,
      event_name: project.event_name,
      destination_folder: project.destination_folder,
      photos_folder: project.photos_folder,
      config: project.config
    })
    
    setProjectData({
      sourceFolder: project.destination_folder,
      destinationFolder: project.destination_folder,
      photosFolder: project.photos_folder,
      csvFile: project.config?.csvFileName ? { 
        name: project.config.csvFileName,
        path: project.config.csvFilePath || project.config.csvFileName
      } : null,
      eventName: project.event_name,
      participants: project.participants || [],
      createdFolderPath: project.destination_folder,
      projectId: project.id
    })
    setShowProjectManager(false)
    setCurrentPage('home')
  }, [])

  const handleNewProject = useCallback(() => {
    setProjectData({
      sourceFolder: null,
      csvFile: null,
      eventName: '',
      participants: [],
      createdFolderPath: null,
      creationResults: null,
      projectId: null
    })
    setShowProjectManager(false)
    setCurrentPage('home')
  }, [])

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home 
            projectData={projectData}
            setProjectData={setProjectData}
            onNavigation={handleNavigation}
          />
        )
      case 'processing':
        return (
          <OCRProcessing 
            onNavigation={handleNavigation}
            projectData={projectData}
            setProcessingResults={setProcessingResults}
          />
        )
      case 'results':
        return (
          <Results 
            projectData={projectData}
            processingResults={processingResults}
            onNavigation={handleNavigation}
          />
        )
      case 'credentials':
        return (
          <Credentials 
            projectData={projectData}
            onNavigation={handleNavigation}
          />
        )
      default:
        return <Home projectData={projectData} setProjectData={setProjectData} />
    }
  }

  return (
    <Layout 
      currentPage={currentPage} 
      onNavigation={handleNavigation}
      onProjectLoad={handleLoadProject}
      onNewProject={handleNewProject}
    >
      {showProjectManager ? (
        <ProjectManager 
          onProjectLoad={handleLoadProject}
          onNewProject={handleNewProject}
        />
      ) : (
        renderPage()
      )}
    </Layout>
  )
}

export default App
