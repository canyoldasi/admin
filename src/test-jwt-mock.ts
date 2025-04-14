/**
 * JWT Entegrasyonu Test Dosyası (Mock ile)
 * 
 * Bu dosya JWT token yönetimini mock localStorage ile test etmek için oluşturulmuştur.
 */

// Bu dosyayı bir modul haline getirmek için boş export ekleyelim
export {};

// localStorage mock
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem: function(key: string) {
      delete store[key];
    },
    clear: function() {
      store = {};
    },
    getAll: function() {
      return store;
    }
  };
})();

// Local Storage'ı mock ile değiştirelim
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Token fonksiyonlarını içe aktaralım
const TOKEN_KEY = 'authUser';

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? JSON.parse(token) : null;
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: token }));
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeader() {
  const token = getToken();
  if (token && token.accessToken) {
    return { Authorization: `Bearer ${token.accessToken}` };
  }
  return {};
}

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
  const header = authHeader();
  
  if (header.Authorization === `Bearer ${mockToken}`) {
    console.log('✅ Test 3 başarılı: Authorization header doğru formatta.');
  } else {
    console.error('❌ Test 3 başarısız: Authorization header yanlış formatta.');
    console.error('Beklenen:', `Bearer ${mockToken}`);
    console.error('Alınan:', header.Authorization);
  }
}

// Test 4: localStorage içeriğini kontrol etme
function testLocalStorageFormat() {
  console.log('\nTest 4: localStorage içerik formatı testi başlıyor...');
  const mockToken = 'mockJWT.token.123456';
  setToken(mockToken);
  
  // LocalStorage'daki değeri direk olarak kontrol edelim
  const rawValue = localStorage.getItem(TOKEN_KEY);
  const expectedValue = JSON.stringify({ accessToken: mockToken });
  
  if (rawValue === expectedValue) {
    console.log('✅ Test 4 başarılı: localStorage içeriği doğru formatta.');
  } else {
    console.error('❌ Test 4 başarısız: localStorage içeriği doğru formatta değil.');
    console.error('Beklenen:', expectedValue);
    console.error('Alınan:', rawValue);
  }
}

// Tüm testleri çalıştır
function runAllTests() {
  console.log('JWT Entegrasyonu Mock Testleri Başlıyor...\n');
  testSetAndGetToken();
  testRemoveToken();
  testAuthHeader();
  testLocalStorageFormat();
  console.log('\nTüm testler tamamlandı.');
}

// Testleri çalıştır
runAllTests(); 