# Deployment-Anleitung — Vecturo

Ziel: Backend auf **Railway**, Frontend auf **Vercel**.
Beide Dienste sind kostenlos für kleine Projekte.

---

## Schritt 1 — Starkes JWT Secret generieren

Einmalig im Terminal ausführen (Node.js muss installiert sein):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Den ausgegebenen String kopieren und sicher aufbewahren.

---

## Schritt 2 — Backend auf Railway deployen

1. Account erstellen auf [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo** → dieses Repository auswählen
3. Wenn gefragt: **Root Directory** = `backend`
4. **Volume hinzufügen** (wichtig für SQLite!):
   - Im Projekt: **+ New → Volume**
   - Mount Path: `/data`
   - Damit bleiben Daten auch nach Neustarts erhalten
5. **Umgebungsvariablen** setzen (Settings → Variables):

   | Variable | Wert |
   |---|---|
   | `JWT_SECRET` | Der generierte String aus Schritt 1 |
   | `ALLOWED_EMAILS` | `deine@email.de,partner@email.de` |
   | `FRONTEND_URL` | Vercel-URL (nach Schritt 3 eintragen) |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |

6. Deploy starten — Railway erkennt Node.js automatisch
7. Die Backend-URL notieren (z.B. `https://vecturo-backend.up.railway.app`)

---

## Schritt 3 — Frontend auf Vercel deployen

1. Account erstellen auf [vercel.com](https://vercel.com)
2. **New Project → Import Git Repository** → dieses Repository
3. **Root Directory** = `frontend`
4. **Framework Preset** = Vite
5. **Umgebungsvariablen** setzen:

   | Variable | Wert |
   |---|---|
   | `VITE_API_URL` | Backend-URL aus Schritt 2 |

6. **Deploy** klicken
7. Die Vercel-URL notieren (z.B. `https://vecturo.vercel.app`)

---

## Schritt 4 — CORS vervollständigen

1. Zurück zu Railway → Backend → Variables
2. `FRONTEND_URL` auf die Vercel-URL setzen (z.B. `https://vecturo.vercel.app`)
3. Railway deployt automatisch neu

---

## Schritt 5 — Accounts anlegen

1. App öffnen (`https://vecturo.vercel.app`)
2. Registrieren mit einer der `ALLOWED_EMAILS`
3. Partner registriert sich ebenfalls
4. Fertig — nur diese zwei E-Mails können sich anmelden

---

## Backups

Täglich manuell ausführen oder als Railway Cron Job einrichten:

```bash
npm run backup
```

Backups werden unter `/data/backups/` gespeichert (letzten 7 Versionen).

### Railway Cron Job einrichten:
- Railway → New Service → Cron Job
- Schedule: `0 3 * * *` (täglich 3 Uhr)
- Command: `node scripts/backup.js`

---

## Kosten (Schätzung)

| Dienst | Plan | Kosten |
|---|---|---|
| Railway | Starter ($5 Credit/Monat gratis) | ~0–5€/Monat |
| Vercel | Hobby (kostenlos) | 0€ |

---

## Sicherheits-Checkliste

- [x] HTTPS (automatisch durch Railway/Vercel)
- [x] JWT-Secret in Umgebungsvariable (nicht im Code)
- [x] E-Mail-Whitelist für Registrierung
- [x] Rate Limiting gegen Brute-Force
- [x] CORS auf Frontend-Domain beschränkt
- [x] SQLite Volume (Daten überleben Neustarts)
- [ ] Tägliche Backups einrichten (Cron Job)
