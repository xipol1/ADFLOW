import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Target, FileText, Image, Video } from 'lucide-react';
import FileUpload from './FileUpload';
import apiService from '../services/api';
import { useNotifications } from '../hooks/useNotifications';

const CreateAdForm = ({ isOpen, onClose, onAdCreated }) => {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    duration: '',
    targetAudience: '',
    category: '',
    requirements: '',
    mediaFiles: [],
    targetChannels: []
  });

  const categories = [
    'Tecnología',
    'Gaming',
    'Lifestyle',
    'Educación',
    'Entretenimiento',
    'Deportes',
    'Música',
    'Cocina',
    'Viajes',
    'Moda',
    'Salud y Fitness',
    'Negocios'
  ];

  // Cargar canales disponibles
  useEffect(() => {
    if (isOpen) {
      loadChannels();
    }
  }, [isOpen]);

  const loadChannels = async () => {
    try {
      const response = await apiService.searchChannels({ verified: true });
      if (response.success) {
        setChannels(response.channels);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChannelToggle = (channelId) => {
    setFormData(prev => ({
      ...prev,
      targetChannels: prev.targetChannels.includes(channelId)
        ? prev.targetChannels.filter(id => id !== channelId)
        : [...prev.targetChannels, channelId]
    }));
  };

  const handleFileUpload = (uploadedFiles) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles]
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'El título es requerido';
    }

    if (!formData.description.trim()) {
      errors.description = 'La descripción es requerida';
    }

    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      errors.budget = 'El presupuesto debe ser mayor a 0';
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      errors.duration = 'La duración debe ser mayor a 0';
    }

    if (!formData.category) {
      errors.category = 'La categoría es requerida';
    }

    if (formData.targetChannels.length === 0) {
      errors.targetChannels = 'Debe seleccionar al menos un canal';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.values(errors).join('\n');
      addNotification('error', 'Errores en el formulario', errorMessages);
      return;
    }

    setLoading(true);

    try {
      // Preparar datos del anuncio
      const adData = {
        title: formData.title,
        description: formData.description,
        budget: parseFloat(formData.budget),
        duration: parseInt(formData.duration),
        targetAudience: formData.targetAudience,
        category: formData.category,
        requirements: formData.requirements,
        mediaFiles: formData.mediaFiles.map(file => ({
          url: file.url,
          type: file.type,
          name: file.name,
          publicId: file.publicId
        })),
        targetChannels: formData.targetChannels
      };

      const response = await apiService.createAd(adData);

      if (response.success) {
        addNotification('success', 'Anuncio creado', 'El anuncio ha sido creado exitosamente');
        onAdCreated?.(response.ad);
        onClose();
        
        // Resetear formulario
        setFormData({
          title: '',
          description: '',
          budget: '',
          duration: '',
          targetAudience: '',
          category: '',
          requirements: '',
          mediaFiles: [],
          targetChannels: []
        });
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      addNotification('error', 'Error', error.message || 'Error al crear el anuncio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Anuncio</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del anuncio *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Promoción de nueva aplicación móvil"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe tu anuncio, objetivos y mensaje clave..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign size={16} className="inline mr-1" />
                Presupuesto (USD) *
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                min="1"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Duración (días) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="7"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar categoría</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Target size={16} className="inline mr-1" />
                Audiencia objetivo
              </label>
              <input
                type="text"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Jóvenes 18-35, interesados en tecnología"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} className="inline mr-1" />
                Requisitos especiales
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Menciona cualquier requisito específico para los creadores..."
              />
            </div>
          </div>

          {/* Archivos multimedia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Image size={16} className="inline mr-1" />
              Archivos multimedia
            </label>
            <FileUpload
              onFileUpload={handleFileUpload}
              acceptedTypes={['image/*', 'video/*', 'application/pdf']}
              maxSize={50 * 1024 * 1024} // 50MB
              multiple={true}
            />
          </div>

          {/* Selección de canales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canales objetivo *
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
              {channels.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Cargando canales disponibles...
                </p>
              ) : (
                <div className="space-y-2">
                  {channels.map(channel => (
                    <label
                      key={channel._id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.targetChannels.includes(channel._id)}
                        onChange={() => handleChannelToggle(channel._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{channel.name}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {channel.platform}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {channel.subscriberCount?.toLocaleString()} suscriptores • {channel.category}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Seleccionados: {formData.targetChannels.length} canales
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Anuncio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAdForm;