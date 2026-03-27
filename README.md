# 🎡 Lucky Wheel Event - Full Stack Application

Premium Lucky Wheel spin event app dengan anti-abuse protection, admin panel, dan professional gambling theme.

## ✨ Features

### User Side
- ✅ Premium dark theme dengan gold accents
- ✅ Smooth wheel spin animation
- ✅ Confetti celebration effects
- ✅ WhatsApp + Agent ID login validation
- ✅ Whitelist verification (server-side)
- ✅ Anti-abuse: 1 spin per user (DB-backed, not localStorage)
- ✅ Server-side weighted random prize determination
- ✅ WhatsApp claim button dengan auto-message
- ✅ Mobile responsive

### Admin Panel
- ✅ Secure login (JWT-based)
- ✅ Dashboard dengan statistics
- ✅ Prize management (name, probability, colors)
- ✅ Whitelist management (add/edit/delete/toggle active)
- ✅ Spin records dengan claim status tracking
- ✅ IP + device fingerprint logging
- ✅ CSV export
- ✅ Event settings (title, WhatsApp, instructions, open/close)

## 🎯 Odds Configuration

| Prize | Probability | Color |
|-------|------------|-------|
| RM100 | 93% | Gold |
| RM288 | 5% | Red-Pink |
| RM388 | 1% | Purple |
| RM588 | 1% | Blue |
| 5G GOLD | 0% | Orange |

## 🏗️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19
- **Backend:** Next.js API Routes
- **Database:** In-memory store (swap with PostgreSQL for production)
- **Auth:** JWT (jose), bcrypt
- **Styling:** Tailwind-free, custom CSS-in-JS

## 📁 Project Structure

```
lucky-wheel-event/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx               # User wheel page
│   │   ├── globals.css             # Global styles
│   │   ├── admin/
│   │   │   └── page.tsx           # Admin panel
│   │   └── api/
│   │       ├── spin/route.ts      # Spin API (POST)
│   │       ├── prizes/route.ts     # Get prizes (GET)
│   │       ├── check/route.ts      # Check eligibility (POST)
│   │       └── admin/
│   │           ├── auth/route.ts  # Admin auth
│   │           ├── stats/route.ts  # Dashboard stats
│   │           ├── prizes/route.ts # CRUD prizes
│   │           ├── whitelist/route.ts # CRUD whitelist
│   │           ├── spins/route.ts  # CRUD spins
│   │           └── settings/route.ts # Event settings
│   └── lib/
│       ├── store.ts                # In-memory database
│       ├── auth.ts                 # JWT auth utilities
│       ├── fingerprint.ts           # Device fingerprint
│       └── ratelimit.ts            # Rate limiting
├── DATABASE_SCHEMA.sql             # PostgreSQL schema (for production)
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Deployment

### Option 1: Vercel (Recommended)
```bash
npm install
npm run build
vercel deploy
```

### Option 2: Docker / Coolify
```bash
docker build -t lucky-wheel .
docker run -p 3000:3000 lucky-wheel
```

### Option 3: Traditional Node.js
```bash
npm install
npm run build
npm start
```

## 🔐 Security Features

1. **Server-side spin logic** - Frontend only receives result after server determines prize
2. **Whitelist enforcement** - DB-backed whitelist check, not bypassable via inspect element
3. **One-spin-per-user** - Server checks (whatsapp + agent_id) before allowing spin
4. **Device fingerprinting** - Logs browser/device fingerprint with each spin
5. **IP logging** - Logs IP address of every spin attempt
6. **Rate limiting** - 5 spin attempts per IP per minute
7. **JWT admin auth** - Secure cookie-based sessions for admin

## 🔑 Default Credentials

**Admin Panel:** `http://localhost:3000/admin`
- Username: `admin`
- Password: `admin123`

**⚠️ CHANGE THESE IN PRODUCTION!**

## 📱 User Flow

1. User visits `/`
2. Fills in WhatsApp number + Agent ID
3. Clicks SPIN
4. Server validates whitelist + checks not already spun
5. Server determines prize (weighted random)
6. Server saves spin record with fingerprint + IP
7. Wheel animates to show result
8. Confetti celebration (for non-5G GOLD prizes)
9. Result card shows prize + Claim ID
10. WhatsApp button opens chat with pre-filled message

## 🎨 Design

- **Theme:** Dark luxury gambling
- **Primary:** #FFD700 (Gold)
- **Background:** #0A0010 → #1A0520 gradient
- **Accent:** #FF4444 (Red), #4FACFE (Blue)
- **Animations:** Wheel spin (5s cubic-bezier), confetti particles, pulse effects

## 📊 Database Schema

For production, use the `DATABASE_SCHEMA.sql` file which includes:

- `admins` - Admin users
- `event_settings` - Event configuration
- `prizes` - Prize configurations
- `whitelist_users` - Eligible participants
- `spin_records` - All spin attempts with anti-abuse data

## 🔧 Configuration

Edit `src/lib/store.ts` to change:
- Default prizes
- Default admin credentials
- Seed whitelist data

For production, replace the in-memory `store.ts` with Prisma + PostgreSQL.
