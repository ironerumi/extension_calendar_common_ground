# Test Document

## 1. Overview
This document outlines the testing strategy for the Chrome extension. Testing includes unit tests for functions, integration tests for API interactions, and manual testing for the user interface and user flows. The tests ensure that all functionalities (calendar integration, slot calculation, booking, and internationalization) work as expected.

## 2. Testing Strategy

### 2.1 Unit Testing
- **Slot Finder Functions**:
  - Create test cases to ensure that:
    • Given a set of available blocks and busy time blocks, the algorithm correctly subtracts busy periods.
    • Available slots meet the “minimum duration” requirement.
    • The algorithm properly distributes available slots across multiple days.
- **Date and Time Calculations**:
  - Test edge cases, e.g., when events span midnight or when exclusion periods overlap with busy periods.
- **Localization Utility**:
  - Verify that slot templates correctly render given placeholder values.
  
*Tools*:  
- Use a JavaScript testing framework like Jest or Mocha for unit tests.

### 2.2 Integration Testing
- **API Interaction**:
  - Test authentication flow: Verify that Chrome Identity API correctly obtains an OAuth token.
  - Test Calendar API helper functions:  
    • Use a mock calendar with known events.  
    • Verify that the functions fetch and process data as expected.
- **End-to-End Flow**:  
  - Simulate the complete flow from fetching calendars, calculating slots, displaying them, and booking an event.
  - Ensure that once an event is booked, it appears in the calendar (can use a test calendar for this).

### 2.3 Manual Testing (User Interface & User Flows)
- **Installation**:
  - Confirm that the extension installs without errors in Chrome.
- **Authentication**:
  - Verify that on first use, the extension prompts for calendar access.
- **Options Page Testing**:
  - Check that all fields (available time, exclusions, days, minimum duration, number of slots) accept valid input.
  - Save settings and verify persistence across sessions using chrome.storage.
- **Slot Calculation Testing**:
  - Input a variety of test cases:
    • Different time ranges (with and without exclusions).
    • Varying event density in calendars.
    • Different values for minimum duration and required slots.
  - Confirm that the extension displays the correct number of available slots.
- **Localization Testing**:
  - Switch language settings between English and Japanese.
  - Verify that the displayed templates change accordingly (check for correct weekday names in Japanese).
- **Event Booking Testing**:
  - Simulate booking an event:
    • Validate that the event name is correctly applied in the calendar.
    • Check that the scheduled time slot is reserved and no conflicts occur.
- **Error Handling**:
  - Simulate network failures or API errors and ensure that the extension displays appropriate error messages.

### 2.4 Acceptance Criteria
- Users can authenticate with their calendars and load a list of events.
- Given the input constraints, the algorithm finds available slots that do not conflict with events.
- The extension successfully books an event in the calendar with the provided meeting name.
- The output slots are rendered using the correct formatting based on the selected language.
- All user settings persist and can be modified via the options page.
- The extension performs within acceptable time limits (slot calculation and API responses are reasonable).

## 3. Test Cases Examples

### Test Case 1: Fetching Calendar Events
- **Preconditions**: User is authenticated.
- **Action**: Call the function to fetch events for a specific day.
- **Expected Result**:  
  • Returns an array of events with valid start and end time formats.

### Test Case 2: Calculating Available Slots
- **Input**:  
  • General availability: 09:00–18:00  
  • Exclusion: 12:00–13:00  
  • Event: 10:00–11:00 in one calendar  
  • Minimum slot duration: 60 minutes
- **Action**: Run slot finder function.
- **Expected Output**:  
  • Available block from 09:00 to 10:00 (60 minutes) and from 11:00 to 12:00 (60 minutes), plus afternoon block from 13:00 to 18:00 where further available slots can be calculated.

### Test Case 3: Localization Output
- **Input**:  
  • Date: 03/15  
  • Start time: 09:00, End time: 10:00, Weekday: (for Japanese, “水” for Wednesday).
- **Action**: Render the slot using the localization module.
- **Expected Output**:  
  - English: “03/15(Mon) 09:00 ~ 10:00”  
  - Japanese: “03/15(水) 09:00 ~ 10:00”

### Test Case 4: Booking an Event
- **Preconditions**: An available slot has been identified.
- **Action**: User clicks “Book Meeting” with a meeting name provided.
- **Expected Result**:  
  • Event is created in the calendar.
  • Confirmation is shown to the user.
  • The booked slot is no longer available in subsequent calculations.

## 4. Running Tests
- To run unit tests, include a test runner (e.g., Jest) and run “npm test” (if Node.js and npm are used).
- For manual testing, use the “Load Unpacked” extension feature in Chrome’s developer mode, and follow the manual test cases listed above.