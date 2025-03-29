import { getToken } from "./auth-token-header";
const tokenData = getToken();
const accessToken = tokenData && tokenData.accessToken ? `Bearer ${tokenData.accessToken}` : "boşlukkkkk";

// Cache the token to prevent excessive localStorage reads
let cachedToken: string | null = null;
let lastTokenTime = 0;
const TOKEN_CACHE_DURATION = 5000; // Cache token for 5 seconds

const getAuthHeader = () => {
    const currentTime = Date.now();
    
    // If we have a cached token and it's not expired, use it
    if (cachedToken && (currentTime - lastTokenTime < TOKEN_CACHE_DURATION)) {
        return cachedToken;
    }
    
    // Token is expired or not available, get a new one
    try {
        const tokenVariable = localStorage.getItem("authUser");
        
        if (tokenVariable) {
            const parsedToken = JSON.parse(tokenVariable);
            // Update the cache
            cachedToken = `Bearer ${parsedToken.accessToken}`;
            lastTokenTime = currentTime;
            return cachedToken;
        }
        
        // Reset cache if we couldn't get a valid token
        cachedToken = null;
        return null;
    } catch (error) {
        console.error("Error retrieving auth token:", error);
        cachedToken = null;
        return null;
    }
};

export { accessToken, getAuthHeader }