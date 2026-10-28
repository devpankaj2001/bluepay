const mongoose = require("mongoose");

/**
 * CCAvenueOrder
 *
 * One document per Add-Money attempt through CCAvenue. Created as
 * INITIATED before the customer is redirected to CCAvenue's hosted
 * payment page, then moved to SUCCESS/FAILED/CANCELLED only by the
 * server-side response handler (never by the frontend).
 *
 * The INITIATED -> (SUCCESS|FAILED|CANCELLED) transition is enforced
 * with an atomic `findOneAndUpdate({ orderId, status: 'INITIATED' }, ...)`
 * in the controller, the same compare-and-swap pattern already used by
 * utils/ledger.js (reserveForPayout/completePayout/failPayout). That is
 * what actually prevents a duplicate wallet credit if CCAvenue calls the
 * response webhook more than once for the same order.
 */
const ccavenueOrderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Our own tracking id, sent to CCAvenue as `order_id`.
        orderId: {
            type: String,
            required: true,
            unique: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 1,
        },

        currency: {
            type: String,
            default: "INR",
        },

        status: {
            type: String,
            enum: ["INITIATED", "SUCCESS", "FAILED", "CANCELLED"],
            default: "INITIATED",
            index: true,
        },

        // Fields returned by CCAvenue on the response webhook.
        ccavenueOrderStatus: {
            type: String,
            default: "",
        },

        trackingId: {
            type: String,
            default: "",
        },

        bankRefNo: {
            type: String,
            default: "",
        },

        paymentMode: {
            type: String,
            default: "",
        },

        failureMessage: {
            type: String,
            default: "",
        },

        // Raw decrypted response fields, minus anything sensitive
        // (see ccavenueController.js for the allow-list applied before
        // this is stored).
        gatewayResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

ccavenueOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("CCAvenueOrder", ccavenueOrderSchema);
