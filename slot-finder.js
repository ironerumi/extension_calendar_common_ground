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
 * @returns {Array} Selected slots, attempting to spread them out and capped by maxDuration.
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

  // 4. Prepare for spreading: Group adjusted blocks by date
  const blocksByDate = adjustedValidBlocks.reduce((acc, block) => {
    (acc[block.date] = acc[block.date] || []).push(block);
    return acc;
  }, {});
  const availableDates = Object.keys(blocksByDate).sort();

  const result = [];
  const slotsAdded = new Set(); // Keep track of added slots (using a unique key)
  const datesUsed = new Set();

  // --- Pass 1: Prioritize Spreading ---
  // Attempt to select one slot per day until the spread target or total required is met.
  for (const date of availableDates) {
    if (result.length >= numRequired) break; // Stop if we have enough slots total
    if (datesUsed.size >= spreadDays && spreadDays > 0) { // Stop adding *new* dates if spread target met
         // However, we might still need more slots than spreadDays, so don't break the outer loop yet.
         // Let Pass 2 handle filling remaining slots if needed.
    }

    const blocksForDay = blocksByDate[date].sort((a, b) => a.start - b.start);

    // Try to add the first available block from this day if the date isn't used yet OR we need more unique dates
    if (!datesUsed.has(date) || datesUsed.size < spreadDays) {
        for (const block of blocksForDay) {
             const slotKey = `${block.date}-${block.start}-${block.end}`;
             if (!slotsAdded.has(slotKey)) { // Ensure we don't add the exact same slot twice across passes
                  result.push(block);
                  slotsAdded.add(slotKey);
                  datesUsed.add(date);
                  if (result.length >= numRequired) break; // Check if required number reached
                  break; // Only take one slot per date in this pass to maximize spread initially
              }
        }
    }
     if (result.length >= numRequired) break;
  }

  // --- Pass 2: Fill Remaining Slots ---
  // If Pass 1 didn't find enough slots, fill the rest chronologically.
  if (result.length < numRequired) {
    // Iterate through all *adjusted* valid blocks, sorted chronologically
    const sortedAllAdjustedBlocks = adjustedValidBlocks.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return a.start - b.start;
    });

    for (const block of sortedAllAdjustedBlocks) {
        if (result.length >= numRequired) break; // Stop if we have enough slots

        const slotKey = `${block.date}-${block.start}-${block.end}`;
        if (!slotsAdded.has(slotKey)) { // Check if this slot wasn't already added in Pass 1
            result.push(block);
            slotsAdded.add(slotKey);
            datesUsed.add(block.date); // Track date usage even in pass 2
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
  return events.map(event => {
    const startDateTime = new Date(event.start.dateTime || `${event.start.date}T00:00:00`);
    const endDateTime = new Date(event.end.dateTime || `${event.end.date}T00:00:00`); // Corrected end date handling for all-day
    
    // Use local date components to avoid timezone issues with just slicing ISO string
    const year = startDateTime.getFullYear();
    const month = (startDateTime.getMonth() + 1).toString().padStart(2, '0'); // JS months are 0-indexed
    const day = startDateTime.getDate().toString().padStart(2, '0');
    const date = `${year}-${month}-${day}`; // Correct local date

    let startTime = startDateTime.getHours() * 60 + startDateTime.getMinutes();
    let endTime = endDateTime.getHours() * 60 + endDateTime.getMinutes();

    // Handle all-day events correctly: they should end at the *start* of the end date
    // If only date is provided (no dateTime), treat as 00:00 to 24:00 on the start date
    if (event.start.date && !event.start.dateTime) {
        startTime = 0;
        // If end.date is the day after start.date, it means it ends at midnight of start.date
        const startDateObj = new Date(event.start.date + 'T00:00:00'); // Ensure consistent parsing
        const endDateObj = new Date(event.end.date + 'T00:00:00');
        // Check if end date is exactly one day after start date
        if (endDateObj.getTime() === startDateObj.getTime() + 24 * 60 * 60 * 1000) {
             endTime = 24 * 60; // End of the start day
        } else {
             // If end date is same as start date or more than one day later (multi-day all-day event)
             // For simplicity, let's make it cover the whole start day.
              // A more complex solution would create blocks for each day.
              // For now, block the entire start day for simplicity.
              endTime = 24 * 60;
         }
     }

    // Snap start time down to the nearest 30-minute interval
    startTime = startTime - (startTime % 30);

    // Snap end time up to the nearest 30-minute interval
    if (endTime % 30 !== 0) {
      endTime = endTime + (30 - (endTime % 30));
    }

    // Ensure snapped end time doesn't exceed the day boundary (1440 minutes)
    endTime = Math.min(endTime, 24 * 60);

    // Ensure start and end don't overlap incorrectly after snapping
    if (startTime >= endTime && (endDateTime.getTime() > startDateTime.getTime())) {
       // If original event had duration but snapping made start>=end,
       // ensure minimum 30min block if it crosses midnight weirdly,
       // otherwise, this small gap is likely fully covered.
       // For simplicity here, we'll just use the snapped values,
       // potentially making the block cover the whole original if snapping caused overlap.
       // A more robust solution might handle edge cases near midnight.
       // Let's assume events are within a day for now. If start >= end, it means the snapped
       // block might be invalid or cover a tiny original gap. Let's just ensure end is at least start + 30 if original end>start
       if(endDateTime.getTime() > startDateTime.getTime()) {
           endTime = startTime + 30; // Ensure minimum block if snapping overlapped.
       } else {
           endTime = startTime; // If original start/end were same, keep them same.
       }
       endTime = Math.min(endTime, 24 * 60); // Re-cap end time
    }


    return createTimeBlock(date, startTime, endTime);
  });
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
