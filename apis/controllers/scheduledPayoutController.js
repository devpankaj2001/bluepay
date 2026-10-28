const ScheduledPayout = require('../models/ScheduledPayout');
const { maskAccountNumber } = require('../utils/mask');

const VALID_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly'];

const maskSchedule = (schedule) => {
    if (!schedule) return schedule;
    const plain = typeof schedule.toObject === 'function' ? schedule.toObject() : { ...schedule };
    return { ...plain, account_number: maskAccountNumber(plain.account_number) };
};

/**
 * POST /api/payouts/scheduled - create a one-time or recurring schedule.
 * Does NOT move any money - only persists the schedule. Execution happens
 * later, through the payout engine, via schedulers/scheduledPayoutRunner.js.
 */
exports.createSchedule = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const {
            beneficiary_name,
            account_number,
            ifsc_code,
            bank_name,
            amount,
            remarks,
            frequency,
            runAt,
            endDate,
        } = req.body;

        const payoutAmount = Number(amount);

        if (!beneficiary_name || !account_number || !ifsc_code) {
            return res.status(400).json({ msg: 'Beneficiary name, account number and IFSC code are required' });
        }

        if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
            return res.status(400).json({ msg: 'Invalid amount' });
        }

        if (!VALID_FREQUENCIES.includes(frequency)) {
            return res.status(400).json({ msg: 'Invalid frequency' });
        }

        if (!runAt) {
            return res.status(400).json({ msg: 'runAt (first run date/time) is required' });
        }

        const nextRunAt = new Date(runAt);

        if (Number.isNaN(nextRunAt.getTime())) {
            return res.status(400).json({ msg: 'Invalid runAt date' });
        }

        if (nextRunAt.getTime() < Date.now() - 60 * 1000) {
            return res.status(400).json({ msg: 'runAt must be in the future' });
        }

        const schedule = await ScheduledPayout.create({
            userId,
            beneficiary_name,
            account_number,
            ifsc_code,
            bank_name,
            amount: payoutAmount,
            remarks,
            frequency,
            nextRunAt,
            endDate: endDate ? new Date(endDate) : null,
            createdBy: userId,
        });

        return res.status(201).json({ success: true, msg: 'Schedule created', schedule: maskSchedule(schedule) });
    } catch (error) {
        console.error('createSchedule:', error);
        return res.status(500).json({ msg: 'Failed to create schedule', requestId: req.requestId });
    }
};

/**
 * GET /api/payouts/scheduled - list own schedules.
 */
exports.getSchedules = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { status } = req.query;

        const query = { userId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const schedules = await ScheduledPayout.find(query).sort({ createdAt: -1 }).lean();

        return res.json({ success: true, schedules: schedules.map(maskSchedule) });
    } catch (error) {
        console.error('getSchedules:', error);
        return res.status(500).json({ msg: 'Failed to load schedules', requestId: req.requestId });
    }
};

/**
 * GET /api/payouts/scheduled/:id
 */
exports.getScheduleById = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const schedule = await ScheduledPayout.findOne({ _id: req.params.id, userId }).lean();

        if (!schedule) {
            return res.status(404).json({ msg: 'Schedule not found' });
        }

        return res.json({ success: true, schedule: maskSchedule(schedule) });
    } catch (error) {
        console.error('getScheduleById:', error);
        return res.status(500).json({ msg: 'Failed to load schedule', requestId: req.requestId });
    }
};

const EDITABLE_STATUSES = ['active', 'paused'];

/**
 * PUT /api/payouts/scheduled/:id - edit a schedule that hasn't run yet (or
 * hasn't reached a terminal state). Editing a recurring schedule's amount/
 * beneficiary only affects FUTURE runs; past payouts already created are
 * untouched.
 */
exports.updateSchedule = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const schedule = await ScheduledPayout.findOne({ _id: req.params.id, userId });

        if (!schedule) {
            return res.status(404).json({ msg: 'Schedule not found' });
        }

        if (!EDITABLE_STATUSES.includes(schedule.status)) {
            return res.status(400).json({ msg: `Cannot edit a schedule that is ${schedule.status}` });
        }

        const { beneficiary_name, account_number, ifsc_code, bank_name, amount, remarks, runAt, endDate } = req.body;

        if (amount !== undefined) {
            const payoutAmount = Number(amount);
            if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
                return res.status(400).json({ msg: 'Invalid amount' });
            }
            schedule.amount = payoutAmount;
        }

        if (beneficiary_name !== undefined) schedule.beneficiary_name = beneficiary_name;
        if (account_number !== undefined) schedule.account_number = account_number;
        if (ifsc_code !== undefined) schedule.ifsc_code = ifsc_code;
        if (bank_name !== undefined) schedule.bank_name = bank_name;
        if (remarks !== undefined) schedule.remarks = remarks;
        if (endDate !== undefined) schedule.endDate = endDate ? new Date(endDate) : null;

        if (runAt !== undefined) {
            const nextRunAt = new Date(runAt);
            if (Number.isNaN(nextRunAt.getTime())) {
                return res.status(400).json({ msg: 'Invalid runAt date' });
            }
            if (nextRunAt.getTime() < Date.now() - 60 * 1000) {
                return res.status(400).json({ msg: 'runAt must be in the future' });
            }
            schedule.nextRunAt = nextRunAt;
        }

        await schedule.save();

        return res.json({ success: true, msg: 'Schedule updated', schedule: maskSchedule(schedule) });
    } catch (error) {
        console.error('updateSchedule:', error);
        return res.status(500).json({ msg: 'Failed to update schedule', requestId: req.requestId });
    }
};

/**
 * POST /api/payouts/scheduled/:id/pause
 */
exports.pauseSchedule = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const schedule = await ScheduledPayout.findOneAndUpdate(
            { _id: req.params.id, userId, status: 'active' },
            { $set: { status: 'paused' } },
            { new: true }
        );

        if (!schedule) {
            return res.status(400).json({ msg: 'Only an active schedule can be paused' });
        }

        return res.json({ success: true, msg: 'Schedule paused', schedule: maskSchedule(schedule) });
    } catch (error) {
        console.error('pauseSchedule:', error);
        return res.status(500).json({ msg: 'Failed to pause schedule', requestId: req.requestId });
    }
};

/**
 * POST /api/payouts/scheduled/:id/resume
 */
exports.resumeSchedule = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const schedule = await ScheduledPayout.findOne({ _id: req.params.id, userId });

        if (!schedule) {
            return res.status(404).json({ msg: 'Schedule not found' });
        }

        if (schedule.status !== 'paused') {
            return res.status(400).json({ msg: 'Only a paused schedule can be resumed' });
        }

        // If the next run time already passed while paused, push it to now
        // so it fires on the runner's next tick instead of looking "overdue
        // forever" - it does NOT retroactively run once per missed tick.
        if (schedule.nextRunAt.getTime() < Date.now()) {
            schedule.nextRunAt = new Date();
        }

        schedule.status = 'active';
        await schedule.save();

        return res.json({ success: true, msg: 'Schedule resumed', schedule: maskSchedule(schedule) });
    } catch (error) {
        console.error('resumeSchedule:', error);
        return res.status(500).json({ msg: 'Failed to resume schedule', requestId: req.requestId });
    }
};

/**
 * POST /api/payouts/scheduled/:id/cancel
 */
exports.cancelSchedule = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const schedule = await ScheduledPayout.findOneAndUpdate(
            { _id: req.params.id, userId, status: { $in: ['active', 'paused'] } },
            { $set: { status: 'cancelled' } },
            { new: true }
        );

        if (!schedule) {
            return res.status(400).json({ msg: 'Only an active or paused schedule can be cancelled' });
        }

        return res.json({ success: true, msg: 'Schedule cancelled', schedule: maskSchedule(schedule) });
    } catch (error) {
        console.error('cancelSchedule:', error);
        return res.status(500).json({ msg: 'Failed to cancel schedule', requestId: req.requestId });
    }
};
