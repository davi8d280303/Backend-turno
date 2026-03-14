const express = require('express');
const { requireAccessToken, requireAreaPrivilege } = require('../middleware/auth');

const router = express.Router();

router.get('/:areaId/reporte', requireAccessToken, requireAreaPrivilege, (req, res) => {
  res.json({
    success: true,
    data: {
      requested_area: req.params.areaId,
      role: req.auth.user.role,
      actor_area: req.auth.user.area_id
    }
  });
});

module.exports = router;
