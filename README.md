# Company Sales Force Dashboard

A lightweight single-page sales-force tracker for internal use.

## Included requirements

- 8 managers with full visibility: Chris Wang, Jeffry Yang, Eason Yang, Teddy Wu, Perry Wang, Jolin Zuo, Raymond Shen, Yujen Lien.
- Channel/Product mapping:
  - Monitor → LCD
  - EDU → IFP, PGA
  - Pro AV → PJ, DvLED, CDE
- New opportunity entry form for sales to key in all projects.
- Funnel / hit-rate / deal amount / in-progress count metrics.
- Filtering by owner, channel, product, and period (week/month/quarter/half/year/all).
- Opportunity detail table for tracking.
- Home page always opens with login first; dashboard becomes visible only after successful sign-in.

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

## Run / Publish

For immediate internal use, run a local server:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/index.html`
