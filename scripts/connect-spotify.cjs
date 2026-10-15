const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { Writable } = require('node:stream');
const { spawn } = require('node:child_process');

const redirectURI = 'http://127.0.0.1:8889/callback';
const outputFile = path.join(__dirname, '..', '.env.spotify');

function prompt(label, hidden = false) {
  return new Promise((resolve, reject) => {
    const output = new Writable({ write(chunk, encoding, done) { if (!hidden) process.stdout.write(chunk); done(); } });
    const input = readline.createInterface({ input: process.stdin, output, terminal: true });
    process.stdout.write(label);
    input.on('SIGINT', () => { input.close(); reject(new Error('Setup cancelled.')); });
    input.question('', answer => {
      input.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function authorizationURL(clientId, state) {
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({
    response_type: 'code', client_id: clientId, scope: 'user-read-currently-playing',
    redirect_uri: redirectURI, state, show_dialog: 'true'
  }).toString();
  return url.href;
}

function waitForAuthorization(state, onListening) {
  return new Promise((resolve, reject) => {
    let timeout;
    const finish = (error, code) => {
      clearTimeout(timeout);
      server.close();
      server.closeAllConnections();
      if (error) reject(error); else resolve(code);
    };
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, redirectURI);
      const reply = (status, message) => {
        response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        response.end(message);
      };
      if (request.method !== 'GET' || url.pathname !== '/callback') { reply(404, 'Not found'); return; }
      if (url.searchParams.get('state') !== state) { reply(400, 'This authorization does not match the setup session. Return to the original Spotify tab.'); return; }
      if (url.searchParams.has('error')) {
        reply(400, 'Spotify authorization was declined. Return to Terminal to try again.');
        response.once('finish', () => finish(new Error('Spotify authorization was declined.')));
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) { reply(400, 'Missing authorization code.'); return; }
      response.once('finish', () => finish(null, code));
      reply(200, 'Spotify authorization received. Return to Terminal to finish setup. You can close this tab.');
    });
    server.once('error', () => finish(new Error('Could not open port 8889. Close any other Spotify setup process and try again.')));
    server.listen(8889, '127.0.0.1', () => {
      timeout = setTimeout(() => finish(new Error('Authorization timed out after five minutes. Run setup again.')), 300000);
      onListening();
    });
  });
}

async function exchangeCode(clientId, clientSecret, code) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectURI }).toString(),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Spotify could not complete authorization (HTTP ${response.status}). Check the client ID, client secret, and exact redirect URI, then run setup again.`);
  const token = await response.json();
  if (!token.refresh_token || !String(token.scope || '').split(' ').includes('user-read-currently-playing')) {
    throw new Error('Spotify did not return the required refresh token and permission. Run setup again and approve the listening permission.');
  }
  return token.refresh_token;
}

function saveCredentials(clientId, clientSecret, refreshToken) {
  const credentials = { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, SPOTIFY_REFRESH_TOKEN: refreshToken };
  const content = Object.entries(credentials).map(([name, value]) => {
    if (!value || /[\r\n]/.test(value)) throw new Error('Unexpected credential format.');
    return `${name}=${JSON.stringify(value)}`;
  }).join('\n') + '\n';
  fs.writeFileSync(outputFile, content, { mode: 0o600, flag: 'w' });
  fs.chmodSync(outputFile, 0o600);
}

async function main() {
  if (!process.stdin.isTTY) throw new Error('Run this helper in your own Terminal so credentials can be entered privately.');
  console.log(`Add this exact redirect URI in your Spotify app first: ${redirectURI}`);
  const clientId = await prompt('Spotify Client ID: ');
  const clientSecret = await prompt('Spotify Client Secret (input hidden): ', true);
  if (!clientId || !clientSecret) throw new Error('Both the client ID and client secret are required.');
  const state = crypto.randomBytes(32).toString('hex');
  const url = authorizationURL(clientId, state);
  const code = await waitForAuthorization(state, () => {
    console.log('Opening Spotify. Sign in with the account whose listening should appear on the portfolio.');
    console.log(`If the browser does not open, open this URL yourself:\n${url}`);
    if (process.platform === 'darwin') {
      const browser = spawn('open', [url], { stdio: 'ignore' });
      browser.on('error', () => {});
    }
  });
  const refreshToken = await exchangeCode(clientId, clientSecret, code);
  saveCredentials(clientId, clientSecret, refreshToken);
  console.log(`Saved your three variables to ${outputFile}`);
  console.log('This file is ignored by Git. Keep it private. Copy its values into Netlify, without the surrounding quotes.');
  console.log('On this Mac, open it privately with: open -a TextEdit .env.spotify');
}

module.exports = { authorizationURL, exchangeCode, saveCredentials, waitForAuthorization };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
