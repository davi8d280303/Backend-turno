const express = require('express');
const authController = require('../controllers/authController');
const loginRateLimit = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/login', loginRateLimit, authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authController.me);
router.post('/logout', authController.logout);

module.exports = router;
