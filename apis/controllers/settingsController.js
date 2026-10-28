const SystemSetting = require('../models/SystemSetting');

// Get Settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = new SystemSetting();
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update Settings
exports.updateSettings = async (req, res) => {
    const data = req.body;
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = new SystemSetting(data);
        } else {
            Object.assign(settings, data);
        }
        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
