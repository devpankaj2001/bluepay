/**
 * Masks a bank account number for merchant-facing responses, keeping only
 * the last 4 digits visible (e.g. "XXXXXXXX1234").
 */
const maskAccountNumber = (accountNumber) => {
    const value = String(accountNumber || "");
    if (value.length <= 4) return value;
    return `${"X".repeat(value.length - 4)}${value.slice(-4)}`;
};

/**
 * Returns a shallow-cloned payout (plain object or lean doc) with the
 * account number masked. Safe to call on lean() results or plain objects.
 */
const maskPayout = (payout) => {
    if (!payout) return payout;
    const plain = typeof payout.toObject === "function" ? payout.toObject() : { ...payout };
    return {
        ...plain,
        account_number: maskAccountNumber(plain.account_number),
    };
};

module.exports = { maskAccountNumber, maskPayout };
