/**
 * Options page script for Common Ground Chrome Extension
 * Handles general settings and management of saved calendar sets.
 */

// --- Existing DOM elements for general settings ---
const optionsForm = document.getElementById('options-form');
const availableFromInput = document.getElementById('available-from');
const availableUntilInput = document.getElementById('available-until');
const dayCheckboxes = document.querySelectorAll('.day-checkbox');
const exclusionsContainer = document.getElementById('exclusions-container');
const addExclusionButton = document.getElementById('add-exclusion');
const languageToggle = document.getElementById('language-toggle');
const saveButton = document.getElementById('save-button');
const statusDiv = document.getElementById('status');

// --- DOM elements for Calendar Set Management ---
const savedSetsManagementList = document.getElementById('saved-sets-management-list');
const deleteAllSetsButton = document.getElementById('delete-all-sets-button');

// --- State Variables ---
let savedCalendarSets = []; // Array of {name, calendars} objects loaded from storage for management

/**
 * Initialize the options page
 */
async function initialize() {
  // Load general settings from sync storage
  const syncSettings = await chrome.storage.sync.get([
    'availableFrom',
    'availableUntil',
    'selectedDays',
    'exclusions',
    'language'
    // No longer loading 'selectedCalendarIds' here
  ]);

  // Load saved calendar sets from local storage for management
  const localSettings = await chrome.storage.local.get(['savedCalendarSets']);
  savedCalendarSets = localSettings.savedCalendarSets || [];

  // Apply general settings to form
  applyGeneralSettings(syncSettings);

  // Populate the management list
  renderManagementList();

  // Set up event listeners
  setupListeners();
}

/**
 * Applies loaded general settings to the form fields.
 * @param {object} settingsData - Settings loaded from chrome.storage.sync.
 */
function applyGeneralSettings(settingsData = {}) {
    const availableFrom = settingsData.availableFrom || '09:00';
    const availableUntil = settingsData.availableUntil || '18:00';
    const selectedDays = settingsData.selectedDays || [false, true, true, true, true, true, false]; // Mon-Fri default
    const exclusions = settingsData.exclusions || [{ start: '12:00', end: '13:00' }]; // Default lunch
    const language = settingsData.language || 'en';

    availableFromInput.value = availableFrom;
    availableUntilInput.value = availableUntil;

    for (let i = 0; i < dayCheckboxes.length; i++) {
        dayCheckboxes[i].checked = selectedDays[i];
    }

    // Clear existing exclusions before adding loaded ones
    exclusionsContainer.innerHTML = '';
    exclusions.forEach(addExclusionItem);

    languageToggle.checked = language === 'ja';
}

/**
 * Set up event listeners for the options page.
 */
function setupListeners() {
  // Form submission for general settings
  optionsForm.addEventListener('submit', saveGeneralOptions);

  // Add exclusion button
  addExclusionButton.addEventListener('click', () => {
    addExclusionItem({ start: '12:00', end: '13:00' }); // Add a default item
  });

  // Language toggle changes (saves immediately)
  languageToggle.addEventListener('change', (event) => {
    saveLanguageSetting(event.target.checked ? 'ja' : 'en');
  });

  // --- Management Listeners ---
  savedSetsManagementList.addEventListener('click', handleDeleteSet); // Use event delegation
  deleteAllSetsButton.addEventListener('click', handleDeleteAllSets);
}


/**
 * Renders the list of saved sets for management (delete).
 */
function renderManagementList() {
    if (!savedSetsManagementList) return;
    savedSetsManagementList.innerHTML = ''; // Clear current list
    savedCalendarSets.forEach((set, index) => {
        const li = document.createElement('li');

        const span = document.createElement('span');
        span.textContent = set.name;
        li.appendChild(span);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-set-button button-small button-danger';
        deleteButton.dataset.setIndex = index.toString(); // Store index for deletion
        deleteButton.type = 'button';
        li.appendChild(deleteButton);

        savedSetsManagementList.appendChild(li);
    });

     // Disable "Delete All" if list is empty
     deleteAllSetsButton.disabled = savedCalendarSets.length === 0;
}


/**
 * Handles deleting a single saved calendar set from the management list.
 * @param {Event} event - The click event object.
 */
async function handleDeleteSet(event) {
    const target = event.target;
    if (target && target.classList.contains('delete-set-button')) {
        const setIndex = parseInt(target.dataset.setIndex, 10);
        if (!isNaN(setIndex) && setIndex >= 0 && setIndex < savedCalendarSets.length) {
            const setName = savedCalendarSets[setIndex].name;

            // Confirmation dialog
             if (!confirm(`Are you sure you want to delete the set "${setName}"?`)) {
                 return;
             }

            // Remove the set from the state array
            savedCalendarSets.splice(setIndex, 1);

            try {
                // Save the updated array back to local storage
                await chrome.storage.local.set({ savedCalendarSets });
                renderManagementList(); // Re-render the list
                showStatus(`Set "${setName}" deleted.`);
            } catch (error) {
                console.error('Failed to delete calendar set:', error);
                showStatus('Error deleting calendar set.', false);
                // If save fails, maybe reload the state from storage?
                const localSettings = await chrome.storage.local.get(['savedCalendarSets']);
                savedCalendarSets = localSettings.savedCalendarSets || [];
                renderManagementList(); // Render again with potentially reverted state
            }
        }
    }
}

/**
 * Handles deleting all saved calendar sets.
 */
async function handleDeleteAllSets() {
    if (savedCalendarSets.length === 0) {
        showStatus('No sets to delete.', false);
        return;
    }

    // Confirmation dialog
    if (confirm('Are you sure you want to delete ALL saved calendar sets? This cannot be undone.')) {
        savedCalendarSets = []; // Clear the state array
        try {
            await chrome.storage.local.remove('savedCalendarSets'); // Clear from storage
            renderManagementList(); // Re-render the empty list
            showStatus('All saved sets deleted.');
        } catch (error) {
            console.error('Failed to delete all calendar sets:', error);
            showStatus('Error deleting all sets.', false);
            // If save fails, reload state
            const localSettings = await chrome.storage.local.get(['savedCalendarSets']);
            savedCalendarSets = localSettings.savedCalendarSets || [];
            renderManagementList();
        }
    }
}


/**
 * Add an exclusion time period item to the UI
 * @param {Object} exclusion - Exclusion time period with start and end properties
 */
function addExclusionItem(exclusion) {
  const exclusionItem = document.createElement('div');
  exclusionItem.className = 'exclusion-item form-row';

  const startGroup = document.createElement('div');
  startGroup.className = 'form-group';
  const startLabel = document.createElement('label');
  startLabel.textContent = 'From:';
  const startInput = document.createElement('input');
  startInput.type = 'time';
  startInput.className = 'exclusion-start';
  startInput.value = exclusion.start;
  startInput.required = true;
  startGroup.appendChild(startLabel);
  startGroup.appendChild(startInput);

  const endGroup = document.createElement('div');
  endGroup.className = 'form-group';
  const endLabel = document.createElement('label');
  endLabel.textContent = 'To:';
  const endInput = document.createElement('input');
  endInput.type = 'time';
  endInput.className = 'exclusion-end';
  endInput.value = exclusion.end;
  endInput.required = true;
  endGroup.appendChild(endLabel);
  endGroup.appendChild(endInput);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'remove-exclusion button-small button-danger'; // Added button styles
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    exclusionsContainer.removeChild(exclusionItem);
  });

  exclusionItem.appendChild(startGroup);
  exclusionItem.appendChild(endGroup);
  exclusionItem.appendChild(removeButton);
  exclusionsContainer.appendChild(exclusionItem);
}

/**
 * Save general options (weekday, time, exclusions, language) to Chrome Sync storage.
 * @param {Event} e - Form submit event
 */
async function saveGeneralOptions(e) {
  e.preventDefault(); // Prevent form submission

  try {
    const availableFrom = availableFromInput.value;
    const availableUntil = availableUntilInput.value;

    const selectedDays = [];
    for (let i = 0; i < dayCheckboxes.length; i++) {
      selectedDays.push(dayCheckboxes[i].checked);
    }

    const exclusions = [];
    const exclusionItems = exclusionsContainer.querySelectorAll('.exclusion-item');
    exclusionItems.forEach(item => {
      const startInput = item.querySelector('.exclusion-start');
      const endInput = item.querySelector('.exclusion-end');
      if (startInput && endInput && startInput.value && endInput.value) {
        exclusions.push({
          start: startInput.value,
          end: endInput.value
        });
      }
    });

    const language = languageToggle.checked ? 'ja' : 'en';

    // Save only general settings to Sync storage
    await chrome.storage.sync.set({
      availableFrom,
      availableUntil,
      selectedDays,
      exclusions,
      language
      // No longer saving 'selectedCalendarIds' here
    });

    showStatus('Options saved.');

  } catch (error) {
    console.error('Failed to save options:', error);
    showStatus('Failed to save options: ' + (error.message || 'Unknown error'), false);
  }
}

/**
 * Save just the language setting immediately when toggled.
 * @param {string} language - Language code ('en' or 'ja')
 */
async function saveLanguageSetting(language) {
  try {
    await chrome.storage.sync.set({ language });
    // Optionally show a subtle confirmation, or none if it's instant
  } catch (error) {
    console.error('Failed to save language setting:', error);
    showStatus('Error saving language preference.', false); // Notify user on failure
  }
}

/**
 * Show status message (reusable utility).
 * @param {string} message - Status message to display.
 * @param {boolean} success - Whether the status is a success or an error.
 */
function showStatus(message, success = true) {
  if (!statusDiv) return;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  statusDiv.className = success ? 'success' : 'error';

  // Hide after 3 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initialize);
