# Common Ground - Calendar Scheduling Chrome Extension

Common Ground is a Chrome extension that helps you schedule meetings efficiently by finding mutual available time slots across multiple calendars. It integrates with Google Calendar to read calendar data, analyzes availability, and suggests optimal meeting times based on your preferences.

## Key Features

### 🗓️ Smart Calendar Integration
- **Google Calendar API Integration**: Secure OAuth 2.0 authentication to access your calendars
- **Multiple Calendar Support**: Include calendars from colleagues and team members (with proper permissions)
- **Comprehensive Event Analysis**: Considers all event types including focus time and out-of-office blocks

### ⚙️ Flexible Scheduling Configuration
- **Customizable Meeting Duration**: Set minimum meeting length (default: 60 minutes)
- **Smart Slot Distribution**: Spread meetings across multiple days (default: 2 days)
- **Availability Windows**: Define your working hours (default: 9:00 AM - 6:00 PM)
- **Lunch Break Exclusions**: Automatically exclude lunch periods (default: 12:00 PM - 1:00 PM)
- **Workday Selection**: Choose specific days of the week (default: Monday-Friday)

### 🎯 Intelligent Time Slot Finding
- **Mutual Availability Detection**: Finds time slots that work for all selected calendars
- **Chronological Prioritization**: Prioritizes earlier time slots within the same day for better scheduling efficiency
- **Multi-Day Event Support**: Properly handles all-day and multi-day events (including "out of office" periods)
- **Smart Time Alignment**: Aligns meeting times to :00 or :30 minute boundaries
- **Flexible Day Distribution**: Balances chronological preference with optional day spreading requirements
- **30-Minute Time Snapping**: Automatically snaps event boundaries to 30-minute intervals for cleaner scheduling

### 🌐 Multi-Language Support
- **Bilingual Output**: Switch between English and Japanese formatting
- **Easy Copy-to-Clipboard**: One-click copying of formatted available slots
- **Localized Date/Time Display**: Proper weekday abbreviations for each language

### 📅 Meeting Management
- **One-Click Booking**: Create calendar events directly from available slots
- **Custom Meeting Names**: Specify meeting titles when booking
- **Primary Calendar Integration**: Automatically books to your main calendar

## Installation & Setup

### For Development
1. Clone this repository:
   ```bash
   git clone [repository-url]
   cd extension_calendar_common_ground
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select this directory

3. Grant Calendar Permissions:
   - Click the extension icon in the Chrome toolbar
   - Follow the OAuth flow to grant Google Calendar access
   - Configure your preferences in the options page

### For Distribution
Build the extension package:
```bash
chmod +x build.sh
./build.sh
```

Or manually create the zip:
```bash
zip dist/extension.zip manifest.json background.js calendar-api.js common.css common-ground-minimal.png common-ground.png options.html options.js sidepanel.html sidepanel.js slot-finder.js -r _locales
```

## How to Use

1. **Initial Setup**:
   - Install the extension and complete Google Calendar authentication
   - Open the options page to configure your preferences
   - Select calendars to include in availability checking

2. **Find Available Slots**:
   - Click the extension icon to open the popup
   - Set your meeting requirements (duration, number of slots, date range)
   - Click "Find Slots" to analyze calendar availability

3. **Review and Book**:
   - Review the suggested time slots in your preferred language format
   - Copy formatted slots to share with others, or
   - Click "Book Meeting" to create a calendar event

## Configuration Options

Access the options page by right-clicking the extension icon and selecting "Options":

- **Calendar Selection**: Choose which calendars to include in availability analysis
- **Working Hours**: Set your general availability window
- **Exclusion Periods**: Define times to always exclude (like lunch breaks)
- **Meeting Preferences**: Configure default duration and slot requirements
- **Language Settings**: Choose output format for copied text

## Privacy & Security

- **Secure Authentication**: Uses Google's OAuth 2.0 for secure calendar access
- **Local Processing**: Calendar analysis happens locally in your browser
- **Minimal Permissions**: Only requests necessary Google Calendar permissions
- **No Data Storage**: Does not store your calendar data permanently

## Technical Requirements

- **Chrome Browser**: Version 88 or later
- **Google Account**: With Google Calendar access
- **Internet Connection**: Required for calendar API calls and initial authentication

## Support & Feedback

For issues, feature requests, or questions:
- Check the [documentation](docs/) for detailed technical information
- Review the [implementation guide](docs/implementation_doc.md) for advanced usage
- Refer to [test documentation](docs/test_doc.md) for troubleshooting

---

*Common Ground helps you find the perfect meeting time, every time.*
