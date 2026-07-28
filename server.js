import express from 'express';
import cors from 'cors';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Enable JSON body parsing and CORS
app.use(express.json());
app.use(cors());

// Configure database path. Render persistent disks are mounted,
// we default to data/wedding.db if environment var is set, or local wedding.db
const dbDir = process.env.DATABASE_DIR || '.';
const dbPath = path.join(dbDir, 'wedding.db');

// Ensure database directory exists
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

// Initialize Database
async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create guests table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      name TEXT,
      email TEXT,
      mobile TEXT,
      household TEXT,
      tier TEXT,
      plusOne INTEGER DEFAULT 0,
      note TEXT,
      street TEXT,
      suite TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT,
      infoCompleted INTEGER DEFAULT 0
    )
  `);

  // Create rsvps table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS rsvps (
      email TEXT PRIMARY KEY,
      name TEXT,
      attendance TEXT,
      tier TEXT,
      meal TEXT,
      dietary TEXT,
      timestamp TEXT
    )
  `);

  // Seed default admin logins if empty
  const count = await db.get('SELECT COUNT(*) as count FROM guests');
  if (count.count === 0) {
    const defaultAdmins = [
      {
        firstName: 'Hannah',
        lastName: 'Levine',
        name: 'Hannah Levine',
        email: 'hannah@example.com',
        mobile: '',
        household: 'Levine-Nachmani-Hannah',
        tier: 'admin',
        plusOne: 1,
        note: 'Bride & Admin'
      },
      {
        firstName: 'Ethan',
        lastName: 'Nachmani',
        name: 'Ethan Nachmani',
        email: 'ethan@example.com',
        mobile: '',
        household: 'Levine-Nachmani-Hannah',
        tier: 'admin',
        plusOne: 1,
        note: 'Groom & Admin'
      },
      {
        firstName: 'System',
        lastName: 'Admin',
        name: 'Hannah & Ethan (Admin)',
        email: 'admin@biltmore.com',
        mobile: '',
        household: 'Biltmore-Admins-System',
        tier: 'admin',
        plusOne: 1,
        note: 'System Admin'
      },
      {
        firstName: 'Ethan & Hannah',
        lastName: 'Admin',
        name: 'Ethan & Hannah (Admin)',
        email: 'admin@nachmani.com',
        mobile: '',
        household: 'Nachmani-Admins-Ethan',
        tier: 'admin',
        plusOne: 1,
        note: 'System Admin'
      }
    ];

    for (const admin of defaultAdmins) {
      await db.run(
        `INSERT INTO guests (
          firstName, lastName, name, email, mobile, household, tier, plusOne, note,
          street, suite, city, state, zip, country, infoCompleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', '', 'US', 0)`,
        admin.firstName, admin.lastName, admin.name, admin.email, admin.mobile,
        admin.household, admin.tier, admin.plusOne, admin.note
      );
    }
    console.log('Seeded database with default admin accounts.');
  }
}

// REST API Endpoints
app.get('/api/guests', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM guests');
    const mapped = rows.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      name: r.name,
      email: r.email,
      mobile: r.mobile,
      household: r.household,
      tier: r.tier,
      plusOne: !!r.plusOne,
      note: r.note,
      address: {
        street: r.street || '',
        suite: r.suite || '',
        city: r.city || '',
        state: r.state || '',
        zip: r.zip || '',
        country: r.country || 'US'
      },
      infoCompleted: !!r.infoCompleted
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/guests/add', async (req, res) => {
  try {
    const g = req.body;
    // Check duplicates by name and household
    const duplicate = await db.get(
      `SELECT * FROM guests WHERE LOWER(name) = ? AND LOWER(household) = ?`,
      g.name.toLowerCase(), g.household.toLowerCase()
    );
    if (duplicate) {
      return res.json({ success: false, message: 'A guest with this name already exists in this household.' });
    }

    const addr = g.address || {};
    await db.run(
      `INSERT INTO guests (
        firstName, lastName, name, email, mobile, household, tier, plusOne, note,
        street, suite, city, state, zip, country, infoCompleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      g.firstName, g.lastName, g.name, g.email || '', g.mobile || '', g.household, g.tier,
      g.plusOne ? 1 : 0, g.note || '',
      addr.street || '', addr.suite || '', addr.city || '', addr.state || '', addr.zip || '', addr.country || 'US',
      g.infoCompleted ? 1 : 0
    );
    res.json({ success: true, guest: g });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/guests/update', async (req, res) => {
  try {
    const { originalIdentifier, updatedGuestData } = req.body;
    const cleanTerm = originalIdentifier.trim().toLowerCase();

    // Find the guest
    const guest = await db.get(
      `SELECT * FROM guests WHERE LOWER(email) = ? OR mobile = ? OR LOWER(name) = ?`,
      cleanTerm, cleanTerm, cleanTerm
    );

    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    const firstName = updatedGuestData.firstName !== undefined ? updatedGuestData.firstName : guest.firstName;
    const lastName = updatedGuestData.lastName !== undefined ? updatedGuestData.lastName : guest.lastName;
    const name = `${firstName} ${lastName}`;
    const email = updatedGuestData.email !== undefined ? updatedGuestData.email : guest.email;
    const mobile = updatedGuestData.mobile !== undefined ? updatedGuestData.mobile : guest.mobile;
    const household = updatedGuestData.household !== undefined ? updatedGuestData.household : guest.household;
    const tier = updatedGuestData.tier !== undefined ? updatedGuestData.tier : guest.tier;
    const plusOne = updatedGuestData.plusOne !== undefined ? (updatedGuestData.plusOne ? 1 : 0) : guest.plusOne;
    const note = updatedGuestData.note !== undefined ? updatedGuestData.note : guest.note;
    const infoCompleted = updatedGuestData.infoCompleted !== undefined ? (updatedGuestData.infoCompleted ? 1 : 0) : guest.infoCompleted;

    let street = guest.street;
    let suite = guest.suite;
    let city = guest.city;
    let state = guest.state;
    let zip = guest.zip;
    let country = guest.country;

    if (updatedGuestData.address) {
      const addr = updatedGuestData.address;
      street = addr.street !== undefined ? addr.street : guest.street;
      suite = addr.suite !== undefined ? addr.suite : guest.suite;
      city = addr.city !== undefined ? addr.city : guest.city;
      state = addr.state !== undefined ? addr.state : guest.state;
      zip = addr.zip !== undefined ? addr.zip : guest.zip;
      country = addr.country !== undefined ? addr.country : guest.country;
    }

    // Update
    await db.run(
      `UPDATE guests SET 
        firstName = ?, lastName = ?, name = ?, email = ?, mobile = ?, 
        household = ?, tier = ?, plusOne = ?, note = ?, 
        street = ?, suite = ?, city = ?, state = ?, zip = ?, country = ?, 
        infoCompleted = ?
      WHERE id = ?`,
      firstName, lastName, name, email, mobile,
      household, tier, plusOne, note,
      street, suite, city, state, zip, country,
      infoCompleted, guest.id
    );

    // Sync household addresses
    if (updatedGuestData.address && household) {
      await db.run(
        `UPDATE guests SET 
          street = ?, suite = ?, city = ?, state = ?, zip = ?, country = ?
        WHERE household = ?`,
        street, suite, city, state, zip, country, household
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/household/update', async (req, res) => {
  try {
    const { householdId, address, updatedMembers } = req.body;
    
    // Fetch all guests in that household
    const guests = await db.all('SELECT * FROM guests WHERE household = ?', householdId);
    
    for (const g of guests) {
      // Find matching member in the form input list by unique database ID
      const match = updatedMembers.find(m => m.id === g.id) || {};
      
      const firstName = match.firstName !== undefined ? match.firstName : g.firstName;
      const lastName = match.lastName !== undefined ? match.lastName : g.lastName;
      const name = `${firstName} ${lastName}`;
      const email = match.email !== undefined ? match.email : g.email;
      const mobile = match.mobile !== undefined ? match.mobile : g.mobile;
      
      const street = address.street !== undefined ? address.street : g.street;
      const suite = address.suite !== undefined ? address.suite : g.suite;
      const city = address.city !== undefined ? address.city : g.city;
      const state = address.state !== undefined ? address.state : g.state;
      const zip = address.zip !== undefined ? address.zip : g.zip;
      const country = address.country !== undefined ? address.country : g.country;
      
      await db.run(
        `UPDATE guests SET 
          firstName = ?, lastName = ?, name = ?, email = ?, mobile = ?, 
          street = ?, suite = ?, city = ?, state = ?, zip = ?, country = ?, 
          infoCompleted = 1
        WHERE id = ?`,
        firstName, lastName, name, email, mobile,
        street, suite, city, state, zip, country,
        g.id
      );
    }
    
    // Fetch and return the updated household members
    const updated = await db.all('SELECT * FROM guests WHERE household = ?', householdId);
    const mapped = updated.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      name: r.name,
      email: r.email,
      mobile: r.mobile,
      household: r.household,
      tier: r.tier,
      plusOne: !!r.plusOne,
      note: r.note,
      address: {
        street: r.street || '',
        suite: r.suite || '',
        city: r.city || '',
        state: r.state || '',
        zip: r.zip || '',
        country: r.country || 'US'
      },
      infoCompleted: !!r.infoCompleted
    }));
    
    res.json({ success: true, guests: mapped });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/guests/delete', async (req, res) => {
  try {
    const { identifier } = req.body;
    const cleanTerm = identifier.trim().toLowerCase();
    await db.run(
      `DELETE FROM guests WHERE LOWER(email) = ? OR mobile = ? OR LOWER(name) = ?`,
      cleanTerm, cleanTerm, cleanTerm
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/import', async (req, res) => {
  try {
    const { newGuests } = req.body;
    if (!Array.isArray(newGuests)) {
      return res.status(400).json({ success: false, message: 'Invalid guests list format' });
    }

    let imported = 0;
    let skipped = 0;

    for (const g of newGuests) {
      // Check duplicates by name and unique household
      const duplicate = await db.get(
        `SELECT * FROM guests WHERE LOWER(name) = ? AND LOWER(household) = ?`,
        g.name.toLowerCase(), g.household.toLowerCase()
      );
      if (duplicate) {
        skipped++;
        continue;
      }

      const addr = g.address || {};
      await db.run(
        `INSERT INTO guests (
          firstName, lastName, name, email, mobile, household, tier, plusOne, note,
          street, suite, city, state, zip, country, infoCompleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        g.firstName, g.lastName, g.name, g.email || '', g.mobile || '', g.household, g.tier,
        g.plusOne ? 1 : 0, g.note || '',
        addr.street || '', addr.suite || '', addr.city || '', addr.state || '', addr.zip || '', addr.country || 'US',
        g.infoCompleted ? 1 : 0
      );
      imported++;
    }

    res.json({ success: true, message: `Successfully imported ${imported} guests. Skipped ${skipped} duplicates.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/rsvps', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM rsvps');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/rsvp', async (req, res) => {
  try {
    const { email, name, attendance, tier, meal, dietary } = req.body;
    const timestamp = new Date().toISOString();

    await db.run(
      `INSERT INTO rsvps (email, name, attendance, tier, meal, dietary, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         attendance = excluded.attendance,
         tier = excluded.tier,
         meal = excluded.meal,
         dietary = excluded.dietary,
         timestamp = excluded.timestamp`,
      email, name, attendance, tier, meal, dietary, timestamp
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// Fallback for SPA routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server after DB is ready
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
});
