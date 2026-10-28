# PharmaFlow Billing

A pharmacy billing and inventory app with a React/Vite frontend, an Express API,
and PostgreSQL storage.

## Local development

### Requirements

- Node.js 20.19+ or 22.12+
- pnpm
- PostgreSQL

### 1. Clone and install

```sh
git clone https://github.com/shanmukhi-singumahanthi/pharma-billing-hub.git
cd pharma-billing-hub
pnpm install
```

### 2. Create a database

Create a PostgreSQL database named `pharmaflow` using pgAdmin or your preferred
PostgreSQL tool. The connection string format is:

```text
postgresql://DB_USER:DB_PASSWORD@localhost:5432/pharmaflow
```

Keep the connection string private. Do not commit your real database password
to GitHub.

### 3. Apply the database schema

Run this once from the repository root, replacing the example username and
password with your local PostgreSQL credentials.

**macOS / Linux (Terminal 1):**

```sh
export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharmaflow'
pnpm --filter @workspace/db run push
```

**Windows (PowerShell):**

```powershell
$env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharmaflow"
pnpm --filter @workspace/db run push
```

### 4. Start the backend

Use the same terminal where you set `DATABASE_URL`.

**macOS / Linux:**

```sh
export PORT=8080
pnpm --filter @workspace/api-server run dev
```

**Windows (PowerShell):**

```powershell
$env:PORT = "8080"
pnpm --filter @workspace/api-server run dev
```

Leave this terminal running. The API health check is available at
`http://localhost:8080/api/healthz`.

### 5. Start the frontend

Open a second terminal in the repository root. This enables a Vite proxy for
local development only, routing `/api` requests to the backend. Replit's own
service routing remains unchanged.

**macOS / Linux:**

```sh
PORT=20029 BASE_PATH=/ LOCAL_DEV_API_PROXY=1 \
  pnpm --filter @workspace/pharma-billing run dev
```

**Windows (PowerShell):**

```powershell
$env:PORT = "20029"
$env:BASE_PATH = "/"
$env:LOCAL_DEV_API_PROXY = "1"
pnpm --filter @workspace/pharma-billing run dev
```

Open the local URL printed by Vite, normally `http://localhost:20029`.

If the API uses a different port, set `LOCAL_API_TARGET` in the frontend
terminal before starting Vite.

**macOS / Linux:**

```sh
export LOCAL_API_TARGET=http://127.0.0.1:8081
```

**Windows (PowerShell):**

```powershell
$env:LOCAL_API_TARGET = "http://127.0.0.1:8081"
```

### Sample data

On a new, empty database, the API creates sample products and bills the first
time the app requests data. Use a separate database for real business records.

### Checks

From the repository root:

```sh
pnpm run typecheck
```
