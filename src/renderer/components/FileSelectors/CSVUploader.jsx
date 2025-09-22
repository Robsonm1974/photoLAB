import React, { useState, useCallback } from 'react'
import { FileText, Upload, AlertCircle, CheckCircle, Users } from 'lucide-react'

/**
 * CSV Uploader Component
 * 
 * Handles CSV file selection and validation for participant list.
 * Validates required columns: name, turma, qrCode
 * Follows patterns from agent_rules.md
 */
const CSVUploader = ({ csvFile, participants, onCSVUploaded }) => {
  // Component state
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [error, setError] = useState(null)
  const [previewData, setPreviewData] = useState([])

  // Handle file selection
  const handleFileSelect = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setValidationResult(null)
      setPreviewData([])

      // Call Electron API to open file dialog
      if (!window.electronAPI) {
        throw new Error('Electron API não disponível')
      }

      const result = await window.electronAPI.selectFile([
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ])
      
      if (!result.filePaths || result.filePaths.length === 0) {
        // User cancelled
        return
      }

      const filePath = result.filePaths[0]

      // Parse CSV file
      const parseResult = await window.electronAPI.parseCSV(filePath)
      
      if (!parseResult.success) {
        setError(parseResult.error)
        return
      }

      // Validate CSV data structure
      const validation = validateCSVData(parseResult.data)
      
      if (!validation.valid) {
        setError(validation.errors.join(', '))
        return
      }

      const data = parseResult.data

      setValidationResult(validation)
      setPreviewData(data.slice(0, 5)) // First 5 rows for preview
      
      // Create file object with name and path
      const fileObject = {
        name: filePath.split('\\').pop() || filePath.split('/').pop(), // Extract filename
        path: filePath // Full path
      }
      
      onCSVUploaded(fileObject, data)
      
    } catch (error) {
      console.error('CSV upload error:', error)
      setError('Erro ao carregar arquivo CSV. Verifique o formato e tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [onCSVUploaded])


  // Validate CSV data structure
  const validateCSVData = (data) => {
    const errors = []
    
    console.log('Validating CSV data:', data)
    
    if (!data || data.length === 0) {
      errors.push('Nenhum dado encontrado no arquivo CSV')
      return { valid: false, errors, rowCount: 0 }
    }

    // Check required columns (more flexible matching)
    const requiredColumns = ['name', 'turma', 'qrCode']
    const headers = Object.keys(data[0] || {})
    console.log('Available headers:', headers)
    
    const missingColumns = []
    for (const col of requiredColumns) {
      // Case-insensitive and partial matching
      const found = headers.some(h => 
        h.toLowerCase().includes(col.toLowerCase()) ||
        col.toLowerCase().includes(h.toLowerCase())
      )
      if (!found) {
        missingColumns.push(col)
      }
    }
    
    if (missingColumns.length > 0) {
      errors.push(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`)
      errors.push(`Colunas encontradas: ${headers.join(', ')}`)
    }

    // Validate data quality
    let validRows = 0
    data.forEach((row, index) => {
      let hasRequiredData = false
      
      // Check if row has name data (flexible field matching)
      const nameField = headers.find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('nome'))
      const turmaField = headers.find(h => h.toLowerCase().includes('turma') || h.toLowerCase().includes('class'))
      const qrField = headers.find(h => h.toLowerCase().includes('qr') || h.toLowerCase().includes('code'))
      
      if (nameField && row[nameField]?.trim()) {
        hasRequiredData = true
        validRows++
      } else {
        errors.push(`Linha ${index + 2}: Nome é obrigatório`)
      }
      
      if (turmaField && !row[turmaField]?.trim()) {
        errors.push(`Linha ${index + 2}: Turma é obrigatória`)
      }
      
      if (qrField && !row[qrField]?.trim()) {
        errors.push(`Linha ${index + 2}: QR Code é obrigatório`)
      }
    })

    // Check for duplicate QR codes
    const qrField = headers.find(h => h.toLowerCase().includes('qr') || h.toLowerCase().includes('code'))
    if (qrField) {
      const qrCodes = data.map(row => row[qrField]).filter(Boolean)
      const duplicates = qrCodes.filter((code, index) => qrCodes.indexOf(code) !== index)
      if (duplicates.length > 0) {
        errors.push(`QR codes duplicados encontrados: ${duplicates.join(', ')}`)
      }
    }

    const turmaField = headers.find(h => h.toLowerCase().includes('turma') || h.toLowerCase().includes('class'))
    const uniqueClasses = turmaField ? [...new Set(data.map(row => row[turmaField]).filter(Boolean))].length : 0

    return {
      valid: errors.length === 0 && validRows > 0,
      errors,
      rowCount: data.length,
      validRows,
      uniqueClasses,
      detectedFields: {
        name: headers.find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('nome')),
        turma: turmaField,
        qrCode: qrField
      }
    }
  }

  // Reset file selection
  const handleReset = useCallback(() => {
    onCSVUploaded(null, [])
    setValidationResult(null)
    setError(null)
    setPreviewData([])
  }, [onCSVUploaded])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          Arquivo CSV com lista de participantes
        </label>
        
        {/* File Selection Button */}
        <button
          onClick={handleFileSelect}
          disabled={isLoading}
          className={`w-full flex items-center justify-center space-x-3 p-4 border-2 border-dashed rounded-lg transition-colors duration-200 ${
            csvFile 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Upload className={`w-6 h-6 ${csvFile ? 'text-green-600' : 'text-gray-500'}`} />
          <span className={`font-medium ${csvFile ? 'text-green-700' : 'text-gray-600'}`}>
            {isLoading 
              ? 'Processando arquivo...' 
              : csvFile 
                ? 'Arquivo carregado' 
                : 'Clique para selecionar arquivo CSV'
            }
          </span>
        </button>
      </div>

      {/* Selected File Info */}
      {csvFile && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Arquivo Validado</span>
              </div>
              <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded mb-3">
                {typeof csvFile === 'string' ? csvFile.split('\\').pop() : csvFile?.name || 'Arquivo CSV'}
              </p>
              
              {/* Validation Results */}
              {validationResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Resultado da Validação
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700">
                        {validationResult.validRows || validationResult.rowCount || 0} participantes
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">
                        {validationResult.validRows || 0} válidos
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700">
                        {validationResult.errors?.length || 0} erros
                      </span>
                    </div>
                  </div>

                  {/* Show errors if any */}
                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-medium text-red-700 mb-2">Erros encontrados:</h5>
                      <ul className="text-sm text-red-600 space-y-1">
                        {validationResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                        {validationResult.errors.length > 5 && (
                          <li className="text-gray-500">
                            ... e mais {validationResult.errors.length - 5} erros
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Preview Data */}
              {previewData.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Prévia dos dados:</h4>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                    <div className="font-mono">
                      {previewData.map((row, index) => (
                        <div key={index} className="mb-1">
                          {row.name} | {row.turma} | {row.qrCode}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 ml-4"
            >
              Alterar
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Erro na validação</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-800 mb-1">
          Formato requerido do CSV:
        </h4>
        <p className="text-xs text-blue-700">
          <strong>Primeira linha:</strong> Nome,Turma,QR Code (cabeçalhos)<br />
          <strong>Demais linhas:</strong> dados dos participantes
        </p>
        <p className="text-xs text-blue-600 mt-1">
          <strong>Exemplo válido:</strong><br />
          Nome,Turma,QR Code<br />
          Ana Silva,Infantil,QR2736920<br />
          João Silva,3º A,QR1039909
        </p>
        <p className="text-xs text-blue-500 mt-1">
          ✓ Aceita vírgula (,) ou ponto-vírgula (;) como separador
        </p>
      </div>
    </div>
  )
}

export default CSVUploader
