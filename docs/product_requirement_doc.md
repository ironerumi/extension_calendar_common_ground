# Product Requirements Document (PRD)

## 1. Overview
This Chrome extension is designed to help users schedule meetings efficiently by:
• Reading calendar information from the user’s calendar as well as calendars from a set of chosen people.  
• Finding mutual available slots based on user-defined time ranges, exceptions, and constraints (such as minimum duration and number of slots needed spread over a given number of days).  
• Allowing the user to book a meeting with a specified name.  
• Displaying the available time slots using a text-based template in English and Japanese with a language switch option.

## 2. Key Features
### 2.1 Calendar Data Integration
- **Authentication & Authorization**:  
  • Integrate with Google Calendar API using OAuth 2.0 to read and write events.
- **Multiple Calendars Support**:  
  • Allow the user to have one or more calendars loaded (including those of other people) – subject to permission and sharing settings.
  
### 2.2 User Input & Scheduling Settings
- **Slot Configuration**:  
  • Minimum meeting duration (in minutes, default 60 minutes).  
  • Number of meeting slots required.  (default 3)
  • Starting date: from which date should the slots be arranged. (default today)
  • Distribution requirement: slots should be spread over a specified number of days. (default 2 days)
- **General Available Time Range**:  
  • User-defined overall available time range (default 09:00 to 18:00).  
  • Option to exclude periods within that range (default 12:00 to 13:00 lunch break).
- **Day Selection**:  
  • User selects which days of the week (default Monday to Friday) are available for scheduling.

### 2.3 Time Slot Finding and Booking
- **Mutual Availability Computation**:
  • Retrieve events (including default, focus time, and out-of-office types) for all selected calendars.
  • Treat calendar events and user-defined exclusions as "busy blocks". Snap the start time of these blocks down to the nearest :00 or :30, and the end time up to the nearest :00 or :30, creating buffer zones.
  • Compute available time gaps by subtracting these snapped busy blocks from the full 24-hour day *before* intersecting with the user's desired availability window (start/end time).
- **Slot Distribution & Selection**:
  • Filter the resulting available blocks by the specified `minDuration`.
  • If enough valid blocks exist, attempt to select the `numRequired` slots, prioritizing earlier dates and times.
  • The selection logic iterates through available dates chronologically, aiming to pick slots evenly across the requested `spreadDays`, but prioritizes fulfilling `numRequired` total slots.
  • If the spread cannot be met (e.g., not enough unique available days), it falls back to returning the first `numRequired` valid slots found.
  • Ensure the *start time* of the finally selected slots is adjusted *up* to the nearest :00 or :30 boundary.
- **Meeting Booking**:
  • Once the user selects a presented slot, create a new event (with the user-specified meeting name) in the primary calendar.

### 2.4 Slot Display and Internationalization
- **Text Template Output & Copying**:
  • Format available slots for display and copying using the template: `mm/dd(Weekday) HH:MM ~ HH:MM`.
  • The weekday abbreviation (e.g., 'Mon' vs '月') depends on the selected language.
  • Provide a button to copy the list of *all found available slots* (formatted according to the selected language) to the clipboard.
- **Language Switching (for Copied Text)**:
  • Provide a UI toggle to switch the language context between English and Japanese.
  • This toggle *only* affects the language used for weekday formatting when slots are *copied to the clipboard*. It does *not* change the language of the extension's UI itself.
  
## 3. Non-functional Requirements
- **Performance**:  
  • Should complete calendar fetches and slot calculations within a reasonable time (preferably a few seconds).
- **Security**:  
  • Ensure safe storage and use of OAuth tokens.  
  • Follow Chrome Extension best practices regarding permission management and background/foreground script separation.
- **Usability**:  
  • User interfaces (popup, options page) should be intuitive and avoid clutter.
- **Scalability**:  
  • The slot finding algorithm should work on typical calendars (with moderate event density).
- **Error Handling**:  
  • Notify the user if API calls fail (e.g., network issues, token expiry).

## 4. User Interface Requirements
- **Popup Page**:  
  • Quick overview and simple controls to start scheduling.
- **Options Page**:  
  • Advanced settings configuration: select calendars/people, specify available time ranges and exclusions, set minimum slot duration and number of required slots, and select working days.
- **Results Page/Display Area**:  
  • Display available time slots in the chosen language format.
  • Provide buttons for actions (e.g., “Book Meeting”, “Recalculate Slots”, "Cancel Booked Slot").
- **Language Toggle**:
  • A simple control (toggle switch) to select the language format (English/Japanese) used *only* for the text copied by the "Copy Slots" button.
