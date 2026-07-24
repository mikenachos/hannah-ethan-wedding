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
  saveRsvp 
} from './invitees.js';

// Application State
let currentGuestState = {
  authenticated: false,
  email: '',
  name: '',
  tier: GUEST_TIERS.WEEKEND,
  plusOne: true
};

document.addEventListener('DOMContentLoaded', () => {
  loadSavedGuestSession();
  checkRouteGuard();
  initDrawer();
  initEntitlementLookup();
  highlightActiveNav();

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
    overlay.classList.add('active');
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    overlay.classList.remove('active');
    drawer.classList.remove('active');
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

  if (lookupForm) {
    lookupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = lookupInput.value.trim();
      if (!email) return;

      const result = lookupGuestEntitlement(email);

      if (result.found) {
        currentGuestState = {
          authenticated: true,
          email: result.guest.email,
          name: result.guest.name,
          tier: result.guest.tier,
          plusOne: result.guest.plusOne
        };

        saveGuestSession();
        updateUIForEntitlement();

        if (result.guest.tier === GUEST_TIERS.ADMIN) {
          showToast('ADMIN UNLOCKED — NAVIGATING TO ADMIN CONSOLE...');
          setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
        } else {
          showToast(`INVITATION VERIFIED — WELCOME ${result.guest.name.toUpperCase()}`);
          setTimeout(() => { window.location.href = 'invitation.html'; }, 1000);
        }
      } else {
        showToast('ACCESS DENIED: EMAIL NOT FOUND ON INVITY LIST. CONTACT HANNAH & ETHAN.');
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
        email: '',
        name: '',
        tier: GUEST_TIERS.WEEKEND,
        plusOne: true
      };
      localStorage.removeItem('hannah_ethan_guest');
      localStorage.removeItem('ethan_hannah_guest');
      showToast('SESSION LOCKED — RETURNING TO GATEKEEPER');
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    });
  }
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

  if (badgeText) {
    badgeText.textContent = currentGuestState.authenticated 
      ? `${currentGuestState.name.split(' ')[0]} — ${currentGuestState.tier.toUpperCase()}`
      : 'PRIVATE ACCESS GATEKEEPER';
  }

  if (drawerStatusVal) {
    drawerStatusVal.textContent = currentGuestState.authenticated
      ? `${currentGuestState.name} (${currentGuestState.tier.toUpperCase()})`
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

    if (emailInput) emailInput.value = currentGuestState.email;
    if (nameInput) nameInput.value = currentGuestState.name;
    if (tierSelect) tierSelect.value = currentGuestState.tier;
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

  const addGuestForm = document.getElementById('add-guest-form');
  const exportCsvBtn = document.getElementById('export-csv-btn');

  if (addGuestForm) {
    addGuestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('new-guest-email').value;
      const name = document.getElementById('new-guest-name').value;
      const tier = document.getElementById('new-guest-tier').value;
      const note = document.getElementById('new-guest-note').value;

      const res = addGuest({ email, name, tier, plusOne: true, note });
      if (res.success) {
        showToast(`ADDED GUEST: ${name.toUpperCase()}`);
        addGuestForm.reset();
        renderAdminStats();
        renderAdminTable();
      } else {
        showToast(`ERROR: ${res.message.toUpperCase()}`);
      }
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportGuestListCSV);
  }
}

function renderAdminStats() {
  const list = getGuestList();
  const rsvps = getRsvpList();

  const totalGuestsEl = document.getElementById('stat-total-guests');
  const weekendCountEl = document.getElementById('stat-weekend-count');
  const rsvpAcceptedEl = document.getElementById('stat-rsvp-accepted');

  if (totalGuestsEl) totalGuestsEl.textContent = list.length;
  if (weekendCountEl) weekendCountEl.textContent = list.filter(g => g.tier === GUEST_TIERS.WEEKEND || g.tier === GUEST_TIERS.ADMIN).length;
  if (rsvpAcceptedEl) rsvpAcceptedEl.textContent = rsvps.filter(r => r.attendance === 'accept').length;
}

function renderAdminTable() {
  const tbody = document.getElementById('admin-guest-table-body');
  if (!tbody) return;

  const list = getGuestList();
  const rsvps = getRsvpList();
  tbody.innerHTML = '';

  list.forEach(guest => {
    const rsvpMatch = rsvps.find(r => r.email.toLowerCase() === guest.email.toLowerCase());
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td><strong>${guest.name}</strong></td>
      <td>${guest.email}</td>
      <td><span class="badge-tier ${guest.tier}">${guest.tier.toUpperCase()}</span></td>
      <td>${rsvpMatch ? (rsvpMatch.attendance === 'accept' ? 'ACCEPTED' : 'DECLINED') : 'PENDING'}</td>
      <td>${guest.note || '—'}</td>
      <td>
        <button class="btn-table-action delete" data-email="${guest.email}">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-table-action.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const email = e.target.getAttribute('data-email');
      if (confirm(`Remove ${email} from guest database?`)) {
        deleteGuest(email);
        renderAdminStats();
        renderAdminTable();
        showToast(`DELETED GUEST: ${email}`);
      }
    });
  });
}

function exportGuestListCSV() {
  const list = getGuestList();
  const rsvps = getRsvpList();

  let csv = 'Name,Email,Tier,Note,RSVP_Status,Meal_Selection,Dietary_Notes\n';

  list.forEach(g => {
    const r = rsvps.find(item => item.email.toLowerCase() === g.email.toLowerCase());
    const rsvpStatus = r ? r.attendance : 'PENDING';
    const meal = r ? r.meal : 'N/A';
    const dietary = r ? `"${(r.dietary || '').replace(/"/g, '""')}"` : 'N/A';

    csv += `"${g.name}","${g.email}","${g.tier}","${g.note || ''}","${rsvpStatus}","${meal}",${dietary}\n`;
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
