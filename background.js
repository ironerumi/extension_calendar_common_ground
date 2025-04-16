/**
 * Background service worker for Common Ground Chrome Extension
 * Handles OAuth, Google Calendar API calls, and background event logic
 */

// In-memory token cache for the auth token obtained via chrome.identity.getAuthToken
// Note: CLIENT_ID and SCOPES are configured in manifest.json's "oauth2" section for Manifest V3
let authToken = null;

/**
 * Get or refresh an OAuth token
 * @param {boolean} interactive - Whether to show OAuth prompt to user
 * @returns {Promise<string>} Auth token
 */
async function getAuthToken(interactive = true) {
  // Return cached token if available
  if (authToken) {
    return authToken;
  }
  
  try {
    // Request token from Chrome Identity API with proper promise handling
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
        if (chrome.runtime.lastError) {
          console.error('Auth error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          const error = new Error('No auth token returned');
          console.error(error);
          reject(error);
        } else {
          console.log('Auth token obtained successfully');
          authToken = token;
          resolve(token);
        }
      });
    });
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
}

/**
 * Handle messages from popup or options page
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use an async IIFE to handle async operations
  (async () => {
    try {
      switch (request.action) {
        case 'getAuthToken':
          // Get auth token with or without interaction
          const token = await getAuthToken(request.interactive !== false);
          sendResponse({ token });
          break;
          
        case 'clearCache':
          // Clear cached token
          authToken = null;
          sendResponse({ success: true });
          break;
          
        case 'revoke':
          // Revoke OAuth token
          if (authToken) {
            try {
              await chrome.identity.removeCachedAuthToken({ token: authToken });
              authToken = null;
              sendResponse({ success: true });
            } catch (error) {
              console.error('Error revoking token:', error);
              sendResponse({ success: false, error: error.message });
            }
          } else {
            sendResponse({ success: true });
          }
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  // Return true to indicate we'll send response asynchronously
  return true;
});

// Install event listener - set up defaults
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Store default settings
    chrome.storage.sync.set({
      language: 'en',
      availableFrom: '09:00',
      availableUntil: '18:00',
      exclusions: [
        { start: '12:00', end: '13:00' } // Default lunch break
      ],
      selectedDays: [false, true, true, true, true, true, false], // Mon-Fri
      minDuration: 60,
      numSlots: 3,
      spreadDays: 2,
      startingDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD
    });
  }
});

// Listener for the extension action click (toolbar icon)
chrome.action.onClicked.addListener((tab) => {
  // Ensure sidePanel is available
  if (chrome.sidePanel) {
    // Open the side panel for the current window
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else {
    console.error("Side Panel API not available.");
  }
});


console.log('Common Ground background service worker initialized');
