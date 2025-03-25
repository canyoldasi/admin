/**
 * JWT Entegrasyonu Test Betiği
 */

// localStorage mock
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    removeItem: function(key) {
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

// global.localStorage'ı mock ile değiştirelim
global.localStorage = localStorageMock;

// Token fonksiyonları
const TOKEN_KEY = 'authUser';

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? JSON.parse(token) : null;
}

function setToken(token) {
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

// Tüm testleri çalıştır
function runAllTests() {
  console.log('JWT Entegrasyonu Mock Testleri Başlıyor...\n');
  testSetAndGetToken();
  testRemoveToken();
  testAuthHeader();
  console.log('\nTüm testler tamamlandı.');
}

// Testleri çalıştır
runAllTests(); 