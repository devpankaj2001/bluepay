const crypto = require("crypto");
const mongoose = require("mongoose");

const CCAvenueOrder = require("../models/CCAvenueOrder");
const User = require("../models/User");

const {
    encrypt,
    decrypt,
    buildRequestString,
    parseResponseString,
} = require("../utils/ccavenue");

const { creditWallet } = require("../utils/ledger");

const REQUIRED_ENV_VARS = [
    "CCAVENUE_MERCHANT_ID",
    "CCAVENUE_ACCESS_CODE",
    "CCAVENUE_WORKING_KEY",
    "CCAVENUE_API_URL",
    "CCAVENUE_RESPONSE_URL",
    "FRONTEND_URL",
];

const getMissingEnvVars = () =>
    REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

const generateOrderId = () =>
    `CCAVN_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;


/**
 * INITIATE CCAVENUE ORDER
 *
 * Creates an INITIATED order record and returns everything the frontend
 * needs to auto-submit a real (non-AJAX) POST to CCAvenue's hosted
 * payment page. No wallet balance is touched here.
 */
exports.initiateOrder = async (req, res) => {
    try {
        const missing = getMissingEnvVars();

        if (missing.length > 0) {
            console.error(
                "CCAvenue is not configured. Missing env vars:",
                missing.join(", ")
            );

            return res.status(503).json({
                msg: "Online payment (CCAvenue) is not configured on the server yet.",
                missingEnvVars: missing,
            });
        }

        const userId = req.user.id || req.user._id;
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                msg: "Invalid amount",
            });
        }

        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).json({
                msg: "User not found",
            });
        }

        const orderId = generateOrderId();

        const order = await CCAvenueOrder.create({
            userId,
            orderId,
            amount,
            currency: "INR",
            status: "INITIATED",
        });

        // Same URL handles both success and failure — CCAvenue tells us
        // which one happened via `order_status` in the encrypted response.
        const requestFields = {
            merchant_id: process.env.CCAVENUE_MERCHANT_ID,
            order_id: orderId,
            currency: "INR",
            amount: amount.toFixed(2),
            redirect_url: process.env.CCAVENUE_RESPONSE_URL,
            cancel_url: process.env.CCAVENUE_RESPONSE_URL,
            language: "EN",
            billing_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
            billing_email: user.email || "",
            billing_tel: user.mobile_number || "",
            merchant_param1: userId.toString(),
        };

        const requestString = buildRequestString(requestFields);

        const encRequest = encrypt(
            requestString,
            process.env.CCAVENUE_WORKING_KEY
        );

        return res.status(201).json({
            success: true,
            orderId: order.orderId,
            accessCode: process.env.CCAVENUE_ACCESS_CODE,
            encRequest,
            ccavenueUrl: process.env.CCAVENUE_API_URL,
        });

    } catch (error) {
        console.error("ccavenue initiateOrder:", error.message);

        return res.status(500).json({
            msg: "Failed to initiate CCAvenue order",
            requestId: req.requestId,
        });
    }
};


/**
 * CCAVENUE RESPONSE HANDLER
 *
 * This is the `redirect_url` / `cancel_url` CCAvenue posts back to —
 * called from CCAvenue's servers/browser redirect, NOT from our
 * frontend. This is the ONLY place a CCAvenue payment can result in a
 * wallet credit.
 *
 * Duplicate-credit protection: the INITIATED -> SUCCESS transition is a
 * single atomic `findOneAndUpdate` filtered on the current status. If
 * CCAvenue (or a user refreshing the page) posts the same result twice,
 * the second attempt finds the order already out of the INITIATED
 * state, matches nothing, and is treated as a no-op replay — it still
 * redirects the browser, it just never touches the wallet again.
 */
exports.handleResponse = async (req, res) => {
    const frontendBase = process.env.FRONTEND_URL || "/";
    const redirectTo = (status, orderId) => {
        const url = new URL("/dashboard", frontendBase);
        url.searchParams.set("fundingStatus", status);
        if (orderId) url.searchParams.set("orderId", orderId);
        return res.redirect(303, url.toString());
    };

    try {
        const encResponse = req.body && req.body.encResp;

        if (!encResponse) {
            console.error("ccavenue handleResponse: missing encResp");
            return redirectTo("failed");
        }

        if (!process.env.CCAVENUE_WORKING_KEY) {
            console.error("ccavenue handleResponse: CCAVENUE_WORKING_KEY not configured");
            return redirectTo("failed");
        }

        let decrypted;
        try {
            decrypted = decrypt(encResponse, process.env.CCAVENUE_WORKING_KEY);
        } catch (decryptError) {
            // Do not log the raw encResp — it's opaque but treat as sensitive.
            console.error("ccavenue handleResponse: decrypt failed", decryptError.message);
            return redirectTo("failed");
        }

        const parsed = parseResponseString(decrypted);

        const orderId = parsed.order_id;
        const ccavenueStatus = String(parsed.order_status || "").trim();
        const respondedAmount = Number(parsed.amount);

        if (!orderId) {
            console.error("ccavenue handleResponse: response missing order_id");
            return redirectTo("failed");
        }

        const order = await CCAvenueOrder.findOne({ orderId });

        if (!order) {
            console.error("ccavenue handleResponse: unknown order_id", orderId);
            return redirectTo("failed");
        }

        // Server-side verification: the amount CCAvenue reports must
        // match what we actually created the order for. Never trust the
        // client (or even the gateway callback) blindly.
        const amountMatches =
            Number.isFinite(respondedAmount) &&
            Math.abs(respondedAmount - order.amount) < 0.01;

        // Only a subset of fields are kept — no raw card/bank details are
        // ever present in a redirect-integration response, but we still
        // allow-list explicitly rather than storing the payload as-is.
        const safeGatewayResponse = {
            order_status: ccavenueStatus,
            tracking_id: parsed.tracking_id || "",
            bank_ref_no: parsed.bank_ref_no || "",
            payment_mode: parsed.payment_mode || "",
            status_message: parsed.status_message || "",
            amount: parsed.amount || "",
        };

        if (ccavenueStatus === "Success" && amountMatches) {
            // Claiming the order (INITIATED -> SUCCESS) and crediting the
            // wallet happen in ONE transaction so a crash between the two
            // can never leave an order marked SUCCESS with no matching
            // wallet credit (or vice versa).
            const session = await mongoose.startSession();
            let claimed = null;

            try {
                await session.withTransaction(async () => {
                    claimed = await CCAvenueOrder.findOneAndUpdate(
                        { orderId, status: "INITIATED" },
                        {
                            $set: {
                                status: "SUCCESS",
                                ccavenueOrderStatus: ccavenueStatus,
                                trackingId: parsed.tracking_id || "",
                                bankRefNo: parsed.bank_ref_no || "",
                                paymentMode: parsed.payment_mode || "",
                                gatewayResponse: safeGatewayResponse,
                            },
                        },
                        { new: true, session }
                    );

                    if (claimed) {
                        // We won the race — this is the one and only credit.
                        await creditWallet({
                            userId: order.userId,
                            amount: order.amount,
                            category: "FUNDING",
                            referenceId: order.orderId,
                            referenceType: "CCAvenue",
                            description: `Wallet funding via CCAvenue - ${order.orderId}`,
                            metadata: {
                                trackingId: parsed.tracking_id || "",
                                bankRefNo: parsed.bank_ref_no || "",
                                paymentMode: parsed.payment_mode || "",
                            },
                            session,
                        });
                    }
                    // If `claimed` is null, this order was already finalized
                    // by an earlier call (duplicate webhook) — do not credit again.
                });
            } finally {
                await session.endSession();
            }

            return redirectTo("success", orderId);
        }

        // Anything that isn't a verified Success is treated as a failure.
        const failureStatus =
            ccavenueStatus === "Aborted" ? "CANCELLED" : "FAILED";

        await CCAvenueOrder.findOneAndUpdate(
            { orderId, status: "INITIATED" },
            {
                $set: {
                    status: failureStatus,
                    ccavenueOrderStatus: ccavenueStatus,
                    trackingId: parsed.tracking_id || "",
                    bankRefNo: parsed.bank_ref_no || "",
                    paymentMode: parsed.payment_mode || "",
                    failureMessage: amountMatches
                        ? (parsed.status_message || "Payment not successful")
                        : "Amount mismatch between order and gateway response",
                    gatewayResponse: safeGatewayResponse,
                },
            }
        );

        return redirectTo(
            failureStatus === "CANCELLED" ? "cancelled" : "failed",
            orderId
        );

    } catch (error) {
        console.error("ccavenue handleResponse:", error.message);
        return redirectTo("failed");
    }
};


/**
 * ORDER STATUS (read-only)
 *
 * Used by the frontend's post-redirect screen to DISPLAY the outcome.
 * It never writes anything — the wallet credit already happened (or
 * didn't) in handleResponse above, server-side.
 */
exports.getOrderStatus = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { orderId } = req.params;

        const order = await CCAvenueOrder.findOne({
            orderId,
            userId,
        }).lean();

        if (!order) {
            return res.status(404).json({
                msg: "Order not found",
            });
        }

        return res.json({
            success: true,
            order: {
                orderId: order.orderId,
                amount: order.amount,
                status: order.status,
                trackingId: order.trackingId,
                failureMessage: order.failureMessage,
                createdAt: order.createdAt,
            },
        });

    } catch (error) {
        console.error("ccavenue getOrderStatus:", error.message);

        return res.status(500).json({
            msg: "Failed to fetch order status",
            requestId: req.requestId,
        });
    }
};
