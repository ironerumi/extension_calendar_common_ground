/**
 * Popup script for Common Ground Chrome Extension
 */

import { getCalendars, getEvents, createEvent } from './calendar-api.js';
import { findAvailableSlots, formatSlot } from './slot-finder.js';

// DOM elements
const authRequiredDiv = document.getElementById('auth-required');
const mainContentDiv = document.getElementById('main-content');
const authButton = document.getElementById('auth-button');
const calendarList = document.getElementById('calendar-list');
const calendarLoading = document.getElementById('calendar-loading');
const startingDateInput = document.getElementById('starting-date');
const minDurationInput = document.getElementById('min-duration');
const maxDurationInput = document.getElementById('max-duration'); // Added
const requiredSlotsInput = document.getElementById('required-slots');
const spreadDaysInput = document.getElementById('spread-days');
// const languageToggle = document.getElementById('language-toggle'); // Removed
const findSlotsButton = document.getElementById('find-slots-button');
const openOptionsIcon = document.getElementById('open-options-icon'); // Changed ID and variable name
const errorContainer = document.getElementById('error-container');
const successContainer = document.getElementById('success-container');
const slotsContainer = document.getElementById('slots-container');
const slotsList = document.getElementById('slots-list'); // Keep one declaration
const selectAllCheckbox = document.getElementById('select-all-slots'); // New
const bulkBookingSection = document.getElementById('bulk-booking-section'); // New
const meetingNameInput = document.getElementById('meeting-name');
const bookMeetingButton = document.getElementById('book-meeting-button'); // Reused button ID
// const cancelBookingButton = document.getElementById('cancel-booking-button'); // Removed
// const copySlotsContainer = document.getElementById('copy-slots-container'); // Removed: Button moved
const copySlotsButton = document.getElementById('copy-slots-button'); // Button still exists

// State management
let settings = {
  language: 'en', // Default language
  availableFrom: '09:00',
  availableUntil: '18:00',
  exclusions: [{ start: '12:00', end: '13:00' }],
  selectedDays: [false, true, true, true, true, true, false], // Default Mon-Fri
  minDuration: 60,
  maxDuration: 120, // Added default max duration
  numSlots: 3,
  spreadDays: 2,
  startDate: new Date().toISOString().split('T')[0],
  numDays: 14
};

let selectedCalendars = [];
let availableSlots = [];
let selectedSlotIndices = []; // New: Store indices of selected slots
let currentLanguage = 'en'; // Variable to hold the currently selected language

// Initialize the popup
async function initialize() {
  console.log("Sidepanel Initialize called"); // Basic log to see if it runs
  try {
    // Load saved settings
    const savedData = await chrome.storage.sync.get([
      'language', 'availableFrom', 'availableUntil', 'exclusions',
      'selectedDays', 'minDuration', 'maxDuration', 'numSlots', 'spreadDays', 'startingDate', // Added maxDuration
      'selectedCalendars' // Also load selected calendars
    ]);

    // Update settings with saved values
    if (savedData) {
      settings = { ...settings, ...savedData }; // Merge saved settings
      currentLanguage = savedData.language || 'en'; // Set currentLanguage from storage or default to 'en'
      // languageToggle.checked = currentLanguage === 'ja'; // Removed: Toggle no longer in sidepanel

      // Apply saved values to form fields
      startingDateInput.value = settings.startDate || new Date().toISOString().split('T')[0];
      minDurationInput.value = settings.minDuration || 60;
      maxDurationInput.value = settings.maxDuration || 120; // Apply saved maxDuration
      requiredSlotsInput.value = settings.numSlots || 3;
      spreadDaysInput.value = settings.spreadDays || 2;
      selectedCalendars = savedData.selectedCalendars || [];
    }

    // Try to get auth token without interaction
    try {
      await chrome.runtime.sendMessage({ action: 'getAuthToken', interactive: false });
      showMainContent();
      loadCalendars(); // Load calendars only if authenticated
    } catch (error) {
      showAuthRequired(); // Show auth UI if token not available
    }

    // Set up event listeners AFTER elements are potentially visible
    setupEventListeners();

  } catch (error) {
    showError('Failed to initialize: ' + (error.message || 'Unknown error'));
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

// Set up event listeners
function setupEventListeners() {
  console.log("Setup Event Listeners called"); // Basic log

  // Auth button click
  authButton?.addEventListener('click', async () => { // Added safe navigation
    try {
      await chrome.runtime.sendMessage({ action: 'getAuthToken', interactive: true });
      showMainContent();
      loadCalendars();
    } catch (error) {
      showError('Authentication failed: ' + (error.message || 'Unknown error'));
    }
  });

  // Find slots button click
  findSlotsButton?.addEventListener('click', findSlots); // Added safe navigation

  // Book selected meetings button click (will also trigger copy)
  bookMeetingButton?.addEventListener('click', bookSelectedMeetings); // Renamed function

  // Copy selected slots button click (can still be used independently)
  copySlotsButton?.addEventListener('click', copySelectedSlots); // Keep independent copy functionality

  // Select All checkbox click
  selectAllCheckbox?.addEventListener('change', handleSelectAllChange); // New listener

  // Language toggle listener removed as the element is gone from sidepanel

  // Open options page using the new icon
  openOptionsIcon?.addEventListener('click', () => { // Use the new variable name
    chrome.runtime.openOptionsPage();
  });
}


// Load user calendars
async function loadCalendars() {
  try {
    calendarLoading.style.display = 'block';
    calendarList.innerHTML = ''; // Clear previous list

    const calendars = await getCalendars();
    calendarLoading.style.display = 'none';

    if (!calendars || calendars.length === 0) {
      calendarList.innerHTML = '<p>No calendars found.</p>';
      return;
    }

    // Use the selectedCalendars array loaded during initialize
    calendars.forEach(calendar => {
      const isChecked = selectedCalendars.includes(calendar.id) || calendar.primary === true;
       // If primary and not explicitly unchecked before, add it
      if (calendar.primary === true && !selectedCalendars.some(id => id === calendar.id)) {
         if (!selectedCalendars.includes(calendar.id)) selectedCalendars.push(calendar.id);
      }


      const calendarItem = document.createElement('div');
      calendarItem.className = 'calendar-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `calendar-${calendar.id}`;
      checkbox.dataset.calendarId = calendar.id;
      checkbox.checked = isChecked;

      const label = document.createElement('label');
      label.htmlFor = `calendar-${calendar.id}`;
      label.textContent = calendar.summary;

      checkbox.addEventListener('change', (event) => {
        const calId = event.target.dataset.calendarId;
        if (event.target.checked) {
          if (!selectedCalendars.includes(calId)) {
            selectedCalendars.push(calId);
          }
        } else {
          selectedCalendars = selectedCalendars.filter(id => id !== calId);
        }
        // Save updated selected calendars
        chrome.storage.sync.set({ selectedCalendars });
        console.log("Selected Calendars:", selectedCalendars)
      });

      calendarItem.appendChild(checkbox);
      calendarItem.appendChild(label);
      calendarList.appendChild(calendarItem);
    });

     // Save the potentially updated selectedCalendars (if primary was added)
     chrome.storage.sync.set({ selectedCalendars });
     console.log("Initial Selected Calendars:", selectedCalendars);


  } catch (error) {
    calendarLoading.style.display = 'none';
    showError('Failed to load calendars: ' + (error.message || 'Unknown error'));
  }
}


// Find available slots
async function findSlots() {
  try {
    // Reset UI elements related to slots and booking
    slotsContainer.style.display = 'none';
    slotsList.innerHTML = '';
    bulkBookingSection.style.display = 'none'; // This correctly hides the section containing both buttons now
    // copySlotsContainer.style.display = 'none'; // Removed reference to non-existent container
    selectAllCheckbox.checked = false;
    errorContainer.style.display = 'none';
    successContainer.style.display = 'none';
    selectedSlotIndices = []; // Clear selection

    if (selectedCalendars.length === 0) {
      showError('Please select at least one calendar.');
      return;
    }

    const startDate = startingDateInput.value;
    const minDuration = parseInt(minDurationInput.value);
    const maxDuration = parseInt(maxDurationInput.value); // Read maxDuration
    const numSlots = parseInt(requiredSlotsInput.value);
    const spreadDays = parseInt(spreadDaysInput.value);

    if (!startDate || isNaN(minDuration) || isNaN(maxDuration) || isNaN(numSlots) || isNaN(spreadDays)) { // Check maxDuration
      showError('Please fill in all fields with valid values.');
      return;
    }
    if (maxDuration < minDuration) {
      showError('Maximum duration cannot be less than minimum duration.');
      return;
    }

    findSlotsButton.disabled = true;
    findSlotsButton.textContent = 'Loading...'; // Simple loading text

    // Get options page settings for exclusions etc.
    const savedSettings = await chrome.storage.sync.get([
      'availableFrom', 'availableUntil', 'exclusions', 'selectedDays'
    ]);

    const currentSettings = {
      startDate,
      numDays: 14,
      availableFrom: savedSettings.availableFrom || settings.availableFrom,
      availableUntil: savedSettings.availableUntil || settings.availableUntil,
      exclusions: savedSettings.exclusions || settings.exclusions,
      selectedDays: savedSettings.selectedDays || settings.selectedDays,
      minDuration,
      maxDuration, // Pass maxDuration
      numSlots,
      spreadDays
    };

    // Save form settings
    chrome.storage.sync.set({
      startingDate: startDate,
      minDuration,
      maxDuration, // Save maxDuration
      numSlots,
      spreadDays
    });

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14);

    const allEvents = [];
    for (const calendarId of selectedCalendars) {
      const events = await getEvents(calendarId, new Date(startDate), endDate);
      allEvents.push(...events);
    }

    availableSlots = await findAvailableSlots(currentSettings, allEvents); // Update global availableSlots

    renderSlots(availableSlots); // Render the found slots

    findSlotsButton.disabled = false;
    findSlotsButton.textContent = 'Find Available Slots'; // Restore button text

  } catch (error) {
    findSlotsButton.disabled = false;
    findSlotsButton.textContent = 'Find Available Slots'; // Restore button text on error
    showError('Failed to find slots: ' + (error.message || 'Unknown error'));
  }
}

// Render available slots in the UI with checkboxes
function renderSlots(slots) {
  slotsList.innerHTML = ''; // Clear previous slots
  selectAllCheckbox.checked = false; // Reset select all
  selectedSlotIndices = []; // Clear selection on re-render

  if (!slots || slots.length === 0) {
    slotsList.innerHTML = `<p>No available slots found. Try adjusting your settings.</p>`;
    slotsContainer.style.display = 'block';
    bulkBookingSection.style.display = 'none'; // Hide booking if no slots
    copySlotsContainer.style.display = 'none'; // Hide copy if no slots
    return;
  }

  slots.forEach((slot, index) => {
    const slotItem = document.createElement('div');
    slotItem.className = 'slot-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `slot-${index}`;
    checkbox.dataset.slotIndex = index; // Store index

    const formattedSlot = formatSlot(slot, currentLanguage);
    const label = document.createElement('label');
    label.htmlFor = `slot-${index}`;
    label.textContent = formattedSlot;

    checkbox.addEventListener('change', (event) => {
      const idx = parseInt(event.target.dataset.slotIndex);
      if (event.target.checked) {
        if (!selectedSlotIndices.includes(idx)) {
          selectedSlotIndices.push(idx);
        }
      } else {
        selectedSlotIndices = selectedSlotIndices.filter(i => i !== idx);
      }
      updateBulkActionsVisibility(); // Show/hide buttons based on selection
      // Update select all checkbox state if needed
      selectAllCheckbox.checked = selectedSlotIndices.length === availableSlots.length;
    });

    slotItem.appendChild(checkbox);
    slotItem.appendChild(label);
    slotsList.appendChild(slotItem);
  });

  slotsContainer.style.display = 'block';
  updateBulkActionsVisibility(); // Initial check
}

// Show/hide bulk action buttons based on selection
function updateBulkActionsVisibility() {
  const hasSelection = selectedSlotIndices.length > 0;
  bulkBookingSection.style.display = hasSelection ? 'block' : 'none';
  // copySlotsContainer is gone, buttons are inside bulkBookingSection

  if (hasSelection) {
    meetingNameInput.focus(); // Focus on meeting name input when selection is made
  } else {
    meetingNameInput.value = ''; // Clear meeting name if selection is cleared
  }
}

// Handle "Select All" checkbox change
function handleSelectAllChange(event) {
  const isChecked = event.target.checked;
  selectedSlotIndices = []; // Clear current selection

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

    const primaryCalendarId = selectedCalendars.find(id => id.includes('@')) || selectedCalendars[0]; // Prefer user's primary
    let successfulBookings = 0;
    let failedBookings = 0;

    for (let i = 0; i < selectedSlotIndices.length; i++) {
      const slotIndex = selectedSlotIndices[i];
      const slot = availableSlots[slotIndex];
      const meetingName = `${baseMeetingName} (${i + 1}/${selectedSlotIndices.length})`; // Adjusted numbering

      // Calculate local timezone offset string (e.g., "+09:00" or "-05:00")
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = Math.abs(offsetMinutes / 60);
      const offsetMinsPart = Math.abs(offsetMinutes % 60);
      // getTimezoneOffset is negative for zones east of UTC (like JST)
      const offsetSign = offsetMinutes <= 0 ? '+' : '-';
      const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinsPart.toString().padStart(2, '0')}`;

      const eventDetails = {
        summary: meetingName,
        // Construct RFC3339 compliant dateTime string with timezone offset
        start: { dateTime: `${slot.date}T${minutesToTime(slot.start)}:00${offsetString}` },
        end: { dateTime: `${slot.date}T${minutesToTime(slot.end)}:00${offsetString}` }
      };

      try {
        await createEvent(primaryCalendarId, eventDetails);
        successfulBookings++;
      } catch (error) {
        console.error(`Failed to book slot ${i + 1}:`, error);
        failedBookings++;
        // Optionally show partial errors, but might be noisy
      }
    }

    bookMeetingButton.disabled = false; // Re-enable button
    bookMeetingButton.textContent = 'Book Selected Slots';

    // === Automatic Copying After Booking ===
    let copySuccess = false;
    if (successfulBookings > 0 && selectedSlotIndices.length > 0) { // Only copy if booking happened and selection still relevant
      try {
        const selectedSlots = selectedSlotIndices.map(index => availableSlots[index]);
        const slotTexts = selectedSlots.map(slot => formatSlot(slot, currentLanguage));
        const textToCopy = slotTexts.join('\n');
        await navigator.clipboard.writeText(textToCopy);
        copySuccess = true;
      } catch (copyError) {
        console.error('Failed to copy slots after booking:', copyError);
        // Don't overwrite booking success/error message with copy error
      }
    }
    // === End Automatic Copying ===

    // Update success/error message based on booking and copy results
    if (failedBookings === 0) {
      let message = `${successfulBookings} meeting(s) booked successfully!`;
      if (copySuccess) {
        message += ` Slots copied to clipboard.`;
      } else if (successfulBookings > 0) {
         message += ` Failed to copy slots.`;
      }
      showSuccess(message);
    } else {
      let message = `Booked ${successfulBookings} meeting(s). Failed to book ${failedBookings}.`;
       if (copySuccess) {
         message += ` Successfully booked slots copied.`;
       }
      showError(message + ` Check console for booking error details.`);
    }


    // Clear meeting name input, keep selection visible
    meetingNameInput.value = '';
    // Keep bulkBookingSection visible because the copy button is still useful
    updateBulkActionsVisibility(); // Refresh button states if needed (e.g., if selection changed implicitly)
    // findSlots(); // DO NOT Refresh slots automatically

    // Manually update UI elements
    selectAllCheckbox.checked = selectedSlotIndices.length === availableSlots.length;


  } catch (error) {
    // Catch errors outside the loop (e.g., initial checks)
    showError('Failed to book meetings: ' + (error.message || 'Unknown error'));
    bookMeetingButton.disabled = false;
    bookMeetingButton.textContent = 'Book Selected Slots'; // Restore button text
  }
}

// Copy selected slots to clipboard as text
function copySelectedSlots() {
  if (selectedSlotIndices.length === 0) {
    return;
  }

  const selectedSlots = selectedSlotIndices.map(index => availableSlots[index]);
  const slotTexts = selectedSlots.map(slot => formatSlot(slot, currentLanguage));
  const textToCopy = slotTexts.join('\n');

  navigator.clipboard.writeText(textToCopy).then(() => {
    showSuccess('Selected slots copied to clipboard!');
  }).catch(error => {
    showError('Failed to copy selected slots: ' + (error.message || 'Unknown error'));
  });
}

// Helper to show error message (Simple version)
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
  successContainer.style.display = 'none';
}

// Helper to show success message (Simple version)
function showSuccess(message) {
  successContainer.textContent = message;
  successContainer.style.display = 'block';
  errorContainer.style.display = 'none';
}

// Helper to convert minutes to time string (HH:MM) - Copied from slot-finder.js for potential use here
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}


// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired.");
    initialize();
});
