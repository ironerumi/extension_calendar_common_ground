/**
 * Sidepanel script for Common Ground Chrome Extension
 */

import { getCalendars, getEvents, createEvent } from './calendar-api.js';
import { findAvailableSlots, formatSlot } from './slot-finder.js';

// --- Core DOM elements ---
const authRequiredDiv = document.getElementById('auth-required');
const mainContentDiv = document.getElementById('main-content');
const authButton = document.getElementById('auth-button');
const findSlotsButton = document.getElementById('find-slots-button');
const openOptionsIcon = document.getElementById('open-options-icon');
const errorContainer = document.getElementById('error-container');
const successContainer = document.getElementById('success-container');

// --- Calendar Selection UI Elements ---
const calendarSearchInput = document.getElementById('calendar-search-input');
const calendarSearchResults = document.getElementById('calendar-search-results');
const selectedCalendarsList = document.querySelector('#selected-calendars-list ul');
const saveSetNameInput = document.getElementById('save-set-name');
const saveSetButton = document.getElementById('save-set-button');
const loadSetDropdown = document.getElementById('load-set-dropdown');
const loadSetButton = document.getElementById('load-set-button');
const openOptionsLinkAlt = document.getElementById('open-options-link-alt'); // Link in calendar section

// --- Slot Finding Settings UI Elements ---
const startingDateInput = document.getElementById('starting-date');
const minDurationInput = document.getElementById('min-duration');
const maxDurationInput = document.getElementById('max-duration');
const requiredSlotsInput = document.getElementById('required-slots');
const spreadDaysInput = document.getElementById('spread-days');

// --- Slot Results UI Elements ---
const slotsContainer = document.getElementById('slots-container');
const slotsList = document.getElementById('slots-list');
const selectAllCheckbox = document.getElementById('select-all-slots');
const bulkBookingSection = document.getElementById('bulk-booking-section');
const meetingNameInput = document.getElementById('meeting-name');
const bookMeetingButton = document.getElementById('book-meeting-button');
const copySlotsButton = document.getElementById('copy-slots-button');

// --- State Management ---
let settings = { // General slot finding settings, loaded from sync
  language: 'en',
  availableFrom: '09:00',
  availableUntil: '18:00',
  exclusions: [{ start: '12:00', end: '13:00' }],
  selectedDays: [false, true, true, true, true, true, false],
};
// Note: min/max duration, required slots, spread days, start date are read directly from inputs when finding slots

let allFetchedCalendars = []; // Full list fetched from API {id, summary, primary}
let selectedCalendars = [];   // Array of {id, summary} objects currently selected IN THE UI
let savedCalendarSets = [];   // Array of {name, calendars} objects loaded from LOCAL storage
let availableSlots = [];      // Results from findAvailableSlots
let selectedSlotIndices = []; // Indices of slots selected for booking/copying
let currentLanguage = 'en';   // Language for formatting slots

// Initialize the sidepanel
async function initialize() {
  console.log("Sidepanel Initialize called");
  try {
    // Load general settings (non-calendar related) from sync storage
    const syncData = await chrome.storage.sync.get([
      'language', 'availableFrom', 'availableUntil', 'exclusions', 'selectedDays',
      'startingDate', 'minDuration', 'maxDuration', 'numSlots', 'spreadDays'
      // Note: We DO NOT load 'selectedCalendarIds' anymore for this UI
    ]);

    // Update general settings and language
    if (syncData) {
      settings = { ...settings, ...syncData };
      currentLanguage = syncData.language || 'en';

      // Apply slot finding settings to form fields
      startingDateInput.value = syncData.startingDate || new Date().toISOString().split('T')[0];
      minDurationInput.value = syncData.minDuration || 60;
      maxDurationInput.value = syncData.maxDuration || 120;
      requiredSlotsInput.value = syncData.numSlots || 3;
      spreadDaysInput.value = syncData.spreadDays || 2;
    }

    // Load saved calendar sets from local storage
    const localData = await chrome.storage.local.get(['savedCalendarSets']);
    savedCalendarSets = localData.savedCalendarSets || [];
    populateLoadDropdown(); // Populate the dropdown

    // Try to get auth token and load all calendars for searching
    try {
      await chrome.runtime.sendMessage({ action: 'getAuthToken', interactive: false });
      showMainContent();
      await fetchAndPrepareCalendars(); // Fetch all calendars and set initial selection
    } catch (error) {
      showAuthRequired(); // Show auth UI if token not available/error
    }

    // Set up event listeners
    setupEventListeners();

  } catch (error) {
    showError('Failed to initialize sidepanel: ' + (error.message || 'Unknown error'));
  }
}

// Show authentication required UI
function showAuthRequired() {
  authRequiredDiv.style.display = 'block';
  mainContentDiv.style.display = 'none';
}

// Show main content UI
function showMainContent() {
  authRequiredDiv.style.display = 'none';
  mainContentDiv.style.display = 'block';
}

/**
 * Fetches all user calendars and sets the initial selected state (primary calendar).
 */
async function fetchAndPrepareCalendars() {
    try {
        allFetchedCalendars = await getCalendars();
        const primaryCalendar = allFetchedCalendars.find(cal => cal.primary);

        // Reset selectedCalendars and add primary by default
        selectedCalendars = [];
        if (primaryCalendar) {
            selectedCalendars.push({ id: primaryCalendar.id, summary: primaryCalendar.summary });
        }
        renderSelectedCalendars(); // Initial render of selected list

    } catch (error) {
        showError('Failed to fetch calendars: ' + (error.message || 'Auth issue?'));
        // Disable calendar search/select functionality?
        calendarSearchInput.disabled = true;
    }
}


// Set up event listeners
function setupEventListeners() {
  console.log("Setup Event Listeners called");

  // Auth button click
  authButton?.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'getAuthToken', interactive: true });
      showMainContent();
      await fetchAndPrepareCalendars(); // Fetch calendars after successful auth
      calendarSearchInput.disabled = false; // Re-enable search
      // Reload saved sets and dropdown too
      const localData = await chrome.storage.local.get(['savedCalendarSets']);
      savedCalendarSets = localData.savedCalendarSets || [];
      populateLoadDropdown();
    } catch (error) {
      showError('Authentication failed: ' + (error.message || 'Unknown error'));
    }
  });

  // --- Calendar Selection Listeners ---
  calendarSearchInput?.addEventListener('input', handleCalendarSearch);
  calendarSearchResults?.addEventListener('click', handleSelectCalendar);
  selectedCalendarsList?.addEventListener('click', handleDeselectCalendar);
  saveSetButton?.addEventListener('click', handleSaveSet);
  loadSetButton?.addEventListener('click', handleLoadSet);

  // --- Slot Finding Listeners ---
  findSlotsButton?.addEventListener('click', findSlots);

  // --- Slot Results Listeners ---
  bookMeetingButton?.addEventListener('click', bookSelectedMeetings);
  copySlotsButton?.addEventListener('click', copySelectedSlots);
  selectAllCheckbox?.addEventListener('change', handleSelectAllChange);

  // --- Options Page Links ---
  openOptionsIcon?.addEventListener('click', () => { // Header icon
    chrome.runtime.openOptionsPage();
  });
  openOptionsLinkAlt?.addEventListener('click', (e) => { // Link under calendar section
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

// --- Calendar Search, Select, Save, Load ---

/**
 * Handles input in the calendar search box, filters, and renders results.
 */
function handleCalendarSearch() {
    if (!calendarSearchInput || !calendarSearchResults) return;
    const searchTerm = calendarSearchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        renderSearchResults([]); // Clear results if search is empty
        return;
    }

    const results = allFetchedCalendars.filter(cal =>
        (cal.summary && cal.summary.toLowerCase().includes(searchTerm)) ||
        (cal.id && cal.id.toLowerCase().includes(searchTerm))
    );

    renderSearchResults(results);
}

/**
 * Renders the results of a calendar search.
 * @param {Array} results - Array of calendar objects matching the search.
 */
function renderSearchResults(results) {
    if (!calendarSearchResults) return;
    calendarSearchResults.innerHTML = ''; // Clear previous results
    results.forEach(cal => {
        // Don't show calendars already selected
        if (selectedCalendars.some(selected => selected.id === cal.id)) {
            return;
        }

        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.dataset.calendarId = cal.id;
        div.dataset.calendarSummary = cal.summary || cal.id;
        div.textContent = `${cal.summary || cal.id}`; // Display summary or ID
        div.style.cursor = 'pointer'; // Indicate clickability
        calendarSearchResults.appendChild(div);
    });
}

/**
 * Handles clicking on a search result to add it to the selected list.
 */
function handleSelectCalendar(event) {
    const target = event.target;
    if (target && target.classList.contains('search-result-item')) {
        const calendarId = target.dataset.calendarId;
        const calendarSummary = target.dataset.calendarSummary;

        if (calendarId && !selectedCalendars.some(cal => cal.id === calendarId)) {
            selectedCalendars.push({ id: calendarId, summary: calendarSummary });
            renderSelectedCalendars();
            calendarSearchInput.value = ''; // Clear search input
            renderSearchResults([]); // Clear search results
        }
    }
}

/**
 * Handles clicking the "Remove" button next to a selected calendar.
 */
function handleDeselectCalendar(event) {
    const target = event.target;
    if (target && target.classList.contains('remove-calendar-button')) {
        const listItem = target.closest('li');
        if (listItem) {
            const calendarIdToRemove = listItem.dataset.calendarId;
            selectedCalendars = selectedCalendars.filter(cal => cal.id !== calendarIdToRemove);
            renderSelectedCalendars();
        }
    }
}

/**
 * Renders the list of currently selected calendars.
 */
function renderSelectedCalendars() {
    if (!selectedCalendarsList) return;
    selectedCalendarsList.innerHTML = ''; // Clear current list
    if (selectedCalendars.length === 0) {
        selectedCalendarsList.innerHTML = '<li><i>Primary calendar will be used.</i></li>'; // Placeholder maybe?
    } else {
        selectedCalendars.forEach(cal => {
            const li = document.createElement('li');
            li.dataset.calendarId = cal.id;

            const span = document.createElement('span');
            span.textContent = cal.summary || cal.id;
            li.appendChild(span);

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.className = 'remove-calendar-button button-small button-danger';
            removeButton.type = 'button';
            li.appendChild(removeButton);

            selectedCalendarsList.appendChild(li);
        });
    }
}

/**
 * Populates the "Load Set" dropdown menu.
 */
function populateLoadDropdown() {
    if (!loadSetDropdown) return;
    loadSetDropdown.innerHTML = '<option value="">-- Select a set --</option>'; // Clear and add default
    savedCalendarSets.forEach((set, index) => {
        const option = document.createElement('option');
        option.value = index.toString(); // Use index as value
        option.textContent = set.name;
        loadSetDropdown.appendChild(option);
    });
}

/**
 * Saves the current selection of calendars as a named set.
 */
async function handleSaveSet() {
    if (!saveSetNameInput) return;
    const setName = saveSetNameInput.value.trim();
    if (!setName) {
        showStatus('Please enter a name for the calendar set.', false);
        return;
    }
    if (selectedCalendars.length === 0) {
        showStatus('Please select at least one calendar to save.', false);
        return;
    }

    const newSet = {
        name: setName,
        calendars: structuredClone(selectedCalendars) // Deep copy
    };

    const existingIndex = savedCalendarSets.findIndex(set => set.name === setName);
    let message = '';
    if (existingIndex !== -1) {
        savedCalendarSets[existingIndex] = newSet; // Overwrite
        message = `Set "${setName}" updated.`;
    } else {
        savedCalendarSets.push(newSet); // Add new
        if (savedCalendarSets.length > 10) {
            savedCalendarSets.shift(); // Limit to 10
        }
        message = `Set "${setName}" saved.`;
    }

    try {
        await chrome.storage.local.set({ savedCalendarSets });
        saveSetNameInput.value = ''; // Clear input
        populateLoadDropdown(); // Update dropdown
        showStatus(message);
    } catch (error) {
        console.error('Failed to save calendar set:', error);
        showStatus('Error saving calendar set.', false);
    }
}

/**
 * Loads a previously saved set of calendars.
 */
function handleLoadSet() {
    if (!loadSetDropdown) return;
    const selectedIndex = loadSetDropdown.value;
    if (selectedIndex === "") {
        showStatus('Please select a set to load.', false);
        return;
    }

    const setToLoad = savedCalendarSets[parseInt(selectedIndex, 10)];
    if (setToLoad) {
        selectedCalendars = structuredClone(setToLoad.calendars); // Update state
        renderSelectedCalendars(); // Update UI
        showStatus(`Set "${setToLoad.name}" loaded.`);
    } else {
        showStatus('Could not find the selected set.', false);
    }
    loadSetDropdown.value = ""; // Reset dropdown
}


// --- Slot Finding and Booking ---

async function findSlots() {
  try {
    // Reset UI
    slotsContainer.style.display = 'none';
    slotsList.innerHTML = '';
    bulkBookingSection.style.display = 'none';
    selectAllCheckbox.checked = false;
    errorContainer.style.display = 'none';
    successContainer.style.display = 'none';
    selectedSlotIndices = [];

    // Use the selectedCalendars state from THIS script
    if (selectedCalendars.length === 0) {
      // Maybe try using primary if none selected? Or show clearer error.
      showError('Please select at least one calendar.');
      return;
    }
    const calendarIdsToQuery = selectedCalendars.map(cal => cal.id);


    const startDate = startingDateInput.value;
    const minDuration = parseInt(minDurationInput.value);
    const maxDuration = parseInt(maxDurationInput.value);
    const numSlots = parseInt(requiredSlotsInput.value);
    const spreadDays = parseInt(spreadDaysInput.value);

    if (!startDate || isNaN(minDuration) || isNaN(maxDuration) || isNaN(numSlots) || isNaN(spreadDays)) {
      showError('Please fill in all slot finding fields with valid values.');
      return;
    }
    if (maxDuration < minDuration) {
      showError('Maximum duration cannot be less than minimum duration.');
      return;
    }

    findSlotsButton.disabled = true;
    findSlotsButton.textContent = 'Loading...';

    // Get potentially updated general settings (like exclusions) from sync storage
    const syncSettingsData = await chrome.storage.sync.get([
      'availableFrom', 'availableUntil', 'exclusions', 'selectedDays'
    ]);
    // Update local settings object if needed
    settings = { ...settings, ...syncSettingsData };

    // Prepare settings for the slot finder algorithm
    const currentSlotSettings = {
      startDate,
      numDays: 14, // Keep search range constant for now
      availableFrom: settings.availableFrom,
      availableUntil: settings.availableUntil,
      exclusions: settings.exclusions,
      selectedDays: settings.selectedDays,
      minDuration,
      maxDuration,
      numSlots,
      spreadDays
    };

    // Save the used slot finding parameters to sync storage for persistence
    chrome.storage.sync.set({
      startingDate: startDate,
      minDuration,
      maxDuration,
      numSlots,
      spreadDays
    });

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + currentSlotSettings.numDays);

    // Fetch events for the currently selected calendars
    const allEvents = [];
    for (const calendarId of calendarIdsToQuery) {
      try {
          const events = await getEvents(calendarId, new Date(startDate), endDate);
          allEvents.push(...events);
      } catch (eventError) {
          const calSummary = selectedCalendars.find(c=>c.id === calendarId)?.summary || calendarId;
          console.warn(`Could not fetch events for calendar ${calSummary}:`, eventError);
          showError(`Warning: Could not get events for ${calSummary}. Results may be incomplete.`);
      }
    }

    availableSlots = await findAvailableSlots(currentSlotSettings, allEvents);
    renderSlots(availableSlots); // Render results

    findSlotsButton.disabled = false;
    findSlotsButton.textContent = 'Find Available Slots';

  } catch (error) {
    findSlotsButton.disabled = false;
    findSlotsButton.textContent = 'Find Available Slots';
    showError('Failed to find slots: ' + (error.message || 'Unknown error'));
  }
}

// Render available slots in the UI with checkboxes
function renderSlots(slots) {
  if (!slotsList) return;
  slotsList.innerHTML = '';
  selectAllCheckbox.checked = false;
  selectedSlotIndices = [];

  if (!slots || slots.length === 0) {
    slotsList.innerHTML = `<p>No available slots found. Try adjusting your settings.</p>`;
    slotsContainer.style.display = 'block';
    bulkBookingSection.style.display = 'none';
    return;
  }

  slots.forEach((slot, index) => {
    const slotItem = document.createElement('div');
    slotItem.className = 'slot-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `slot-${index}`;
    checkbox.dataset.slotIndex = index;

    const formattedSlot = formatSlot(slot, currentLanguage);
    const label = document.createElement('label');
    label.htmlFor = `slot-${index}`;
    label.textContent = formattedSlot;

    checkbox.addEventListener('change', (event) => {
      const idx = parseInt(event.target.dataset.slotIndex);
      if (event.target.checked) {
        if (!selectedSlotIndices.includes(idx)) selectedSlotIndices.push(idx);
      } else {
        selectedSlotIndices = selectedSlotIndices.filter(i => i !== idx);
      }
      updateBulkActionsVisibility();
      selectAllCheckbox.checked = selectedSlotIndices.length === availableSlots.length;
    });

    slotItem.appendChild(checkbox);
    slotItem.appendChild(label);
    slotsList.appendChild(slotItem);
  });

  slotsContainer.style.display = 'block';
  updateBulkActionsVisibility();
}

// Show/hide bulk action buttons based on selection
function updateBulkActionsVisibility() {
  const hasSelection = selectedSlotIndices.length > 0;
  bulkBookingSection.style.display = hasSelection ? 'block' : 'none';
  if (hasSelection) {
    meetingNameInput.focus();
  } else {
    meetingNameInput.value = '';
  }
}

// Handle "Select All" checkbox change
function handleSelectAllChange(event) {
  const isChecked = event.target.checked;
  selectedSlotIndices = [];
  const checkboxes = slotsList.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
    if (isChecked) {
      selectedSlotIndices.push(parseInt(checkbox.dataset.slotIndex));
    }
  });
  updateBulkActionsVisibility();
}


// Book meetings for all selected slots
async function bookSelectedMeetings() {
  try {
    if (selectedSlotIndices.length === 0) {
      showError('No slots selected.');
      return;
    }
    const baseMeetingName = meetingNameInput.value.trim();
    if (!baseMeetingName) {
      showError('Please enter a base meeting name.');
      return;
    }

    bookMeetingButton.disabled = true;
    bookMeetingButton.textContent = `Booking ${selectedSlotIndices.length}...`;

    // Find the primary calendar among the *currently selected* ones, or default to the first selected.
    const primarySelectedCalendar = selectedCalendars.find(cal => {
        const fullCal = allFetchedCalendars.find(afc => afc.id === cal.id);
        return fullCal && fullCal.primary;
    }) || selectedCalendars[0]; // Fallback to the first selected

    if (!primarySelectedCalendar) {
        showError('Cannot determine a calendar to book events into. Please select at least one calendar.');
        bookMeetingButton.disabled = false;
        bookMeetingButton.textContent = 'Book Selected Slots';
        return;
    }
    const primaryCalendarId = primarySelectedCalendar.id;

    let successfulBookings = 0;
    let failedBookings = 0;

    for (let i = 0; i < selectedSlotIndices.length; i++) {
      const slotIndex = selectedSlotIndices[i];
      const slot = availableSlots[slotIndex];
      const meetingName = `${baseMeetingName} (${i + 1}/${selectedSlotIndices.length})`;

      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = Math.abs(offsetMinutes / 60);
      const offsetMinsPart = Math.abs(offsetMinutes % 60);
      const offsetSign = offsetMinutes <= 0 ? '+' : '-';
      const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinsPart.toString().padStart(2, '0')}`;

      const eventDetails = {
        summary: meetingName,
        start: { dateTime: `${slot.date}T${minutesToTime(slot.start)}:00${offsetString}` },
        end: { dateTime: `${slot.date}T${minutesToTime(slot.end)}:00${offsetString}` }
      };

      try {
        await createEvent(primaryCalendarId, eventDetails);
        successfulBookings++;
      } catch (error) {
        console.error(`Failed to book slot ${i + 1}:`, error);
        failedBookings++;
      }
    }

    bookMeetingButton.disabled = false;
    bookMeetingButton.textContent = 'Book Selected Slots';

    let copySuccess = false;
    if (successfulBookings > 0 && selectedSlotIndices.length > 0) {
      try {
        const selectedSlots = selectedSlotIndices.map(index => availableSlots[index]);
        const slotTexts = selectedSlots.map(slot => formatSlot(slot, currentLanguage));
        const textToCopy = slotTexts.join('\n');
        await navigator.clipboard.writeText(textToCopy);
        copySuccess = true;
      } catch (copyError) {
        console.error('Failed to copy slots after booking:', copyError);
      }
    }

    if (failedBookings === 0) {
      let message = `${successfulBookings} meeting(s) booked successfully!`;
      message += copySuccess ? ` Slots copied.` : ` Failed to copy slots.`;
      showSuccess(message);
    } else {
      let message = `Booked ${successfulBookings}. Failed ${failedBookings}.`;
      message += copySuccess ? ` Booked slots copied.` : '';
      showError(message + ` Check console for errors.`);
    }

    meetingNameInput.value = '';
    updateBulkActionsVisibility();
    // Do not automatically refresh slots

  } catch (error) {
    showError('Failed to book meetings: ' + (error.message || 'Unknown error'));
    bookMeetingButton.disabled = false;
    bookMeetingButton.textContent = 'Book Selected Slots';
  }
}

// Copy selected slots to clipboard as text
function copySelectedSlots() {
  if (selectedSlotIndices.length === 0) return;

  const selectedSlots = selectedSlotIndices.map(index => availableSlots[index]);
  const slotTexts = selectedSlots.map(slot => formatSlot(slot, currentLanguage));
  const textToCopy = slotTexts.join('\n');

  navigator.clipboard.writeText(textToCopy).then(() => {
    showSuccess('Selected slots copied!');
  }).catch(error => {
    showError('Failed to copy: ' + (error.message || 'Unknown error'));
  });
}

// --- Utility Functions ---

function showStatus(message, success = true) {
  const container = success ? successContainer : errorContainer;
  const otherContainer = success ? errorContainer : successContainer;
  if (!container || !otherContainer) return;

  container.textContent = message;
  container.style.display = 'block';
  otherContainer.style.display = 'none';

  // Optional: Hide after a delay
  setTimeout(() => {
      container.style.display = 'none';
  }, 3000);
}
function showError(message) { showStatus(message, false); }
function showSuccess(message) { showStatus(message, true); }


// Helper to convert minutes to time string (HH:MM)
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initialize);
