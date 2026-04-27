import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import MainLayout from './layouts/MainLayout';
import Input from './components/Input';
import Button from './components/Button';
import Tabs from './components/Tabs';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register, loading, error, clearError } = useAuth();
  
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    userType: 'creator' // creator o advertiser
  });
  const [formErrors, setFormErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Limpiar error general
    if (error) {
      clearError();
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El correo electrónico no es válido';
    }
    
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (activeTab === 'register') {
      if (!formData.name) {
        errors.name = 'El nombre es requerido';
      }
      
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Confirma tu contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await login({
      email: formData.email,
      password: formData.password
    });
    
    if (result.success) {
      navigate('/dashboard');
    }
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await register({
      nombre: formData.name,
      email: formData.email,
      password: formData.password,
      rol: formData.userType === 'creator' ? 'creador' : 'anunciante'
    });
    
    if (result.success) {
      // Si el registro fue exitoso, cambiar a login o redirigir
      if (result.message) {
        alert(result.message); // Mostrar mensaje de éxito
      }
      setActiveTab('login');
      setFormData({
        email: formData.email, // Mantener el email
        password: '',
        name: '',
        confirmPassword: '',
        userType: 'creator'
      });
    }
  };
  
  const tabs = [
    { id: 'login', label: 'Iniciar Sesión' },
    { id: 'register', label: 'Registrarse' }
  ];
  
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {activeTab === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea una nueva cuenta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {activeTab === 'login' ? (
              <>
                ¿No tienes una cuenta?{' '}
                <button 
                  onClick={() => setActiveTab('register')}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes una cuenta?{' '}
                <button 
                  onClick={() => setActiveTab('login')}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <Tabs 
              tabs={tabs} 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              className="mb-6"
            />
            
            {/* Mostrar errores generales */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {activeTab === 'login' ? (
              <form className="space-y-6" onSubmit={handleLogin}>
                <Input
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={formErrors.email}
                  required
                />
                
                <Input
                  label="Contraseña"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={formErrors.password}
                  required
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember_me"
                      name="remember_me"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900">
                      Recordarme
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                </div>
                
                <div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Button>
                </div>
                
                {/* Botones de demo */}
                <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-4 border-gray-200">
                  <p className="text-xs text-center text-gray-500 mb-1">Acceso rápido (Demo)</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={() => {
                      setFormData(prev => ({...prev, email: 'demo@channelad.io', password: '123456'}));
                      setTimeout(() => {
                        const fakeEvent = { preventDefault: () => {} };
                        handleLogin(fakeEvent);
                      }, 100);
                    }}
                  >
                    Entrar como anunciante demo
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={() => {
                      setFormData(prev => ({...prev, email: 'creator@channelad.io', password: '123456'}));
                      setTimeout(() => {
                        const fakeEvent = { preventDefault: () => {} };
                        handleLogin(fakeEvent);
                      }, 100);
                    }}
                  >
                    Entrar como creador demo
                  </Button>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleRegister}>
                <Input
                  label="Nombre completo"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  error={formErrors.name}
                  required
                />
                
                <Input
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={formErrors.email}
                  required
                />
                
                <Input
                  label="Contraseña"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={formErrors.password}
                  required
                />
                
                <Input
                  label="Confirmar contraseña"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={formErrors.confirmPassword}
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de usuario
                  </label>
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center">
                      <input
                        id="creator"
                        name="userType"
                        type="radio"
                        value="creator"
                        checked={formData.userType === 'creator'}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="creator" className="ml-3 block text-sm font-medium text-gray-700">
                        Creador de contenido
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="advertiser"
                        name="userType"
                        type="radio"
                        value="advertiser"
                        checked={formData.userType === 'advertiser'}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="advertiser" className="ml-3 block text-sm font-medium text-gray-700">
                        Anunciante
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Registrando...' : 'Registrarse'}
                  </Button>
                </div>
              </form>
            )}
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    O continuar con
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                  <Button variant="outline" className="w-full">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                    </svg>
                    Google
                  </Button>
                </div>

                <div>
                  <Button variant="outline" className="w-full">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AuthPage;
