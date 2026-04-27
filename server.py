#!/usr/bin/env python3
import json
import sqlite3
from datetime import date
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "sales.db"

USERS = [
    ("Chris", "Chris Wang", "12345678", "manager"),
    ("Jeffry", "Jeffry Yang", "12345678", "manager"),
    ("Eason", "Eason Yang", "12345678", "manager"),
    ("Teddy", "Teddy Wu", "12345678", "manager"),
    ("Perry", "Perry Wang", "12345678", "manager"),
    ("Jolin", "Jolin Zuo", "12345678", "manager"),
    ("Raymond", "Raymond Shen", "12345678", "manager"),
    ("Yujen", "Yujen Lien", "12345678", "manager"),
]

SEED_DEALS = [
    ("Chris Wang", "屏東IFP", "屏東教育局", "屏東人", "", "", "EDU", "IFP", 10, 5000000, "2026-04-08", "成交", 90, ""),
    ("Jeffry Yang", "屏東LCD", "屏東", "沈", "", "", "Monitor", "LCD", 20, 20000000, "2026-01-28", "成交", 80, ""),
    ("Eason Yang", "屏東更新", "屏東", "沈", "", "", "EDU", "IFP", 30, 17055998, "2026-01-28", "成交", 85, ""),
]

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
}


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner TEXT NOT NULL,
            project_name TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            contact_name TEXT,
            contact_phone TEXT,
            contact_email TEXT,
            channel TEXT NOT NULL,
            product TEXT NOT NULL,
            qty INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            expected_date TEXT NOT NULL,
            status TEXT NOT NULL,
            win_rate INTEGER NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO users(username, full_name, password, role) VALUES (?, ?, ?, ?)",
            USERS,
        )
    cur.execute("SELECT COUNT(*) FROM deals")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            """
            INSERT INTO deals(
              owner, project_name, customer_name, contact_name, contact_phone, contact_email,
              channel, product, qty, amount, expected_date, status, win_rate, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [(*row, date.today().isoformat()) for row in SEED_DEALS],
        )
    conn.commit()
    conn.close()


class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(data.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/users":
            conn = get_conn()
            rows = conn.execute("SELECT username, full_name, role FROM users ORDER BY full_name").fetchall()
            conn.close()
            users = [dict(row) for row in rows]
            return self._json(200, {"users": users})

        if parsed.path == "/api/deals":
            qs = parse_qs(parsed.query)
            owner = qs.get("owner", ["all"])[0]
            channel = qs.get("channel", ["all"])[0]
            product = qs.get("product", ["all"])[0]
            query = "SELECT * FROM deals WHERE 1=1"
            params = []
            if owner != "all":
                query += " AND owner = ?"
                params.append(owner)
            if channel != "all":
                query += " AND channel = ?"
                params.append(channel)
            if product != "all":
                query += " AND product = ?"
                params.append(product)
            query += " ORDER BY expected_date DESC, id DESC"

            conn = get_conn()
            rows = conn.execute(query, params).fetchall()
            conn.close()
            deals = []
            for row in rows:
                item = dict(row)
                item["projectName"] = item.pop("project_name")
                item["customerName"] = item.pop("customer_name")
                item["contactName"] = item.pop("contact_name")
                item["contactPhone"] = item.pop("contact_phone")
                item["contactEmail"] = item.pop("contact_email")
                item["expectedDate"] = item.pop("expected_date")
                item["winRate"] = item.pop("win_rate")
                deals.append(item)
            return self._json(200, {"deals": deals})

        path = ROOT / ("index.html" if parsed.path == "/" else parsed.path.lstrip("/"))
        if path.exists() and path.is_file():
            data = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", MIME.get(path.suffix, "application/octet-stream"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        self._json(404, {"error": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/login":
            body = self._read_json()
            username = body.get("username", "").strip()
            password = body.get("password", "")
            conn = get_conn()
            row = conn.execute(
                "SELECT username, full_name, role FROM users WHERE username = ? AND password = ?",
                (username, password),
            ).fetchone()
            conn.close()
            if not row:
                return self._json(401, {"error": "帳號或密碼錯誤"})
            return self._json(200, {"user": dict(row)})

        if parsed.path == "/api/deals":
            body = self._read_json()
            required = [
                "owner", "projectName", "customerName", "channel", "product",
                "qty", "amount", "expectedDate", "status", "winRate",
            ]
            for field in required:
                if field not in body or body[field] in ("", None):
                    return self._json(400, {"error": f"缺少欄位: {field}"})

            conn = get_conn()
            conn.execute(
                """
                INSERT INTO deals(
                    owner, project_name, customer_name, contact_name, contact_phone, contact_email,
                    channel, product, qty, amount, expected_date, status, win_rate, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    body["owner"],
                    body["projectName"],
                    body["customerName"],
                    body.get("contactName", ""),
                    body.get("contactPhone", ""),
                    body.get("contactEmail", ""),
                    body["channel"],
                    body["product"],
                    int(body["qty"]),
                    int(body["amount"]),
                    body["expectedDate"],
                    body["status"],
                    int(body["winRate"]),
                    body.get("notes", ""),
                    date.today().isoformat(),
                ),
            )
            conn.commit()
            conn.close()
            return self._json(201, {"ok": True})

        self._json(404, {"error": "Not found"})


def main():
    init_db()
    server = HTTPServer(("0.0.0.0", 8080), Handler)
    print("Server running at http://localhost:8080")
    server.serve_forever()


if __name__ == "__main__":
    main()
