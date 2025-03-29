import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink } from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { getAuthHeader } from "./helpers/jwt-token-access/accessToken";

// Get API URL from environment
const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

// Cache for storing the auth token
let cachedAuthHeader: string | null = null;
let lastTokenFetchTime = 0;
const TOKEN_CACHE_DURATION = 5000; // 5 seconds

// Custom link to cache the auth token
const cachedAuthLink = new ApolloLink((operation, forward) => {
  const currentTime = Date.now();
  
  // Only fetch a new token if the cached one has expired
  if (!cachedAuthHeader || (currentTime - lastTokenFetchTime > TOKEN_CACHE_DURATION)) {
    cachedAuthHeader = getAuthHeader();
    lastTokenFetchTime = currentTime;
    console.log("Fetched fresh auth token");
  } else {
    console.log("Using cached auth token");
  }
  
  // Set the authorization header
  operation.setContext({
    headers: {
      authorization: cachedAuthHeader || "",
    }
  });
  
  return forward(operation);
});

// Create batch http link to combine multiple requests
const batchLink = new BatchHttpLink({
  uri: apiUrl,
  batchMax: 5, // Max 5 operations per batch
  batchInterval: 20, // Wait 20ms for batching
});

// Regular http link for non-batchable operations
const httpLink = createHttpLink({
  uri: apiUrl,
});

// Create Apollo Client with combined links
export const createOptimizedClient = () => {
  return new ApolloClient({
    link: from([
      cachedAuthLink,
      batchLink
    ]),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'all',
      }
    },
  });
};

// Helper function to get context with cached auth header
export const getAuthContext = () => {
  const currentTime = Date.now();
  
  // Only fetch a new token if the cached one has expired
  if (!cachedAuthHeader || (currentTime - lastTokenFetchTime > TOKEN_CACHE_DURATION)) {
    cachedAuthHeader = getAuthHeader();
    lastTokenFetchTime = currentTime;
  }
  
  return {
    headers: {
      authorization: cachedAuthHeader || "",
    }
  };
}; 