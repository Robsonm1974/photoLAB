import React, { useState } from 'react'
import { Folder, FileText, Settings, CheckCircle } from 'lucide-react'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Processing from './pages/Processing'
import OCRProcessing from './pages/OCRProcessing'
import Results from './pages/Results'
import Credentials from './pages/Credentials' // New import

/**
 * Main Application Component
 * 
 * Manages the overall application state and routing.
 * Following the established patterns from agent_rules.md
 */
const App = () => {
  // Application state
  const [currentPage, setCurrentPage] = useState('home')
  const [projectData, setProjectData] = useState({
    sourceFolder: null,
    csvFile: null,
    eventName: '',
    participants: [],
    createdFolderPath: null,
    creationResults: null
  })
  const [processingResults, setProcessingResults] = useState(null)

  // Navigation handler
  const handleNavigation = (page) => {
    setCurrentPage(page)
  }

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
    <Layout currentPage={currentPage} onNavigation={handleNavigation}>
      {renderPage()}
    </Layout>
  )
}

export default App
