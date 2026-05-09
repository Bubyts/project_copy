# LibraryDB — Library Management System

A full-stack web application for managing a library: books, authors, loans, reservations, and reports.

**Author:** Joki  
**Stack:** React + Vite + TypeScript, Ant Design, Supabase, Vercel

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| UI | Ant Design 5 |
| Backend / DB | Supabase (PostgreSQL + Auth + REST) |
| Hosting | Vercel (frontend) |
| Routing | React Router v6 |

---

## Features

### Admin Panel
- **Dashboard** — live stats: books, users, active loans, overdue count
- **Books** — full CRUD with author assignment, availability tracking
- **Authors** — full CRUD
- **Categories** — full CRUD
- **Users** — view all users, edit role / status / loan limit
- **Loans** — create new loans, mark returns, automatic fine calculation
- **Reservations** — view all reservations, fulfill or cancel
- **Reports** — popular books chart, most active readers, overdue detail table

### Reader Portal
- **Browse Books** — search by title / author / ISBN, filter by category and availability
- **Book Detail** — full info, 1-click reservation (7-day hold)
- **My Loans** — personal loan history, overdue alert with total fine
- **My Reservations** — active/past reservations, cancel option

### Auth
- Role-based: `admin` and `reader`
- Supabase Auth (email + password)
- Profile auto-created on signup via DB trigger

---

## Project Structure

```
src/
├── components/layout/
│   ├── AdminLayout.tsx       # Sidebar nav for admin
│   └── ReaderLayout.tsx      # Top nav for readers
├── contexts/
│   └── AuthContext.tsx       # Global auth + profile state
├── lib/
│   └── supabase.ts           # Supabase client
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── admin/
│   │   ├── DashboardPage.tsx
│   │   ├── BooksPage.tsx
│   │   ├── AuthorsPage.tsx
│   │   ├── CategoriesPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── LoansPage.tsx
│   │   ├── ReservationsPage.tsx
│   │   └── ReportsPage.tsx
│   └── reader/
│       ├── BrowsePage.tsx
│       ├── BookDetailPage.tsx
│       ├── MyLoansPage.tsx
│       └── MyReservationsPage.tsx
├── types/
│   └── index.ts              # All TypeScript types
├── App.tsx                   # Route definitions
└── main.tsx                  # Entry point
supabase/
└── migrations/
    └── 001_init.sql          # Full DB schema + RLS + sample data
```

---

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) → create a free project
2. Open the **SQL Editor** and run `supabase/migrations/001_init.sql`
3. Copy your **Project URL** and **anon public key** from Project Settings → API

### 2. Local Development

```bash
# Clone the repo
git clone <your-repo-url>
cd <repo-name>

# Install dependencies
npm install

# Create env file
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
```

### 3. Create Admin Account

1. Register a new account via `/register`
2. In Supabase Dashboard → Table Editor → `profiles` → find your row → set `role = admin`

### 4. Deploy to Vercel

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — done

---

## Database Schema

```
profiles        — users (linked to auth.users)
categories      — book categories
authors         — book authors
books           — books with copy tracking
book_authors    — M:N relation books ↔ authors
loans           — loan records (Active / Returned / Overdue)
reservations    — reservation records (Active / Fulfilled / Cancelled / Expired)
```

**Row Level Security** is enabled on all tables:
- Readers see only their own loans and reservations
- Admins have full access

**Triggers:**
- `on_auth_user_created` — auto-creates profile on signup
- `trg_loans_after_insert` — decreases `available_copies` on new loan
- `trg_loans_before_update` — restores copies + calculates fine on return

---

## License

Educational project — free to use.
