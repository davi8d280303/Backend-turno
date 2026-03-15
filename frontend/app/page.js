'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { clearSession, loginUsuario, saveSession } from '@/lib/api';
import Loader from '@/app/components/Loader';

export default function LoginPage() {
  const router = useRouter();
  const emailRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    clearSession();

    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Por favor completa todos los campos');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Email inválido');
      }

      const result = await loginUsuario(formData.email, formData.password);
      if (!result.success || !result.accessToken || !result.refreshToken) {
        throw new Error(result.error || 'Error al iniciar sesión');
      }

      saveSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          ...(result.data || {}),
          loginTime: new Date().toISOString(),
        },
      });

      router.push('/panel');
    } catch (err) {
      console.error('Error en login:', err);
      setError(err.message || 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      {isLoading && <Loader isVisible fullscreen message="Iniciando sesión..." />}

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-10 border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">¡Bienvenido de nuevo!</h1>
          <p className="text-gray-600 text-lg">Ingresa tus credenciales para continuar</p>
        </div>

        {error && (
          <div
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold">Error:</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-gray-700 font-medium text-sm uppercase tracking-wide"
            >
              Correo electrónico
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 
                         rounded-xl text-gray-800 placeholder-gray-500 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent transition-all duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed"
              required
              aria-describedby="email-help"
            />
            <p id="email-help" className="text-xs text-gray-500">
              Usa un email válido
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-gray-700 font-medium text-sm uppercase tracking-wide"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 
                         rounded-xl text-gray-800 placeholder-gray-500 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent transition-all duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 
                       text-white font-semibold py-3.5 rounded-xl
                       hover:from-blue-700 hover:to-blue-800 
                       active:scale-[0.98] transition-all duration-200
                       shadow-lg hover:shadow-xl shadow-blue-200 hover:shadow-blue-300
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
            aria-busy={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Enviar al sistema'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link
              href="/registro"
              className="font-semibold text-blue-600 hover:text-blue-700 
                         underline underline-offset-4 decoration-2 
                         hover:decoration-blue-700 transition-colors"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
