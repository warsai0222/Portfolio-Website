# Spotify listening card

The Home music card reads `/api/now-playing`. A Netlify function uses the portfolio owner's Spotify authorization to publish just the current track, artist, album artwork, and progress. Visitors do not sign in. When playback stops, it shows an idle state. Until configured, it shows “Live listening coming soon.”

## Connect the owner account

1. Create an app at https://developer.spotify.com/dashboard using your Spotify account. Spotify's Development Mode currently requires the app owner to have Premium.
2. Add this exact redirect URI: `http://127.0.0.1:8889/callback`. Select **Web API** if asked which APIs the app uses. Save your app settings. Do not use `localhost` in place of `127.0.0.1`.
3. Open your own Terminal in the portfolio directory and run `node scripts/connect-spotify.cjs`. Paste the Client ID and Client Secret from the Spotify app settings when prompted. The secret input is hidden. The helper opens Spotify, requests only `user-read-currently-playing`, validates the callback state, exchanges the code locally, and saves all three variables in the private, Git-ignored `.env.spotify` file. Sign in as the account whose listening you want to display. If you receive a user-access error, add that account in your app's User Management settings.
4. Open the saved file privately with `open -a TextEdit .env.spotify`. In the existing Netlify project's **Project configuration → Environment variables**, add `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN`, copying each value without the surrounding quotes. Select **Production** as the deploy context. If scope selection is available, choose **Functions**; otherwise the default all-scopes setting includes Functions. Mark the secret and refresh token as secrets if that option is available. Keep the existing Groq variables. Keep secrets out of HTML, Git, screenshots, and chat.
5. Redeploy after setting the variables. Play a track in Spotify, then open the deployed Home page. Updates poll about every 30 seconds while the card is visible; progress advances between polls. Paused playback keeps the current track with a “Paused” label.

Spotify currently expires refresh tokens after six months. Reauthorize the owner account when the token expires or is revoked. The card handles upstream failures without exposing credentials or error responses. Warm function instances cache access tokens and playback requests; this cache is not a distributed rate limiter.

Local `file://` previews show the placeholder. To use Spotify locally, use `netlify dev` with the variables in an ignored `.env` file. `.env.spotify` is only a setup output file; the deployed function reads Netlify's environment variables.

## Official documentation

- Authorization Code flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Current playback and required scope: https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track
- Refresh tokens: https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
- Development Mode: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
