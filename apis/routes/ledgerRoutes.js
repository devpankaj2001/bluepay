const express = require("express");
const router = express.Router();

const {
    getTransactions,
    getTransactionById,
    getLedgerSummary,
} = require("../controllers/ledgerController");

const auth = require("../middleware/authMiddleware");

router.get(
    "/transactions",
    auth,
    getTransactions
);

router.get(
    "/transactions/:id",
    auth,
    getTransactionById
);

router.get(
    "/summary",
    auth,
    getLedgerSummary
);

module.exports = router;