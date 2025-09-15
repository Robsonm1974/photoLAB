import React, { useState, useEffect } from 'react'
import { FileImage, Eye } from 'lucide-react'

const PhotoThumbnail = ({ 
  photo, 
  size = 'md', 
  onClick = null, 
  showFileName = false,
  className = '',
  clickable = false 
}) => {
  const [thumbnail, setThumbnail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Size variants
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  }

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        setLoading(true)
        setError(false)
        
        // Get photo path - try multiple possible fields
        let photoPath = null
        if (typeof photo === 'string') {
          photoPath = photo
        } else if (photo) {
          // Try different possible path fields
          photoPath = photo.file_path || photo.path || photo.source || photo.destination || photo.original_path
        }
        
        if (!photoPath) {
          console.warn('No valid photo path found for:', photo)
          setError(true)
          return
        }
        
        console.log('Loading thumbnail for:', photoPath)
        
        // If the path is from the copied files, we need to use the original source path
        // because the copied files are in the destination folder
        if (photoPath.includes('QR_') || photoPath.includes('Não Agrupadas')) {
          // This is a copied file, try to find the original
          const fileName = photoPath.split('\\').pop() || photoPath.split('/').pop()
          if (fileName && photo.original_path) {
            photoPath = photo.original_path
            console.log('Using original path for copied file:', photoPath)
          }
        }

        // Generate thumbnail
        const result = await window.electronAPI.generateThumbnail(photoPath)
        
        if (result.success) {
          setThumbnail(result.dataUrl)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Error loading thumbnail:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadThumbnail()
  }, [photo])

  const handleClick = () => {
    if (clickable && onClick) {
      onClick(photo)
    }
  }

  const getFileName = () => {
    let photoPath = ''
    if (typeof photo === 'string') {
      photoPath = photo
    } else if (photo) {
      photoPath = photo.file_path || photo.path || photo.source || photo.destination || ''
    }
    return photoPath.split('\\').pop() || photoPath.split('/').pop() || 'Unknown'
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          ${sizes[size]} 
          rounded border-2 border-gray-200 
          flex items-center justify-center 
          overflow-hidden
          ${clickable ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''}
          ${loading ? 'bg-gray-100' : ''}
          ${error ? 'bg-gray-50' : ''}
        `}
        onClick={handleClick}
      >
        {loading && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {error && !loading && (
          <FileImage className="text-gray-400" size={size === 'sm' ? 16 : size === 'md' ? 20 : 28} />
        )}
        
        {thumbnail && !loading && !error && (
          <img 
            src={thumbnail} 
            alt="Photo thumbnail"
            className="w-full h-full object-cover"
          />
        )}
        
        {clickable && thumbnail && !loading && !error && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
            <Eye className="text-white opacity-0 hover:opacity-100 transition-opacity" size={16} />
          </div>
        )}
      </div>
      
      {showFileName && (
        <p className="text-xs text-gray-600 mt-1 truncate max-w-16">
          {getFileName()}
        </p>
      )}
    </div>
  )
}

export default PhotoThumbnail
