import { client } from '../helpers/graphql_helper';
import { gql } from '@apollo/client';

// GraphQL query for getApp
const GET_APP = gql`
    query GetApp {
        getApp {
            logo
            name
        }
    }
`;

// Keys for localStorage
export const LOGO_KEY = 'app_logo';
export const LOGO_TIMESTAMP_KEY = 'app_logo_timestamp';
const LOGO_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Fetch logo from getApp service and store in localStorage
 * @returns Promise<string> - The logo as a data URL
 */
export const fetchAndStoreAppLogo = async (defaultLogo: string): Promise<string> => {
    try {
        // Check if we have a valid cached logo
        const cachedLogo = getStoredLogo();
        if (cachedLogo) {
            return cachedLogo;
        }

        // Fetch from API if no valid cached logo
        const { data } = await client.query({
            query: GET_APP,
            fetchPolicy: 'network-only'
        });
        
        if (data?.getApp?.logo) {
            // Process the logo
            const logoDataUrl = data.getApp.logo.startsWith('data:image') 
                ? data.getApp.logo
                : `data:image/png;base64,${data.getApp.logo}`;
            
            // Store in localStorage with timestamp
            localStorage.setItem(LOGO_KEY, logoDataUrl);
            localStorage.setItem(LOGO_TIMESTAMP_KEY, Date.now().toString());
            
            return logoDataUrl;
        }
        
        return defaultLogo;
    } catch (error) {
        console.error('Error fetching app logo:', error);
        return defaultLogo;
    }
};

/**
 * Get stored logo from localStorage if it exists and is not expired
 * @returns string | null - The logo as a data URL or null if not found/expired
 */
export const getStoredLogo = (): string | null => {
    try {
        const storedLogo = localStorage.getItem(LOGO_KEY);
        const timestamp = localStorage.getItem(LOGO_TIMESTAMP_KEY);
        
        if (!storedLogo || !timestamp) {
            return null;
        }
        
        // Check if logo is expired
        const storedTime = parseInt(timestamp, 10);
        const now = Date.now();
        
        if (now - storedTime > LOGO_EXPIRY_TIME) {
            // Logo is expired, clear it
            localStorage.removeItem(LOGO_KEY);
            localStorage.removeItem(LOGO_TIMESTAMP_KEY);
            return null;
        }
        
        return storedLogo;
    } catch (error) {
        console.error('Error retrieving stored logo:', error);
        return null;
    }
}; 