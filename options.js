/**
 * Options page script for Common Ground Chrome Extension
 */

// DOM elements
const optionsForm = document.getElementById('options-form');
const availableFromInput = document.getElementById('available-from');
const availableUntilInput = document.getElementById('available-until');
const dayCheckboxes = document.querySelectorAll('.day-checkbox');
const exclusionsContainer = document.getElementById('exclusions-container');
const addExclusionButton = document.getElementById('add-exclusion');
const languageToggle = document.getElementById('language-toggle');
const saveButton = document.getElementById('save-button');
const statusDiv = document.getElementById('status');

/**
 * Initialize the options page
 */
async function initialize() {
  // Load saved settings
  const settings = await chrome.storage.sync.get([
    'availableFrom',
    'availableUntil',
    'selectedDays',
    'exclusions',
    'language'
  ]);
  
  // Set default values if not already saved
  const availableFrom = settings.availableFrom || '09:00';
  const availableUntil = settings.availableUntil || '18:00';
  const selectedDays = settings.selectedDays || [false, true, true, true, true, true, false]; // Mon-Fri
  const exclusions = settings.exclusions || [{ start: '12:00', end: '13:00' }]; // Default lunch
  const language = settings.language || 'en';
  
  // Apply settings to form
  availableFromInput.value = availableFrom;
  availableUntilInput.value = availableUntil;
  
  // Apply selected days
  for (let i = 0; i < dayCheckboxes.length; i++) {
    dayCheckboxes[i].checked = selectedDays[i];
  }
  
  // Create exclusion items
  exclusions.forEach(addExclusionItem);
  
  // Set language toggle
  languageToggle.checked = language === 'ja';
  
  // Set up event listeners
  setupListeners();
}

/**
 * Set up event listeners
 */
function setupListeners() {
  // Form submission
  optionsForm.addEventListener('submit', saveOptions);
  
  // Add exclusion button
  addExclusionButton.addEventListener('click', () => {
    addExclusionItem({ start: '12:00', end: '13:00' });
  });
  
  // Language toggle
  languageToggle.addEventListener('change', (event) => {
    saveLanguageSetting(event.target.checked ? 'ja' : 'en');
  });
}

/**
 * Add an exclusion time period item to the UI
 * @param {Object} exclusion - Exclusion time period with start and end properties
 */
function addExclusionItem(exclusion) {
  const exclusionItem = document.createElement('div');
  exclusionItem.className = 'exclusion-item form-row';
  
  // Start time input
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
  
  // End time input
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
  
  // Remove button
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'remove-exclusion';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    exclusionsContainer.removeChild(exclusionItem);
  });
  
  // Add all elements to the exclusion item
  exclusionItem.appendChild(startGroup);
  exclusionItem.appendChild(endGroup);
  exclusionItem.appendChild(removeButton);
  
  // Add the exclusion item to the container
  exclusionsContainer.appendChild(exclusionItem);
}

/**
 * Save options to Chrome storage
 * @param {Event} e - Form submit event
 */
async function saveOptions(e) {
  e.preventDefault();
  
  try {
    // Get available time range
    const availableFrom = availableFromInput.value;
    const availableUntil = availableUntilInput.value;
    
    // Get selected days
    const selectedDays = [];
    for (let i = 0; i < dayCheckboxes.length; i++) {
      selectedDays.push(dayCheckboxes[i].checked);
    }
    
    // Get exclusions
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
    
    // Get language setting
    const language = languageToggle.checked ? 'ja' : 'en';
    
    // Save to Chrome storage
    await chrome.storage.sync.set({
      availableFrom,
      availableUntil,
      selectedDays,
      exclusions,
      language
    });
    
    // Show success message
    showStatus('Options saved.');
    
  } catch (error) {
    console.error('Failed to save options:', error);
    showStatus('Failed to save options: ' + error.message, false);
  }
}

/**
 * Save just the language setting
 * @param {string} language - Language code ('en' or 'ja')
 */
async function saveLanguageSetting(language) {
  try {
    await chrome.storage.sync.set({ language });
  } catch (error) {
    console.error('Failed to save language setting:', error);
  }
}

/**
 * Show status message
 * @param {string} message - Status message to display
 * @param {boolean} success - Whether the status is a success or an error
 */
function showStatus(message, success = true) {
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  statusDiv.className = success ? 'success' : 'error';
  
  // Hide the status message after 3 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initialize);