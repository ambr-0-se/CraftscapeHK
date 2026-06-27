#!/usr/bin/env node

/**
 * CORS Verification Script
 * Tests if CORS is properly configured on your Replit backend
 */

const https = require('https');

const REPLIT_URL = 'https://80323cac-9cf1-4503-afba-de3082d32504-00-2vq4n4lqc6zbv.sisko.replit.dev:3001';
const VERCEL_ORIGIN = 'https://craftscape-hk.vercel.app';
const TEST_ENDPOINT = '/api/crafts';

console.log('🔍 CORS Verification Test\n');
console.log(`Testing: ${REPLIT_URL}${TEST_ENDPOINT}`);
console.log(`Origin: ${VERCEL_ORIGIN}\n`);

// Parse URL
const url = new URL(REPLIT_URL + TEST_ENDPOINT);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'OPTIONS',
  headers: {
    'Origin': VERCEL_ORIGIN,
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Content-Type'
  }
};

const req = https.request(options, (res) => {
  console.log(`✅ Response Status: ${res.statusCode} ${res.statusMessage}\n`);
  
  console.log('📋 Response Headers:');
  console.log('-------------------');
  
  const corsHeaders = {
    'access-control-allow-origin': res.headers['access-control-allow-origin'],
    'access-control-allow-methods': res.headers['access-control-allow-methods'],
    'access-control-allow-headers': res.headers['access-control-allow-headers'],
    'access-control-allow-credentials': res.headers['access-control-allow-credentials'],
  };
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) {
      console.log(`  ${key}: ${value}`);
    }
  });
  
  console.log('\n🧪 Test Results:');
  console.log('-------------------');
  
  let allPassed = true;
  
  // Check 1: Access-Control-Allow-Origin
  if (corsHeaders['access-control-allow-origin']) {
    if (corsHeaders['access-control-allow-origin'] === VERCEL_ORIGIN || 
        corsHeaders['access-control-allow-origin'] === '*') {
      console.log('  ✅ Access-Control-Allow-Origin is set correctly');
    } else {
      console.log(`  ❌ Access-Control-Allow-Origin is set to: ${corsHeaders['access-control-allow-origin']}`);
      console.log(`     Expected: ${VERCEL_ORIGIN}`);
      allPassed = false;
    }
  } else {
    console.log('  ❌ Access-Control-Allow-Origin header is missing');
    allPassed = false;
  }
  
  // Check 2: Access-Control-Allow-Methods
  if (corsHeaders['access-control-allow-methods']) {
    if (corsHeaders['access-control-allow-methods'].includes('GET')) {
      console.log('  ✅ Access-Control-Allow-Methods includes GET');
    } else {
      console.log('  ⚠️  Access-Control-Allow-Methods does not include GET');
      console.log(`     Current: ${corsHeaders['access-control-allow-methods']}`);
    }
  } else {
    console.log('  ⚠️  Access-Control-Allow-Methods header is missing');
  }
  
  // Check 3: Response status
  if (res.statusCode === 200 || res.statusCode === 204) {
    console.log(`  ✅ Response status is ${res.statusCode} (OK)`);
  } else {
    console.log(`  ⚠️  Response status is ${res.statusCode}`);
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 CORS is configured correctly!');
    console.log('Your Vercel frontend should be able to access the backend.');
  } else {
    console.log('❌ CORS configuration issues detected.');
    console.log('\n💡 Quick fixes:');
    console.log('  1. Ensure ALLOWED_ORIGINS env var is set on Replit');
    console.log('  2. Rebuild backend: npm run server:build');
    console.log('  3. Restart backend: npm run start:prod');
    console.log('\nSee CORS_FIX.md for detailed instructions.');
  }
  console.log('='.repeat(50) + '\n');
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
  console.log('\n💡 Possible causes:');
  console.log('  - Backend is not running on Replit');
  console.log('  - Network connectivity issues');
  console.log('  - Replit URL has changed');
  console.log('\nVerify backend is accessible at:');
  console.log(`  ${REPLIT_URL}${TEST_ENDPOINT}\n`);
});

req.end();
