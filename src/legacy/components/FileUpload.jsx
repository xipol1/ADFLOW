import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, Video, Music, FileText } from 'lucide-react';
import apiService from '../services/api';

const FileUpload = ({ 
  onFileUpload, 
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf'],
  maxSize = 10 * 1024 * 1024, // 10MB por defecto
  multiple = false,
  className = ''
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Obtener icono según el tipo de archivo
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    if (type.startsWith('video/')) return <Video size={20} className="text-purple-500" />;
    if (type.startsWith('audio/')) return <Music size={20} className="text-green-500" />;
    if (type === 'application/pdf') return <FileText size={20} className="text-red-500" />;
    return <File size={20} className="text-gray-500" />;
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validar archivo
  const validateFile = (file) => {
    const errors = [];

    // Validar tamaño
    if (file.size > maxSize) {
      errors.push(`El archivo es muy grande. Máximo ${formatFileSize(maxSize)}`);
    }

    // Validar tipo
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      errors.push('Tipo de archivo no permitido');
    }

    return errors;
  };

  // Manejar selección de archivos
  const handleFileSelect = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length === 0) {
        validFiles.push({
          file,
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          status: 'pending'
        });
      } else {
        errors.push(`${file.name}: ${fileErrors.join(', ')}`);
      }
    });

    if (errors.length > 0) {
      alert('Errores en algunos archivos:\n' + errors.join('\n'));
    }

    if (multiple) {
      setFiles(prev => [...prev, ...validFiles]);
    } else {
      setFiles(validFiles.slice(0, 1));
    }
  };

  // Manejar drop de archivos
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  // Manejar drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  // Manejar drag leave
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Remover archivo
  const removeFile = (fileId) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(f => f.id !== fileId);
      // Limpiar URL de preview si existe
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updatedFiles;
    });
  };

  // Subir archivos
  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const fileData of files) {
        if (fileData.status === 'uploaded') {
          uploadedFiles.push(fileData);
          continue;
        }

        // Actualizar estado a uploading
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'uploading' } : f
        ));

        try {
          const response = await apiService.uploadFile(fileData.file);
          
          if (response.success) {
            const uploadedFile = {
              ...fileData,
              status: 'uploaded',
              url: response.url,
              publicId: response.publicId
            };
            
            uploadedFiles.push(uploadedFile);
            
            // Actualizar estado a uploaded
            setFiles(prev => prev.map(f => 
              f.id === fileData.id ? uploadedFile : f
            ));
          } else {
            throw new Error(response.message || 'Error al subir archivo');
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          
          // Actualizar estado a error
          setFiles(prev => prev.map(f => 
            f.id === fileData.id ? { ...f, status: 'error', error: error.message } : f
          ));
        }
      }

      // Llamar callback con archivos subidos exitosamente
      if (onFileUpload && uploadedFiles.length > 0) {
        onFileUpload(multiple ? uploadedFiles : uploadedFiles[0]);
      }

    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Zona de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="text-sm text-gray-500">
          Tipos permitidos: {acceptedTypes.join(', ')}
        </p>
        <p className="text-sm text-gray-500">
          Tamaño máximo: {formatFileSize(maxSize)}
        </p>
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">
            Archivos seleccionados ({files.length})
          </h4>
          
          {files.map((fileData) => (
            <div
              key={fileData.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* Preview o icono */}
              <div className="flex-shrink-0">
                {fileData.preview ? (
                  <img
                    src={fileData.preview}
                    alt={fileData.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  getFileIcon(fileData.type)
                )}
              </div>

              {/* Información del archivo */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileData.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(fileData.size)}
                </p>
                
                {/* Estado */}
                {fileData.status === 'uploading' && (
                  <p className="text-xs text-blue-600">Subiendo...</p>
                )}
                {fileData.status === 'uploaded' && (
                  <p className="text-xs text-green-600">✓ Subido</p>
                )}
                {fileData.status === 'error' && (
                  <p className="text-xs text-red-600">
                    Error: {fileData.error}
                  </p>
                )}
              </div>

              {/* Botón remover */}
              <button
                onClick={() => removeFile(fileData.id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600"
                disabled={fileData.status === 'uploading'}
              >
                <X size={16} />
              </button>
            </div>
          ))}

          {/* Botón de subida */}
          {files.some(f => f.status === 'pending' || f.status === 'error') && (
            <button
              onClick={uploadFiles}
              disabled={uploading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Subiendo...' : 'Subir archivos'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;