#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/SUPABASE_URL=(.+)/)?.[1]?.trim();
const serviceKey = envContent.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// First, get the user ID from auth
const authOptions = {
  hostname: new URL(supabaseUrl).hostname,
  port: 443,
  path: '/auth/v1/user',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
  }
};

// This won't work easily without the user's JWT token
// Let me try a different approach - directly query the user_profiles table

console.log('Attempting to grant admin role...');
console.log('Supabase URL:', supabaseUrl);

// Get user_id from the profiles table by email
const email = 'qa-tester@example.com';
const profilePath = `/rest/v1/user_profiles?email=eq.${email}&select=*`;

console.log('Checking for existing profile...');

const req = https.request({
  hostname: new URL(supabaseUrl).hostname,
  port: 443,
  path: profilePath,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const profiles = JSON.parse(data);
      console.log('Found profiles:', profiles);

      if (profiles.length > 0) {
        const profile = profiles[0];
        console.log('Profile ID:', profile.id);
        console.log('Current role:', profile.role);

        // Update the role to admin
        const updatePath = `/rest/v1/user_profiles?id=eq.${profile.id}`;
        const updateReq = https.request({
          hostname: new URL(supabaseUrl).hostname,
          port: 443,
          path: updatePath,
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json',
          }
        }, (updateRes) => {
          let updateData = '';
          updateRes.on('data', chunk => { updateData += chunk; });
          updateRes.on('end', () => {
            console.log('Update response:', updateRes.statusCode, updateData);
            if (updateRes.statusCode >= 200 && updateRes.statusCode < 300) {
              console.log('✅ Successfully granted admin role!');
            } else {
              console.log('❌ Failed to update role');
            }
          });
        });

        updateReq.on('error', (err) => {
          console.error('Update request error:', err);
        });

        updateReq.write(JSON.stringify({ role: 'admin' }));
        updateReq.end();
      } else {
        console.log('No profile found with email:', email);
        console.log('User may not have completed signup yet');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.end();
