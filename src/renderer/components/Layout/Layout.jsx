import React from 'react'
import { Camera, FolderOpen, FileText, Settings } from 'lucide-react'
import RecentProjects from '../RecentProjects'

/**
 * Main Layout Component - MVP VERSION
 * 
 * Provides the overall application layout with navigation sidebar
 * Removed: Processing and Results tabs
 */
const Layout = ({ children, currentPage, onNavigation, onProjectLoad, onNewProject }) => {
  const navigationItems = [
    { id: 'home', label: 'Início', icon: Camera },
    { id: 'projects', label: 'Projetos', icon: FolderOpen },
    { id: 'credentials', label: 'Credenciais', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <Camera className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">PhotoLab</h1>
              <p className="text-sm text-gray-500">v1.0.0</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigation(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Recent Projects Section */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <RecentProjects 
              onProjectLoad={onProjectLoad}
              onNewProject={onNewProject}
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="page-wrapper">
          <div className="page-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout

