const express = require('express');
const router = express.Router();

const controller = require('../controllers/scheduledPayoutController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, controller.getSchedules);
router.post('/', auth, controller.createSchedule);
router.get('/:id', auth, controller.getScheduleById);
router.put('/:id', auth, controller.updateSchedule);
router.post('/:id/pause', auth, controller.pauseSchedule);
router.post('/:id/resume', auth, controller.resumeSchedule);
router.post('/:id/cancel', auth, controller.cancelSchedule);

module.exports = router;
