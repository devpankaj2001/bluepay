const MAX_ROWS = 500;
const REQUIRED_COLUMNS = ['beneficiary_name', 'account_number', 'ifsc_code', 'amount'];
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_REGEX = /^[0-9]{6,20}$/;

/**
 * Validates parsed CSV rows for a bulk payout. Pure function - does not
 * touch the database - so it can be reused identically by the preview
 * endpoint and by the actual batch-creation endpoint (which MUST
 * re-validate server-side rather than trust whatever the client echoes
 * back from the preview call).
 *
 * @param {Array<object>} rows - from utils/csv.js parseCsv().rows
 * @param {number} availableBalance
 * @returns {{ valid: object[], invalid: object[], totalCount, totalAmount, availableBalance, remainingBalance, rowLimitExceeded }}
 */
const validateBulkRows = (rows, availableBalance = 0) => {
    const rowLimitExceeded = rows.length > MAX_ROWS;
    const limitedRows = rowLimitExceeded ? rows.slice(0, MAX_ROWS) : rows;

    const seen = new Map(); // dedupe key -> first rowIndex
    const valid = [];
    const invalid = [];

    limitedRows.forEach((row, index) => {
        const rowIndex = index + 1; // 1-based, matches CSV row (excluding header)
        const errors = [];

        const beneficiary_name = String(row.beneficiary_name || '').trim();
        const account_number = String(row.account_number || '').trim();
        const ifsc_code = String(row.ifsc_code || '').trim().toUpperCase();
        const bank_name = String(row.bank_name || '').trim();
        const remarks = String(row.remarks || '').trim();
        const rawAmount = String(row.amount || '').trim();
        const amount = Number(rawAmount);

        REQUIRED_COLUMNS.forEach((col) => {
            if (!String(row[col] || '').trim()) {
                errors.push(`Missing ${col}`);
            }
        });

        if (rawAmount && (!Number.isFinite(amount) || amount <= 0)) {
            errors.push('Invalid amount');
        }

        if (account_number && !ACCOUNT_REGEX.test(account_number)) {
            errors.push('Invalid account number');
        }

        if (ifsc_code && !IFSC_REGEX.test(ifsc_code)) {
            errors.push('Invalid IFSC code');
        }

        const dedupeKey = `${account_number}|${ifsc_code}|${amount}`;

        if (errors.length === 0) {
            if (seen.has(dedupeKey)) {
                errors.push(`Duplicate of row ${seen.get(dedupeKey)}`);
            } else {
                seen.set(dedupeKey, rowIndex);
            }
        }

        const record = {
            rowIndex,
            beneficiary_name,
            account_number,
            ifsc_code,
            bank_name,
            remarks,
            amount: Number.isFinite(amount) ? amount : rawAmount,
        };

        if (errors.length > 0) {
            invalid.push({ ...record, errors });
        } else {
            valid.push(record);
        }
    });

    const totalAmount = valid.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return {
        valid,
        invalid,
        totalCount: limitedRows.length,
        totalAmount,
        availableBalance: Number(availableBalance || 0),
        remainingBalance: Number(availableBalance || 0) - totalAmount,
        rowLimitExceeded,
        maxRows: MAX_ROWS,
        insufficientBalance: totalAmount > Number(availableBalance || 0),
    };
};

module.exports = { validateBulkRows, MAX_ROWS, REQUIRED_COLUMNS, IFSC_REGEX };
