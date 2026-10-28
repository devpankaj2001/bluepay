/**
 * Minimal CSV parser/writer - no external dependency needed for the simple
 * flat, comma-separated bulk payout template (supports quoted fields that
 * contain commas, using double-quote escaping "" for a literal quote).
 */

const parseLine = (line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current);
    return fields.map((f) => f.trim());
};

/**
 * Parses CSV text into an array of row objects keyed by the header row.
 * Blank lines are skipped.
 */
const parseCsv = (text) => {
    const lines = String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter((line) => line.trim().length > 0);

    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    const rows = lines.slice(1).map((line) => {
        const values = parseLine(line);
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] !== undefined ? values[idx] : '';
        });
        return row;
    });

    return { headers, rows };
};

const toCsv = (headers, rows) => {
    const escape = (value) => {
        const str = String(value ?? '');
        if (/[",\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const lines = [headers.join(',')];
    rows.forEach((row) => {
        lines.push(headers.map((h) => escape(row[h])).join(','));
    });

    return lines.join('\n');
};

module.exports = { parseCsv, toCsv };
