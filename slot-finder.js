/**
 * Slot finder module
 * Provides functions to calculate available time slots
 */

/**
 * Convert a time string to minutes since midnight
 * @param {string} timeStr - Time string in format "HH:MM"
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time in format "HH:MM"
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Create a time block object
 * @param {string|Date} date - The date for the time block
 * @param {string|number} startTime - Start time (either as "HH:MM" or minutes since midnight)
 * @param {string|number} endTime - End time (either as "HH:MM" or minutes since midnight)
 * @returns {Object} Time block object
 */
function createTimeBlock(date, startTime, endTime) {
  const dateStr = date instanceof Date ? 
    date.toISOString().split('T')[0] : 
    date;
    
  const startMinutes = typeof startTime === 'string' ? 
    timeToMinutes(startTime) : 
    startTime;
    
  const endMinutes = typeof endTime === 'string' ? 
    timeToMinutes(endTime) : 
    endTime;
    
  return {
    date: dateStr,
    start: startMinutes,
    end: endMinutes,
    duration: endMinutes - startMinutes
  };
}

/**
 * Subtract busy blocks from available blocks
 * @param {Array} availableBlocks - Array of available time blocks
 * @param {Array} busyBlocks - Array of busy time blocks
 * @returns {Array} Remaining available time blocks
 */
function subtractBusyTimes(availableBlocks, busyBlocks) {
  let result = [...availableBlocks];

  // Process each busy block
  for (const busyBlock of busyBlocks) {
    const newResult = [];
    
    // Check each available block against current busy block
    for (const availableBlock of result) {
      // Skip if they're on different dates
      if (availableBlock.date !== busyBlock.date) {
        newResult.push(availableBlock);
        continue;
      }
      
      // If busy block is outside available block, keep available block unchanged
      if (busyBlock.end <= availableBlock.start || busyBlock.start >= availableBlock.end) {
        newResult.push(availableBlock);
        continue;
      }
      
      // If busy block completely overlaps available, skip available block
      if (busyBlock.start <= availableBlock.start && busyBlock.end >= availableBlock.end) {
        continue;
      }
      
      // If busy block is in the middle, split into two blocks
      if (busyBlock.start > availableBlock.start && busyBlock.end < availableBlock.end) {
        newResult.push(createTimeBlock(
          availableBlock.date, 
          availableBlock.start, 
          busyBlock.start
        ));
        newResult.push(createTimeBlock(
          availableBlock.date, 
          busyBlock.end, 
          availableBlock.end
        ));
        continue;
      }
      
      // If busy block overlaps the start
      if (busyBlock.start <= availableBlock.start && busyBlock.end > availableBlock.start) {
        newResult.push(createTimeBlock(
          availableBlock.date, 
          busyBlock.end, 
          availableBlock.end
        ));
        continue;
      }
      
      // If busy block overlaps the end
      if (busyBlock.start < availableBlock.end && busyBlock.end >= availableBlock.end) {
        newResult.push(createTimeBlock(
          availableBlock.date, 
          availableBlock.start, 
          busyBlock.start
        ));
        continue;
      }
    }
    
    result = newResult;
  }
  
  return result;
}

/**
 * Find slots that meet minimum duration criteria
 * @param {Array} availableBlocks - Array of available time blocks
 * @param {number} minDuration - Minimum slot duration in minutes
 * @returns {Array} Filtered slots meeting minimum duration
 */
function filterByMinDuration(availableBlocks, minDuration) {
  return availableBlocks.filter(block => block.duration >= minDuration);
}

/**
 * Calculate slots needed from the available blocks, applying duration constraints.
 * @param {Array} availableBlocks - Array of available time blocks (already filtered by user availability window)
 * @param {number} minDuration - Minimum duration in minutes
 * @param {number} maxDuration - Maximum duration in minutes
 * @param {number} numRequired - Number of slots required
 * @param {number} spreadDays - Required spread over days (minimum number of unique days to use if possible)
 * @returns {Array} Selected slots, prioritizing chronological order over spreading.
 */
function calculateSlots(availableBlocks, minDuration, maxDuration, numRequired, spreadDays) {
  // 1. Filter by minimum duration first
  const validBlocks = filterByMinDuration(availableBlocks, minDuration);

  // Helper function to adjust slot duration based on min/max constraints and start time snapping
  const adjustSlotDuration = (block) => {
    let start = block.start;
    let end = block.end;

    // Optional: Snap start UP to nearest 30 mins
    if (start % 30 !== 0) {
      start = start + (30 - (start % 30));
    }

    let adjustedDuration = end - start;

    // Check if still valid after start adjustment
    if (adjustedDuration < minDuration) {
      return null; // Invalid slot
    }

    // Cap the duration at maxDuration
    const finalDuration = Math.min(adjustedDuration, maxDuration);

    // Ensure final duration is still >= minDuration
    if (finalDuration < minDuration) {
      return null; // Invalid slot
    }

    // Calculate the final end time
    const finalEnd = start + finalDuration;

    // Create the final slot object
    return createTimeBlock(block.date, start, finalEnd);
  };

  // 2. Adjust all valid blocks first
  const adjustedValidBlocks = validBlocks.map(adjustSlotDuration).filter(slot => slot !== null);

  // 3. Handle case where not enough valid blocks are found even after adjustment
  if (adjustedValidBlocks.length < numRequired) {
    // Not enough blocks meet the basic criteria, return what we have.
    return adjustedValidBlocks;
  }

  // 4. Sort all blocks chronologically (date first, then start time)
  const sortedAllAdjustedBlocks = adjustedValidBlocks.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return a.start - b.start;
  });

  const result = [];
  const slotsAdded = new Set(); // Keep track of added slots (using a unique key)
  const datesUsed = new Set();

  // --- Primary Strategy: Chronological Selection ---
  // Select slots chronologically, but respect spreadDays as a constraint
  for (const block of sortedAllAdjustedBlocks) {
    if (result.length >= numRequired) break; // Stop if we have enough slots

    const slotKey = `${block.date}-${block.start}-${block.end}`;
    if (slotsAdded.has(slotKey)) continue; // Skip if already added

    // Check if we should add this slot based on spreading constraint
    const wouldExceedSpreadDays = spreadDays > 0 && 
                                  !datesUsed.has(block.date) && 
                                  datesUsed.size >= spreadDays;

    // If we haven't reached the spread limit, or this date is already used, add the slot
    if (!wouldExceedSpreadDays || datesUsed.has(block.date)) {
      result.push(block);
      slotsAdded.add(slotKey);
      datesUsed.add(block.date);
    }
  }

  // --- Fallback Strategy: Force Spreading if Needed ---
  // If we still need more slots and haven't met the spread requirement,
  // force spreading to meet the minimum requirements
  if (result.length < numRequired && spreadDays > 0 && datesUsed.size < spreadDays) {
    // Group remaining blocks by date
    const blocksByDate = {};
    for (const block of sortedAllAdjustedBlocks) {
      const slotKey = `${block.date}-${block.start}-${block.end}`;
      if (!slotsAdded.has(slotKey)) {
        (blocksByDate[block.date] = blocksByDate[block.date] || []).push(block);
      }
    }

    // Try to add one slot from each unused date until we meet requirements
    const unusedDates = Object.keys(blocksByDate)
                              .filter(date => !datesUsed.has(date))
                              .sort();

    for (const date of unusedDates) {
      if (result.length >= numRequired) break;
      
      const blocksForDay = blocksByDate[date].sort((a, b) => a.start - b.start);
      if (blocksForDay.length > 0) {
        const block = blocksForDay[0]; // Take the earliest slot of the day
        const slotKey = `${block.date}-${block.start}-${block.end}`;
        
        result.push(block);
        slotsAdded.add(slotKey);
        datesUsed.add(block.date);
      }
    }
  }

  // Return the final list of slots, ensuring it doesn't exceed numRequired
  return result.slice(0, numRequired);
}



/**
 * Convert events from Google Calendar to busy time blocks
 * @param {Array} events - Google Calendar events
 * @returns {Array} Busy time blocks
 */
function eventsToBusyBlocks(events) {
  const busyBlocks = [];

  for (const event of events) {
    const startDateTime = new Date(event.start.dateTime || `${event.start.date}T00:00:00`);
    const endDateTime = new Date(event.end.dateTime || `${event.end.date}T00:00:00`);

    // Handle all-day events and multi-day events
    if (event.start.date && !event.start.dateTime) {
      // This is an all-day event
      const startDateObj = new Date(event.start.date + 'T00:00:00');
      const endDateObj = new Date(event.end.date + 'T00:00:00');
      
      // Create busy blocks for each day the event spans
      const currentDate = new Date(startDateObj);
      while (currentDate < endDateObj) {
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        
        busyBlocks.push(createTimeBlock(date, 0, 24 * 60)); // Block the entire day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // This is a timed event
      const year = startDateTime.getFullYear();
      const month = (startDateTime.getMonth() + 1).toString().padStart(2, '0');
      const day = startDateTime.getDate().toString().padStart(2, '0');
      const date = `${year}-${month}-${day}`;

      let startTime = startDateTime.getHours() * 60 + startDateTime.getMinutes();
      let endTime = endDateTime.getHours() * 60 + endDateTime.getMinutes();

      // Snap start time down to the nearest 30-minute interval
      startTime = startTime - (startTime % 30);

      // Snap end time up to the nearest 30-minute interval
      if (endTime % 30 !== 0) {
        endTime = endTime + (30 - (endTime % 30));
      }

      // Ensure snapped end time doesn't exceed the day boundary (1440 minutes)
      endTime = Math.min(endTime, 24 * 60);

      if (startTime < endTime) {
        busyBlocks.push(createTimeBlock(date, startTime, endTime));
      }
    }
  }

  return busyBlocks;
}

/**
 * Format a slot according to specified language
 * @param {Object} slot - Time slot object
 * @param {string} lang - Language code ('en' or 'ja')
 * @returns {string} Formatted slot string
 */
function formatSlot(slot, lang) {
  const date = new Date(`${slot.date}T00:00:00`);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${month}/${day}`;
  
  const startTime = minutesToTime(slot.start);
  const endTime = minutesToTime(slot.end);

  const weekdayIndex = date.getDay(); // 0 (Sunday) to 6 (Saturday)
  let weekday;
  // Use hardcoded fallback for weekdays based on language
  const fallbackWeekdays = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ja: ['日', '月', '火', '水', '木', '金', '土'],
  };

  // Ensure lang is valid or default to 'en'
  const validLang = lang === 'ja' ? 'ja' : 'en';
  weekday = fallbackWeekdays[validLang][weekdayIndex];

  return `${dateStr}(${weekday}) ${startTime} ~ ${endTime}`;
}

/**
/**
 * Find available meeting slots based on settings and events.
 * @param {Object} settings - Configuration settings including minDuration, maxDuration, etc.
 * @param {Array} events - All events from selected calendars.
 * @returns {Promise<Array>} Available meeting slots.
 */
async function findAvailableSlots(settings, events) {
  const {
    startDate,
    numDays,
    availableFrom, // User's desired start time (e.g., "09:00")
    availableUntil,
    exclusions,
    selectedDays,
    minDuration,
    maxDuration,
    numSlots,
    spreadDays,
  } = settings;

  const userAvailableStartMinutes = timeToMinutes(availableFrom);
  const userAvailableEndMinutes = timeToMinutes(availableUntil);
  const allPotentialBusyBlocks = eventsToBusyBlocks(events); // Convert all events upfront

  const finalAvailableBlocksAcrossDays = [];
  const startDateObj = new Date(startDate);

  // Process each day in the range
  for (let i = 0; i < numDays; i++) {
    const currentDate = new Date(startDateObj);
    currentDate.setDate(startDateObj.getDate() + i);

    // Skip if day is not selected by the user
    const dayOfWeek = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
    if (!selectedDays[dayOfWeek]) {
      continue;
    }

    const dateString = currentDate.toISOString().split('T')[0];

    // 1. Start with the full day as available
    let dayFreeBlocks = [createTimeBlock(dateString, 0, 24 * 60)]; // 0 to 1440 minutes

    // 2. Prepare all busy/exclusion blocks for THIS specific day
    const busyBlocksForDay = allPotentialBusyBlocks.filter(b => b.date === dateString); // Already snapped in eventsToBusyBlocks

    // Snap exclusion blocks as well
    const exclusionBlocksForDay = (exclusions || []).map(ex => {
        let startEx = timeToMinutes(ex.start);
        let endEx = timeToMinutes(ex.end);

        // Snap start down
        startEx = startEx - (startEx % 30);
        // Snap end up
        if (endEx % 30 !== 0) {
            endEx = endEx + (30 - (endEx % 30));
        }
        endEx = Math.min(endEx, 24 * 60); // Cap at end of day

        // Ensure valid block after snapping
        if (startEx >= endEx) {
           // If original exclusion had duration but snapping made it invalid, make it min 30 min
           if (timeToMinutes(ex.end) > timeToMinutes(ex.start)) {
               endEx = startEx + 30;
           } else {
               endEx = startEx; // Keep zero duration if original was zero
           }
           endEx = Math.min(endEx, 24 * 60);
        }

        return createTimeBlock(dateString, startEx, endEx);
    });

    const allBlocksToSubtract = [...busyBlocksForDay, ...exclusionBlocksForDay];

    // 3. Subtract busy/exclusions from the full day
    dayFreeBlocks = subtractBusyTimes(dayFreeBlocks, allBlocksToSubtract);

    // 4. Intersect remaining free blocks with the user's desired availability window (e.g., 09:00-18:00)
    const intersectedDayFreeBlocks = dayFreeBlocks.map(freeBlock => {
      const start = Math.max(freeBlock.start, userAvailableStartMinutes);
      const end = Math.min(freeBlock.end, userAvailableEndMinutes);

      // If the intersection is valid (start < end), create a new block
      if (start < end) {
        return createTimeBlock(dateString, start, end);
      }
      return null; // No overlap with user's desired window
    }).filter(block => block !== null); // Remove null entries where there was no overlap

    // 5. Add the valid, intersected blocks for this day to the overall list
    finalAvailableBlocksAcrossDays.push(...intersectedDayFreeBlocks);
  }

  // 6. Calculate the final slots using the refined available blocks and duration constraints
  return calculateSlots(
    finalAvailableBlocksAcrossDays,
    minDuration,
    maxDuration,
    numSlots,
    spreadDays,
  );
}

export {
  findAvailableSlots,
  createTimeBlock,
  subtractBusyTimes,
  filterByMinDuration,
  calculateSlots,
  eventsToBusyBlocks,
  formatSlot,
  timeToMinutes,
  minutesToTime
};
