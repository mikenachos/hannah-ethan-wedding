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
    email: 'admin@biltmore.com',
    name: 'Hannah & Ethan (Admin)',
    tier: GUEST_TIERS.ADMIN,
    plusOne: true,
    note: 'System Admin'
  },
  {
    email: 'hannah@example.com',
    name: 'Hannah Levine',
    tier: GUEST_TIERS.ADMIN,
    plusOne: true,
    note: 'Bride & Admin'
  },
  {
    email: 'ethan@example.com',
    name: 'Ethan Nachmani',
    tier: GUEST_TIERS.ADMIN,
    plusOne: true,
    note: 'Groom & Admin'
  },

  // Weekend Tier Invites
  {
    email: 'weekend@biltmore.com',
    name: 'Alexandra & Harrison Vance',
    tier: GUEST_TIERS.WEEKEND,
    plusOne: true,
    note: 'Weekend Invitee'
  },
  {
    email: 'vip@example.com',
    name: 'Marcus & Sophia Sterling',
    tier: GUEST_TIERS.WEEKEND,
    plusOne: true,
    note: 'VIP Family'
  },
  {
    email: 'michael@example.com',
    name: 'Michael',
    tier: GUEST_TIERS.WEEKEND,
    plusOne: true,
    note: 'Honored Weekend Guest'
  },

  // Wedding Only Tier Invites
  {
    email: 'wedding@biltmore.com',
    name: 'David & Catherine Miller',
    tier: GUEST_TIERS.WEDDING_ONLY,
    plusOne: false,
    note: 'Wedding Day Guest'
  },
  {
    email: 'guest@example.com',
    name: 'Eleanor & Julian Ross',
    tier: GUEST_TIERS.WEDDING_ONLY,
    plusOne: true,
    note: 'Wedding Day Guest'
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

/* Helper to get guest list with LocalStorage persistence */
export function getGuestList() {
  const stored = localStorage.getItem('hannah_ethan_guest_db') || localStorage.getItem('ethan_hannah_guest_db');
  if (stored) {
    try {
      return JSON.parse(stored);
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
  const exists = list.some(g => g.email.toLowerCase() === newGuest.email.toLowerCase());
  if (exists) {
    return { success: false, message: 'A guest with this email already exists.' };
  }
  list.push(newGuest);
  saveGuestList(list);
  return { success: true, guest: newGuest };
}

export function deleteGuest(email) {
  let list = getGuestList();
  list = list.filter(g => g.email.toLowerCase() !== email.toLowerCase());
  saveGuestList(list);
  return { success: true };
}

export function lookupGuestEntitlement(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const list = getGuestList();
  
  const foundGuest = list.find(
    g => g.email.toLowerCase() === cleanEmail
  );

  if (foundGuest) {
    return {
      found: true,
      guest: foundGuest,
      unlockedEvents: EVENTS_LIST.filter(e => {
        if (foundGuest.tier === GUEST_TIERS.ADMIN || foundGuest.tier === GUEST_TIERS.WEEKEND) return true;
        return e.tierRequired === GUEST_TIERS.WEDDING_ONLY;
      })
    };
  }

  return {
    found: false,
    message: 'Email address not found on the guest list. Please check for typos or contact Hannah & Ethan.'
  };
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
  const stored = localStorage.getItem('hannah_ethan_rsvp_db') || localStorage.getItem('ethan_hannah_rsvp_db');
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
