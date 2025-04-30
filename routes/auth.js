const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');


router.post('/register', registerUser); // Must be POST
router.post('/login', loginUser);

module.exports = router;
