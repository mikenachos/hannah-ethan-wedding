export const GUEST_TIERS = {
  ADMIN: 'admin',
  WEEKEND: 'weekend',
  WEDDING_ONLY: 'wedding_only'
};

export const EVENTS_LIST = [
  {
    id: 'welcome_cocktail',
    day: 'Friday',
    date: 'March 26, 2027',
    time: '7:30 PM – 10:30 PM',
    title: 'Sunset Welcome Cocktail Reception',
    venue: 'Alhambra Courtyard & Fountain',
    location: 'The Biltmore Hotel, Coral Gables',
    attire: 'Resort Chic / Cocktail',
    description: 'Join us beneath the illuminated banyan trees for craft libations, champagne, and wood-fired bites as we welcome our weekend guests to Coral Gables.',
    tierRequired: GUEST_TIERS.WEEKEND
  },
  {
    id: 'rehearsal_dinner',
    day: 'Saturday',
    date: 'March 27, 2027',
    time: '6:30 PM – 11:00 PM',
    title: 'Rehearsal Dinner & Poolside Soirée',
    venue: 'The Cascades & Private Cabana Lawn',
    location: 'The Biltmore Hotel, Coral Gables',
    attire: 'Warm-Weather Black Tie (Optional)',
    description: 'An intimate candlelit dining experience framing the historic Biltmore pool, dedicated to toasts, family stories, and fine wine.',
    tierRequired: GUEST_TIERS.WEEKEND
  },
  {
    id: 'marriage_ceremony',
    day: 'Sunday',
    date: 'March 28, 2027',
    time: '5:00 PM – 11:30 PM',
    title: 'The Marriage Ceremony & Wedding Banquet',
    venue: 'The Country Club Ballroom & Loggia',
    location: 'The Biltmore Hotel, Coral Gables',
    attire: 'Black Tie / Formal',
    description: 'The marriage ceremony of Hannah Levine and Ethan Nachmani, followed by a formal cocktail hour on the Loggia, multi-course seated banquet dinner, and dancing under the chandeliers.',
    tierRequired: GUEST_TIERS.WEDDING_ONLY
  },
  {
    id: 'farewell_brunch',
    day: 'Monday',
    date: 'March 29, 2027',
    time: '10:00 AM – 1:00 PM',
    title: 'Farewell Champagne Brunch',
    venue: 'Fontana Terrace',
    location: 'The Biltmore Hotel, Coral Gables',
    attire: 'Casual Elegance',
    description: 'A relaxed morning gathering with artisanal coffee, bellinis, and breakfast favorites to send off our weekend guests before departure.',
    tierRequired: GUEST_TIERS.WEEKEND
  }
];

/* Helper to normalize phone numbers to digits only */
export function normalizePhone(phone) {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '');
}

/* Helper to get guest list with HTTP fetch */
export async function getGuestList() {
  try {
    const res = await fetch('/api/guests');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch guest list', e);
  }
  return [];
}

export function saveGuestList(list) {
  // Deprecated client-side, handled by backend API.
  console.warn('saveGuestList is deprecated on client side.');
}

export async function addGuest(newGuest) {
  try {
    const res = await fetch('/api/guests/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGuest)
    });
    return await res.json();
  } catch (e) {
    console.error('Failed to add guest', e);
    return { success: false, message: e.message };
  }
}

export async function deleteGuest(identifier) {
  try {
    const res = await fetch('/api/guests/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    return await res.json();
  } catch (e) {
    console.error('Failed to delete guest', e);
    return { success: false, message: e.message };
  }
}

/* Helper to perform dynamic security lookup via email or phone */
export async function lookupGuestEntitlement(inputTerm) {
  const list = await getGuestList();
  const cleanTerm = inputTerm.trim().toLowerCase();
  const cleanPhone = normalizePhone(cleanTerm);

  // Check administrators list
  const foundGuest = list.find(g => 
    (g.email && g.email.toLowerCase() === cleanTerm) ||
    (g.mobile && normalizePhone(g.mobile) === cleanPhone && cleanPhone !== '')
  );

  if (foundGuest) {
    // If the guest is found, filter all guests belonging to the same household
    const householdMembers = list.filter(g => g.household === foundGuest.household);
    return {
      found: true,
      guest: foundGuest,
      householdMembers: householdMembers,
      unlockedEvents: EVENTS_LIST.filter(e => {
        // Shared entitlement tier by household
        if (foundGuest.tier === GUEST_TIERS.ADMIN || foundGuest.tier === GUEST_TIERS.WEEKEND) return true;
        return e.tierRequired === GUEST_TIERS.WEDDING_ONLY;
      })
    };
  }

  return {
    found: false,
    message: 'Invitee details not found. Please verify your email or phone number, or contact Hannah & Ethan.'
  };
}

export async function updateHouseholdInfo(householdId, address, updatedMembers) {
  try {
    const res = await fetch('/api/household/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId, address, updatedMembers })
    });
    const result = await res.json();
    if (result.success) {
      return result.guests;
    }
  } catch (e) {
    console.error('Failed to update household info', e);
  }
  return [];
}

export async function updateGuestDirectly(originalIdentifier, updatedGuestData) {
  try {
    const res = await fetch('/api/guests/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalIdentifier, updatedGuestData })
    });
    return await res.json();
  } catch (e) {
    console.error('Failed to update guest directly', e);
    return { success: false, message: e.message };
  }
}

/* CSV Import Engine */
export async function importGuestsFromCSV(csvText, addedBy) {
  const lines = csvText.split('\n');
  if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
    return { success: false, message: 'No data found' };
  }

  const list = await getGuestList();
  let importCount = 0;
  let skippedCount = 0;

  // Auto-detect delimiter: tab (\t) if copied from Sheets/Excel, otherwise comma (,)
  const firstLine = lines[0].trim();
  if (!firstLine) return { success: false, message: 'First line is empty' };
  
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
  
  // Flexible column index matching
  let householdIdx = headers.findIndex(h => h.includes('household'));
  let firstIdx = headers.findIndex(h => h.includes('first'));
  let lastIdx = headers.findIndex(h => h.includes('last'));
  let emailIdx = headers.findIndex(h => h.includes('email'));
  let mobileIdx = headers.findIndex(h => h.includes('mobile') || h.includes('phone'));
  let tierIdx = headers.findIndex(h => h.includes('tier'));
  let registryIdx = headers.findIndex(h => h.includes('registry'));

  let startRow = 1;

  // If we can't find a valid header matching our required fields, assume the first row has no header and is data
  if (firstIdx === -1 || lastIdx === -1 || householdIdx === -1 || tierIdx === -1) {
    startRow = 0;
    
    // Split the first line to analyze columns count
    let firstCols = [];
    if (delimiter === '\t') {
      firstCols = firstLine.split('\t').map(c => c.replace(/^"|"$/g, '').trim());
    } else {
      firstCols = firstLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    }

    const colCount = firstCols.length;
    if (colCount >= 7) {
      // Household, First, Last, email, mobile, tier, registry
      householdIdx = 0;
      firstIdx = 1;
      lastIdx = 2;
      emailIdx = 3;
      mobileIdx = 4;
      tierIdx = 5;
      registryIdx = 6;
    } else if (colCount === 6) {
      // Standard: Household, First, Last, email, mobile, tier
      householdIdx = 0;
      firstIdx = 1;
      lastIdx = 2;
      emailIdx = 3;
      mobileIdx = 4;
      tierIdx = 5;
      registryIdx = -1;
    } else if (colCount === 5) {
      // 5 Columns: Household, First, Last, (email or mobile), tier
      householdIdx = 0;
      firstIdx = 1;
      lastIdx = 2;
      if (firstCols[3].includes('@')) {
        emailIdx = 3;
        mobileIdx = -1;
      } else {
        emailIdx = -1;
        mobileIdx = 3;
      }
      tierIdx = 4;
      registryIdx = -1;
    } else if (colCount === 4) {
      // 4 Columns: Household, First, Last, tier
      householdIdx = 0;
      firstIdx = 1;
      lastIdx = 2;
      emailIdx = -1;
      mobileIdx = -1;
      tierIdx = 3;
      registryIdx = -1;
    } else {
      return { success: false, message: 'Invalid format. Must contain at least 4 columns (Household, First, Last, Tier).' };
    }
  }

  // Map to store the first guest's first name for each raw household
  const householdFirstNames = {};

  // First pass: scan the lines to map each raw household to the first guest's first name
  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let cols = [];
    if (delimiter === '\t') {
      cols = line.split('\t').map(c => c.replace(/^"|"$/g, '').trim());
    } else {
      cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    }

    const rawHousehold = (cols[householdIdx] || '').trim();
    const firstName = (cols[firstIdx] || '').trim();

    if (rawHousehold && firstName && !householdFirstNames[rawHousehold]) {
      // Keep only alphanumeric characters to make a clean ID suffix
      householdFirstNames[rawHousehold] = firstName.replace(/[^a-zA-Z0-9]/g, '');
    }
  }

  const newGuests = [];

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by detected delimiter, respecting quotes if comma
    let cols = [];
    if (delimiter === '\t') {
      cols = line.split('\t').map(c => c.replace(/^"|"$/g, '').trim());
    } else {
      cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    }

    const rawHousehold = (cols[householdIdx] || '').trim();
    const firstName = (cols[firstIdx] || '').trim();
    const lastName = (cols[lastIdx] || '').trim();
    const email = emailIdx !== -1 ? (cols[emailIdx] || '').trim() : '';
    const mobile = mobileIdx !== -1 ? (cols[mobileIdx] || '').trim() : '';
    
    // Parse tier field flexibly
    let tier = '';
    if (tierIdx !== -1 && cols[tierIdx]) {
      const rawTier = cols[tierIdx].trim().toLowerCase();
      if (rawTier.includes('weekend')) {
        tier = GUEST_TIERS.WEEKEND;
      } else if (rawTier.includes('wedding') || rawTier.includes('only')) {
        tier = GUEST_TIERS.WEDDING_ONLY;
      } else if (rawTier.includes('admin')) {
        tier = GUEST_TIERS.ADMIN;
      }
    }

    let giftRegistry = false;
    if (registryIdx !== -1 && cols[registryIdx]) {
      const rawReg = cols[registryIdx].trim().toLowerCase();
      if (rawReg === 'yes' || rawReg === 'true' || rawReg === 'y' || rawReg === '1') {
        giftRegistry = true;
      }
    }

    if (!firstName || !lastName || !rawHousehold || !tier) {
      skippedCount++;
      continue;
    }

    const uniqueFirst = householdFirstNames[rawHousehold] || firstName.replace(/[^a-zA-Z0-9]/g, '');
    const household = `${rawHousehold}-${uniqueFirst}`;

    // Check duplicate by name and unique household ID
    const isDuplicate = list.some(g => 
      g.name.toLowerCase() === `${firstName} ${lastName}`.toLowerCase() &&
      g.household.toLowerCase() === household.toLowerCase()
    );

    if (isDuplicate) {
      skippedCount++;
      continue;
    }

    newGuests.push({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: email,
      mobile: mobile,
      household: household,
      tier: tier,
      plusOne: false,
      note: 'Imported',
      address: { street: '', suite: '', city: '', state: '', zip: '', country: 'US' },
      infoCompleted: false,
      addedBy: addedBy || 'import',
      addedAt: new Date().toISOString(),
      giftRegistry: giftRegistry
    });
    importCount++;
  }

  if (newGuests.length > 0) {
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newGuests })
      });
      return await res.json();
    } catch (e) {
      console.error('Failed to import guests', e);
      return { success: false, message: e.message };
    }
  }

  return { success: false, message: `No new guests were imported. Skipped ${skippedCount} rows.` };
}

export async function getRsvpList() {
  try {
    const res = await fetch('/api/rsvps');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch RSVP list', e);
  }
  return [];
}

export async function saveRsvp(rsvpData) {
  try {
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    });
    return await res.json();
  } catch (e) {
    console.error('Failed to save RSVP', e);
    return { success: false, message: e.message };
  }
}
