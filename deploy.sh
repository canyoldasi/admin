#!/bin/bash

# Hata durumunda script'i durdur
set -e

# ISO formatında tarih ve saat (colon yerine hyphen kullanıyoruz)
TZ='Europe/Istanbul' TIMESTAMP=$(date -u +"%Y-%m-%d-%H-%M-%S")

echo "🚀 Deployment başlıyor..."

# Local build
echo "📦 Local build yapılıyor..."
cd /Users/esrefatak/Documents/code/canyoldasi/admin
npm run build

# Local'de dosyaları sıkıştırma
echo "📦 Local dosyalar sıkıştırılıyor..."
cd build
tar czf ../deploy-admin-${TIMESTAMP}.tar.gz .
cd ..

# Dosyaları remote'a kopyalama
echo "📤 Dosyalar remote'a kopyalanıyor..."
scp deploy-admin-${TIMESTAMP}.tar.gz root@recommed.co:/root/agiletech/crm/

# Remote'da yedekleme ve dosyaları çıkartma
echo "💾 Remote klasör yedekleniyor ve dosyalar çıkartılıyor..."
ssh root@recommed.co "set -e && \
    tar czf /root/agiletech/crm/admin-remote-backup-${TIMESTAMP}.tar.gz /root/agiletech/crm/admin && \
    tar xzf /root/agiletech/crm/deploy-admin-${TIMESTAMP}.tar.gz -C /root/agiletech/crm/admin"

echo "✅ Deployment tamamlandı!"
