/**
 * OAuth Refresh Token Generator
 *
 * Run this script to get refresh tokens for Google Drive and YouTube APIs.
 *
 * Usage:
 *   npx tsx scripts/get-refresh-token.ts
 *
 * Then open the URL in your browser and authorize the app.
 */

import { google } from 'googleapis';
import * as http from 'http';
import * as url from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// Scopes for both YouTube and Google Drive
const SCOPES = [
  // YouTube
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  // Google Drive
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: CLIENT_ID and CLIENT_SECRET must be set in .env file');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to get refresh token
  });

  console.log('\n===========================================');
  console.log('OAuth Refresh Token Generator');
  console.log('===========================================\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2. Authorize the app');
  console.log('3. You will be redirected to localhost:3000');
  console.log('\nWaiting for authorization...\n');

  // Start local server to receive the callback
  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/oauth2callback')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const parsedUrl = url.parse(req.url, true);
    const code = parsedUrl.query.code as string;

    if (!code) {
      res.writeHead(400);
      res.end('No authorization code received');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: sans-serif; padding: 20px;">
            <h1>Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
          </body>
        </html>
      `);

      console.log('===========================================');
      console.log('SUCCESS! Add these to your .env file:');
      console.log('===========================================\n');
      console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n===========================================');
      console.log('Access Token (for debugging):');
      console.log(`${tokens.access_token?.substring(0, 50)}...`);
      console.log('===========================================\n');

      server.close();
      process.exit(0);
    } catch (error) {
      console.error('Error getting tokens:', error);
      res.writeHead(500);
      res.end('Error getting tokens');
      server.close();
      process.exit(1);
    }
  });

  server.listen(3000, () => {
    console.log('Local server listening on http://localhost:3000');
  });
}

main().catch(console.error);
