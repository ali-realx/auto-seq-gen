# Docker Deployment Guide

## Prerequisites
- Docker installed on Ubuntu 20.04 LTS
- Docker Compose installed
- External Supabase project configured

## Setup Instructions

### 1. Clone or Upload Project Files
Upload semua file project ke server Ubuntu Anda.

### 2. Configure Environment Variables
Copy file `.env.example` menjadi `.env` dan isi dengan konfigurasi Supabase Anda:

```bash
cp .env.example .env
nano .env
```

Isi dengan nilai dari Supabase external project Anda:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
PORT=6890
```

### 3. Build Docker Image
```bash
docker-compose build
```

### 4. Run Application
```bash
docker-compose up -d
```

### 5. Check Application Status
```bash
docker-compose ps
docker-compose logs -f
```

### 6. Access Application
Aplikasi akan berjalan di port 7000 (mapped dari internal port 6890):
- Local: http://localhost:7000
- Server: http://your-server-ip:7000

## Management Commands

### Stop Application
```bash
docker-compose down
```

### Restart Application
```bash
docker-compose restart
```

### View Logs
```bash
docker-compose logs -f app
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Nginx Proxy Manager Configuration

Jika menggunakan Nginx Proxy Manager (seperti di vite.config.ts):

1. Add Proxy Host di Nginx Proxy Manager
2. Domain: `nomor.petrolog.my.id`
3. Forward Hostname/IP: IP container atau `host.docker.internal`
4. Forward Port: `7000`
5. Enable Websockets: Yes (untuk Vite HMR)
6. SSL: Configure Let's Encrypt jika diperlukan

## Troubleshooting

### Container tidak start
```bash
docker-compose logs app
```

### Port sudah digunakan
Edit `docker-compose.yml` dan ubah port mapping:
```yaml
ports:
  - "8000:6890"  # Ubah 7000 ke port lain yang available
```

### Update environment variables
```bash
nano .env
docker-compose down
docker-compose up -d
```

### Clear everything and restart
```bash
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

## Database Migration

Untuk migrasi database ke Supabase external, gunakan file SQL yang sudah disediakan:
```bash
# File: supabase-external-migration.sql
# Import file ini ke Supabase external project Anda via SQL Editor
```

## Production Checklist

- [ ] Configure `.env` dengan production Supabase credentials
- [ ] Set proper domain di Nginx Proxy Manager
- [ ] Enable SSL certificate
- [ ] Configure firewall untuk allow port 7000 (atau port yang Anda gunakan)
- [ ] Setup backup untuk database Supabase
- [ ] Monitor logs regularly: `docker-compose logs -f`
- [ ] Set restart policy di `docker-compose.yml` sudah `unless-stopped`

## Security Notes

1. **JANGAN commit file `.env`** ke git
2. Gunakan `.env.example` sebagai template
3. Pastikan Supabase RLS policies sudah dikonfigurasi dengan benar
4. Gunakan strong password untuk user accounts
5. Regularly update dependencies: `npm audit` dan `npm update`
