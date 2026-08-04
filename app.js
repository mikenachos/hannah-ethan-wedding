/**
 * BLACK-TIE EDITORIAL WEDDING INTERACTIVE CONTROLLER
 * Private Access Gatekeeper & Security Route Guard
 * Hannah Levine & Ethan Nachmani — March 26-28, 2027
 */

import { 
  lookupGuestEntitlement, 
  GUEST_TIERS, 
  EVENTS_LIST, 
  getGuestList, 
  addGuest, 
  deleteGuest, 
  getRsvpList, 
  saveRsvp,
  updateHouseholdInfo,
  normalizePhone,
  importGuestsFromCSV,
  updateGuestDirectly
} from './invitees.js';

// Application State
let currentGuestState = {
  authenticated: false,
  firstName: '',
  lastName: '',
  name: '',
  email: '',
  mobile: '',
  household: '',
  tier: GUEST_TIERS.WEEKEND,
  plusOne: true,
  infoCompleted: false,
  address: { street: '', suite: '', city: '', state: '', zip: '', country: 'US' }
};

let editingIdentifier = null;

document.addEventListener('DOMContentLoaded', () => {
  loadSavedGuestSession();
  checkRouteGuard();
  initDrawer();
  initEntitlementLookup();
  highlightActiveNav();
  checkContactInfoModal();

  // Show pending toast if any (e.g. from redirect due to disabled page)
  const pendingToast = localStorage.getItem('disabled_section_toast');
  if (pendingToast) {
    showToast(pendingToast);
    localStorage.removeItem('disabled_section_toast');
  }

  // Page specific initializations
  if (document.getElementById('timeline-grid')) {
    initTimeline();
  }

  if (document.getElementById('admin-guest-table-body')) {
    initAdminConsole();
  }

  if (document.getElementById('rsvp-page-form')) {
    initRSVPPageForm();
  }
});

/* ==========================================================================
   1. ROUTE GUARD & SECURITY GATEKEEPER
   ========================================================================== */

function checkRouteGuard() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isGatekeeperPage = (currentPath === 'index.html' || currentPath === '');

  if (!currentGuestState.authenticated && !isGatekeeperPage) {
    // Redirect unverified guests to the gatekeeper landing page
    window.location.href = 'index.html';
    return;
  }

  // Redirect if section is disabled by admin
  if (currentGuestState.authenticated && currentGuestState.tier !== GUEST_TIERS.ADMIN) {
    const settings = getPageSettings();
    let isPageDisabled = false;
    let sectionName = '';

    if (currentPath === 'itinerary.html' && !settings.itinerary) {
      isPageDisabled = true;
      sectionName = 'Itinerary';
    } else if (currentPath === 'accommodations.html' && !settings.accommodations) {
      isPageDisabled = true;
      sectionName = 'Accommodations';
    } else if (currentPath === 'registry.html' && (!settings.registry || !currentGuestState.giftRegistry)) {
      isPageDisabled = true;
      sectionName = 'Registry';
    } else if (currentPath === 'rsvp.html' && !settings.rsvp) {
      isPageDisabled = true;
      sectionName = 'RSVP';
    }

    if (isPageDisabled) {
      localStorage.setItem('disabled_section_toast', `THE ${sectionName.toUpperCase()} SECTION IS TEMPORARILY DISABLED BY THE COUPLE.`);
      window.location.href = 'invitation.html';
    }
  }
}

/* ==========================================================================
   2. DRAWER & NAVIGATION CONTROLLER
   ========================================================================== */

function initDrawer() {
  const toggleBtn = document.getElementById('nav-toggle-btn');
  const closeBtn = document.getElementById('drawer-close-btn');
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('slide-drawer');

  function openDrawer() {
    if (overlay) overlay.classList.add('active');
    if (drawer) drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (overlay) overlay.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
}

function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.drawer-link');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* ==========================================================================
   3. GUEST ENTITLEMENT SESSION MANAGER
   ========================================================================== */

function initEntitlementLookup() {
  const lookupForm = document.getElementById('entitlement-lookup-form');
  const lookupInput = document.getElementById('lookup-email-input');
  const badgeBtn = document.getElementById('header-access-badge');
  const resetBtn = document.getElementById('drawer-reset-session');

  // Input formatter for phone number on lookup screen
  if (lookupInput) {
    lookupInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && /^\+?[\d\s()-.]{2,}/.test(val) && !val.includes('@')) {
        let clean = val.replace(/[^\d]/g, '');
        if (clean.length > 10) clean = clean.slice(0, 10);
        if (clean.length > 6) {
          e.target.value = `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
        } else if (clean.length > 3) {
          e.target.value = `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
        } else {
          e.target.value = clean;
        }
      }
    });
  }

  if (lookupForm) {
    lookupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputVal = lookupInput.value.trim();
      if (!inputVal) return;

      const result = await lookupGuestEntitlement(inputVal);

      if (result.found) {
        currentGuestState = {
          authenticated: true,
          firstName: result.guest.firstName || '',
          lastName: result.guest.lastName || '',
          name: result.guest.name || '',
          email: result.guest.email || '',
          mobile: result.guest.mobile || '',
          household: result.guest.household || '',
          tier: result.guest.tier,
          plusOne: result.guest.plusOne,
          infoCompleted: result.guest.infoCompleted || false,
          address: result.guest.address || { street: '', suite: '', city: '', state: '', zip: '', country: 'US' },
          giftRegistry: !!result.guest.giftRegistry
        };

        saveGuestSession();
        updateUIForEntitlement();

        if (result.guest.tier === GUEST_TIERS.ADMIN) {
          showToast('ADMIN UNLOCKED — NAVIGATING TO ADMIN CONSOLE...');
          setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
        } else {
          showToast(`INVITATION VERIFIED — WELCOME ${result.guest.firstName.toUpperCase()}`);
          setTimeout(() => { window.location.href = 'invitation.html'; }, 1000);
        }
      } else {
        showToast('ACCESS DENIED: EMAIL OR PHONE NOT FOUND. CONTACT HANNAH & ETHAN.');
      }
    });
  }

  if (badgeBtn) {
    badgeBtn.addEventListener('click', () => {
      if (currentGuestState.authenticated) {
        window.location.href = 'rsvp.html';
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentGuestState = {
        authenticated: false,
        firstName: '',
        lastName: '',
        name: '',
        email: '',
        mobile: '',
        household: '',
        tier: GUEST_TIERS.WEEKEND,
        plusOne: true,
        infoCompleted: false,
        address: { street: '', suite: '', city: '', state: '', zip: '', country: 'US' }
      };
      localStorage.removeItem('hannah_ethan_guest');
      localStorage.removeItem('ethan_hannah_guest');
      showToast('SESSION LOCKED — RETURNING TO GATEKEEPER');
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    });
  }
}

/* ==========================================================================
   PAGE VISIBILITY SETTINGS HELPERS
   ========================================================================== */

export function getPageSettings() {
  const stored = localStorage.getItem('hannah_ethan_page_settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  const defaults = {
    itinerary: true,
    accommodations: true,
    registry: true,
    rsvp: true
  };
  localStorage.setItem('hannah_ethan_page_settings', JSON.stringify(defaults));
  return defaults;
}

export function savePageSettings(settings) {
  localStorage.setItem('hannah_ethan_page_settings', JSON.stringify(settings));
}

function loadSavedGuestSession() {
  const saved = localStorage.getItem('hannah_ethan_guest') || localStorage.getItem('ethan_hannah_guest');
  if (saved) {
    try {
      currentGuestState = JSON.parse(saved);
      updateUIForEntitlement();
    } catch (e) {
      console.error('Error loading session', e);
    }
  } else {
    updateUIForEntitlement();
  }
}

function saveGuestSession() {
  localStorage.setItem('hannah_ethan_guest', JSON.stringify(currentGuestState));
}

function updateUIForEntitlement() {
  const badgeText = document.getElementById('badge-tier-text');
  const drawerStatusVal = document.getElementById('drawer-status-value');
  const adminDrawerLink = document.getElementById('drawer-admin-link');
  const protectedLinks = document.querySelectorAll('.protected-nav-link');

  const tierDisplayNames = {
    admin: 'Admin',
    weekend: 'Weekend',
    wedding_only: 'Wedding'
  };

  const displayTier = tierDisplayNames[currentGuestState.tier] || currentGuestState.tier || '';

  if (badgeText) {
    badgeText.textContent = currentGuestState.authenticated 
      ? `${currentGuestState.firstName || currentGuestState.name.split(' ')[0]} — ${displayTier.toUpperCase()}`
      : 'PRIVATE ACCESS GATEKEEPER';
  }

  if (drawerStatusVal) {
    drawerStatusVal.textContent = currentGuestState.authenticated
      ? `${currentGuestState.name} (${displayTier})`
      : 'Session Locked / Unverified';
  }

  if (adminDrawerLink) {
    adminDrawerLink.style.display = (currentGuestState.tier === GUEST_TIERS.ADMIN) ? 'flex' : 'none';
  }

  const invitationFooterNote = document.getElementById('invitation-footer-note');
  if (invitationFooterNote) {
    if (currentGuestState.tier === GUEST_TIERS.WEEKEND || currentGuestState.tier === GUEST_TIERS.ADMIN) {
      invitationFooterNote.textContent = 'WEEKEND CELEBRATIONS: MARCH 26 – 28, 2027';
      invitationFooterNote.style.display = 'block';
    } else {
      invitationFooterNote.textContent = 'RECEPTION TO FOLLOW';
    }
  }

  // Update footer copy dates dynamically for wedding only guests
  const footerCopy = document.querySelector('.footer-copy');
  if (footerCopy) {
    if (currentGuestState.authenticated && currentGuestState.tier === GUEST_TIERS.WEDDING_ONLY) {
      footerCopy.textContent = 'March 28, 2027 — The Biltmore Hotel, Coral Gables, Florida';
    } else {
      footerCopy.textContent = 'March 26–28, 2027 — The Biltmore Hotel, Coral Gables, Florida';
    }
  }

  // Show/Hide protected links based on authentication
  protectedLinks.forEach(link => {
    if (currentGuestState.authenticated) {
      link.style.opacity = '1';
      link.style.pointerEvents = 'auto';
    } else {
      link.style.opacity = '0.3';
      link.style.pointerEvents = 'none';
    }
  });

  // Dynamically inject "Edit Contact Details" link near the Reset Session button
  const statusCard = document.querySelector('.drawer-status-card');
  if (statusCard) {
    let editBtn = document.getElementById('drawer-edit-contact');
    
    if (currentGuestState.authenticated && currentGuestState.tier !== GUEST_TIERS.ADMIN) {
      if (!editBtn) {
        editBtn = document.createElement('button');
        editBtn.id = 'drawer-edit-contact';
        editBtn.className = 'drawer-status-btn';
        editBtn.style.marginRight = '1.5rem';
        editBtn.style.textDecoration = 'underline';
        editBtn.textContent = 'Edit Contact Details';
        editBtn.addEventListener('click', () => {
          // Close drawer
          const overlay = document.getElementById('drawer-overlay');
          const drawer = document.getElementById('slide-drawer');
          if (overlay) overlay.classList.remove('active');
          if (drawer) drawer.classList.remove('active');
          document.body.style.overflow = '';
          
          // Show contact details modal
          showContactCollectionModal();
        });
        
        const resetBtn = document.getElementById('drawer-reset-session');
        if (resetBtn) {
          resetBtn.parentNode.insertBefore(editBtn, resetBtn);
        }
      }
      editBtn.style.display = 'inline-block';
    } else {
      if (editBtn) {
        editBtn.style.display = 'none';
      }
    }
  }

  // Dynamically hide disabled sections in the drawer
  const pageSettings = getPageSettings();
  const drawerLinks = document.querySelectorAll('.drawer-link');
  drawerLinks.forEach(link => {
    const href = link.getAttribute('href');
    let showLink = true;

    if (href === 'itinerary.html' && !pageSettings.itinerary) showLink = false;
    if (href === 'accommodations.html' && !pageSettings.accommodations) showLink = false;
    if (href === 'registry.html' && (!pageSettings.registry || !currentGuestState.giftRegistry)) showLink = false;
    if (href === 'rsvp.html' && !pageSettings.rsvp) showLink = false;

    // Admin Console link should ONLY show if the user is an admin
    if (href === 'admin.html' && currentGuestState.tier !== GUEST_TIERS.ADMIN) showLink = false;

    // Admins should always see all links so they can preview/test pages!
    if (currentGuestState.tier === GUEST_TIERS.ADMIN) {
      showLink = true;
    }

    if (showLink) {
      link.style.display = 'flex';
    } else {
      link.style.display = 'none';
    }
  });

  if (document.getElementById('timeline-grid')) {
    renderTimeline();
  }
}

/* ==========================================================================
   4. TIMELINE CONTROLLER
   ========================================================================== */

function initTimeline() {
  const pillAll = document.getElementById('pill-view-weekend');
  const pillWedding = document.getElementById('pill-view-wedding');

  if (pillAll) {
    pillAll.addEventListener('click', () => {
      currentGuestState.tier = GUEST_TIERS.WEEKEND;
      pillAll.classList.add('active');
      if (pillWedding) pillWedding.classList.remove('active');
      renderTimeline();
    });
  }

  if (pillWedding) {
    pillWedding.addEventListener('click', () => {
      currentGuestState.tier = GUEST_TIERS.WEDDING_ONLY;
      pillWedding.classList.add('active');
      if (pillAll) pillAll.classList.remove('active');
      renderTimeline();
    });
  }

  renderTimeline();
}

function renderTimeline() {
  const timelineGrid = document.getElementById('timeline-grid');
  if (!timelineGrid) return;

  timelineGrid.innerHTML = '';

  EVENTS_LIST.forEach(event => {
    const isRestricted = (event.tierRequired === GUEST_TIERS.WEEKEND) && (currentGuestState.tier === GUEST_TIERS.WEDDING_ONLY);

    const card = document.createElement('div');
    card.className = `timeline-card ${isRestricted ? 'restricted' : ''}`;

    card.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-day">${event.day}</div>
        <div class="timeline-date-str">${event.date}</div>
      </div>
      <div class="timeline-content-col">
        <h4>${event.title}</h4>
        <div class="timeline-meta">
          <span>TIME: ${event.time}</span>
          <span>VENUE: ${event.venue}</span>
          <span>ATTIRE: ${event.attire}</span>
        </div>
        <p class="timeline-desc">${isRestricted ? 'This private event is reserved for guests with Full Weekend invitation entitlement.' : event.description}</p>
      </div>
    `;

    timelineGrid.appendChild(card);
  });
}

/* ==========================================================================
   5. RSVP PAGE FORM
   ========================================================================== */

function initRSVPPageForm() {
  const rsvpForm = document.getElementById('rsvp-page-form');
  if (!rsvpForm) return;

  if (currentGuestState.authenticated) {
    const emailInput = document.getElementById('rsvp-email');
    const nameInput = document.getElementById('rsvp-name');
    const tierSelect = document.getElementById('rsvp-tier');

    if (emailInput) emailInput.value = currentGuestState.email || '';
    if (nameInput) nameInput.value = currentGuestState.name || '';
    if (tierSelect) tierSelect.value = currentGuestState.tier || 'weekend';
  }

  rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('rsvp-email').value;
    const name = document.getElementById('rsvp-name').value;
    const attendance = document.querySelector('input[name="attendance"]:checked').value;
    const tier = document.getElementById('rsvp-tier').value;
    const meal = document.getElementById('rsvp-meal').value;
    const dietary = document.getElementById('rsvp-dietary').value;

    saveRsvp({ email, name, attendance, tier, meal, dietary });
    showToast(`RSVP SUBMITTED — THANK YOU, ${name.toUpperCase()}`);
    rsvpForm.reset();
  });
}

/* ==========================================================================
   6. ADMIN SUITE CONTROLLER
   ========================================================================== */

function initAdminConsole() {
  renderAdminStats();
  renderAdminTable();

  // Attach filter event listeners to trigger redraw on typing/selection
  const filterElements = [
    'filter-household', 'filter-name', 'filter-email', 'filter-mobile',
    'filter-address', 'filter-tier', 'filter-registry', 'filter-rsvp', 'filter-completed',
    'filter-addedby', 'filter-addedat'
  ];
  filterElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        renderAdminTable();
      });
    }
  });

  const addGuestForm = document.getElementById('add-guest-form');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const importCsvBtn = document.getElementById('btn-import-csv');
  const csvPasteArea = document.getElementById('csv-paste-area');

  if (addGuestForm) {
    addGuestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = document.getElementById('new-guest-first').value.trim();
      const lastName = document.getElementById('new-guest-last').value.trim();
      const email = document.getElementById('new-guest-email').value.trim();
      const mobile = document.getElementById('new-guest-mobile').value.trim();
      const household = document.getElementById('new-guest-household').value.trim();
      const tier = document.getElementById('new-guest-tier').value;
      const registryVal = document.getElementById('new-guest-registry').value;
      const note = document.getElementById('new-guest-note').value.trim();

      const res = await addGuest({ 
        firstName, 
        lastName, 
        name: `${firstName} ${lastName}`, 
        email, 
        mobile, 
        household, 
        tier, 
        plusOne: false, 
        note,
        addedBy: currentGuestState.email || 'admin',
        addedAt: new Date().toISOString(),
        giftRegistry: (registryVal === 'yes')
      });

      if (res.success) {
        showToast(`ADDED GUEST: ${firstName.toUpperCase()} ${lastName.toUpperCase()}`);
        addGuestForm.reset();
        await renderAdminStats();
        await renderAdminTable();
      } else {
        showToast(`ERROR: ${res.message.toUpperCase()}`);
      }
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportGuestListCSV);
  }

  if (importCsvBtn && csvPasteArea) {
    importCsvBtn.addEventListener('click', async () => {
      const csvText = csvPasteArea.value;

      if (!csvText.trim()) {
        showToast('ERROR: CSV DATA BOX IS EMPTY');
        return;
      }

      const res = await importGuestsFromCSV(csvText, currentGuestState.email || 'import');
      if (res.success) {
        showToast(res.message.toUpperCase());
        csvPasteArea.value = '';
        await renderAdminStats();
        await renderAdminTable();
      } else {
        showToast(`ERROR: ${res.message.toUpperCase()}`);
      }
    });
  }

  // Hook up visibility control checkboxes
  const settings = getPageSettings();
  const toggleItinerary = document.getElementById('toggle-itinerary');
  const toggleAccommodations = document.getElementById('toggle-accommodations');
  const toggleRegistry = document.getElementById('toggle-registry');
  const toggleRsvp = document.getElementById('toggle-rsvp');

  if (toggleItinerary) {
    toggleItinerary.checked = settings.itinerary;
    toggleItinerary.addEventListener('change', (e) => {
      settings.itinerary = e.target.checked;
      savePageSettings(settings);
      showToast(`ITINERARY SECTION ${settings.itinerary ? 'ENABLED' : 'DISABLED'}`);
    });
  }
  if (toggleAccommodations) {
    toggleAccommodations.checked = settings.accommodations;
    toggleAccommodations.addEventListener('change', (e) => {
      settings.accommodations = e.target.checked;
      savePageSettings(settings);
      showToast(`ACCOMMODATIONS SECTION ${settings.accommodations ? 'ENABLED' : 'DISABLED'}`);
    });
  }
  if (toggleRegistry) {
    toggleRegistry.checked = settings.registry;
    toggleRegistry.addEventListener('change', (e) => {
      settings.registry = e.target.checked;
      savePageSettings(settings);
      showToast(`REGISTRY SECTION ${settings.registry ? 'ENABLED' : 'DISABLED'}`);
    });
  }
  if (toggleRsvp) {
    toggleRsvp.checked = settings.rsvp;
    toggleRsvp.addEventListener('change', (e) => {
      settings.rsvp = e.target.checked;
      savePageSettings(settings);
      showToast(`RSVP SECTION ${settings.rsvp ? 'ENABLED' : 'DISABLED'}`);
    });
  }
}

async function renderAdminStats() {
  const list = await getGuestList();
  const rsvps = await getRsvpList();

  const totalGuestsEl = document.getElementById('stat-total-guests');
  const weekendCountEl = document.getElementById('stat-weekend-count');
  const rsvpAcceptedEl = document.getElementById('stat-rsvp-accepted');

  if (totalGuestsEl) totalGuestsEl.textContent = list.length;
  if (weekendCountEl) weekendCountEl.textContent = list.filter(g => g.tier === GUEST_TIERS.WEEKEND || g.tier === GUEST_TIERS.ADMIN).length;
  if (rsvpAcceptedEl) rsvpAcceptedEl.textContent = rsvps.filter(r => r.attendance === 'accept').length;
}

async function renderAdminTable() {
  const tbody = document.getElementById('admin-guest-table-body');
  if (!tbody) return;

  const list = await getGuestList();
  const rsvps = await getRsvpList();
  tbody.innerHTML = '';

  // Get active filter values
  const filterHousehold = (document.getElementById('filter-household')?.value || '').toLowerCase();
  const filterName = (document.getElementById('filter-name')?.value || '').toLowerCase();
  const filterEmail = (document.getElementById('filter-email')?.value || '').toLowerCase();
  const filterMobile = (document.getElementById('filter-mobile')?.value || '').toLowerCase();
  const filterAddress = (document.getElementById('filter-address')?.value || '').toLowerCase();
  const filterTier = document.getElementById('filter-tier')?.value || '';
  const filterRegistry = document.getElementById('filter-registry')?.value || '';
  const filterRsvp = document.getElementById('filter-rsvp')?.value || '';
  const filterCompleted = document.getElementById('filter-completed')?.value || '';
  const filterAddedBy = (document.getElementById('filter-addedby')?.value || '').toLowerCase();
  const filterAddedAt = (document.getElementById('filter-addedat')?.value || '').toLowerCase();

  const filteredList = list.filter(guest => {
    if (filterHousehold && !guest.household?.toLowerCase().includes(filterHousehold)) return false;
    if (filterName && !guest.name?.toLowerCase().includes(filterName)) return false;
    if (filterEmail && !guest.email?.toLowerCase().includes(filterEmail)) return false;
    if (filterMobile && !normalizePhone(guest.mobile).includes(normalizePhone(filterMobile))) return false;
    
    if (filterAddress) {
      const a = guest.address || {};
      const fullAddr = `${a.street} ${a.suite} ${a.city} ${a.state} ${a.zip} ${a.country}`.toLowerCase();
      if (!fullAddr.includes(filterAddress)) return false;
    }
    
    if (filterTier && guest.tier !== filterTier) return false;
    
    if (filterRegistry) {
      const allowed = guest.giftRegistry ? 'yes' : 'no';
      if (allowed !== filterRegistry) return false;
    }
    
    const rsvpMatch = rsvps.find(r => 
      (guest.email && r.email && r.email.toLowerCase() === guest.email.toLowerCase()) || 
      (guest.name && r.name && r.name.toLowerCase() === guest.name.toLowerCase())
    );
    const rsvpStatus = rsvpMatch ? rsvpMatch.attendance : 'pending';
    if (filterRsvp && rsvpStatus !== filterRsvp) return false;
    
    const completed = guest.infoCompleted ? 'yes' : 'no';
    if (filterCompleted && completed !== filterCompleted) return false;

    if (filterAddedBy && !guest.addedBy?.toLowerCase().includes(filterAddedBy)) return false;

    if (filterAddedAt) {
      const dateStr = guest.addedAt ? new Date(guest.addedAt).toLocaleString().toLowerCase() : '';
      if (!dateStr.includes(filterAddedAt)) return false;
    }
    
    return true;
  });

  filteredList.forEach(guest => {
    const guestIdentifier = guest.email || guest.mobile || guest.name;
    const isEditing = (editingIdentifier === guestIdentifier);

    // Try to match RSVP by email first, fallback to name
    const rsvpMatch = rsvps.find(r => 
      (guest.email && r.email && r.email.toLowerCase() === guest.email.toLowerCase()) || 
      (guest.name && r.name && r.name.toLowerCase() === guest.name.toLowerCase())
    );

    let addrStr = '—';
    if (guest.address && guest.address.street) {
      const a = guest.address;
      addrStr = `${a.street}${a.suite ? ', ' + a.suite : ''}, ${a.city}, ${a.state} ${a.zip} (${a.country})`;
    }

    const tr = document.createElement('tr');

    if (isEditing) {
      // Build comma-separated address value for easy inline editing
      let addrInputVal = '';
      if (guest.address && guest.address.street) {
        const a = guest.address;
        addrInputVal = [a.street || '', a.suite || '', a.city || '', a.state || '', a.zip || '', a.country || 'US'].filter(Boolean).join(', ');
      }

      tr.innerHTML = `
        <td><input type="text" class="lookup-input grid-edit-household" value="${guest.household || ''}" style="width: 100px; text-align: left; padding: 4px; font-size: 0.8rem;"></td>
        <td>
          <input type="text" class="lookup-input grid-edit-first" value="${guest.firstName || ''}" placeholder="First" style="width: 70px; text-align: left; padding: 4px; font-size: 0.8rem; display: inline-block; margin-bottom: 2px;">
          <input type="text" class="lookup-input grid-edit-last" value="${guest.lastName || ''}" placeholder="Last" style="width: 70px; text-align: left; padding: 4px; font-size: 0.8rem; display: inline-block;">
        </td>
        <td><input type="email" class="lookup-input grid-edit-email" value="${guest.email || ''}" style="width: 130px; text-align: left; padding: 4px; font-size: 0.8rem;"></td>
        <td><input type="text" class="lookup-input grid-edit-mobile" value="${guest.mobile || ''}" style="width: 100px; text-align: left; padding: 4px; font-size: 0.8rem;"></td>
        <td><input type="text" class="lookup-input grid-edit-address" value="${addrInputVal}" placeholder="Street, Suite, City, State, Zip, Country" style="width: 180px; text-align: left; padding: 4px; font-size: 0.75rem;"></td>
        <td>
          <select class="lookup-input grid-edit-tier" style="width: 100px; height: 32px; padding: 4px; font-size: 0.8rem;">
            <option value="weekend" ${guest.tier === 'weekend' ? 'selected' : ''}>WEEKEND</option>
            <option value="wedding_only" ${guest.tier === 'wedding_only' ? 'selected' : ''}>WEDDING_ONLY</option>
            <option value="admin" ${guest.tier === 'admin' ? 'selected' : ''}>ADMIN</option>
          </select>
        </td>
        <td>
          <select class="lookup-input grid-edit-registry" style="width: 70px; height: 32px; padding: 4px; font-size: 0.8rem;">
            <option value="yes" ${guest.giftRegistry ? 'selected' : ''}>YES</option>
            <option value="no" ${!guest.giftRegistry ? 'selected' : ''}>NO</option>
          </select>
        </td>
        <td>${rsvpMatch ? (rsvpMatch.attendance === 'accept' ? 'ACCEPTED' : 'DECLINED') : 'PENDING'}</td>
        <td>${guest.infoCompleted ? '✓' : '—'}</td>
        <td style="font-size: 0.75rem;">${guest.addedBy || 'system'}</td>
        <td style="font-size: 0.75rem;">${guest.addedAt ? new Date(guest.addedAt).toLocaleString() : '—'}</td>
        <td>
          <button class="btn-table-action save" data-identifier="${guestIdentifier}" style="margin-bottom: 2px;">Save</button>
          <button class="btn-table-action cancel" style="color: var(--text-secondary);">Cancel</button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td><strong>${guest.household || '—'}</strong></td>
        <td><strong>${guest.name}</strong></td>
        <td>${guest.email || '—'}</td>
        <td>${guest.mobile || '—'}</td>
        <td style="font-size: 0.75rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${addrStr}">${addrStr}</td>
        <td><span class="badge-tier ${guest.tier || 'weekend'}">${(guest.tier || '').toUpperCase()}</span></td>
        <td><span style="font-size: 0.8rem; font-weight: 500; color: ${guest.giftRegistry ? 'green' : 'red'};">${guest.giftRegistry ? 'YES' : 'NO'}</span></td>
        <td>${rsvpMatch ? (rsvpMatch.attendance === 'accept' ? 'ACCEPTED' : 'DECLINED') : 'PENDING'}</td>
        <td>${guest.infoCompleted ? '✓' : '—'}</td>
        <td style="font-size: 0.75rem;">${guest.addedBy || 'system'}</td>
        <td style="font-size: 0.75rem;">${guest.addedAt ? new Date(guest.addedAt).toLocaleString() : '—'}</td>
        <td>
          <button class="btn-table-action edit" data-identifier="${guestIdentifier}">Edit</button>
          <button class="btn-table-action delete" data-identifier="${guestIdentifier}">Delete</button>
        </td>
      `;
    }

    tbody.appendChild(tr);
  });

  // Attach Edit action listeners
  document.querySelectorAll('.btn-table-action.edit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      editingIdentifier = e.target.getAttribute('data-identifier');
      await renderAdminTable();
    });
  });

  // Attach Cancel action listeners
  document.querySelectorAll('.btn-table-action.cancel').forEach(btn => {
    btn.addEventListener('click', async () => {
      editingIdentifier = null;
      await renderAdminTable();
    });
  });

  // Attach Save action listeners
  document.querySelectorAll('.btn-table-action.save').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const identifier = e.target.getAttribute('data-identifier');
      const row = e.target.closest('tr');

      const household = row.querySelector('.grid-edit-household').value.trim();
      const firstName = row.querySelector('.grid-edit-first').value.trim();
      const lastName = row.querySelector('.grid-edit-last').value.trim();
      const email = row.querySelector('.grid-edit-email').value.trim();
      const mobile = row.querySelector('.grid-edit-mobile').value.trim();
      const tier = row.querySelector('.grid-edit-tier').value;
      const registryVal = row.querySelector('.grid-edit-registry').value;
      const addrStr = row.querySelector('.grid-edit-address').value.trim();

      if (!firstName || !lastName || !household) {
        showToast('ERROR: HOUSEHOLD, FIRST AND LAST NAMES ARE REQUIRED');
        return;
      }

      // Parse address: Street, Suite, City, State, Zip, Country
      let address = { street: '', suite: '', city: '', state: '', zip: '', country: 'US' };
      if (addrStr) {
        const parts = addrStr.split(',').map(p => p.trim());
        address = {
          street: parts[0] || '',
          suite: parts[1] || '',
          city: parts[2] || '',
          state: parts[3] || '',
          zip: parts[4] || '',
          country: parts[5] || 'US'
        };
      }

      const updatedData = {
        household,
        firstName,
        lastName,
        email,
        mobile,
        tier,
        address,
        giftRegistry: (registryVal === 'yes')
      };

      const res = await updateGuestDirectly(identifier, updatedData);
      if (res.success) {
        showToast('GUEST INFORMATION UPDATED');
        editingIdentifier = null;
        await renderAdminStats();
        await renderAdminTable();
      } else {
        showToast(`ERROR: ${res.message.toUpperCase()}`);
      }
    });
  });

  // Attach Delete action listeners
  document.querySelectorAll('.btn-table-action.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const identifier = e.target.getAttribute('data-identifier');
      if (confirm(`Remove ${identifier} from guest database?`)) {
        await deleteGuest(identifier);
        await renderAdminStats();
        await renderAdminTable();
        showToast(`DELETED GUEST: ${identifier}`);
      }
    });
  });
}

async function exportGuestListCSV() {
  const list = await getGuestList();
  const rsvps = await getRsvpList();

  let csv = 'Household,First_Name,Last_Name,Email,Mobile,Street,Suite,City,State,Zip,Country,Tier,Gift_Registry,Note,RSVP_Status,Meal_Selection,Dietary_Notes,Added_By,Added_At\n';

  list.forEach(g => {
    const r = rsvps.find(item => 
      (g.email && item.email.toLowerCase() === g.email.toLowerCase()) || 
      (item.name.toLowerCase() === g.name.toLowerCase())
    );
    const rsvpStatus = r ? r.attendance : 'PENDING';
    const meal = r ? r.meal : 'N/A';
    const dietary = r ? `"${(r.dietary || '').replace(/"/g, '""')}"` : 'N/A';
    const street = g.address ? `"${(g.address.street || '').replace(/"/g, '""')}"` : '""';
    const suite = g.address ? `"${(g.address.suite || '').replace(/"/g, '""')}"` : '""';
    const city = g.address ? `"${(g.address.city || '').replace(/"/g, '""')}"` : '""';
    const state = g.address ? `"${(g.address.state || '').replace(/"/g, '""')}"` : '""';
    const zip = g.address ? `"${(g.address.zip || '').replace(/"/g, '""')}"` : '""';
    const country = g.address ? `"${(g.address.country || '').replace(/"/g, '""')}"` : '""';

    csv += `"${g.household || ''}","${g.firstName || ''}","${g.lastName || ''}","${g.email || ''}","${g.mobile || ''}",${street},${suite},${city},${state},${zip},${country},"${g.tier}","${g.giftRegistry ? 'Yes' : 'No'}","${g.note || ''}","${rsvpStatus}","${meal}",${dietary},"${g.addedBy || 'system'}","${g.addedAt || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Hannah_Ethan_Wedding_GuestList_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
  showToast('EXPORTED GUEST LIST CSV');
}

/* ==========================================================================
   7. TOAST NOTIFICATION
   ========================================================================== */

function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4500);
}

/* ==========================================================================
   8. BLOCKING HOUSEHOLD CONTACT DETAILS MODAL
   ========================================================================== */

function checkContactInfoModal() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isGatekeeperPage = (currentPath === 'index.html' || currentPath === '');
  const isAdminPage = (currentPath === 'admin.html');

  if (currentGuestState.authenticated && !currentGuestState.infoCompleted && currentGuestState.tier !== GUEST_TIERS.ADMIN && !isGatekeeperPage && !isAdminPage) {
    showContactCollectionModal();
  }
}

async function showContactCollectionModal() {
  // Prevent double rendering
  if (document.getElementById('contact-collection-modal')) return;

  const list = await getGuestList();
  const householdId = currentGuestState.household;
  const members = list.filter(g => g.household && g.household === householdId);
  
  if (members.length === 0) return; // safety check

  const defaultAddress = members[0].address || { street: '', suite: '', city: '', state: '', zip: '', country: 'US' };

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'contact-modal-overlay active';
  overlay.id = 'contact-collection-modal';

  // Create modal window
  const windowEl = document.createElement('div');
  windowEl.className = 'contact-modal-window';

  // Modal header
  let headerHtml = `
    <div class="contact-modal-header">
      <div class="contact-modal-title">Confirm Contact Details</div>
      <p class="contact-modal-subtitle">
        Please verify your mailing address and the contact info for each member of your household to help us coordinate invitations and wedding updates.
      </p>
    </div>
  `;

  // Build tabs header and panels
  let tabsHeaderHtml = '<div class="household-tabs-nav">';
  let panelsHtml = '<div class="household-tabs-content">';

  members.forEach((member, index) => {
    const isActive = index === 0 ? 'active' : '';
    const displayName = member.firstName || member.name.split(' ')[0] || `Guest ${index + 1}`;
    
    tabsHeaderHtml += `
      <button type="button" class="household-tab-btn ${isActive}" data-member-idx="${index}">
        ${displayName}
      </button>
    `;

    // Parse phone and country code from database
    let phoneVal = member.mobile || '';
    let selectedCountry = '1';
    
    if (phoneVal.startsWith('+')) {
      const parts = phoneVal.split(' ');
      if (parts.length > 1) {
        selectedCountry = parts[0].replace('+', '');
        phoneVal = parts.slice(1).join(' ');
      }
    }

    panelsHtml += `
      <div class="household-tab-panel ${isActive}" id="member-panel-${index}">
        <div class="form-grid-member">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" class="lookup-input member-first-name" data-idx="${index}" value="${member.firstName || ''}" required style="text-align: left;">
          </div>
          <div class="form-group">
            <label>Last Name</label>
            <input type="text" class="lookup-input member-last-name" data-idx="${index}" value="${member.lastName || ''}" required style="text-align: left;">
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" class="lookup-input member-email" data-idx="${index}" value="${member.email || ''}" placeholder="email@domain.com" style="text-align: left;">
          </div>
          <div class="form-group">
            <label>Mobile Phone</label>
            <div class="phone-input-combo">
              <select class="phone-country-select member-phone-country" data-idx="${index}">
                <option value="1" ${selectedCountry === '1' ? 'selected' : ''}>US (+1)</option>
                <option value="44" ${selectedCountry === '44' ? 'selected' : ''}>UK (+44)</option>
                <option value="972" ${selectedCountry === '972' ? 'selected' : ''}>IL (+972)</option>
                <option value="33" ${selectedCountry === '33' ? 'selected' : ''}>FR (+33)</option>
                <option value="39" ${selectedCountry === '39' ? 'selected' : ''}>IT (+39)</option>
                <option value="1-CA" ${selectedCountry === '1-CA' ? 'selected' : ''}>CA (+1)</option>
                <option value="other" ${selectedCountry === 'other' ? 'selected' : ''}>Other</option>
              </select>
              <input type="text" class="lookup-input member-mobile-input" data-idx="${index}" value="${phoneVal}" placeholder="(555) 555-5555" style="text-align: left;">
            </div>
          </div>
        </div>
      </div>
    `;
  });

  tabsHeaderHtml += '</div>';
  panelsHtml += '</div>';

  // Assemble full body HTML
  let bodyHtml = `
    <form id="contact-collection-form">
      <div class="contact-modal-body">
        <h4 class="contact-modal-section-title">Mailing Address</h4>
        
        <div class="form-grid-address">
          <div class="form-group full-width">
            <label>Street Address</label>
            <input type="text" id="modal-addr-street" class="lookup-input" value="${defaultAddress.street || ''}" placeholder="123 Orchard Road" required style="text-align: left;">
          </div>
          <div class="form-group">
            <label>Apt / Suite</label>
            <input type="text" id="modal-addr-suite" class="lookup-input" value="${defaultAddress.suite || ''}" placeholder="Apt 4B" style="text-align: left;">
          </div>
          <div class="form-group">
            <label>City</label>
            <input type="text" id="modal-addr-city" class="lookup-input" value="${defaultAddress.city || ''}" placeholder="Miami" required style="text-align: left;">
          </div>
        </div>

        <div class="form-grid-address-3col">
          <div class="form-group">
            <label>State / Province</label>
            <input type="text" id="modal-addr-state" class="lookup-input" value="${defaultAddress.state || ''}" placeholder="FL" required style="text-align: left;">
          </div>
          <div class="form-group">
            <label>Zip / Postal Code</label>
            <input type="text" id="modal-addr-zip" class="lookup-input" value="${defaultAddress.zip || ''}" placeholder="33134" required style="text-align: left;">
          </div>
          <div class="form-group">
            <label>Country</label>
            <select id="modal-addr-country" class="phone-country-select" style="width: 100%; height: 42px;">
              <option value="US" ${defaultAddress.country === 'US' ? 'selected' : ''}>United States</option>
              <option value="CA" ${defaultAddress.country === 'CA' ? 'selected' : ''}>Canada</option>
              <option value="GB" ${defaultAddress.country === 'GB' ? 'selected' : ''}>United Kingdom</option>
              <option value="IL" ${defaultAddress.country === 'IL' ? 'selected' : ''}>Israel</option>
              <option value="FR" ${defaultAddress.country === 'FR' ? 'selected' : ''}>France</option>
              <option value="IT" ${defaultAddress.country === 'IT' ? 'selected' : ''}>Italy</option>
              <option value="Other" ${defaultAddress.country === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <h4 class="contact-modal-section-title">Guests</h4>
        ${tabsHeaderHtml}
        ${panelsHtml}
      </div>

      <div class="contact-modal-footer">
        <button type="submit" class="contact-modal-submit-btn">Save & Continue</button>
      </div>
    </form>
  `;

  windowEl.innerHTML = headerHtml + bodyHtml;
  overlay.appendChild(windowEl);
  document.body.appendChild(overlay);

  // Disable background scrolling
  document.body.style.overflow = 'hidden';

  // Attach tab row switchers
  const tabBtns = windowEl.querySelectorAll('.household-tab-btn');
  const panels = windowEl.querySelectorAll('.household-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.getAttribute('data-member-idx');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      panels.forEach(p => p.classList.remove('active'));
      windowEl.querySelector(`#member-panel-${idx}`).classList.add('active');
    });
  });

  // Attach formatting handlers to inputs
  const mobileInputs = windowEl.querySelectorAll('.member-mobile-input');
  mobileInputs.forEach(input => {
    const idx = input.getAttribute('data-idx');
    const countrySelect = windowEl.querySelector(`.member-phone-country[data-idx="${idx}"]`);

    function applyFormat() {
      if (countrySelect.value === '1' || countrySelect.value === '1-CA') {
        let val = input.value.replace(/[^\d]/g, '');
        if (val.length > 10) val = val.slice(0, 10);
        if (val.length > 6) {
          input.value = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
        } else if (val.length > 3) {
          input.value = `(${val.slice(0, 3)}) ${val.slice(3)}`;
        } else {
          input.value = val;
        }
      }
    }

    input.addEventListener('input', applyFormat);
    countrySelect.addEventListener('change', applyFormat);
    applyFormat();
  });

  // Handle Form Submission
  const form = windowEl.querySelector('#contact-collection-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const address = {
      street: document.getElementById('modal-addr-street').value.trim(),
      suite: document.getElementById('modal-addr-suite').value.trim(),
      city: document.getElementById('modal-addr-city').value.trim(),
      state: document.getElementById('modal-addr-state').value.trim(),
      zip: document.getElementById('modal-addr-zip').value.trim(),
      country: document.getElementById('modal-addr-country').value
    };

    const updatedMembers = [];
    let validationPassed = true;

    members.forEach((member, index) => {
      const fNameInput = windowEl.querySelector(`.member-first-name[data-idx="${index}"]`);
      const lNameInput = windowEl.querySelector(`.member-last-name[data-idx="${index}"]`);
      const emailInput = windowEl.querySelector(`.member-email[data-idx="${index}"]`);
      const mobileInput = windowEl.querySelector(`.member-mobile-input[data-idx="${index}"]`);
      const countrySelect = windowEl.querySelector(`.member-phone-country[data-idx="${index}"]`);

      const fName = fNameInput.value.trim();
      const lName = lNameInput.value.trim();
      const email = emailInput.value.trim();
      const mobileRaw = mobileInput.value.trim();
      const countryCode = countrySelect.value;

      if (!fName || !lName) {
        validationPassed = false;
        fNameInput.style.borderColor = 'red';
        lNameInput.style.borderColor = 'red';
      } else {
        fNameInput.style.borderColor = '';
        lNameInput.style.borderColor = '';
      }

      let mobile = mobileRaw;
      if (mobileRaw && countryCode !== 'other') {
        const cleanCode = countryCode.split('-')[0];
        mobile = `+${cleanCode} ${mobileRaw}`;
      }

      updatedMembers.push({
        id: member.id,
        firstName: fName,
        lastName: lName,
        email: email,
        mobile: mobile
      });
    });

    if (!validationPassed) {
      showToast('ERROR: PLEASE COMPLETE ALL NAMES');
      return;
    }

    const updated = await updateHouseholdInfo(householdId, address, updatedMembers);

    // Update current guest state
    currentGuestState.infoCompleted = true;
    currentGuestState.address = address;

    // Refresh currently logged-in guest session values from updated records
    const activeMatch = updated.find(m => {
      if (currentGuestState.email && m.email.toLowerCase() === currentGuestState.email.toLowerCase()) return true;
      if (currentGuestState.mobile && normalizePhone(m.mobile) === normalizePhone(currentGuestState.mobile)) return true;
      return false;
    }) || updated[0];

    currentGuestState.firstName = activeMatch.firstName;
    currentGuestState.lastName = activeMatch.lastName;
    currentGuestState.name = activeMatch.name;
    currentGuestState.email = activeMatch.email;
    currentGuestState.mobile = activeMatch.mobile;

    saveGuestSession();

    overlay.remove();
    document.body.style.overflow = '';

    showToast('THANK YOU — CONTACT INFORMATION VERIFIED');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  });
}
