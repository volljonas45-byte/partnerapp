# InvoiceApp

A clean, professional invoice management tool for small businesses.
Built with React + TailwindCSS (frontend) and Node.js + Express + SQLite (backend).

---

## Features

- Dashboard with revenue statistics (paid / unpaid / overdue)
- Client management (add, edit, delete)
- Invoice creation with line items, tax calculation, auto-generated numbers
- PDF export with your company branding and logo
- Invoice status management (mark as paid, overdue detection)
- Company settings: logo, bank details, VAT ID

---

## Project Structure

```
invoice-app/
├── backend/
│   ├── src/
│   │   ├── db/database.js        # SQLite setup + schema init
│   │   ├── middleware/auth.js    # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js           # Register / Login / Me
│   │   │   ├── clients.js        # Client CRUD
│   │   │   ├── invoices.js       # Invoice CRUD + PDF endpoint
│   │   │   └── settings.js       # Company settings
│   │   ├── services/pdfService.js # PDF generation with pdf-lib
│   │   └── app.js                # Express app setup
│   ├── server.js                 # Entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                  # Axios API layer (auth, clients, invoices, settings)
│   │   ├── components/           # Reusable UI (Layout, Sidebar, Modal, StatusBadge)
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/                # Dashboard, Clients, Invoices, NewInvoice, Settings
│   │   └── utils/formatters.js   # Currency + date formatting
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
# From the project root
npm run install:all

# Or manually:
cd backend  && npm install
cd frontend && npm install
```

### 2. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
PORT=3001
JWT_SECRET=your-long-random-secret-here
NODE_ENV=development
```

### 3. Start development servers

Open **two terminals**:

```bash
# Terminal 1 — Backend (API on :3001)
cd backend
npm run dev

# Terminal 2 — Frontend (UI on :5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

On first visit you'll be prompted to create an account.

---

## API Endpoints

| Method | Endpoint                     | Description            |
|--------|------------------------------|------------------------|
| POST   | /api/auth/register           | Create account         |
| POST   | /api/auth/login              | Login                  |
| GET    | /api/auth/me                 | Current user           |
| GET    | /api/clients                 | List clients           |
| POST   | /api/clients                 | Create client          |
| PUT    | /api/clients/:id             | Update client          |
| DELETE | /api/clients/:id             | Delete client          |
| GET    | /api/invoices                | List invoices          |
| GET    | /api/invoices/stats          | Dashboard stats        |
| GET    | /api/invoices/:id            | Single invoice         |
| POST   | /api/invoices                | Create invoice         |
| PATCH  | /api/invoices/:id/status     | Update status          |
| DELETE | /api/invoices/:id            | Delete invoice         |
| GET    | /api/invoices/:id/pdf        | Download PDF           |
| GET    | /api/settings                | Get settings           |
| PUT    | /api/settings                | Update settings        |
| POST   | /api/settings/logo           | Upload logo (base64)   |
| DELETE | /api/settings/logo           | Remove logo            |

---

## Production Deployment

### Option A: Netlify (Frontend) + Railway/Render (Backend)

**Backend on Railway or Render:**
1. Create a new service pointing to the `backend/` directory
2. Set environment variables: `JWT_SECRET`, `PORT`, `NODE_ENV=production`
3. Start command: `node server.js`
4. Note the deployed URL (e.g., `https://my-api.railway.app`)

**Frontend on Netlify:**
1. Build command: `npm run build` (from `frontend/`)
2. Publish directory: `frontend/dist`
3. Add environment variable: `VITE_API_URL=https://my-api.railway.app`
4. Add a `frontend/public/_redirects` file with: `/* /index.html 200`

### Option B: Single VPS / Docker

Run both services on the same server. Configure Nginx to:
- Proxy `/api/*` → `localhost:3001`
- Serve `frontend/dist` as static files for all other routes

**Nginx example:**
```nginx
server {
  listen 80;
  server_name yourdomain.com;

  root /var/www/invoice-app/frontend/dist;
  index index.html;

  location /api/ {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## Environment Variables

| Variable       | Where    | Description                    |
|----------------|----------|--------------------------------|
| PORT           | backend  | API server port (default 3001) |
| JWT_SECRET     | backend  | Secret for signing JWT tokens  |
| NODE_ENV       | backend  | `development` or `production`  |
| VITE_API_URL   | frontend | Backend URL in production      |

---

## Database

SQLite file is created automatically at `backend/data/invoices.db` on first run.
No migrations needed — schema initializes on startup.

To back up: copy `backend/data/invoices.db`.
