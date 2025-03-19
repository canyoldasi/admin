export const TOKEN_KEY = 'authUser';

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? JSON.parse(token) : null;
};

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: token }));
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export default function authHeader() {
  const token = getToken();
  if (token && token.accessToken) {
    return { Authorization: `Bearer ${token.accessToken}` };
  }
  return {};
}
