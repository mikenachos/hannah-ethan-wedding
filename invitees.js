/**
 * GUEST ENTITLEMENT DATABASE & ADMIN MANAGEMENT ENGINE
 * Hannah Levine & Ethan Nachmani — March 26–28, 2027
 * The Biltmore Hotel, Coral Gables
 */

export const GUEST_TIERS = {
  ADMIN: 'admin',
  WEEKEND: 'weekend',
  WEDDING_ONLY: 'wedding_only'
};

const INITIAL_INVITEES_DATABASE = [
  // Admin Tier Invites
  {
    firstName: 'Hannah',
    lastName: 'Levine',
    name: 'Hannah Levine',
    email: 'hannah@example.com',
    mobile: '',
    household: 'Levine-Nachmani',
    tier: GUEST_TIERS.ADMIN,
    plusOne: true,
    note: 'Bride & Admin',
    address: { street: '', suite: '', city: '', state: '', zip: '', country: 'US' },
    infoCompleted: false
  },
  {
    firstName: 'Ethan',
    lastName: 'Nachmani',
    name: 'Ethan Nachmani',
    email: 'ethan@example.com',
    mobile: '',
    household: 'Levine-Nachmani',
    tier: GUEST_TIERS.ADMIN,
    plusOne: true,
    note: 'Groom & Admin',
    address: { street: '', suite: '', city: '', state: '', zip: '', country: 'US' },
    infoCompleted: false
  },
  {
    firstName: 'System',
    lastName: 'Admin',
    name: 'Hannah & Ethan (Admin)',
    email: 'admin@biltmore.com',
    mobile: '',
    household: 'Biltmore-Admins',
    tier: GUEST_TIERS.ADMIN,
    plusOne: true,
    note: 'System Admin',
    address: { street: '', suite: '', city: '', state: '', zip: '', country: 'US' },
    infoCompleted: false
  },
  {
    firstName: 'Ethan & Hannah',
    lastName: 'Admin',
    name: 'Ethan & Hannah (Admin)',
    email: 'admin@nachmani.com',
    mobile: '',
    household: 'Nachmani-Admins',
    tier: GUEST_TIERS.ADMIN,
    plusOne: true,
    note: 'System Admin',
    address: { street: '', suite: '', city: '', state: '', zip: '', country: 'US' },
    infoCompleted: false
  }
];

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
    attire: 'Elevated Evening Wear',
    description: 'An intimate candlelit dinner featuring Mediterranean cuisine, heartfelt toasts, and evening lounge music overlooking the iconic Biltmore pool.',
    tierRequired: GUEST_TIERS.WEEKEND
  },
  {
    id: 'wedding_ceremony_reception',
    day: 'Sunday',
    date: 'March 28, 2027',
    time: '5:00 PM – Late',
    title: 'Wedding Ceremony & Black-Tie Gala',
    venue: 'The Country Club Ballroom & Terrace',
    location: 'The Biltmore Hotel, Coral Gables',
    attire: 'Black Tie (Tuxedos & Floor-Length Gowns)',
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

/* Helper to get guest list with LocalStorage persistence */
export function getGuestList() {
  const stored = localStorage.getItem('hannah_ethan_guest_db');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Auto-migrate: reset storage if it contains old flat schema without household mapping
      if (parsed.length > 0 && parsed[0].household === undefined) {
        console.warn('Old schema detected. Resetting guest database.');
        localStorage.removeItem('hannah_ethan_guest_db');
        localStorage.removeItem('hannah_ethan_guest');
        localStorage.removeItem('hannah_ethan_rsvp_db');
      } else {
        // Dynamic Sync: merge any entries in code's initial list that are missing in LocalStorage
        let modified = false;
        INITIAL_INVITEES_DATABASE.forEach(initG => {
          const exists = parsed.some(g => 
            (initG.email && g.email && g.email.toLowerCase() === initG.email.toLowerCase()) ||
            (initG.mobile && g.mobile && normalizePhone(g.mobile) === normalizePhone(initG.mobile))
          );
          if (!exists) {
            parsed.push(initG);
            modified = true;
          }
        });
        if (modified) {
          localStorage.setItem('hannah_ethan_guest_db', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse guest list', e);
    }
  }
  // Initialize default
  localStorage.setItem('hannah_ethan_guest_db', JSON.stringify(INITIAL_INVITEES_DATABASE));
  return INITIAL_INVITEES_DATABASE;
}

export function saveGuestList(list) {
  localStorage.setItem('hannah_ethan_guest_db', JSON.stringify(list));
}

export function addGuest(newGuest) {
  const list = getGuestList();
  
  // Validation for duplicate emails
  if (newGuest.email) {
    const emailExists = list.some(g => g.email && g.email.toLowerCase() === newGuest.email.toLowerCase());
    if (emailExists) {
      return { success: false, message: 'A guest with this email already exists.' };
    }
  }
  
  // Validation for duplicate phones
  if (newGuest.mobile) {
    const cleanNewMobile = normalizePhone(newGuest.mobile);
    const phoneExists = list.some(g => g.mobile && normalizePhone(g.mobile) === cleanNewMobile);
    if (phoneExists) {
      return { success: false, message: 'A guest with this mobile number already exists.' };
    }
  }

  const defaultAddr = { street: '', suite: '', city: '', state: '', zip: '', country: 'US' };

  // If there are existing members in this household, sync their address
  const householdMembers = list.filter(g => g.household && g.household === newGuest.household);
  const syncedAddress = householdMembers.length > 0 ? { ...householdMembers[0].address } : defaultAddr;

  const addedGuest = {
    firstName: newGuest.firstName || '',
    lastName: newGuest.lastName || '',
    name: newGuest.name || `${newGuest.firstName} ${newGuest.lastName}`,
    email: newGuest.email || '',
    mobile: newGuest.mobile || '',
    household: newGuest.household || 'Single',
    tier: newGuest.tier || GUEST_TIERS.WEEKEND,
    plusOne: newGuest.plusOne || false,
    note: newGuest.note || '',
    address: syncedAddress,
    infoCompleted: newGuest.infoCompleted || false
  };

  list.push(addedGuest);
  saveGuestList(list);
  return { success: true, guest: addedGuest };
}

export function deleteGuest(emailOrMobile) {
  let list = getGuestList();
  const cleanTerm = emailOrMobile.trim().toLowerCase();
  const cleanPhone = normalizePhone(cleanTerm);

  list = list.filter(g => {
    if (g.email && g.email.toLowerCase() === cleanTerm) return false;
    if (g.mobile && normalizePhone(g.mobile) === cleanPhone && cleanPhone !== '') return false;
    // Fallback: match by full name if term contains no email or phone match
    if (g.name.toLowerCase() === cleanTerm) return false;
    return true;
  });

  saveGuestList(list);
  return { success: true };
}

export function lookupGuestEntitlement(input) {
  if (!input) return null;
  const cleanInput = input.trim().toLowerCase();
  const cleanPhone = normalizePhone(cleanInput);
  
  const list = getGuestList();
  
  const foundGuest = list.find(g => {
    if (g.email && g.email.toLowerCase() === cleanInput) return true;
    if (g.mobile && normalizePhone(g.mobile) === cleanPhone && cleanPhone.length >= 7) return true;
    return false;
  });

  if (foundGuest) {
    const householdMembers = list.filter(g => g.household && g.household === foundGuest.household);
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

export function updateHouseholdInfo(householdId, address, updatedMembers) {
  const list = getGuestList();
  
  const updatedList = list.map(g => {
    if (g.household === householdId) {
      // Find matching member in the form input list by name
      const match = updatedMembers.find(m => 
        (m.firstName.toLowerCase() === g.firstName.toLowerCase() && m.lastName.toLowerCase() === g.lastName.toLowerCase())
      ) || {};
      
      return {
        ...g,
        firstName: match.firstName !== undefined ? match.firstName : g.firstName,
        lastName: match.lastName !== undefined ? match.lastName : g.lastName,
        name: `${match.firstName || g.firstName} ${match.lastName || g.lastName}`,
        email: match.email !== undefined ? match.email : g.email,
        mobile: match.mobile !== undefined ? match.mobile : g.mobile,
        address: { ...address },
        infoCompleted: true
      };
    }
    return g;
  });

  saveGuestList(updatedList);
  return updatedList.filter(g => g.household === householdId);
}

export function updateGuestDirectly(originalIdentifier, updatedGuestData) {
  const list = getGuestList();
  const cleanTerm = originalIdentifier.trim().toLowerCase();
  const cleanPhone = normalizePhone(cleanTerm);

  const idx = list.findIndex(g => 
    (g.email && g.email.toLowerCase() === cleanTerm) ||
    (g.mobile && normalizePhone(g.mobile) === cleanPhone && cleanPhone !== '') ||
    (g.name.toLowerCase() === cleanTerm)
  );

  if (idx !== -1) {
    const originalGuest = list[idx];
    const newGuest = {
      ...originalGuest,
      ...updatedGuestData,
      name: `${updatedGuestData.firstName !== undefined ? updatedGuestData.firstName : originalGuest.firstName} ${updatedGuestData.lastName !== undefined ? updatedGuestData.lastName : originalGuest.lastName}`
    };

    list[idx] = newGuest;

    // Sync household addresses if updated
    if (updatedGuestData.address) {
      list.forEach((g, i) => {
        if (g.household === newGuest.household) {
          list[i].address = { ...newGuest.address };
        }
      });
    }

    saveGuestList(list);
    return { success: true, guest: newGuest };
  }
  return { success: false, message: 'Guest not found' };
}

/* CSV Import Engine */
export function importGuestsFromCSV(csvText) {
  const lines = csvText.split('\n');
  if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
    return { success: false, message: 'No data found' };
  }

  const list = getGuestList();
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
    if (colCount >= 6) {
      // Standard: Household, First, Last, email, mobile, tier
      householdIdx = 0;
      firstIdx = 1;
      lastIdx = 2;
      emailIdx = 3;
      mobileIdx = 4;
      tierIdx = 5;
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
    } else if (colCount === 4) {
      // 4 Columns: Household, First, Last, tier
      householdIdx = 0;
      firstIdx = 1;
      lastIdx = 2;
      emailIdx = -1;
      mobileIdx = -1;
      tierIdx = 3;
    } else {
      return { success: false, message: 'Invalid format. Must contain at least 4 columns (Household, First, Last, Tier).' };
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

    const household = cols[householdIdx] || '';
    const firstName = cols[firstIdx] || '';
    const lastName = cols[lastIdx] || '';
    const email = emailIdx !== -1 ? (cols[emailIdx] || '') : '';
    const mobile = mobileIdx !== -1 ? (cols[mobileIdx] || '') : '';
    
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

    if (!firstName || !lastName || !household || !tier) {
      skippedCount++;
      continue;
    }

    // Check duplicate
    const isDuplicate = list.some(g => 
      (email && g.email && g.email.toLowerCase() === email.toLowerCase()) ||
      (mobile && g.mobile && normalizePhone(g.mobile) === normalizePhone(mobile))
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
      infoCompleted: false
    });
    importCount++;
  }

  if (newGuests.length > 0) {
    const updatedList = [...list, ...newGuests];
    saveGuestList(updatedList);
    return { success: true, message: `Successfully imported ${importCount} guests. Skipped ${skippedCount} duplicates/invalid rows.` };
  }

  return { success: false, message: `No new guests were imported. Skipped ${skippedCount} rows.` };
}

/* RSVP Responses Storage */
const INITIAL_RSVP_LIST = [
  {
    email: 'weekend@biltmore.com',
    name: 'Alexandra & Harrison Vance',
    attendance: 'accept',
    tier: 'weekend',
    meal: 'seabass',
    dietary: 'No shellfish',
    timestamp: '2026-07-20T14:30:00Z'
  },
  {
    email: 'wedding@biltmore.com',
    name: 'David & Catherine Miller',
    attendance: 'accept',
    tier: 'wedding_only',
    meal: 'beef',
    dietary: 'Gluten free',
    timestamp: '2026-07-22T09:15:00Z'
  }
];

export function getRsvpList() {
  const stored = localStorage.getItem('hannah_ethan_rsvp_db');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse rsvp list', e);
    }
  }
  localStorage.setItem('hannah_ethan_rsvp_db', JSON.stringify(INITIAL_RSVP_LIST));
  return INITIAL_RSVP_LIST;
}

export function saveRsvp(rsvpData) {
  const list = getRsvpList();
  const index = list.findIndex(r => r.email.toLowerCase() === rsvpData.email.toLowerCase());
  if (index >= 0) {
    list[index] = { ...rsvpData, timestamp: new Date().toISOString() };
  } else {
    list.push({ ...rsvpData, timestamp: new Date().toISOString() });
  }
  localStorage.setItem('hannah_ethan_rsvp_db', JSON.stringify(list));
}
