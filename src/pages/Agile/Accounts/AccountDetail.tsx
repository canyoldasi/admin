import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Input,
  Button,
  Spinner,
  Badge,
  Table
} from "reactstrap";
import classnames from "classnames";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import { useMutation, useQuery, useLazyQuery, ApolloClient, InMemoryCache, createHttpLink, ApolloProvider } from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import Select from "react-select";
import * as Yup from "yup";
import { useFormik } from "formik";
import moment from "moment";
import { gql } from "@apollo/client";
import axios from "axios";

// Import DB
import {
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT,
  UPDATE_ACCOUNT_LOCATIONS
} from "../../../graphql/mutations/accountMutations";
import { 
  GET_ACCOUNT,
  GET_USERS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS,
  GET_SEGMENTS,
  GET_ACCOUNT_TYPES
} from "../../../graphql/queries/accountQueries";
import { GET_TRANSACTIONS } from "../Transactions/graphql/queries";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { Account, SelectOption } from "../../../types/graphql";
import { ApolloError } from "@apollo/client";
import DeleteModal from "../../../Components/Common/DeleteModal";
import Loader from "../../../Components/Common/Loader";

import AccountForm from "./AccountForm";
import AccountFormModal from "./AccountFormModal";

// API URL
const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

// Create auth link with improved error handling
const authLink = setContext((_, { headers }) => {
  try {
    // Get the authentication token from local storage
    const token = getAuthHeader();
    
    // Debug auth token
    console.log("Auth Link - Token Available:", !!token);
    if (token) {
      console.log("Auth Link - Token Preview:", `${token.substring(0, 15)}...`);
    } else {
      console.error("Auth Link - No token available - User may need to login");
    }
    
    // Return the headers to the context so httpLink can read them
    return {
      headers: {
        ...headers,
        authorization: token || "",
      }
    };
  } catch (error) {
    console.error("Error in auth link:", error);
    // Geri dön ama hata geçiştir
    return {
      headers: {
        ...headers,
      }
    };
  }
});

// Create http link
const httpLink = createHttpLink({
  uri: apiUrl,
});

// Create Apollo Client with combined links and improved token handling
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
    // Add watchQuery defaults to control token usage
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      errorPolicy: 'all',
    }
  },
  connectToDevTools: true // Enable dev tools for debugging
});

// Helper function to get context for individual queries
const getAuthorizationLink = () => {
  // Get a fresh token every time to ensure we have the latest
  const token = getAuthHeader();
  
  // Debug auth context
  console.log("Auth Context - Token Available:", !!token);
  if (token) {
    console.log("Auth Context - Token Preview:", `${token.substring(0, 15)}...`);
  } else {
    console.error("Auth Context - No token available - Authentication may fail");
  }
  
  const headers = {
    Authorization: token || '',
    'Content-Type': 'application/json',
  };
  
  console.log("Request headers:", headers);
  
  return { headers };
};

// Add a debounce utility function to reduce token requests during typing
function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Create a function to generate debounced formik handlers
const createDebouncedFormikHandlers = (originalHandleChange: Function, delay = 300) => {
  const debouncedHandleChange = debounce((e: React.ChangeEvent<any>) => {
    originalHandleChange(e);
  }, delay);
  
  return {
    handleDebouncedChange: (e: React.ChangeEvent<any>) => {
      // Always set the event value immediately for a responsive UI
      e.persist();
      debouncedHandleChange(e);
    },
  };
};

// Helper function to convert empty strings to null for GraphQL
const nullIfEmpty = (value: string | null | undefined) => {
  // If the value is undefined, null, or an empty string, return null
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

// Interface for account in the UI
interface AccountWithCreatedAt extends Partial<Account> {
  id?: string;
  createdAt?: string;
  date?: string; // UI formatting field
  // Additional fields needed for UI
  address?: string;
  postalCode?: string;
  country?: any; // Nesne olarak ülke bilgisi
  city?: any; // Nesne olarak şehir bilgisi
  county?: any; // Nesne olarak ilçe bilgisi
  district?: any; // Nesne olarak mahalle bilgisi
  neighborhood?: string;
  channel?: { id: string; name: string };
  createdBy?: { id: string; fullName: string };
  updatedBy?: { id: string; fullName: string };
  updatedAt?: string;
  no?: string;
  locations?: Array<{
    id: string;
    address?: string;
    postalCode?: string;
    country?: { id: string; name: string };
    city?: { id: string; name: string };
    county?: { id: string; name: string };
    district?: { id: string; name: string };
  }>;
}

// Location form interface
interface LocationForm {
  id: string;
  name?: string;
  countryId: string | null;
  countryName?: string;
  cityId: string | null;
  cityName?: string;
  countyId: string | null;
  countyName?: string;
  districtId: string | null;
  districtName?: string;
  address: string;
  postalCode: string;
  isEditing: boolean;
  isNew: boolean;
  isDeleted: boolean;
}

// Define a Transaction interface for the account page
interface AccountTransaction {
  id: string;
  createdAt: string;
  amount: number;
  status: {
    id: string;
    name: string;
  };
  transactionProducts: Array<{
    id: string;
    product: {
      id: string;
      name: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

// Define the type for location input
interface LocationInput {
  id?: string | null;
  countryId: string | null;
  cityId: string | null;
  countyId: string | null;
  districtId: string | null;
  postalCode: string | null;
  address: string | null;
}

// Main account detail component
const AccountDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accountIdRef = useRef<string | undefined>(id);
  
  // Debug - URL ve id parametresini yazdıralım
  useEffect(() => {
    console.log("Component mounted or ID changed - Current URL:", window.location.href);
    console.log("ID from URL params:", id);
    
    if (id) {
      console.log("Valid ID found, setting accountIdRef and fetching data");
      accountIdRef.current = id;
      fetchAccountData();
    } else {
      console.error("No account ID found in URL params");
      handleError("Hesap ID'si bulunamadı");
      console.log("Navigating back to accounts list");
      navigate("../");
    }
  }, [id, navigate]);
  
  // State for account data
  const [account, setAccount] = useState<AccountWithCreatedAt | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("1");
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  
  // Add state for transactions
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(false);
  
  // Reference data state
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  
  // Add state for locations management
  const [locations, setLocations] = useState<LocationForm[]>([]);
  const [isLocationFormDirty, setIsLocationFormDirty] = useState<boolean>(false);
  const [isLocationsLoading, setIsLocationsLoading] = useState<boolean>(false);
  
  // Toggle tabs
  const toggleTab = (tab: string) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };
  
  // Error handling function
  const handleError = (message: string) => {
    toast.error(message);
    console.error(message);
  };
  
  // Fetch cities for a country
  const fetchCitiesForCountry = async (countryId: string): Promise<void> => {
    try {
      console.log("Fetching cities for country:", countryId);
      return new Promise((resolve) => {
      client.query({
        query: GET_CITIES,
        variables: { countryId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getCities) {
          const options = data.getCities.map((city: any) => ({
            value: city.id,
            label: city.name
          }));
          setCityOptions(options);
            console.log(`Loaded ${options.length} cities for country ${countryId}`);
          } else {
            console.warn("No cities found for country:", countryId);
        }
          resolve();
        }).catch(error => {
          console.error("Error fetching cities:", error);
          resolve(); // Resolve anyway to prevent blocking
        });
      });
    } catch (error) {
      console.error("Error in fetchCitiesForCountry:", error);
      handleError("Şehir verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Fetch counties for a city
  const fetchCountiesForCity = async (cityId: string): Promise<void> => {
    try {
      console.log("Fetching counties for city:", cityId);
      return new Promise((resolve) => {
      client.query({
        query: GET_COUNTIES,
        variables: { cityId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getCounties) {
          const options = data.getCounties.map((county: any) => ({
            value: county.id,
            label: county.name
          }));
          setCountyOptions(options);
            console.log(`Loaded ${options.length} counties for city ${cityId}`);
          } else {
            console.warn("No counties found for city:", cityId);
        }
          resolve();
        }).catch(error => {
          console.error("Error fetching counties:", error);
          resolve(); // Resolve anyway to prevent blocking
        });
      });
    } catch (error) {
      console.error("Error in fetchCountiesForCity:", error);
      handleError("İlçe verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Fetch districts for a county
  const fetchDistrictsForCounty = async (countyId: string): Promise<void> => {
    try {
      console.log("Fetching districts for county:", countyId);
      return new Promise((resolve) => {
      client.query({
        query: GET_DISTRICTS,
        variables: { countyId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getDistricts) {
          const options = data.getDistricts.map((district: any) => ({
            value: district.id,
            label: district.name
          }));
          setDistrictOptions(options);
            console.log(`Loaded ${options.length} districts for county ${countyId}`);
          } else {
            console.warn("No districts found for county:", countyId);
        }
          resolve();
        }).catch(error => {
          console.error("Error fetching districts:", error);
          resolve(); // Resolve anyway to prevent blocking
        });
      });
    } catch (error) {
      console.error("Error in fetchDistrictsForCounty:", error);
      handleError("Mahalle verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Load user options
  const loadUserOptions = async () => {
    try {
      const { data } = await client.query({
        query: GET_USERS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getUsersLookup && data.getUsersLookup.items) {
        const options = data.getUsersLookup.items.map((user: any) => ({
          value: user.id,
          label: user.fullName
        }));
        setUserOptions(options);
      }
    } catch (error) {
      handleError("Kullanıcı verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Load country options
  const loadCountryOptions = async () => {
    try {
      const { data } = await client.query({
        query: GET_COUNTRIES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getCountries) {
        const options = data.getCountries.map((country: any) => ({
          value: country.id,
          label: country.name
        }));
        setCountryOptions(options);
      }
    } catch (error) {
      handleError("Ülke verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Fetch account data
  const fetchAccountData = async () => {
    try {
      setLoading(true);
      
      if (!accountIdRef.current) {
        console.error("Account ID is missing in params");
        handleError("Hesap ID'si bulunamadı");
        navigate("../");
        return;
      }
      
      // Log request details
      console.log("Current timestamp:", new Date().toISOString());
      console.log("Fetching account with ID:", accountIdRef.current);
      
      try {
        // Load reference data
        await Promise.all([
          loadUserOptions(),
          loadCountryOptions()
        ]);
        
        // API request parameters
        const variables = { id: accountIdRef.current };
        console.log("Sending GET_ACCOUNT query with variables:", variables);
        
        // Fetch account data with Apollo client
        const { data, error, errors } = await client.query({
          query: GET_ACCOUNT,
          variables,
          context: getAuthorizationLink(),
          fetchPolicy: "network-only" // Force new network request
        });
        
        // Log Apollo response
        console.log("Apollo response received:", !!data);
        
        if (errors) {
          console.error("GraphQL errors:", errors);
          handleError(`Veri alınırken GraphQL hataları oluştu: ${errors[0]?.message || "Bilinmeyen hata"}`);
          return;
        }
        
        if (!data) {
          console.error("No data returned from Apollo");
          handleError("Sunucudan veri alınamadı");
          return;
        }

        if (!data.getAccount) {
          console.error("getAccount query returned null or undefined");
          handleError("Hesap bulunamadı");
          return;
        }
        
        console.log("Successfully fetched account:", data.getAccount.id);
        
        // Debug locations data structure
        const debugLocations = () => {
          const account = data.getAccount;
          console.log("=== LOCATIONS DEBUG INFO ===");
          console.log("- Has locations property:", account.hasOwnProperty('locations'));
          
          if (account.locations) {
            console.log("- Locations is array:", Array.isArray(account.locations));
            console.log("- Locations length:", account.locations.length);
            
            if (account.locations.length > 0) {
              console.log("- Sample location data:");
              account.locations.forEach((loc: any, idx: number) => {
                console.log(`  Location #${idx + 1}:`, {
                  id: loc.id,
                  country: loc.country?.name,
                  city: loc.city?.name,
                  county: loc.county?.name,
                  district: loc.district?.name,
                  address: loc.address,
                  postalCode: loc.postalCode
                });
              });
            }
          } else {
            console.log("- Locations is falsy:", account.locations);
          }
          
          console.log("=== END LOCATIONS DEBUG ===");
        };
        
        // Call the debug function
        debugLocations();
        
        // Process account data
        const fetchedAccount = data.getAccount as AccountWithCreatedAt;
        
        // Create a new copy of the immutable Apollo object
        const accountCopy = { ...fetchedAccount };
        
        // Format dates for UI
        if (accountCopy.createdAt) {
          accountCopy.date = moment(accountCopy.createdAt).format("DD.MM.YYYY");
        }
        
        // Ensure locations array exists and is properly structured
        if (!accountCopy.locations) {
          console.log("No locations array found in account data, initializing empty array");
          accountCopy.locations = [];
        } else if (!Array.isArray(accountCopy.locations)) {
          console.error("Locations is not an array, fixing:", accountCopy.locations);
          accountCopy.locations = [];
        } else {
          console.log(`Account has ${accountCopy.locations.length} locations`);
          
          // Ensure each location has properly formatted data
          accountCopy.locations = accountCopy.locations.map((location: any) => {
            // Make sure all location objects have the required properties
            return {
              id: location.id,
              address: location.address || '',
              postalCode: location.postalCode || '',
              country: location.country || null,
              city: location.city || null,
              county: location.county || null,
              district: location.district || null
            };
          });
        }
        
        // Load location reference data sequentially
        try {
          if (accountCopy.country?.id) {
            console.log("Loading main account location data");
            
            await fetchCitiesForCountry(accountCopy.country.id);
            
            if (accountCopy.city?.id) {
              await fetchCountiesForCity(accountCopy.city.id);
              
              if (accountCopy.county?.id) {
                await fetchDistrictsForCounty(accountCopy.county.id);
              }
            }
          }
          
          // Also preload reference data for all locations
          if (accountCopy.locations.length > 0) {
            console.log("Preloading reference data for all locations");
            
            for (const location of accountCopy.locations) {
              if (location.country?.id) {
                await fetchCitiesForCountry(location.country.id);
                
                if (location.city?.id) {
                  await fetchCountiesForCity(location.city.id);
                  
                  if (location.county?.id) {
                    await fetchDistrictsForCounty(location.county.id);
                  }
                }
              }
            }
          }
        } catch (locationError) {
          console.error("Error loading location reference data:", locationError);
          // Non-critical error, can continue
        }
        
        // Save account data to state
        setAccount(accountCopy);
        
        // Update form with account data
        validation.setValues({
          id: accountCopy.id || "",
          name: accountCopy.name || "",
          firstName: accountCopy.firstName || "",
          lastName: accountCopy.lastName || "",
          email: accountCopy.email || "",
          phone: accountCopy.phone || "",
          phone2: accountCopy.phone2 || "",
          taxNumber: accountCopy.taxNumber || "",
          taxOffice: accountCopy.taxOffice || "",
          nationalId: accountCopy.nationalId || "",
          address: accountCopy.address || "",
          postalCode: accountCopy.postalCode || "",
          note: accountCopy.note || "",
          assignedUserId: accountCopy.assignedUser?.id || "",
          countryId: accountCopy.country?.id || "",
          cityId: accountCopy.city?.id || "",
          countyId: accountCopy.county?.id || "",
          districtId: accountCopy.district?.id || ""
        });
        
        // Fetch transactions for this account
        fetchAccountTransactions(accountIdRef.current);
      } catch (apolloError) {
        console.error("Apollo error details:", apolloError);
        
        if (apolloError instanceof ApolloError) {
          console.error("Apollo error while fetching account:", apolloError.message, apolloError);
          
          if (apolloError.networkError) {
            console.error("Network error details:", apolloError.networkError);
            handleError("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.");
          } else if (apolloError.graphQLErrors && apolloError.graphQLErrors.length > 0) {
            console.error("GraphQL errors:", apolloError.graphQLErrors);
            const errorMessage = apolloError.graphQLErrors[0].message;
            handleError(`Veri alınırken hata oluştu: ${errorMessage}`);
          } else {
            handleError("Hesap detayı yüklenirken bir hata oluştu");
          }
        } else {
          console.error("Unexpected Apollo error:", apolloError);
          handleError("Apollo sorgusu sırasında beklenmeyen bir hata oluştu");
        }
      }
    } catch (error) {
      // General error handling
      console.error("General error in fetchAccountData:", error);
      handleError("Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch transactions for the account
  const fetchAccountTransactions = async (accountId: string) => {
    try {
      setTransactionsLoading(true);
      console.log(`Fetching transactions for account ID: ${accountId}`);
      
      const { data } = await client.query({
        query: GET_TRANSACTIONS,
        variables: { 
          input: { 
            accountId: accountId,
            pageSize: 10,   // You can adjust this or make it configurable
            pageIndex: 0
          } 
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getTransactions && data.getTransactions.items) {
        console.log(`Found ${data.getTransactions.items.length} transactions`);
        setTransactions(data.getTransactions.items);
      } else {
        console.log("No transactions found for this account");
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      handleError("İşlemler yüklenirken bir hata oluştu");
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  // Update account mutation
  const [updateAccountMutation] = useMutation(UPDATE_ACCOUNT, {
    onCompleted: (data) => {
      toast.success("Hesap başarıyla güncellendi");
      setShowEditModal(false);
      fetchAccountData();
    },
    onError: (error) => {
      handleError(`Hesap güncellenirken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Delete account mutation
  const [deleteAccountMutation] = useMutation(DELETE_ACCOUNT, {
    onCompleted: (data) => {
      toast.success("Hesap başarıyla silindi");
      navigate("../");
    },
    onError: (error) => {
      handleError(`Hesap silinirken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Add the UPDATE_ACCOUNT_LOCATIONS mutation hook
  const [updateAccountLocationsMutation] = useMutation(UPDATE_ACCOUNT_LOCATIONS, {
    onCompleted: (data) => {
      toast.success("Lokasyonlar başarıyla güncellendi");
      fetchAccountData(); // Refresh data to show updated locations
    },
    onError: (error) => {
      handleError(`Lokasyon güncellenirken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Handle account update
  const handleUpdateAccount = async (values: any) => {
    try {
      setFormSubmitting(true);
      
      console.log("Received account update data from modal:", values);
      
      // Ensure values has a valid ID
      if (!values.id) {
        // Try to get the ID from accountIdRef
        if (accountIdRef.current) {
          values.id = accountIdRef.current;
        } else {
          handleError("Hesap ID'si bulunamadı. Güncelleme yapılamıyor.");
          return;
        }
      }
      
      // Log the values to be updated
      console.log(`Updating account with ID: ${values.id}`, values);
      
      // Get authorization token
      try {
        const authLink = getAuthorizationLink();
        if (!authLink) {
          console.error("Authentication link could not be created");
          toast.error("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
          return;
        }
      } catch (authError) {
        console.error("Error getting authorization:", authError);
        toast.error("Oturum bilgisi alınırken hata oluştu. Lütfen tekrar giriş yapın.");
        return;
      }
      
      // Update account - use values directly as they already have the right format
      const response = await updateAccountMutation({
        variables: {
          input: values
        },
        context: getAuthorizationLink()
      });
      
      console.log("Update response:", response);
      
      // Check for successful update
      if (!response || !response.data || !response.data.updateAccount) {
        console.error("Failed to update account: No data returned");
        handleError("Hesap güncellenirken bir hata oluştu: Sunucudan veri dönmedi");
        return;
      }
      
      // Close the modal after successful update
      setShowEditModal(false);
      
      // Show success message
      toast.success("Hesap başarıyla güncellendi");
      
      // Fetch the updated account data to refresh the UI
      await fetchAccountData();
    } catch (error: any) {
      console.error("Error updating account:", error);
      
      // Check for unique constraint violation
      const errorMessage = error.message || "";
      console.log("Error message details:", errorMessage);
      
      if (errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
        // Try to determine which field is causing the unique constraint violation
        if (errorMessage.includes("UQ_4c8f96ccf523e9a3faefd5bdd4c")) {
          // This appears to be the tax number constraint based on the error you provided
          handleError("Vergi numarası başka bir hesap tarafından kullanılıyor. Lütfen benzersiz bir değer girin.");
        } 
        else if (errorMessage.includes("email")) {
          handleError("Bu e-posta adresi zaten kullanılıyor. Lütfen benzersiz bir e-posta adresi girin.");
        }
        else if (errorMessage.includes("phone")) {
          handleError("Bu telefon numarası zaten kullanılıyor. Lütfen benzersiz bir telefon numarası girin.");
        }
        else if (errorMessage.includes("nationalId")) {
          handleError("Bu TC kimlik numarası zaten kullanılıyor. Lütfen benzersiz bir TC kimlik numarası girin.");
        }
        else {
          // Generic unique constraint message
          handleError("Hesap güncellenirken benzersiz alan hatası oluştu. Lütfen tüm değerleri kontrol edin ve benzersiz olduklarından emin olun.");
        }
      } else {
        // Generic error handling
        handleError(`Hesap güncellenirken bir hata oluştu: ${error.message}`);
      }
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Toggle edit modal
  const toggleEditModal = async () => {
    // If we're opening the modal
    if (!showEditModal) {
      try {
        // Set a loading state
        setFormSubmitting(true);
        
        // Ensure we have the latest account data before editing
        if (accountIdRef.current) {
          console.log("Fetching fresh account data for editing with ID:", accountIdRef.current);
          
          // Fetch the latest account data using the ID
          const { data, errors } = await client.query({
            query: GET_ACCOUNT,
            variables: { id: accountIdRef.current },
            context: getAuthorizationLink(),
            fetchPolicy: "network-only" // Force a network request to get fresh data
          });
          
          if (errors) {
            console.error("GraphQL errors when fetching account for edit:", errors);
            handleError(`Hesap bilgileri yüklenirken hata oluştu: ${errors[0]?.message || "Bilinmeyen hata"}`);
            setFormSubmitting(false);
            return;
          }
          
          if (!data || !data.getAccount) {
            console.error("No account data returned for editing");
            handleError("Hesap bilgileri bulunamadı");
            setFormSubmitting(false);
            return;
          }
          
          // Successfully fetched fresh account data
          console.log("Successfully fetched fresh account data for editing:", data.getAccount);
          
          // Update the account state with fresh data
          const freshAccount = { ...data.getAccount };
          
          // Format dates for UI
          if (freshAccount.createdAt) {
            freshAccount.date = moment(freshAccount.createdAt).format("DD.MM.YYYY");
          }
          
          // Update account state with fresh data
          setAccount(freshAccount);
          
          // Also update the form values with fresh data
          validation.setValues({
            id: freshAccount.id || "",
            name: freshAccount.name || "",
            firstName: freshAccount.firstName || "",
            lastName: freshAccount.lastName || "",
            email: freshAccount.email || "",
            phone: freshAccount.phone || "",
            phone2: freshAccount.phone2 || "",
            taxNumber: freshAccount.taxNumber || "",
            taxOffice: freshAccount.taxOffice || "",
            nationalId: freshAccount.nationalId || "",
            address: freshAccount.address || "",
            postalCode: freshAccount.postalCode || "",
            note: freshAccount.note || "",
            assignedUserId: freshAccount.assignedUser?.id || "",
            countryId: freshAccount.country?.id || "",
            cityId: freshAccount.city?.id || "",
            countyId: freshAccount.county?.id || "",
            districtId: freshAccount.district?.id || ""
          });
          
          // Pre-load location data if needed
          if (freshAccount.country?.id) {
            console.log("Pre-loading location data for edit form");
            
            await fetchCitiesForCountry(freshAccount.country.id);
            
            if (freshAccount.city?.id) {
              await fetchCountiesForCity(freshAccount.city.id);
            }
            if (freshAccount.county?.id) {
              await fetchDistrictsForCounty(freshAccount.county.id);
            }
          }
        }
      } catch (error) {
        console.error("Error preparing account data for editing:", error);
        handleError("Hesap düzenleme hazırlığı sırasında hata oluştu");
      } finally {
        setFormSubmitting(false);
      }
    }
    
    // Toggle the modal
    setShowEditModal(!showEditModal);
  };
  
  // Handle delete click
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    try {
      if (!accountIdRef.current) {
        handleError("Hesap ID'si bulunamadı");
        return;
      }
      
      await deleteAccountMutation({
        variables: { id: accountIdRef.current },
        context: getAuthorizationLink()
      });
    } catch (error) {
      handleError(`Hesap silinirken bir hata oluştu: ${(error as Error).message}`);
    }
  };
  
  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };
  
  // Formik validation schema
  const validationSchema = Yup.object({
    // All fields are optional, only format validation when a value is provided
    email: Yup.string()
      .email("Geçerli bir e-posta adresi giriniz"),
    phone: Yup.string()
      .test('phone-format', 'Geçerli bir telefon numarası giriniz', 
        function(value) {
          // If phone is empty, validation passes
          if (!value) {
            return true;
          }
          // Simple phone format check - can be enhanced further
          const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
          return phoneRegex.test(value) || this.createError({ message: 'Geçerli bir telefon numarası giriniz' });
        }),
    taxNumber: Yup.string()
      .test('tax-number-format', 'Geçerli bir vergi numarası giriniz',
        function(value) {
          // If tax number is empty, validation passes
          if (!value) {
            return true;
          }
          // For Turkish tax numbers (10 digits)
          return value.length === 10 || this.createError({ message: 'Vergi numarası 10 haneli olmalıdır' });
        }),
    nationalId: Yup.string()
      .test('national-id-format', 'Geçerli bir TC kimlik numarası giriniz',
        function(value) {
          // If national ID is empty, validation passes
          if (!value) {
            return true;
          }
          // For Turkish national ID (11 digits)
          return value.length === 11 || this.createError({ message: 'TC kimlik numarası 11 haneli olmalıdır' });
        })
  });
  
  // Formik instance
  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: account?.id || "",
      name: account?.name || "",
      firstName: account?.firstName || "",
      lastName: account?.lastName || "",
      email: account?.email || "",
      phone: account?.phone || "",
      phone2: account?.phone2 || "",
      taxNumber: account?.taxNumber || "",
      taxOffice: account?.taxOffice || "",
      nationalId: account?.nationalId || "",
      address: account?.address || "",
      postalCode: account?.postalCode || "",
      note: account?.note || "",
      assignedUserId: account?.assignedUser?.id || "",
      countryId: account?.country?.id || "",
      cityId: account?.city?.id || "",
      countyId: account?.county?.id || "",
      districtId: account?.district?.id || ""
    },
    validationSchema,
    onSubmit: (values) => {
      handleUpdateAccount(values);
    }
  });
  
  // Create formatted address for display
  const formattedAddress = (): string => {
    const parts = [];
    
    if (account?.address) parts.push(account.address);
    
    // Add district and county if available
    const locationParts = [];
    if (account?.district?.name) locationParts.push(account.district.name);
    if (account?.county?.name) locationParts.push(account.county.name);
    
    if (locationParts.length > 0) {
      parts.push(locationParts.join(', '));
    }
    
    // Add city and country if available
    const regionParts = [];
    if (account?.city?.name) regionParts.push(account.city.name);
    if (account?.country?.name) regionParts.push(account.country.name);
    
    if (regionParts.length > 0) {
      parts.push(regionParts.join(', '));
    }
    
    if (account?.postalCode) {
      parts.push(`Posta Kodu: ${account.postalCode}`);
    }
    
    return parts.join('<br/>');
  };
  
  // Load location data when account changes
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        if (!account) return;
        console.log("Loading account data for location form:", account);
        
        // Initialize locations array based on account data
        const locationsArray: LocationForm[] = [];
        
        // Load existing locations from account if available
        if (account.locations && Array.isArray(account.locations) && account.locations.length > 0) {
          console.log("Account has existing locations:", account.locations.length);
          
          // Map each location to the LocationForm format
          account.locations.forEach((location: any, index: number) => {
            console.log(`Processing location ${index}:`, location);
            
            // Ensure we have all needed information from location
            if (!location || !location.id) {
              console.warn(`Skipping invalid location at index ${index}:`, location);
              return;
            }
            
            // Create a complete location form object with all properties
            const locationForm: LocationForm = {
              id: location.id,
              name: `Lokasyon ${index + 1}`,
              countryId: location.country?.id || null,
              countryName: location.country?.name || '',
              cityId: location.city?.id || null,
              cityName: location.city?.name || '',
              countyId: location.county?.id || null,
              countyName: location.county?.name || '',
              districtId: location.district?.id || null,
              districtName: location.district?.name || '',
              address: location.address || '',
              postalCode: location.postalCode || '',
              isEditing: false,
              isNew: false,
              isDeleted: false
            };
            
            // Skip locations without a country
            if (!locationForm.countryId) {
              console.warn(`Skipping location without a country at index ${index}:`, location);
              return;
            }
            
            console.log(`Created location form for "${locationForm.countryName}"`, locationForm);
            locationsArray.push(locationForm);
          });
          
          console.log("Populated locations array with count:", locationsArray.length);
        } else {
          console.log("No existing locations found in account data");
        }
        
        // Only add a default empty location if there are no locations at all
        if (locationsArray.length === 0) {
          const defaultLocation: LocationForm = {
            id: `new-${Date.now()}`,
            name: 'Lokasyon 1',
            countryId: null,
            countryName: '',
            cityId: null,
            cityName: '',
            countyId: null,
            countyName: '',
            districtId: null,
            districtName: '',
            address: '',
            postalCode: '',
            isEditing: true,
            isNew: true,
            isDeleted: false
          };
          locationsArray.push(defaultLocation);
          console.log("Added default empty location");
        }
        
        // Preload reference data (country options etc.)
        try {
          // Load country options if not already loaded
          if (countryOptions.length === 0) {
            console.log("Loading country options");
            await loadCountryOptions();
          }
          
          // Preload location reference data for each location
          console.log("Preloading reference data for each location");
          for (const location of locationsArray) {
            if (location.countryId) {
              console.log(`Preloading cities for country ${location.countryName} (${location.countryId})`);
              await fetchCitiesForCountry(location.countryId);
              
              if (location.cityId) {
                console.log(`Preloading counties for city ${location.cityName} (${location.cityId})`);
                await fetchCountiesForCity(location.cityId);
          
                if (location.countyId) {
                  console.log(`Preloading districts for county ${location.countyName} (${location.countyId})`);
                  await fetchDistrictsForCounty(location.countyId);
                }
              }
            }
          }
          console.log("Finished preloading all reference data");
        } catch (locationDataError) {
          console.error("Error loading location reference data:", locationDataError);
        }
        
        console.log("Setting locations array for form:", locationsArray);
        
        // Reset the form dirty state - a fresh load should be clean
        setIsLocationFormDirty(false);
        
        // Important: Use a completely new array reference to ensure React detects the change
        setLocations([...locationsArray]);
        
        // Add CSS to fix Select dropdown menus
        const style = document.createElement('style');
        style.innerHTML = `
          .location-dropdown-fix .basic-single {
            position: relative;
          }
          .location-dropdown-fix .css-26l3qy-menu, 
          .location-dropdown-fix .css-1pahdxg-control {
            position: absolute;
            z-index: 1000;
            width: 100%;
          }
          .table-responsive .react-select__menu {
            position: absolute;
            z-index: 1000;
            width: 100%;
          }
          .react-select__menu-portal {
            z-index: 1000;
          }
          .location-cell .react-select__menu {
            min-width: 200px;
          }
        `;
        document.head.appendChild(style);
      } catch (error: any) {
        console.error("Error initializing location form:", error);
        handleError("Lokasyon formu hazırlanırken bir hata oluştu");
      }
    };
    
    loadLocationData();
  }, [account, countryOptions.length]);

  // Handle location input change
  const handleLocationChange = (index: number, field: keyof LocationForm, value: any) => {
    setIsLocationFormDirty(true);
    
    // ÖNEMLI: Derin kopya oluşturuyoruz - herhangi bir referans sorunu yaşamamak için
    const updatedLocations = JSON.parse(JSON.stringify(locations));
    
    console.log(`Lokasyon değiştiriliyor - Index: ${index}, Alan: ${field}, Değer:`, value);
    console.log("Değişiklik öncesi lokasyon:", updatedLocations[index]);
    
    // Önce temel değeri güncelle (örn. countryId, cityId vs.)
    updatedLocations[index] = {
      ...updatedLocations[index],
      [field]: value
    };
    
    // Şimdi ilgili name değerini de güncelle
    if (field === 'countryId') {
      // Ülke değişirse ilçe/mahalle sıfırla AMA SADECE bu lokasyon için
      updatedLocations[index].cityId = null;
      updatedLocations[index].cityName = '';
      updatedLocations[index].countyId = null;
      updatedLocations[index].countyName = '';
      updatedLocations[index].districtId = null;
      updatedLocations[index].districtName = '';
      
      // Ülke adını güncelle (değişiklik value'dan geliyor)
      if (value) {
        const country = countryOptions.find(c => c.value === value);
        if (country) {
          console.log(`Ülke adı bulundu ve atanıyor: ${country.label}`);
          updatedLocations[index].countryName = country.label;
        }
      } else {
        updatedLocations[index].countryName = '';
      }
      
      // Load cities for this country
      if (value) {
        console.log(`${value} ülkesi için şehirler yükleniyor...`);
        fetchCitiesForCountry(value);
      }
    } else if (field === 'cityId') {
      // Şehir değişirse ilçe/mahalle sıfırla AMA SADECE bu lokasyon için
      updatedLocations[index].countyId = null;
      updatedLocations[index].countyName = '';
      updatedLocations[index].districtId = null;
      updatedLocations[index].districtName = '';
      
      // Şehir adını güncelle
      if (value) {
        const city = cityOptions.find(c => c.value === value);
        if (city) {
          console.log(`Şehir adı bulundu ve atanıyor: ${city.label}`);
          updatedLocations[index].cityName = city.label;
        }
      } else {
        updatedLocations[index].cityName = '';
      }
      
      // Load counties for this city
      if (value) {
        console.log(`${value} şehri için ilçeler yükleniyor...`);
        fetchCountiesForCity(value);
      }
    } else if (field === 'countyId') {
      // İlçe değişirse mahalle sıfırla AMA SADECE bu lokasyon için
      updatedLocations[index].districtId = null;
      updatedLocations[index].districtName = '';
      
      // İlçe adını güncelle
      if (value) {
        const county = countyOptions.find(c => c.value === value);
        if (county) {
          console.log(`İlçe adı bulundu ve atanıyor: ${county.label}`);
          updatedLocations[index].countyName = county.label;
        }
      } else {
        updatedLocations[index].countyName = '';
      }
      
      // Load districts for this county
      if (value) {
        console.log(`${value} ilçesi için mahalleler yükleniyor...`);
        fetchDistrictsForCounty(value);
      }
    } else if (field === 'districtId') {
      // Mahalle adını güncelle
      if (value) {
        const district = districtOptions.find(d => d.value === value);
        if (district) {
          console.log(`Mahalle adı bulundu ve atanıyor: ${district.label}`);
          updatedLocations[index].districtName = district.label;
        }
      } else {
        updatedLocations[index].districtName = '';
      }
    }
    
    console.log("Değişiklik sonrası lokasyon:", updatedLocations[index]);
    console.log("Tüm lokasyonlar:", updatedLocations);
    
    // ÖNEMLI: Set locations with a complete new reference
    // Bu React'in state değişikliğini doğru şekilde algılamasını sağlar
    setLocations([...updatedLocations]);
  };

  // Add a new location
  const handleAddLocation = () => {
    console.log("Yeni lokasyon ekleniyor...");
    console.log("Mevcut lokasyonlar:", locations);
    
    // Mevcut lokasyonların derin bir kopyasını al
    const existingLocations = JSON.parse(JSON.stringify(locations));
    
    // Yeni indeks hesapla
    const newIndex = existingLocations.length + 1;
    
    // Yeni lokasyon objesi oluştur
    const newLocation: LocationForm = {
      id: `new-${Date.now()}`, // Generate a temporary ID
      name: `Lokasyon ${newIndex}`,
      countryId: null,
      countryName: '',
      cityId: null,
      cityName: '',
      countyId: null,
      countyName: '',
      districtId: null,
      districtName: '',
      address: '',
      postalCode: '',
      isNew: true,
      isEditing: true,
      isDeleted: false
    };
    
    console.log("Oluşturulan yeni lokasyon:", newLocation);
    
    // Yeni lokasyonu ekle, mevcut lokasyonlara DOKUNMA!
    const updatedLocations = [...existingLocations, newLocation];
    console.log("Güncellenmiş lokasyonlar:", updatedLocations);
    
    // ÖNEMLI: Tamamen yeni bir array referansı ile state'i güncelle
    setLocations(updatedLocations);
    setIsLocationFormDirty(true);
    
    // Scroll to the new location after a short delay to ensure the DOM has updated
    setTimeout(() => {
      try {
        const locationRows = document.querySelectorAll('.location-cell');
        if (locationRows.length > 0) {
          const lastLocationRow = locationRows[locationRows.length - 1];
          lastLocationRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } catch (error) {
        console.error("Error scrolling to new location:", error);
      }
    }, 300);
  };

  // Toggle editing for a location
  const handleEditLocation = (index: number) => {
    console.log(`Lokasyon #${index} düzenleme modu değiştiriliyor`);
    console.log("Lokasyon orijinal durumu:", locations[index]);
    
    // Mevcut lokasyonların derin bir kopyasını al
    const existingLocations = JSON.parse(JSON.stringify(locations));
    
    // Belirtilen lokasyonun düzenleme durumunu değiştir
    existingLocations[index] = {
      ...existingLocations[index],
      isEditing: !existingLocations[index].isEditing
    };
    
    console.log("Lokasyon yeni durumu:", existingLocations[index]);
    
    // Tamamen yeni bir referans ile state'i güncelle
    setLocations([...existingLocations]);
  };

  // Mark a location for deletion
  const handleDeleteLocation = (index: number) => {
    console.log(`Lokasyon #${index} siliniyor`);
    console.log("Silinecek lokasyon:", locations[index]);
    
    setIsLocationFormDirty(true);
    
    // Mevcut lokasyonların derin bir kopyasını al
    const existingLocations = JSON.parse(JSON.stringify(locations));
    
    // If it's a new unsaved location, remove it
    if (existingLocations[index].isNew) {
      console.log("Yeni eklenen lokasyon tamamen kaldırılıyor");
      existingLocations.splice(index, 1);
    } else {
      // Otherwise mark it for deletion (sadece UI'dan gizlenecek)
      console.log("Var olan lokasyon silindi olarak işaretleniyor");
      existingLocations[index] = {
        ...existingLocations[index],
        isDeleted: true
      };
    }
    
    console.log("Güncellenmiş lokasyonlar:", existingLocations);
    
    // Tamamen yeni bir referans ile state'i güncelle
    setLocations([...existingLocations]);
  };

  // Handle Save Locations
  const handleSaveLocations = async () => {
    try {
      setIsLocationsLoading(true);
      
      // Get account ID
      if (!account?.id) {
        console.error("Account ID is not available");
        toast.error("Hesap ID'si bulunamadı");
        return;
      }
      
      // Prepare locations data - keep only valid locations
      const locationInputs = locations
        .filter(loc => !loc.isDeleted)
        .filter(loc => loc.countryId) // Only keep locations with country
        .map(loc => {
          // Basic location data
          const locationData: any = {
            countryId: loc.countryId,
            cityId: loc.cityId || null,
            countyId: loc.countyId || null,
            districtId: loc.districtId || null,
            postalCode: loc.postalCode || null,
            address: loc.address || null
          };
          
          // Only include ID for existing locations
          if (!loc.isNew && loc.id && !loc.id.startsWith('new-')) {
            locationData.id = loc.id;
          }
          
          return locationData;
        });
      
      console.log("Prepared locations data:", locationInputs);
      
      // Use direct client query instead of mutation hooks
      try {
        // Create a simpler mutation that just focuses on updating
        const UPDATE_ACCOUNT_MUTATION = gql`
          mutation UpdateAccount($input: CreateUpdateAccountDTO!) {
            updateAccount(input: $input) {
              id
            }
          }
        `;
        
        console.log("Sending direct Apollo client request with payload:", {
          id: account.id,
          locations: locationInputs
        });
        
        const result = await client.mutate({
          mutation: UPDATE_ACCOUNT_MUTATION,
          variables: {
            input: {
              id: account.id,
              locations: locationInputs
            }
          },
          context: getAuthorizationLink()
        });
        
        console.log("Apollo mutation response:", result);
        
        if (result.errors) {
          console.error("GraphQL errors:", result.errors);
          throw new Error(result.errors[0]?.message || "GraphQL error");
        }
        
        if (!result.data) {
          throw new Error("No data returned from mutation");
        }
        
        // Success!
        setIsLocationFormDirty(false);
        toast.success("Lokasyonlar başarıyla güncellendi");
        
        // Fetch fresh data
        await fetchAccountData();
      } catch (mutationError) {
        console.error("Mutation error:", mutationError);
        throw mutationError;
      }
    } catch (error) {
      console.error("Error updating locations:", error);
      handleError(error?.message || "Lokasyonlar güncellenirken bir hata oluştu");
    } finally {
      setIsLocationsLoading(false);
    }
  };

  // Find country name by ID
  const getCountryName = (countryId: string | null | undefined) => {
    if (!countryId) return '-';
    const country = countryOptions.find(c => c.value === countryId);
    return country ? country.label : '-';
  };

  // Find city name by ID
  const getCityName = (cityId: string | null | undefined) => {
    if (!cityId) return '-';
    const city = cityOptions.find(c => c.value === cityId);
    return city ? city.label : '-';
  };

  // Find county name by ID
  const getCountyName = (countyId: string | null | undefined) => {
    if (!countyId) return '-';
    const county = countyOptions.find(c => c.value === countyId);
    return county ? county.label : '-';
  };

  // Find district name by ID
  const getDistrictName = (districtId: string | null | undefined) => {
    if (!districtId) return '-';
    const district = districtOptions.find(d => d.value === districtId);
    return district ? district.label : '-';
  };
  
  // Format date helper function
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format product names helper function
  const formatProductNames = (products: any[]): string => {
    if (!products || products.length === 0) return "-";
    return products.map(p => p.product.name).join(", ");
  };
  
  // Render
  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <div className="d-flex align-items-center mb-2">
            <h4 className="mb-0">HESAP DETAYI</h4>
          </div>
          
          {loading ? (
            <Loader />
          ) : account ? (
            <div className="border rounded bg-white p-3" >
            <Row>
              {/* Left Column - Transactions */}
              <Col md={7}>
                <Card className="mb-4">
                  <CardBody className="p-0">
                    <div className="table-responsive">
                      <Table className="align-middle mb-0" hover>
                        <thead className="table-light">
                          <tr>
                            <th scope="col">İşlemler</th>
                          </tr>
                        </thead>
                      </Table>
                    </div>
                    
                    <div className="table-responsive">
                      <Table className="align-middle mb-0" hover>
                        <thead className="table-light">
                          <tr>
                            <th scope="col">Tarih</th>
                            <th scope="col">Ürünler</th>
                            <th scope="col">Tutar</th>
                            <th scope="col">Durum</th>
                            <th scope="col" className="text-end">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                            {transactionsLoading ? (
                              <tr>
                                <td colSpan={5} className="text-center">
                                  <Spinner size="sm" color="primary" /> Yükleniyor...
                            </td>
                          </tr>
                            ) : transactions.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center">
                                  Bu hesap için işlem bulunamadı.
                                </td>
                              </tr>
                            ) : (
                              transactions.map(transaction => (
                                <tr key={transaction.id}>
                                  <td>{formatDate(transaction.createdAt)}</td>
                                  <td>{formatProductNames(transaction.transactionProducts)}</td>
                                  <td>{transaction.amount || "-"}</td>
                                  <td>{transaction.status?.name || "-"}</td>
                            <td className="text-end">
                                    <Link 
                                      to={`/transactions/detail/${transaction.id}`}
                                      className="btn btn-link btn-sm text-decoration-none text-dark me-1"
                              >
                                Detaylar
                                    </Link>
                            </td>
                          </tr>
                              ))
                            )}
                        </tbody>
                      </Table>
                    </div>
                  </CardBody>
                </Card>
                
                {/* Lokasyonlar Bölümü - UPDATED */}
                <Card className="mb-4">
                  <CardBody className="p-0">
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light">
                      <h5 className="mb-0">Lokasyonlar</h5>
                      <div>
                        <Button color="primary" size="sm" onClick={handleAddLocation} className="me-2">
                          <i className="ri-add-line align-bottom"></i> Ekle
                        </Button>
                        <Button 
                          color="success" 
                          size="sm" 
                          onClick={handleSaveLocations} 
                          disabled={!isLocationFormDirty}
                        >
                          <i className="ri-save-line align-bottom"></i> Kaydet
                        </Button>
                      </div>
                    </div>
                    
                    <div className="table-responsive location-dropdown-fix">
                      <Table className="align-middle mb-0" hover>
                        <thead className="table-light">
                          <tr>
                            <th scope="col" style={{ minWidth: "200px" }}>Ülke/Şehir</th>
                            <th scope="col" style={{ minWidth: "200px" }}>İlçe/Mahalle</th>
                            <th scope="col">Kod</th>
                            <th scope="col">Adres</th>
                            <th scope="col" className="text-end">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locations.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-3">
                                <p className="text-muted mb-0">Henüz lokasyon eklenmemiş.</p>
                              </td>
                            </tr>
                          ) : (
                            locations.map((location, index) => {
                              // Don't render deleted locations
                              if (location.isDeleted) return null;
                              
                              return (
                                <tr key={location.id || `new-${index}`}>
                                  <td className="location-cell">
                                    {location.isEditing ? (
                                      <div className="mb-2 dropdown-container" style={{ position: "relative", zIndex: 100 - index }}>
                                        <Select 
                                          className="basic-single" 
                                          classNamePrefix="react-select"
                                          placeholder="Ülke Seçiniz"
                                          options={countryOptions}
                                          value={location.countryId ? 
                                            {
                                              value: location.countryId,
                                              label: location.countryName || getCountryName(location.countryId) 
                                            } : null
                                          }
                                          onChange={(selected: SelectOption | null) => 
                                            handleLocationChange(index, 'countryId', selected?.value)
                                          }
                                          isClearable
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                                            control: (base: any) => ({ ...base, minHeight: "34px" }),
                                            container: (base: any) => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="mb-2 fw-medium">
                                        {location.countryName || getCountryName(location.countryId)}
                                      </div>
                                    )}
                                    
                                    {location.isEditing ? (
                                      <div className="dropdown-container" style={{ position: "relative", zIndex: 99 - index }}>
                                      <Select 
                                        className="basic-single" 
                                          classNamePrefix="react-select"
                                        placeholder="Şehir Seçiniz"
                                        options={cityOptions}
                                        value={location.cityId ? 
                                          {
                                            value: location.cityId,
                                            label: location.cityName || getCityName(location.cityId)
                                          } : null
                                        }
                                        onChange={(selected: SelectOption | null) => 
                                          handleLocationChange(index, 'cityId', selected?.value)
                                        }
                                        isClearable
                                        isDisabled={!location.countryId}
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                                            control: (base: any) => ({ ...base, minHeight: "34px" }),
                                            container: (base: any) => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div>
                                        {location.cityName || getCityName(location.cityId)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="location-cell">
                                    {location.isEditing ? (
                                      <div className="mb-2 dropdown-container" style={{ position: "relative", zIndex: 98 - index }}>
                                        <Select 
                                          className="basic-single" 
                                          classNamePrefix="react-select"
                                          placeholder="İlçe Seçiniz"
                                          options={countyOptions}
                                          value={location.countyId ? 
                                            {
                                              value: location.countyId,
                                              label: location.countyName || getCountyName(location.countyId)
                                            } : null
                                          }
                                          onChange={(selected: SelectOption | null) => 
                                            handleLocationChange(index, 'countyId', selected?.value)
                                          }
                                          isClearable
                                          isDisabled={!location.cityId}
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                                            control: (base: any) => ({ ...base, minHeight: "34px" }),
                                            container: (base: any) => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="mb-2">
                                        {location.countyName || getCountyName(location.countyId)}
                                      </div>
                                    )}
                                    
                                    {location.isEditing ? (
                                      <div className="dropdown-container" style={{ position: "relative", zIndex: 97 - index }}>
                                      <Select 
                                        className="basic-single" 
                                          classNamePrefix="react-select"
                                        placeholder="Mahalle Seçiniz"
                                        options={districtOptions}
                                        value={location.districtId ? 
                                          {
                                            value: location.districtId,
                                            label: location.districtName || getDistrictName(location.districtId)
                                          } : null
                                        }
                                        onChange={(selected: SelectOption | null) => 
                                          handleLocationChange(index, 'districtId', selected?.value)
                                        }
                                        isClearable
                                        isDisabled={!location.countyId}
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                                            control: (base: any) => ({ ...base, minHeight: "34px" }),
                                            container: (base: any) => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div>
                                        {location.districtName || getDistrictName(location.districtId)}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {location.isEditing ? (
                                      <Input 
                                        type="text" 
                                        placeholder="Posta Kodu" 
                                        className="form-control mb-2"
                                        value={location.postalCode || ''}
                                        onChange={(e) => 
                                          handleLocationChange(index, 'postalCode', e.target.value)
                                        }
                                      />
                                    ) : (
                                      <div>{location.postalCode || '-'}</div>
                                    )}
                                  </td>
                                  <td>
                                    {location.isEditing ? (
                                      <Input 
                                        type="textarea" 
                                        placeholder="Adres bilgisi giriniz" 
                                        className="form-control"
                                        style={{ height: '70px' }}
                                        value={location.address || ''}
                                        onChange={(e) => 
                                          handleLocationChange(index, 'address', e.target.value)
                                        }
                                      />
                                    ) : (
                                      <div>{location.address || '-'}</div>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <Button 
                                      color="link" 
                                      className={location.isEditing ? "text-success" : "text-primary"}
                                      onClick={() => handleEditLocation(index)}
                                    >
                                      <i className={location.isEditing ? "ri-check-line" : "ri-edit-line"}></i>
                                    </Button>
                                    <Button 
                                      color="link" 
                                      className="text-danger"
                                      onClick={() => handleDeleteLocation(index)}
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </CardBody>
                </Card>
              </Col>
              
              {/* Right Column - Account Info */}
              <Col md={5}>
                <div className="d-flex justify-content-end mb-2">
                  <Link to="/accounts" className="btn btn-light btn-sm">
                    <i className="ri-arrow-left-line me-1"></i> Hesaplara Dön
                  </Link>
                </div>
                
                <Card className="border mb-4">
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Hesap Bilgileri</h5>
                      <Button 
                        color="primary" 
                        size="sm"
                        onClick={toggleEditModal}
                      >
                        Düzenle
                      </Button>
                    </div>
                    
                    <div className="table-responsive">
                      <Table borderless>
                        <tbody>
                          <tr>
                            <th style={{ width: "40%" }}>Hesap Türleri</th>
                            <td>
                              {account.accountTypes && account.accountTypes.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                  {account.accountTypes.map((type, index) => (
                                    <Badge 
                                      key={index} 
                                      color="info" 
                                      className="me-1"
                                    >
                                      {type.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                          </tr>
                          <tr>
                            <th>Tam Adı</th>
                            <td>{account.name || `${account.firstName || ''} ${account.lastName || ''}`}</td>
                          </tr>
                          <tr>
                            <th>Adı</th>
                            <td>{account.firstName || account.name?.split(' ')[0] || '-'}</td>
                          </tr>
                          <tr>
                            <th>Soyadı</th>
                            <td>{account.lastName || (account.name && account.name.split(' ').length > 1 ? account.name.split(' ').slice(1).join(' ') : '-')}</td>
                          </tr>
                          <tr>
                            <th>Telefon</th>
                            <td>{account.phone || '-'}</td>
                          </tr>
                          <tr>
                            <th>E-posta</th>
                            <td>{account.email || '-'}</td>
                          </tr>
                          <tr>
                            <th>Kanal</th>
                            <td>{account.channel?.name || '-'}</td>
                          </tr>
                          <tr>
                            <th>Eklenme</th>
                            <td>{account.createdAt ? moment(account.createdAt).format('DD.MM.YYYY HH:mm') : '-'}</td>
                          </tr>
                          <tr>
                            <th>Ekleyen</th>
                            <td>{account.createdBy?.fullName || '-'}</td>
                          </tr>
                          <tr>
                            <th>Güncellenme</th>
                            <td>{account.updatedAt ? moment(account.updatedAt).format('DD.MM.YYYY HH:mm') : '-'}</td>
                          </tr>
                          <tr>
                            <th>Güncelleyen</th>
                            <td>{account.updatedBy?.fullName || '-'}</td>
                          </tr>
                          <tr>
                            <th>Hesap No</th>
                            <td>{account.no || account.id?.substring(0, 5) || '-'}</td>
                          </tr>
                          <tr>
                            <th>Atanan Kullanıcı</th>
                            <td>{account.assignedUser?.fullName || '-'}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted">Hesap bulunamadı.</p>
              <Link to="../" className="btn btn-primary">Hesap Listesine Dön</Link>
            </div>
          )}
        </Container>
      </div>
      
      {/* Edit Modal */}
      {account && (
        <AccountFormModal
          isOpen={showEditModal}
          toggle={toggleEditModal}
          title="Hesabı Düzenle"
          submitText="Güncelle"
          onSubmit={handleUpdateAccount}
          validation={validation}
          isSubmitting={formSubmitting}
          account={account}
        />
      )}
      
      {/* Delete Modal */}
      <DeleteModal
        show={showDeleteModal}
        onCloseClick={closeDeleteModal}
        backdrop="static"
      />
      
      <ToastContainer closeButton={false} position="top-right" />
    </React.Fragment>
  );
};

// Main component
const AccountDetail: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <AccountDetailContent />
    </ApolloProvider>
  );
};

export default AccountDetail;