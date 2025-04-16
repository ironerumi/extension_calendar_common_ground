# Implementation Document

## 1. Architecture Overview
- **Extension Type**: Chrome Extension (Manifest V3).
- **Main Components**:  
  • Manifest file  
  • Background Service Worker script  
  • Popup UI (HTML, CSS, JavaScript)  
  • Options Page (HTML, CSS, JavaScript)  
  • Event/Calendar API helper (JavaScript module)  
  • Localization files (for English and Japanese messages)

## 2. Technology Stack
- HTML, CSS, and JavaScript (ES6+).
- Google Calendar API.
- Chrome Identity API for OAuth2 token management.
- JSON for configuration and localization (messages.json).

## 3. Detailed Implementation Steps

### 3.1 Setting Up the Chrome Extension
- **manifest.json**:
  - Define extension name, description, version.
  - Specify permissions: "identity", "storage", and any remote host (e.g., https://www.googleapis.com/).
  - Include background service worker, popup and options pages.
  - Example snippet:
    {
      "manifest_version": 3,
      "name": "Common Ground",
      "version": "1.0",
      "description": "Schedule meetings based on mutual calendar availability.",
      "permissions": [
        "identity",
        "storage"
      ],
      "host_permissions": [
        "https://www.googleapis.com/"
      ],
      "background": {
        "service_worker": "background.js"
      },
      "action": {
        "default_popup": "popup.html"
      },
      "options_page": "options.html",
      "default_locale": "en"
    }

### 3.2 OAuth2 and Calendar API Integration
- **Authentication**:
  - Use the Chrome Identity API to initiate an OAuth2 flow.
  - Request necessary scopes (e.g., “https://www.googleapis.com/auth/calendar.readonly” for reading and “https://www.googleapis.com/auth/calendar.events” for creating events).
- **Calendar API Helper Module** (calendar-api.js):
  - Functions to:
    • Retrieve calendar lists.
    • Fetch events from a selected calendar over a specified date range.
    • Create events when booking a meeting.

### 3.3 UI Implementation
- **Popup Page (popup.html)**:
  - Build a form with:
    • Calendar/people selection (synced with the user's selected calenders, include the ones in "My Calendar" and "Other Calendars").
    • Time range settings: “Available from” and “Available until” fields.
    • Exclusion time ranges: allow adding one or more “exclude” blocks.
    • Days selection: checkboxes for Monday–Sunday.
    • Minimum meeting duration input field.
    • Number of slots required input field.
    • Spread (e.g., number of days over which slots must be distributed).
    • Save button to persist settings using chrome.storage API.
  - Provide basic controls:
    • Button to “Find Available Slots”
    • Display area to show calculated slots.
    • Option to choose language (toggle).

### 3.4 Slot Finder Algorithm
- **Input Data**:  
  • User settings (available time, exclusions, days, slot duration, number of required slots, spread days).
  • Fetched events from all selected calendars.
- **Algorithm Steps**:
  1. For each day in the defined period:
     - Define the “base available times” based on the general available time range.
     - Subtract any “exclusion time blocks” (e.g., lunch breaks).
  2. For each selected calendar, mark off busy periods based on events.
  3. Calculate the intersection of all calendars’ free times within the defined available periods.
  4. From the resulting available blocks, select time slots that:
     - Are at least the minimum duration.
     - Ensure the required number of slots are spread over the specified number of days.
- **Data Structures**:
  - Use arrays of time block objects (with start and end times).
  - Possibly use a library (or custom helper functions) for time calculations.
- **Example Pseudocode**:
  /*
    For each day in [startDate, endDate]:
       availableBlocks = subtractExclusions(generalAvailableTime, exclusionPeriods)
       For each selected calendar:
          busyBlocks = getBusyTimes(calendar, day)
          availableBlocks = subtractBusyTimes(availableBlocks, busyBlocks)
       If availableBlocks contain block with duration >= minDuration:
          add slot to potentialSlots
    End For
    Filter potentialSlots to ensure slots are distributed over required days.
  */

### 3.5 Booking Meeting Event
- When the user selects or confirms a slot:
  - Construct the event details:
    • Title (as input by the user)
    • Start and end times (from the selected slot)
    • Optionally include reminders or description.
  - Use the Calendar API helper to call the “create event” endpoint.
  - Handle API responses and show confirmation or error messages.

### 3.6 Internationalization (i18n)
- **Localization Files**:  
  - Create a messages.json in the _locales/en/ and _locales/ja/ directories.
  - Example for English (en/messages.json):
    {
      "slotFormat": {
        "message": "{date}({weekday}) {startTime} ~ {endTime}"
      }
    }
  - Example for Japanese (ja/messages.json):
    {
      "slotFormat": {
        "message": "{date}({weekday}) {startTime} ~ {endTime}"
      }
    }
- **Usage**:
  - In the output-related code, load the appropriate localized template.
  - Replace placeholders (e.g., {date}, {weekday}, {startTime}, {endTime}) with values.
  - Provide the user with a language toggle in the UI which triggers re-rendering of displayed slots in the selected language.

## 4. Code Organization
- /manifest.json
- /background.js
- /popup.html, /popup.js, /popup.css
- /options.html, /options.js, /options.css
- /calendar-api.js (API helper functions)
- /slot-finder.js (contains scheduling algorithm)
- /_locales/en/messages.json
- /_locales/ja/messages.json

## 5. Development Workflow
- Use Git for version control.
- Write code in small, testable modules.
- Comment extensively in code for clarity.
- Regularly test OAuth flows and API calls as you implement features.
