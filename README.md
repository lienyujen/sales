# Company Sales Force Dashboard

A lightweight sales-force tracker for internal use.

## Key update (Database-backed)

- Opportunity records are now stored in **SQLite database** (`sales.db`), not in session/localStorage.
- Accounts, passwords, and opportunities are seeded/managed in DB tables and loaded from backend after login.
- Includes backend APIs for login and deal CRUD-lite flows:
  - `POST /api/login`
  - `GET /api/me`
  - `GET /api/users`
  - `GET /api/deals`
  - `POST /api/deals`

## Included requirements

- 8 managers with full visibility: Chris Wang, Jeffry Yang, Eason Yang, Teddy Wu, Perry Wang, Jolin Zuo, Raymond Shen, Yujen Lien.
- Channel/Product mapping:
  - Monitor → LCD
  - EDU → IFP, PGA
  - Pro AV → PJ, DvLED, CDE
- Home page is a pure login screen (`/`); after login it redirects to dashboard (`/dashboard.html`) and loads data directly from DB-backed APIs.
- New opportunity entry form for sales to key in all projects.
- Funnel / hit-rate / deal amount / in-progress count metrics.
- Filtering by owner, channel, product, and period (week/month/quarter/half/year/all).

## Login accounts

- Username = first name only (no surname).
- Default password for all users = `12345678`.

| Full Name | Username | Password |
|---|---|---|
| Chris Wang | Chris | 12345678 |
| Jeffry Yang | Jeffry | 12345678 |
| Eason Yang | Eason | 12345678 |
| Teddy Wu | Teddy | 12345678 |
| Perry Wang | Perry | 12345678 |
| Jolin Zuo | Jolin | 12345678 |
| Raymond Shen | Raymond | 12345678 |
| Yujen Lien | Yujen | 12345678 |

## Run

```bash
python3 server.py
```

Open: `http://localhost:8080`
