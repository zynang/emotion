import { client_Id, redirect_Uri } from './config.js';

// Ensure the script runs after the page has loaded
window.onload = async function() {

    const clientId = client_Id; 
    const redirectUri = redirect_Uri; 
    const scopes = 'activity heartrate sleep profile';
  
    // Function to generate a random string (for PKCE code verifier and state)
    function generateRandomString(length) {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let text = '';
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    }
  
    // Function to generate the PKCE code challenge
    async function generateCodeChallenge(codeVerifier) {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return base64Digest;
    }
  
    // Function to parse query parameters from the URL
    function getQueryParams() {
      const params = {};
      window.location.search.substring(1).split('&').forEach(pair => {
        if (pair !== '') {
          const [key, value] = pair.split('=');
          params[key] = decodeURIComponent(value || '');
        }
      });
      return params;
    }
  
    // Function to exchange the authorization code for an access token
    async function getAccessToken(authorizationCode, codeVerifier) {
      const tokenUrl = 'https://api.fitbit.com/oauth2/token';
  
      const data = new URLSearchParams();
      data.append('client_id', clientId);
      data.append('grant_type', 'authorization_code');
      data.append('redirect_uri', redirectUri);
      data.append('code', authorizationCode);
      data.append('code_verifier', codeVerifier);
  
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data.toString(),
      });
  
      const tokenData = await response.json();
      return tokenData;
    }
  
    // Function to fetch user profile data from Fitbit API
    async function getUserProfile(accessToken) {
      const apiUrl = 'https://api.fitbit.com/1/user/-/profile.json';
  
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
  
      const profileData = await response.json();
      return profileData;
    }
  
    // Function to display the user profile data on the webpage
    function displayProfile(profileData) {
      const userName = profileData.user.fullName;
      const avatarUrl = profileData.user.avatar;
  
      const profileDiv = document.getElementById('profile');
      profileDiv.innerHTML = `
        <h2>${userName}</h2>
        <img src="${avatarUrl}" alt="User Avatar">
      `;
    }
  
    // Function to fetch heart rate data from Fitbit API
    async function getHeartRateData(accessToken) {
      // Define the API endpoint
      const apiUrl = 'https://api.fitbit.com/1/user/-/activities/heart/date/today/1d/1min.json';
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json();
        throw new Error(`Error fetching heart rate data: ${errorData.errors[0].message}`);
      }
      
      const heartRateData = await response.json();
      return heartRateData;
    }
  
    // Function to display the heart rate data on the webpage
    function displayHeartRateData(heartRateData) {
      const heartRateDiv = document.getElementById('heart-rate');
      
      // Check if intraday data is available
      if (heartRateData['activities-heart-intraday'] && heartRateData['activities-heart-intraday'].dataset.length > 0) {
        const dataset = heartRateData['activities-heart-intraday'].dataset;
        
        // Create a simple list of heart rate data
        let html = '<h3>Heart Rate Data</h3><ul>';
        dataset.forEach(dataPoint => {
          html += `<li>${dataPoint.time}: ${dataPoint.value} bpm</li>`;
        });
        html += '</ul>';
        
        heartRateDiv.innerHTML = html;
      } else {
        heartRateDiv.innerHTML = '<p>No heart rate data available.</p>';
      }
    }
  
    // Start of the main OAuth flow
    const params = getQueryParams();
  
    if (params.code) {
      // Step 3 & 4: Handle redirect and get access token
      const authorizationCode = params.code;
      const returnedState = params.state;
  
      // Retrieve stored codeVerifier and state
      const codeVerifier = sessionStorage.getItem('codeVerifier');
      const storedState = sessionStorage.getItem('oauthState');
  
      // Clear the code and state from the URL for cleanliness
      window.history.replaceState({}, document.title, redirectUri);
  
      // Verify state
      if (returnedState !== storedState) {
        console.error('Invalid state parameter');
        // Handle error appropriately
        alert('Invalid state parameter. Please try again.');
      } else {
        // Exchange authorization code for access token
        try {
          const tokenData = await getAccessToken(authorizationCode, codeVerifier);
  
          if (tokenData.access_token) {
            const accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token;
  
            // Store tokens in sessionStorage (or another secure storage)
            sessionStorage.setItem('accessToken', accessToken);
            sessionStorage.setItem('refreshToken', refreshToken);
  
            // Fetch profile data and display
            const profileData = await getUserProfile(accessToken);
            displayProfile(profileData);
  
            // Fetch heart rate data and display
            try {
              const heartRateData = await getHeartRateData(accessToken);
              displayHeartRateData(heartRateData);
            } catch (error) {
              console.error('Error fetching heart rate data:', error);
              alert('Error fetching heart rate data. Please try again.');
            }
          } else {
            console.error('Error obtaining access token:', tokenData);
            alert('Error obtaining access token. Please try again.');
          }
        } catch (error) {
          console.error('Error during token exchange:', error);
          alert('Error during token exchange. Please try again.');
        }
      }
    } else {
      // Step 1 & 2: Generate PKCE code verifier and code challenge, then redirect to authorization URL
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(16);
  
      // Store codeVerifier and state in sessionStorage
      sessionStorage.setItem('codeVerifier', codeVerifier);
      sessionStorage.setItem('oauthState', state);
  
      // Build the authorization URL
      const authorizationUrl = `https://www.fitbit.com/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `code_challenge=${encodeURIComponent(codeChallenge)}&` +
        `code_challenge_method=S256&` +
        `state=${encodeURIComponent(state)}`;
  
      // Redirect the user to Fitbit's authorization page
      window.location.href = authorizationUrl;
    }
  };
  