# Company Sales Force Dashboard

This version uses **Google Sheet as database** via **Google Apps Script Web App**.

## Architecture

- Frontend (GitHub Pages): `index.html`, `dashboard.html`, `app.js`, `styles.css`
- Backend API: Google Apps Script (`google_apps_script/Code.gs`)
- Data store: Google Sheet tabs:
  - `users`
  - `deals`

## Required Google Sheet columns

### users
`username,full_name,password,role`

### deals
`owner,projectName,customerName,contactName,contactPhone,contactEmail,channel,product,qty,amount,expectedDate,status,winRate,notes`

## Apps Script actions

- `action=health`
- `action=login` (POST)
- `action=me`
- `action=users`
- `action=deals`
- `action=createDeal` (POST)

## Deploy steps

1. Open Google Sheet and create sheets `users` / `deals` with columns above.
2. In Extensions → Apps Script, paste `google_apps_script/Code.gs`.
3. Deploy → New deployment → Web app.
4. Access: `Anyone` (or your org if suitable), copy Web App URL.
5. Open frontend and fill **Google Apps Script Web App URL** to login.

You can prefill by URL query:

`https://lienyujen.github.io/sales/?script=<YOUR_WEB_APP_URL>`
