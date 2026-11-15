import axios from 'axios';
import { URL } from 'url';

/**
 * Validates a server URL to prevent SSRF and unsafe schemes
 */
export function validateServerUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, message: 'URL string is required' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    return { valid: false, message: 'Invalid URL format' };
  }

  // Only permit HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, message: 'Only HTTP and HTTPS protocols are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block Cloud metadata service IP (SSRF protection)
  const blockedIPs = ['169.254.169.254', 'metadata.google.internal', 'instance-data'];
  if (blockedIPs.includes(hostname)) {
    return { valid: false, message: 'Access to internal cloud metadata addresses is restricted' };
  }

  return { valid: true, url: parsed.toString() };
}

/**
 * Performs an HTTP health check and measures response time in milliseconds
 * 
 * @param {string} url - Target URL to probe
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns {Promise<{ isReachable: boolean, statusCode: number, responseTime: number, errorMessage: string|null, checkedAt: Date }>}
 */
export async function performHttpHealthCheck(url, timeoutMs = 5000) {
  const checkedAt = new Date();
  const startTime = process.hrtime.bigint();

  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      maxRedirects: 3,
      validateStatus: () => true, // Don't throw on 4xx/5xx so we record real status codes
      headers: {
        'User-Agent': 'Distributed-Server-Health-Monitor/1.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
      },
    });

    const endTime = process.hrtime.bigint();
    const responseTimeMs = Math.round(Number(endTime - startTime) / 1e6);

    const isSuccessStatus = response.status >= 200 && response.status < 400;

    return {
      isReachable: isSuccessStatus,
      statusCode: response.status,
      responseTime: responseTimeMs,
      errorMessage: isSuccessStatus ? null : `HTTP status ${response.status} ${response.statusText || ''}`.trim(),
      checkedAt,
    };
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTimeMs = Math.round(Number(endTime - startTime) / 1e6);

    let errorMessage = 'Network unreachable';
    let statusCode = 0;

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = `Request timed out after ${timeoutMs}ms`;
      statusCode = 408;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused (service not running or port closed)';
      statusCode = 503;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS resolution failed (host not found)';
      statusCode = 502;
    } else if (error.response) {
      statusCode = error.response.status;
      errorMessage = `HTTP Error: ${error.response.status}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      isReachable: false,
      statusCode,
      responseTime: responseTimeMs,
      errorMessage,
      checkedAt,
    };
  }
}

export default {
  validateServerUrl,
  performHttpHealthCheck,
};
