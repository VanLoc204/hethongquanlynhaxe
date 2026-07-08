const express = require('express');
const router = express.Router();
const { searchTrips, getTripById } = require('../controllers/tripController');

// Search Route
router.get('/search', searchTrips);

// Get Trip details Route
router.get('/:id', getTripById);

module.exports = router;
