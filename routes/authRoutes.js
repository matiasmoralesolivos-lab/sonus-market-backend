const express = require('express');
const {
  login,
  loginGoogle,
} = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/google', loginGoogle);

module.exports = router;