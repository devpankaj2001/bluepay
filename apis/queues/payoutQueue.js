const { Queue } = require('bullmq');
const redis = require('../config/redis');

const payoutQueue = new Queue('payout-processing', {
    connection: redis
});

module.exports = payoutQueue;