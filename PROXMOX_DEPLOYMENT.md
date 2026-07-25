# OfficeConnect v1.0 — Proxmox VE Deployment Guide

This guide provides step-by-step instructions for hosting the **OfficeConnect** internal collaboration platform on a **Proxmox Virtual Environment (PVE)** server (e.g., HPE ProLiant DL360 Gen10) attached to your institution's Local Area Network (LAN).

---

## 📋 Recommended Deployment Architecture

For optimal resource efficiency and performance on Proxmox VE, an **Unprivileged LXC Container** running **Ubuntu 22.04 LTS** or **Debian 12** is recommended.

```mermaid
graph TD
    LAN[Institution LAN Users] -->|HTTP / WebSockets| NGINX[Nginx Reverse Proxy :80]
    NGINX -->|/ -> :3000| NEXT[Next.js Frontend Client]
    NGINX -->|/api & /socket.io -> :4000| NEST[NestJS Backend API]
    NEST -->|PostgreSQL Protocol| PG[(PostgreSQL 16 DB)]
    NEST -->|Local Storage| FS[Storage Disk /opt/officeconnect/storage]
```

### System Requirements Allocation (Container / VM)

| Resource | Recommended Minimum | Production Allocation |
| :--- | :--- | :--- |
| **Cores (vCPU)** | 2 Cores | 4 Cores |
| **RAM** | 2 GB | 4 GB - 8 GB |
| **Swap** | 1 GB | 2 GB |
| **Disk Space** | 30 GB (ZFS/LVM-Thin) | 100 GB+ (ZFS / Enterprise NVMe/SAS) |
| **Network** | Linux Bridge (`vmbr0`) | Static IP on LAN Subnet |

---

## 🚀 Step 1: Create the LXC Container in Proxmox VE

1. Log into your **Proxmox VE Web Console** (`https://<proxmox-ip>:8006`).
2. Go to **local (pve)** storage -> **CT Templates** -> Download **Ubuntu 22.04 Standard** (or Debian 12).
3. Click **Create CT** (top right corner):
   - **General**: Set Hostname (e.g., `officeconnect-app`), Unprivileged container = **Checked**, Nesting = **Checked** (in Features tab).
   - **Template**: Select Ubuntu 22.04 template.
   - **Disks**: Set Root Disk size (e.g., 50GB or 100GB on `local-lvm` or ZFS pool).
   - **CPU**: 4 Cores.
   - **Memory**: 4096 MB RAM, 2048 MB Swap.
   - **Network**:
     - Bridge: `vmbr0`
     - IPv4: Static IP (e.g., `192.168.1.50/24`)
     - Gateway: LAN Gateway IP (e.g., `192.168.1.1`)
   - **DNS**: Use LAN DNS Server.
4. Finish CT creation and start the container.

---

## ⚙️ Step 2: Install System Dependencies

Enter the LXC console (or SSH into the container static IP):

```bash
# Update System Packages
apt update && apt upgrade -y
apt install -y curl git build-essential nginx postgresql postgresql-contrib

# Install Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Installations
node -v   # Should show v20.x.x
npm -v    # Should show v10.x.x
psql --version
```

---

## 🗄️ Step 3: Configure PostgreSQL Database

1. Switch to the `postgres` user and launch `psql`:

```bash
su - postgres
psql
```

2. Execute the following SQL commands to setup the database and user:

```sql
CREATE DATABASE officeconnect;
CREATE USER office_user WITH PASSWORD 'SecureLANPass2026!';
GRANT ALL PRIVILEGES ON DATABASE officeconnect TO office_user;
\c officeconnect
GRANT ALL ON SCHEMA public TO office_user;
\q
```

3. Exit back to root shell:
```bash
exit
```

---

## 📦 Step 4: Clone & Build OfficeConnect

1. Clone or copy the project code to `/opt/officeconnect`:

```bash
mkdir -p /opt/officeconnect
# Copy workspace contents or git clone into /opt/officeconnect
cd /opt/officeconnect
```

2. Configure Environment Files:

Create `/opt/officeconnect/backend/.env`:

```env
DATABASE_URL="postgresql://office_user:SecureLANPass2026!@localhost:5432/officeconnect?schema=public"
JWT_SECRET="officeconnect_lan_secret_key_dl360_2026"
PORT=4000
```

Create `/opt/officeconnect/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://192.168.1.50:4000"
```
*(Replace `192.168.1.50` with your LXC container's actual static LAN IP address).*

3. Install & Build Backend:

```bash
cd /opt/officeconnect/backend
npm install
npx prisma migrate deploy
npm run seed
npm run build
```

4. Install & Build Frontend:

```bash
cd /opt/officeconnect/frontend
npm install
npm run build
```

---

## 🔄 Step 5: Configure PM2 Process Manager

PM2 will manage and auto-restart both the NestJS backend and Next.js frontend processes.

1. Install PM2 globally:

```bash
npm install -g pm2
```

2. Create Ecosystem configuration at `/opt/officeconnect/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'officeconnect-backend',
      cwd: '/opt/officeconnect/backend',
      script: 'dist/src/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'officeconnect-frontend',
      cwd: '/opt/officeconnect/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

3. Start services and configure system boot startup:

```bash
cd /opt/officeconnect
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```
*(Copy and execute the output `env PATH=... pm2 startup systemd -u root ...` command provided by PM2).*

---

## 🌐 Step 6: Configure Nginx Reverse Proxy (Single LAN Port 80 Ingress)

Using Nginx as a reverse proxy allows LAN users to access the entire application on standard HTTP Port 80 without having to specify ports 3000 or 4000.

1. Create Nginx site config at `/etc/nginx/sites-available/officeconnect`:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M; # Max file upload size

    # Frontend Client
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Uploaded Files & Static Assets
    location /storage/ {
        proxy_pass http://127.0.0.1:4000/storage/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Socket.IO Gateway (WebSockets)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

2. Enable Nginx config and restart service:

```bash
ln -sf /etc/nginx/sites-available/officeconnect /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

## 🛡️ Step 7: Proxmox VE Auto-Start & Snapshot Backups

1. **Enable Auto-Start on Host Boot**:
   - In Proxmox VE GUI -> Select `officeconnect-app` Container -> **Options** -> Double-click **Start at boot** -> Set to **Yes**.

2. **Automated Backups**:
   - In Proxmox VE GUI -> **Datacenter** -> **Backup** -> Add Backup Job:
     - Target Node: Selected Host.
     - Storage: PBS or Local Backup Disk (`local` / `backup-pool`).
     - Selection Mode: Include CT `officeconnect-app`.
     - Schedule: Daily at 01:00 AM (Retention: 7 Daily, 4 Weekly).

---

## ✅ Verification Checklist

From any workstation browser on the LAN:

- [x] Navigate to `http://<CONTAINER-STATIC-IP>` (e.g. `http://192.168.1.50`).
- [x] Verify Apple-inspired login page loads.
- [x] Log in with seed admin account (`admin` / `admin123`).
- [x] Test real-time Chat WebSockets across 2 client tabs.
- [x] Test uploading and sharing a document in File Center.
- [x] Test drafting and approving an official letter in Correspondence module.
