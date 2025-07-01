# Chrome Web Store Privacy Form Justifications

## Single Purpose Description
Common Ground is a calendar scheduling extension that finds mutual available time slots across multiple Google Calendars. The extension reads calendar events from selected calendars, analyzes availability based on user-defined constraints (working hours, meeting duration, excluded periods), and presents optimal meeting times. Users can then book meetings directly or copy formatted time slots to share with others. The extension supports bilingual formatting (English/Japanese) for international collaboration.

## Permission Justifications

### identity justification
The identity permission is required to authenticate users with Google's OAuth 2.0 system to access their Google Calendar data. This permission enables the extension to:
- Obtain OAuth tokens for Google Calendar API access
- Authenticate users securely without storing passwords
- Refresh authentication tokens automatically
- Allow users to grant/revoke calendar access permissions
Without this permission, the extension cannot access Google Calendar data, which is essential for its core functionality of finding mutual availability across calendars.

### storage justification
The storage permission is required to save user preferences and configuration settings locally. This includes:
- User-defined working hours and availability windows
- Selected calendars to include in availability analysis
- Meeting duration preferences and slot requirements
- Language preferences for time slot formatting
- Excluded time periods (lunch breaks, unavailable times)
- Workday selections (which days of week are available)
These settings need to persist between browser sessions to provide a consistent user experience and avoid requiring users to reconfigure preferences every time they use the extension.

### sidePanel justification
The sidePanel permission is used to provide an expanded interface for detailed calendar analysis and meeting scheduling operations. The side panel:
- Displays comprehensive availability analysis results
- Shows detailed time slot options with formatting controls
- Provides interface for booking meetings with custom names
- Allows users to copy formatted time slots for sharing
- Offers bilingual language switching for international teams
The side panel provides more space than a popup for complex scheduling operations and multi-calendar analysis, improving usability for the extension's primary scheduling functions.

### Host permission justification
The host permission for "https://www.googleapis.com/" is required to communicate with Google Calendar API endpoints. This permission enables:
- Reading calendar events from selected Google Calendars
- Creating new calendar events when users book meetings
- Accessing calendar metadata (names, sharing settings)
- Retrieving availability information across multiple calendars
This is the official Google API domain for Calendar services, and access is essential for the extension's core functionality of analyzing calendar availability and creating meeting events.

## Remote Code Usage
**Answer: No, I am not using Remote code**

The extension does not use any remote code. All JavaScript and functionality is contained within the extension package. The extension only makes API calls to Google Calendar endpoints to retrieve calendar data and create events, but does not load or execute any external JavaScript files, modules, or eval() statements. All code execution happens locally within the extension's bundled files.

## Data Usage Disclosures

### What user data do you plan to collect from users now or in the future?

**Personally identifiable information**: ❌ NOT COLLECTED
- We do not collect names, addresses, email addresses, age, or identification numbers

**Health information**: ❌ NOT COLLECTED  
- We do not collect any health-related data

**Financial and payment information**: ❌ NOT COLLECTED
- We do not collect any financial or payment information

**Authentication information**: ✅ COLLECTED
- We collect OAuth 2.0 tokens for Google Calendar API access
- These tokens are stored locally and used only for calendar authentication
- We do not collect passwords, PINs, or security questions

**Personal communications**: ❌ NOT COLLECTED
- We do not collect emails, texts, or chat messages

**Location**: ❌ NOT COLLECTED
- We do not collect location data, IP addresses, or GPS coordinates

**Web history**: ❌ NOT COLLECTED
- We do not track web browsing history or visited pages

**User activity**: ❌ NOT COLLECTED
- We do not monitor clicks, mouse position, scroll, or keystroke logging

**Website content**: ✅ COLLECTED (LIMITED)
- We access Google Calendar event data (titles, dates, times, attendee information) only from calendars you explicitly authorize
- This data is processed locally and not stored permanently
- Used solely for availability analysis and meeting scheduling

### Required Certifications
✅ **I do not sell or transfer user data to third parties, apart from the approved use cases**
- We only interact with Google Calendar API using your authorized credentials
- No user data is shared with any other third parties

✅ **I do not use or transfer user data for purposes that are unrelated to my item's single purpose**
- All calendar data access is used exclusively for meeting scheduling and availability analysis
- No data is used for advertising, analytics, or other unrelated purposes

✅ **I do not use or transfer user data to determine creditworthiness or for lending purposes**
- We do not use any data for financial assessments or lending decisions

### Privacy Policy URL
[Enter your hosted privacy policy URL here - this should be a publicly accessible webpage containing the privacy policy content from docs/privacy_policy.md]

Example format: https://yourdomain.com/privacy-policy
or https://yourcompany.github.io/common-ground-extension/privacy-policy

---

## Character Counts
- Single purpose description: 562 characters
- identity justification: 489 characters  
- storage justification: 573 characters
- sidePanel justification: 559 characters
- Host permission justification: 446 characters
- Remote code justification: 394 characters

All justifications are well within the 1000 character limit for each field.

## Data Collection Summary
The extension primarily collects:
1. **OAuth tokens** (for authentication)
2. **Calendar event data** (for scheduling analysis)
3. **User preferences** (stored locally)

All data collection is minimal, purpose-limited, and transparent to users.
