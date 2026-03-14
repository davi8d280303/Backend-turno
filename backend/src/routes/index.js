/**
 * Rutas de salud del servidor y utilidades
 */
const express = require('express');
const router = express.Router();
const usuariosRoutes = require('./usuarios');
const authRoutes = require('./auth');
const { checkSupabaseConnection } = require('../services/supabaseHealthService');
const { getSupabaseConfigStatus } = require('../config/supabaseClient');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'API activa',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Health check de Supabase (sin exponer secretos)
router.get('/health/supabase', async (req, res, next) => {
  try {
    const config = getSupabaseConfigStatus();

    if (!config.urlConfigured || !config.serviceRoleConfigured) {
      return res.status(503).json({
        success: false,
        status: 'Supabase no configurado',
        config,
        timestamp: new Date().toISOString(),
      });
    }

    const connection = await checkSupabaseConnection();

    res.json({
      success: true,
      status: 'Supabase activo',
      config,
      connection,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Info del servidor
router.get('/', (req, res) => {
  res.json({
    name: 'API Sistema Préstamos',
    version: '1.0.0',
    description: 'Backend para sistema de gestión de préstamos',
    endpoints: {
      health: '/api/health',
      supabaseHealth: '/api/health/supabase',
      usuarios: '/api/usuarios',
      auth: '/api/auth',
      prestamos: '/api/prestamos',
      inventario: '/api/inventario'
    }
  });
});

// Rutas principales
router.use('/usuarios', usuariosRoutes);
router.use('/auth', authRoutes);

module.exports = router;
