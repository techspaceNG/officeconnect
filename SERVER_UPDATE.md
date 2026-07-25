# Updating OfficeConnect on your Live Server / Proxmox Container

Follow these **4 simple steps** to pull the latest changes (FCET Bichi logo, ICT Department branding, `.gitignore` fixes, and seed accounts) on your Proxmox LXC container or live Linux server:

---

## 🛠️ Step-by-Step Update Commands

SSH into your Proxmox LXC container (or open CT Console) and run:

```bash
# 1. Navigate to the project directory & pull the latest code from GitHub
cd /opt/officeconnect
git pull origin main

# 2. Rebuild the Backend & run seed script for initial accounts
cd /opt/officeconnect/backend
npm run build
npx prisma migrate deploy
npx prisma db seed

# 3. Rebuild the Next.js Frontend
cd /opt/officeconnect/frontend
npm run build

# 4. Restart PM2 Services
pm2 restart all
```

---

## ✅ Verification Checklist

After running the commands above:

1. Open `http://<YOUR-SERVER-LAN-IP>` in your browser.
2. Verify the **FCET Bichi Logo** displays on the login screen.
3. Verify the title reads **ICT Department — FCET Bichi**.
4. Verify the footer shows **Powered by Techspaceng • techspace544@gmail.com**.
5. Log in using any of the seeded accounts:
   - **Admin**: `admin` / `admin123`
   - **Director**: `director` / `director123`
   - **Staff**: `aliyu` / `aliyu123`
