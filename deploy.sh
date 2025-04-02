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
scp deploy-admin-${TIMESTAMP}.tar.gz root@recommed.co:/root/canyoldasi/

# Remote'da yedekleme ve dosyaları çıkartma
echo "💾 Remote klasör yedekleniyor ve dosyalar çıkartılıyor..."
ssh root@recommed.co "set -e && \
    tar czf /root/canyoldasi/admin-remote-backup-${TIMESTAMP}.tar.gz /root/canyoldasi/admin && \
    tar xzf /root/canyoldasi/deploy-admin-${TIMESTAMP}.tar.gz -C /root/canyoldasi/admin"

echo "✅ Deployment tamamlandı!"
