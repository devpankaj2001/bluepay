/**
 * SSRF protection for merchant-configured webhook URLs.
 *
 * A webhook URL is merchant-supplied and this server will later make an
 * outbound HTTP request to it - that is exactly the SSRF shape (attacker
 * registers http://169.254.169.254/latest/meta-data/ or http://localhost:6379
 * as their "webhook" and waits for BluePay's server to fetch it for them).
 *
 * Defense in depth:
 *   1. `validateWebhookUrl` - called at registration time (and again right
 *      before every send, since DNS can change between the two - "DNS
 *      rebinding"). Resolves the hostname and rejects if the URL itself or
 *      ANY resolved address is loopback/private/link-local/reserved, or if
 *      the scheme isn't http/https.
 */

const dns = require("dns").promises;
const net = require("net");

const isIPv4PrivateOrReserved = (ip) => {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // malformed - treat as unsafe

    const [a, b] = parts;

    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata (169.254.169.254)
    if (a === 0) return true; // "this network"
    if (a >= 224) return true; // multicast/reserved/broadcast
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT (100.64.0.0/10)

    return false;
};

const isIPv6PrivateOrReserved = (ip) => {
    const lower = ip.toLowerCase();

    if (lower === "::1") return true; // loopback
    if (lower === "::") return true; // unspecified
    if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local fe80::/10
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7

    // IPv4-mapped IPv6 (::ffff:10.0.0.1) - check the embedded IPv4.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isIPv4PrivateOrReserved(mapped[1]);

    return false;
};

const isPrivateOrReservedIp = (ip) => {
    const version = net.isIP(ip);
    if (version === 4) return isIPv4PrivateOrReserved(ip);
    if (version === 6) return isIPv6PrivateOrReserved(ip);
    return true; // not a recognizable IP - treat as unsafe
};

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "ip6-localhost", "metadata.google.internal"]);

/**
 * @param {string} urlString
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
const validateWebhookUrl = async (urlString) => {
    let parsed;

    try {
        parsed = new URL(String(urlString || ""));
    } catch {
        return { valid: false, reason: "Malformed URL" };
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        return { valid: false, reason: "Only http/https URLs are allowed" };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.has(hostname)) {
        return { valid: false, reason: "Destination host is not allowed" };
    }

    // Hostname is itself a literal IP - validate directly, no DNS involved.
    if (net.isIP(hostname)) {
        if (isPrivateOrReservedIp(hostname)) {
            return { valid: false, reason: "Destination resolves to a private/internal address" };
        }
        return { valid: true };
    }

    let addresses;

    try {
        addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
        return { valid: false, reason: "Destination host could not be resolved" };
    }

    if (!addresses.length) {
        return { valid: false, reason: "Destination host could not be resolved" };
    }

    const unsafe = addresses.some((a) => isPrivateOrReservedIp(a.address));

    if (unsafe) {
        return { valid: false, reason: "Destination resolves to a private/internal address" };
    }

    return { valid: true };
};

module.exports = { validateWebhookUrl, isPrivateOrReservedIp };
