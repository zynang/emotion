// Ensure the script runs after the page has loaded
window.onload = async function() {
    // Your Fitbit app's Client ID
    const clientId = '23PRPH'; // Replace with your actual Client ID
  
    // Your app's Redirect URI
    const redirectUri = 'https://zynang.github.io/emotion/'; // Replace with your actual Redirect URI, e.g., 'https://yourusername.github.io/yourrepo/'
  
    // Scopes for the data you want to access
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
      window.history.replaceState({}, document.title, '/');
  
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
  
            // Fetch data and display
            const profileData = await getUserProfile(accessToken);
            displayProfile(profileData);
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
  