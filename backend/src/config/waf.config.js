module.exports = {
  sqlInjectionPatterns: [
    /(?:UNION\s+SELECT|OR\s+1=1|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+SET|--|xp_cmdshell|exec\(|INFORMATION_SCHEMA)/i
  ],
  xssPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /eval\(/i,
    /document\.cookie/i,
    /alert\(/i,
    /onmouseover=/i
  ],
  pathTraversalPatterns: [
    /\.\.\//,
    /\.\./,
    /%2e%2e/i,
    /(?:\/|)\.\.(?:\/|)/
  ],
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    loginMax: 50,
    loginWindowMs: 15 * 60 * 1000
  },
  blockedStatusCode: 403,
  whitelistIps: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
  maxBodySize: '10mb'
};
