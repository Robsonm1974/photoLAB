import React, { useState, useCallback } from 'react'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Credentials from './pages/Credentials'
import Settings from './pages/Settings'
import ProjectManager from './components/ProjectManager'

/**
 * Main Application Component - MVP VERSION
 * 
 * Manages the overall application state and routing.
 * Removed: QR code processing and photo grouping functionality
 */
const App = () => {
  // Application state
  const [currentPage, setCurrentPage] = useState('home')
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [isProjectLoaded, setIsProjectLoaded] = useState(false)
  const [projectData, setProjectData] = useState({
    sourceFolder: null,
    csvFile: null,
    eventName: '',
    participants: [],
    createdFolderPath: null,
    creationResults: null,
    projectId: null
  })

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
      participants: project.participants,
      config: project.config
    })
    
    // Restore all project data including CSV file info
    const csvFile = project.config?.csvFileName ? {
      name: project.config.csvFileName,
      path: project.config.csvFilePath || project.config.csvFileName
    } : null
    
    setProjectData({
      sourceFolder: project.destination_folder,
      destinationFolder: project.destination_folder,
      photosFolder: project.photos_folder,
      csvFile: csvFile,
      eventName: project.event_name,
      participants: project.participants || [],
      createdFolderPath: project.destination_folder,
      creationResults: project.config ? {
        createdDirectories: project.config.createdDirectories,
        errors: project.config.errors,
        structure: project.config.structure
      } : null,
      projectId: project.id
    })
    
    console.log('Project data restored:', {
      eventName: project.event_name,
      destinationFolder: project.destination_folder,
      photosFolder: project.photos_folder,
      csvFile: csvFile,
      participants: project.participants?.length || 0,
      projectId: project.id
    })
    
    setIsProjectLoaded(true)
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
    setIsProjectLoaded(false)
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
            isProjectLoaded={isProjectLoaded}
          />
        )
      case 'credentials':
        return (
          <Credentials 
            projectData={projectData}
            onNavigation={handleNavigation}
          />
        )
      case 'settings':
        return (
          <Settings 
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
