#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// This script generates a runtime configuration that can be imported
// It's useful when environment variables aren't available at build time

const config = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
};

const configContent = `
// Auto-generated runtime configuration
// This file is generated at runtime to handle dynamic environment variables

export const runtimeConfig = ${JSON.stringify(config, null, 2)};

// Helper to get API URL
export function getApiUrl() {
  if (typeof window !== 'undefined') {
    // Client-side: try to use window location if API URL is not set
    if (!runtimeConfig.NEXT_PUBLIC_API_URL || runtimeConfig.NEXT_PUBLIC_API_URL === 'http://localhost:8000') {
      // Assume API is on same domain with /api prefix in production
      const protocol = window.location.protocol;
      const host = window.location.host;
      return \`\${protocol}//\${host}\`.replace('3001', '8000'); // Fallback for local dev
    }
  }
  return runtimeConfig.NEXT_PUBLIC_API_URL;
}
`;

// Write to public directory so it can be served statically
const outputPath = path.join(__dirname, '..', 'public', 'runtime-config.js');
fs.writeFileSync(outputPath, configContent);

console.log('Runtime configuration generated:', config);