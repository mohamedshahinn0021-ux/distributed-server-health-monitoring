import { URL } from 'url';
import net from 'net';

/**
 * Checks if an IP address belongs to a private / internal / link-local / loopback range
 */
export function isPrivateIP(ip) {
  if (!ip) return false;

  // Handle IPv6 loopback and mapped addresses
  if (ip === '::1' || ip === '::' || ip.startsWith('fc00:') || ip.startsWith('fe80:')) {
    return true;
  }

  // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;

    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 (Link-Local, AWS/GCP cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224) return true;
  }

  return false;
}

/**
 * Validates a health-check URL for security, syntax, and SSRF prevention.
 * Allows safe mock simulation endpoints on localhost:5000/api/mock/ for testing.
 */
export function validateHealthCheckUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch (err) {
    return { valid: false, error: 'Malformed URL: ' + err.message };
  }

  // 1. Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Protocol not allowed. Only HTTP and HTTPS are permitted.' };
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URL must not contain embedded authentication credentials' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Special exception for safe built-in mock endpoints for academic testing
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  const isMockEndpoint =
    (hostname === 'localhost' || hostname === '127.0.0.1') &&
    (port === '5000' || port === '3000') &&
    parsed.pathname.startsWith('/api/mock');

  if (isMockEndpoint) {
    return { valid: true, url: parsed.toString(), isMock: true };
  }

  // 4. Reject localhost, 127.0.0.1, 0.0.0.0, internal domains if not a safe mock endpoint
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254'
  ) {
    return {
      valid: false,
      error:
        'SSRF Protection: Access to localhost, internal hosts, or cloud metadata services is restricted.',
    };
  }

  // 5. If hostname is an IP, check if it's private
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return {
        valid: false,
        error: `SSRF Protection: Private IP ranges (${hostname}) are restricted.`,
      };
    }
  }

  return { valid: true, url: parsed.toString(), isMock: false };
}
