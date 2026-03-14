/**
 * Rutas de Usuarios
 * Consume data real desde Supabase
 */
const express = require('express');
const { getUsers, getUserById } = require('../repositories/usersRepository');

const router = express.Router();

function okResponse({ data, total }) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (typeof total === 'number') {
    response.total = total;
  }

  return response;
}

/**
 * GET /api/usuarios
 * Obtiene todos los usuarios
 */
router.get('/', async (req, res, next) => {
  try {
    console.log('GET /api/usuarios');
    const users = await getUsers();

    res.json(
      okResponse({
        data: users,
        total: users.length,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/usuarios/:id
 * Obtiene un usuario por ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`GET /api/usuarios/${id}`);

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        timestamp: new Date().toISOString(),
      });
    }

    res.json(
      okResponse({
        data: user,
      })
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
