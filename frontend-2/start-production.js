#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set the port from environment variable or default
const port = process.env.PORT || 3001;
process.env.PORT = port;

// For standalone Next.js builds, we need to start from the standalone directory
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');

console.log(`Starting production server on port ${port}...`);
console.log(`Server path: ${serverPath}`);

// Check if standalone server exists, otherwise fall back to regular next start
const fs = require('fs');
if (fs.existsSync(serverPath)) {
  // Copy public and static files to standalone directory if they exist
  const publicPath = path.join(__dirname, 'public');
  const standalonePublicPath = path.join(__dirname, '.next', 'standalone', 'public');
  const staticPath = path.join(__dirname, '.next', 'static');
  const standaloneStaticPath = path.join(__dirname, '.next', 'standalone', '.next', 'static');
  
  // Copy directories if they don't exist in standalone
  const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else if (exists) {
      fs.copyFileSync(src, dest);
    }
  };
  
  // Copy public folder if it exists and standalone doesn't have it
  if (fs.existsSync(publicPath) && !fs.existsSync(standalonePublicPath)) {
    console.log('Copying public folder to standalone directory...');
    copyRecursiveSync(publicPath, standalonePublicPath);
  }
  
  // Copy static folder if it exists and standalone doesn't have it
  if (fs.existsSync(staticPath) && !fs.existsSync(standaloneStaticPath)) {
    console.log('Copying static folder to standalone directory...');
    fs.mkdirSync(path.dirname(standaloneStaticPath), { recursive: true });
    copyRecursiveSync(staticPath, standaloneStaticPath);
  }
  
  // Start the standalone server
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    process.exit(code);
  });
} else {
  console.log('Standalone server not found, falling back to next start...');
  
  // Fall back to regular next start
  const next = spawn('npx', ['next', 'start', '-p', port], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  next.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  
  next.on('exit', (code) => {
    process.exit(code);
  });
}