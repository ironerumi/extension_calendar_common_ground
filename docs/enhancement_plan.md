# Enhancement Plan: Calendar Search and Saved Sets

## 1. Overview

This plan details the steps required to refactor the calendar selection UI in the Chrome Extension. The current static list will be replaced with a dynamic search interface. Additionally, functionality to save, load, and manage sets of selected calendars will be implemented.

**Affected Files:**

*   `options.html`: Major UI changes for search, selection, saving/loading sets, and management.
*   `options.js`: Logic for fetching calendars, searching, selecting, saving/loading sets via `chrome.storage`, and managing saved sets.
*   `calendar-api.js`: Ensure it fetches all necessary calendar details.
*   `common.css`: Styles for new UI elements.

## 2. Goals

1.  Replace the static calendar list with a search-based selection UI in `options.html`.
2.  Implement client-side filtering of calendars based on user search input.
3.  Automatically include the user's primary calendar in the selected list.
4.  Allow users to save the current set of selected calendars with a name (up to 10 sets).
5.  Allow users to load previously saved calendar sets.
6.  Add a section in `options.html` for managing (deleting) saved calendar sets.

## 3. Detailed Implementation Steps

### 3.1 Refactor Calendar Selection UI (`options.html`)

1.  **Remove Existing List:** Delete the HTML elements currently displaying the full static list of calendars.
2.  **Add Search Input:**
    *   `<input type="text" id="calendar-search-input" placeholder="Search calendars...">`
3.  **Add Search Results Container:**
    *   `<div id="calendar-search-results"></div>` (This will be populated dynamically by JavaScript).
4.  **Add Selected Calendars Container:**
    *   `<div id="selected-calendars-list"><h4>Selected Calendars:</h4><ul></ul></div>` (This will display the calendars chosen by the user).
5.  **Add Save Set UI:**
    *   `<input type="text" id="save-set-name" placeholder="Name for this set...">`
    *   `<button id="save-set-button">Save Current Selection</button>`
6.  **Add Load Set UI:**
    *   `<label for="load-set-dropdown">Load Saved Set:</label>`
    *   `<select id="load-set-dropdown"><option value="">-- Select a set --</option></select>`
    *   `<button id="load-set-button">Load</button>`

### 3.2 Implement Search and Selection Logic (`options.js`)

1.  **Fetch Calendars:**
    *   On page load, call `calendar-api.js` to get the full list of the user's calendars (`calendarList.list`). Store this list in a variable (e.g., `allCalendars`).
    *   Identify and store the user's primary calendar ID.
    *   Initialize the "Selected Calendars" list, adding the primary calendar by default. Render this initial list in `#selected-calendars-list`.
2.  **Implement Search Listener:**
    *   Add an `input` event listener to `#calendar-search-input`.
    *   Inside the listener:
        *   Get the search term (lowercase).
        *   If the term is empty, clear `#calendar-search-results`.
        *   If the term has characters, filter `allCalendars`: Check if the search term is a substring of the calendar's `summary` or `id` (case-insensitive).
        *   Render the filtered list in `#calendar-search-results`. Each result should be clickable (e.g., a `div` or `li` with calendar details and an "Add" button/icon). Make sure already selected calendars are visually distinct or excluded from search results.
3.  **Implement Selection Logic:**
    *   Add a click event listener to `#calendar-search-results` (using event delegation).
    *   When a calendar result is clicked:
        *   Get the calendar ID.
        *   Check if it's not already in the "Selected Calendars" list.
        *   Add the calendar object (ID, summary) to the internal selected list array.
        *   Re-render the `#selected-calendars-list`.
        *   Optionally, clear the search input and results after selection.
4.  **Implement Deselection Logic:**
    *   Add a click event listener to `#selected-calendars-list` (using event delegation).
    *   Allow users to click a "Remove" button/icon next to each selected calendar (except perhaps the primary one, or handle that case).
    *   Update the internal selected list array and re-render.

### 3.3 Implement Save/Load Set Logic (`options.js`)

1.  **Storage Structure:** Define the storage key (e.g., `savedCalendarSets`). The value will be an array of objects: `[{ name: "Set Name", calendars: [{id: "cal1", summary: "Summary 1"}, {id: "cal2", summary: "Summary 2"}] }, ...]`.
2.  **Save Set:**
    *   Add a click listener to `#save-set-button`.
    *   Get the name from `#save-set-name` and the current selected calendars array.
    *   Validate the name is not empty.
    *   Fetch the current saved sets from `chrome.storage.local`.
    *   Check if a set with the same name exists (optional: allow overwrite or prompt user).
    *   Add the new set to the array.
    *   If the array size exceeds 10, remove the oldest set (FIFO).
    *   Save the updated array back to `chrome.storage.local`.
    *   Update the `#load-set-dropdown`.
    *   Provide user feedback (e.g., "Set saved!").
3.  **Load Set Dropdown Population:**
    *   On page load, fetch `savedCalendarSets` from storage.
    *   Populate the `#load-set-dropdown` with options based on the fetched sets (`<option value='SET_INDEX'>Set Name</option>`).
4.  **Load Set:**
    *   Add a click listener to `#load-set-button`.
    *   Get the selected index/value from `#load-set-dropdown`.
    *   Fetch the `savedCalendarSets` from storage again (to ensure freshness).
    *   Retrieve the specific set's `calendars` array.
    *   Replace the current internal selected list with the loaded one (ensure the primary calendar is still included if it wasn't saved).
    *   Re-render `#selected-calendars-list`.

### 3.4 Implement Management UI (`options.html`)

1.  **Add Management Section:**
    *   Create a new section: `<div id="manage-saved-sets"><h2>Manage Saved Calendar Sets</h2><ul id="saved-sets-management-list"></ul><button id="delete-all-sets-button">Delete All Sets</button></div>`
2.  **Populate Management List (`options.js`):**
    *   Fetch `savedCalendarSets` from storage.
    *   For each set, create an `<li>` in `#saved-sets-management-list` containing the set name and a "Delete" button (`<button class="delete-set-button" data-set-index="INDEX">Delete</button>`).

### 3.5 Implement Management Logic (`options.js`)

1.  **Delete Single Set:**
    *   Add a click listener to `#saved-sets-management-list` (using event delegation on `.delete-set-button`).
    *   Get the `data-set-index` attribute from the clicked button.
    *   Fetch `savedCalendarSets` from storage.
    *   Remove the set at the specified index from the array.
    *   Save the updated array back to `chrome.storage.local`.
    *   Re-render the management list (`#saved-sets-management-list`) and the load dropdown (`#load-set-dropdown`).
2.  **Delete All Sets:**
    *   Add a click listener to `#delete-all-sets-button`.
    *   (Optional: Add a confirmation dialog `confirm(...)`).
    *   Save an empty array `[]` to the `savedCalendarSets` key in `chrome.storage.local`.
    *   Re-render the management list and the load dropdown.

### 3.6 Update `calendar-api.js` (If Necessary)

*   Ensure the function used to fetch the calendar list (e.g., `getCalendars`) retrieves `id`, `summary`, and `primary` status for each calendar entry. Adjust the API call parameters if needed.

### 3.7 Styling (`common.css`)

*   Add CSS rules to style the new input fields, buttons, search results container, selected list, and management section for a clean and usable interface.

## 4. Testing Considerations

*   Test search with various inputs (empty, short, long, no matches).
*   Test adding/removing calendars from the selected list.
*   Test saving sets (naming, 10-set limit, duplicates).
*   Test loading sets (correct calendars loaded).
*   Test deleting single sets and all sets.
*   Verify primary calendar is always handled correctly.
*   Test responsiveness and usability of the new UI elements.
*   Test edge cases like having no saved sets initially.
