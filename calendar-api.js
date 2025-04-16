/**
 * Calendar API helper module
 * Provides functions to interact with the Google Calendar API
 */

/**
 * Get user calendars 
 * @returns {Promise<Array>} List of calendars
 */
async function getCalendars() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    
    // Check if we received a valid response and token
    if (!response) {
      throw new Error('No response from background script');
    }
    
    if (response.error) {
      throw new Error(`Auth error: ${response.error}`);
    }
    
    if (!response.token) {
      throw new Error('No auth token in response');
    }
    
    const token = response.token;
    console.log('Got valid token, making API request...');
    
    const apiResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!apiResponse.ok) {
      console.error('Calendar API error:', apiResponse.status, apiResponse.statusText);
      throw new Error(`Failed to fetch calendars: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching calendars:', error);
    throw error;
  }
}

/**
 * Fetch events from a calendar for a specific date range
 * @param {string} calendarId - ID of the calendar
 * @param {Date} startDate - Start date for event search
 * @param {Date} endDate - End date for event search
 * @returns {Promise<Array>} List of events
 */
async function getEvents(calendarId, startDate, endDate) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    if (!response || !response.token) {
      throw new Error('Failed to get auth token');
    }
    
    const token = response.token;
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();

    // Add eventTypes parameter to include focusTime and outOfOffice along with default events
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&eventTypes=default&eventTypes=focusTime&eventTypes=outOfOffice`;

    console.log(`Fetching events with URL: ${url}`); // Log the URL to confirm parameters

    const apiResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!apiResponse.ok) {
      throw new Error(`Failed to fetch events: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

/**
 * Create a new calendar event
 * @param {string} calendarId - ID of the calendar
 * @param {Object} eventDetails - Details for the new event
 * @returns {Promise<Object>} Created event
 */
async function createEvent(calendarId, eventDetails) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    if (!response || !response.token) {
      throw new Error('Failed to get auth token');
    }
    
    const token = response.token;
    const apiResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventDetails)
    });

    if (!apiResponse.ok) {
      throw new Error(`Failed to create event: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

/**
 * Delete a calendar event
 * @param {string} calendarId - ID of the calendar
 * @param {string} eventId - ID of the event to delete
 * @returns {Promise<void>}
 */
async function deleteEvent(calendarId, eventId) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    if (!response || !response.token) {
      throw new Error('Failed to get auth token');
    }
    
    const token = response.token;
    const apiResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!apiResponse.ok) {
      throw new Error(`Failed to delete event: ${apiResponse.status}`);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

export { getCalendars, getEvents, createEvent, deleteEvent };
