/**
 * JWT Entegrasyonu Test Dosyası
 * 
 * Bu dosya JWT token yönetimini test etmek için oluşturulmuştur.
 * Normalde bu testler Jest gibi bir test aracıyla yapılmalıdır.
 */

import { getToken, setToken, removeToken } from './helpers/jwt-token-access/auth-token-header';

// Test 1: Token ekleme ve alma
function testSetAndGetToken() {
  console.log('Test 1: Token ekleme ve alma testi başlıyor...');
  const mockToken = 'mockJWT.token.123456';
  setToken(mockToken);
  
  const retrievedToken = getToken();
  if (retrievedToken && retrievedToken.accessToken === mockToken) {
    console.log('✅ Test 1 başarılı: Token başarıyla eklendi ve alındı.');
  } else {
    console.error('❌ Test 1 başarısız: Token eklendi ancak alınan token beklenen değeri içermiyor.');
    console.error('Beklenen:', mockToken);
    console.error('Alınan:', retrievedToken?.accessToken);
  }
}

// Test 2: Token silme
function testRemoveToken() {
  console.log('\nTest 2: Token silme testi başlıyor...');
  const mockToken = 'mockJWT.token.123456';
  setToken(mockToken);
  
  // Token'ı doğrulayalım
  let retrievedToken = getToken();
  if (!retrievedToken || retrievedToken.accessToken !== mockToken) {
    console.error('❌ Test 2 başarısız: Test için token eklenemedi.');
    return;
  }
  
  // Token'ı silelim
  removeToken();
  retrievedToken = getToken();
  
  if (!retrievedToken) {
    console.log('✅ Test 2 başarılı: Token başarıyla silindi.');
  } else {
    console.error('❌ Test 2 başarısız: Token silinmedi.');
  }
}

// Test 3: Authorization header formatı
function testAuthHeader() {
  console.log('\nTest 3: Authorization header formatı testi başlıyor...');
  const mockToken = 'mockJWT.token.123456';
  setToken(mockToken);
  
  // Token header'ını kontrol edelim
  const authHeader = require('./helpers/jwt-token-access/auth-token-header').default();
  
  if (authHeader.Authorization === `Bearer ${mockToken}`) {
    console.log('✅ Test 3 başarılı: Authorization header doğru formatta.');
  } else {
    console.error('❌ Test 3 başarısız: Authorization header yanlış formatta.');
    console.error('Beklenen:', `Bearer ${mockToken}`);
    console.error('Alınan:', authHeader.Authorization);
  }
}

// Tüm testleri çalıştır
function runAllTests() {
  console.log('JWT Entegrasyonu Testleri Başlıyor...\n');
  testSetAndGetToken();
  testRemoveToken();
  testAuthHeader();
  console.log('\nTüm testler tamamlandı.');
}

// Testleri çalıştır
runAllTests();

export {}; // TypeScript bu dosyayı bir modül olarak görmesi için 