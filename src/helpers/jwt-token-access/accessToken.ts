import { getToken } from "./auth-token-header";
const tokenData = getToken();
const accessToken = tokenData && tokenData.accessToken ? `Bearer ${tokenData.accessToken}` : "";

// Cache the token to prevent excessive localStorage reads
let cachedToken: string | null = null;
let lastTokenTime = 0;
const TOKEN_CACHE_DURATION = 5000; // Cache token for 5 seconds

const getAuthHeader = () => {
    const currentTime = Date.now();
    
    // If we have a cached token and it's not expired, use it
    if (cachedToken && (currentTime - lastTokenTime < TOKEN_CACHE_DURATION)) {
        console.log("Using cached token");
        return cachedToken;
    }
    
    // Token is expired or not available, get a new one
    try {
        const tokenVariable = localStorage.getItem("authUser");
        
        if (tokenVariable) {
            try {
                const parsedToken = JSON.parse(tokenVariable);
                
                // Validate token structure before using
                if (parsedToken && parsedToken.accessToken) {
                    // Update the cache
                    cachedToken = `Bearer ${parsedToken.accessToken}`;
                    lastTokenTime = currentTime;
                    console.log("Successfully retrieved fresh token");
                    return cachedToken;
                } else {
                    console.error("Token found in localStorage but has invalid structure:", parsedToken);
                    cachedToken = null;
                    return null;
                }
            } catch (parseError) {
                console.error("Error parsing token from localStorage:", parseError);
                cachedToken = null;
                return null;
            }
        } else {
            console.warn("No auth token found in localStorage. User might need to login.");
            cachedToken = null;
            return null;
        }
    } catch (error) {
        console.error("Error retrieving auth token:", error);
        cachedToken = null;
        return null;
    }
};

export { accessToken, getAuthHeader }