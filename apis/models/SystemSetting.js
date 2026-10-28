const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    // Bank Details
    bank_name: { type: String, default: '' },
    account_number: { type: String, default: '' },
    account_type: { type: String, default: 'Current' },
    holder_name: { type: String, default: '' },
    ifsc_code: { type: String, default: '' },
    upi_id: { type: String, default: '' },

    // Basic Settings
    site_name: { type: String, default: 'BluePay' },
    mobile_number: { type: String, default: '' },
    whatsapp_number: { type: String, default: '' },
    support_email: { type: String, default: '' },
    support_start_time: { type: String, default: '09:00 AM' },
    support_end_time: { type: String, default: '06:00 PM' }
}, { timestamps: true });

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
module.exports = SystemSetting;
