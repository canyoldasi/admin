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
  DELETE_ACCOUNT
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
import { GET_TRANSACTIONS } from "../../../graphql/queries/transactionQueries";
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
      
      // Tarih ve ID değerlerini yazdır
      console.log("Current timestamp:", new Date().toISOString());
      console.log("Fetching account with ID:", accountIdRef.current);
      
      try {
        // Yardımcı veriler yükleme
        await Promise.all([
          loadUserOptions(),
          loadCountryOptions()
        ]);
        
        // API'ye gönderilen sorgu parametreleri
        const variables = { id: accountIdRef.current };
        console.log("Sending GET_ACCOUNT query with variables:", variables);
        
        // Apollo istemcisi ile account verilerini getir
        const { data, error, errors } = await client.query({
          query: GET_ACCOUNT,
          variables,
          context: getAuthorizationLink(),
          fetchPolicy: "network-only"
        });
        
        // Apollo yanıtını detaylı şekilde logla
        console.log("Apollo response:", { data, error, errors });
        
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
        
        console.log("Successfully fetched account:", data.getAccount);
        
        // Alınan verileri işle
        const fetchedAccount = data.getAccount as AccountWithCreatedAt;
        
        // Apollo nesnelerinin değiştirilmez (immutable) olduğundan yeni bir kopya oluştur
        const accountCopy = { ...fetchedAccount };
        
        // Format dates for UI
        if (accountCopy.createdAt) {
          accountCopy.date = moment(accountCopy.createdAt).format("DD.MM.YYYY");
        }
        
        // Konum verilerini yükle - sequential to ensure proper data loading
        try {
          // Start by preloading any necessary location data
          if (accountCopy.country?.id) {
            console.log("Loading location data sequentially");
            
            // First, load cities for the country
            await fetchCitiesForCountry(accountCopy.country.id);
            
            // If city is present, load counties
            if (accountCopy.city?.id) {
              await fetchCountiesForCity(accountCopy.city.id);
              
              // If county is present, load districts
              if (accountCopy.county?.id) {
                await fetchDistrictsForCounty(accountCopy.county.id);
              }
            }
          }
        } catch (locationError) {
          console.error("Error loading location data:", locationError);
          // Konum verisi yükleme hatası kritik değil, devam edebiliriz
        }
        
        // Account verisini state'e kaydet
        setAccount(accountCopy);
        
        // Also update the form with the account data
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
      // Genel hata yakalama
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
  
  // Handle account update
  const handleUpdateAccount = async (values: any) => {
    try {
      setFormSubmitting(true);
      
      // Ensure we have a valid ID
      if (!accountIdRef.current) {
        handleError("Hesap ID'si bulunamadı. Güncelleme yapılamıyor.");
        return;
      }
      
      // Log the values to be updated
      console.log(`Updating account with ID: ${accountIdRef.current}`, values);
      
      // Prepare account input
      const accountInput = {
        id: accountIdRef.current,
        name: values.name,
        firstName: nullIfEmpty(values.firstName),
        lastName: nullIfEmpty(values.lastName),
        email: nullIfEmpty(values.email),
        phone: nullIfEmpty(values.phone),
        phone2: nullIfEmpty(values.phone2),
        taxNumber: nullIfEmpty(values.taxNumber),
        taxOffice: nullIfEmpty(values.taxOffice),
        nationalId: nullIfEmpty(values.nationalId),
        address: nullIfEmpty(values.address),
        postalCode: nullIfEmpty(values.postalCode),
        note: nullIfEmpty(values.note),
        assignedUserId: nullIfEmpty(values.assignedUserId),
        countryId: nullIfEmpty(values.countryId),
        cityId: nullIfEmpty(values.cityId),
        countyId: nullIfEmpty(values.countyId),
        districtId: nullIfEmpty(values.districtId)
      };
      
      // Log the prepared input
      console.log("Prepared account input for update:", accountInput);
      
      // Update account
      const response = await updateAccountMutation({
        variables: {
          input: accountInput
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
      
      // Fetch the updated account data to refresh the UI
      await fetchAccountData();
      
      // Show success message - this is now handled by the mutation's onCompleted callback
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
          
          // Highlight the field that's likely causing the issue
          validation.setFieldError("taxNumber", "Bu vergi numarası zaten kullanılıyor");
        } 
        else if (errorMessage.includes("email")) {
          handleError("Bu e-posta adresi zaten kullanılıyor. Lütfen benzersiz bir e-posta adresi girin.");
          validation.setFieldError("email", "Bu e-posta adresi zaten kullanılıyor");
        }
        else if (errorMessage.includes("phone")) {
          handleError("Bu telefon numarası zaten kullanılıyor. Lütfen benzersiz bir telefon numarası girin.");
          validation.setFieldError("phone", "Bu telefon numarası zaten kullanılıyor");
        }
        else if (errorMessage.includes("nationalId")) {
          handleError("Bu TC kimlik numarası zaten kullanılıyor. Lütfen benzersiz bir TC kimlik numarası girin.");
          validation.setFieldError("nationalId", "Bu TC kimlik numarası zaten kullanılıyor");
        }
        else {
          // Generic unique constraint message
          handleError("Hesap güncellenirken benzersiz alan hatası oluştu. Lütfen tüm değerleri kontrol edin ve benzersiz olduklarından emin olun.");
          
          // For debugging, log the values that might be causing issues
          console.log("Possible duplicate values:", {
            email: values.email,
            phone: values.phone,
            taxNumber: values.taxNumber,
            nationalId: values.nationalId
          });
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
    name: Yup.string().required("Ad alanı zorunludur"),
    email: Yup.string()
      .email("Geçerli bir e-posta adresi giriniz")
      .test('email-uniqueness', 'Bu e-posta adresi zaten kullanılıyor', 
        function(value) {
          // If email is empty or unchanged, validation passes
          if (!value || (account?.email === value)) {
            return true;
          }
          // For now, we can only catch duplicates after submission
          return true;
        }),
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
        console.log("Loading locations from account data:", account);
        
        const locationsArray: LocationForm[] = [];
        
        // Check if the account has location data (main location)
        if (account.country || account.city || account.county || account.district || account.address || account.postalCode) {
          console.log("Account has main location data");
          
          // Add the main location with a special ID prefix to identify it
          locationsArray.push({
            id: 'main-location',
            name: 'Ana Lokasyon',
            countryId: account.country?.id || null,
            countryName: account.country?.name,
            cityId: account.city?.id || null,
            cityName: account.city?.name,
            countyId: account.county?.id || null,
            countyName: account.county?.name,
            districtId: account.district?.id || null,
            districtName: account.district?.name,
            address: account.address || '',
            postalCode: account.postalCode || '',
            isEditing: false,
            isNew: false,
            isDeleted: false
          });
          
          // Load related location data (city, county, district options) for the main location
          try {
            if (account.country?.id) {
              await fetchCitiesForCountry(account.country.id);
            }
            if (account.city?.id) {
              await fetchCountiesForCity(account.city.id);
            }
            if (account.county?.id) {
              await fetchDistrictsForCounty(account.county.id);
            }
          } catch (locationDataError) {
            console.error("Error loading related location data for main location:", locationDataError);
          }
        }
        
        // Add additional locations from locations array if available
        if (account.locations && account.locations.length > 0) {
          console.log("Account has additional locations:", account.locations);
          
          // Load related location data for each additional location
          for (const location of account.locations) {
            try {
              // Skip locations that might be flagged as main (using a property check)
              const isMainLocation = location.hasOwnProperty('isMainLocation') && 
                (location as any).isMainLocation === true;
                
              if (isMainLocation) {
                console.log("Skipping main location in locations array:", location);
                continue;
              }
              
              // Load related location data for each location
              if (location.country?.id) {
                await fetchCitiesForCountry(location.country.id);
              }
              if (location.city?.id) {
                await fetchCountiesForCity(location.city.id);
              }
              if (location.county?.id) {
                await fetchDistrictsForCounty(location.county.id);
              }
              
              // Add the location to our array
              locationsArray.push({
                id: location.id,
                name: `Lokasyon ${locationsArray.length + 1}`,
                countryId: location.country?.id || null,
                countryName: location.country?.name,
                cityId: location.city?.id || null,
                cityName: location.city?.name,
                countyId: location.county?.id || null,
                countyName: location.county?.name,
                districtId: location.district?.id || null,
                districtName: location.district?.name,
                address: location.address || '',
                postalCode: location.postalCode || '',
                isEditing: false,
                isNew: false,
                isDeleted: false
              });
            } catch (locationError: any) {
              console.error("Error processing additional location:", locationError);
            }
          }
        }
        
        console.log("Final locations array:", locationsArray);
        setLocations(locationsArray);
        
        // Load country options if not already loaded
        if (countryOptions.length === 0) {
          loadCountryOptions();
        }
        
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
        console.error("Error loading location data:", error);
        handleError("Lokasyon verileri yüklenirken bir hata oluştu");
      }
    };
    
    loadLocationData();
  }, [account]);

  // Handle location input change
  const handleLocationChange = (index: number, field: keyof LocationForm, value: any) => {
    setIsLocationFormDirty(true);
    
    const updatedLocations = [...locations];
    updatedLocations[index] = {
      ...updatedLocations[index],
      [field]: value
    };
    
    // Handle cascading selects
    if (field === 'countryId') {
      // When country changes, clear city, county, district
      updatedLocations[index].cityId = null;
      updatedLocations[index].countyId = null;
      updatedLocations[index].districtId = null;
      
      // Load cities for this country
      if (value) {
        fetchCitiesForCountry(value);
      }
    } else if (field === 'cityId') {
      // When city changes, clear county, district
      updatedLocations[index].countyId = null;
      updatedLocations[index].districtId = null;
      
      // Load counties for this city
      if (value) {
        fetchCountiesForCity(value);
      }
    } else if (field === 'countyId') {
      // When county changes, clear district
      updatedLocations[index].districtId = null;
      
      // Load districts for this county
      if (value) {
        fetchDistrictsForCounty(value);
      }
    }
    
    setLocations(updatedLocations);
  };

  // Add a new location
  const handleAddLocation = () => {
    // Create a new location with default values
    const newLocation: LocationForm = {
      id: `new-${Date.now()}`, // Generate a temporary ID
      name: `Lokasyon ${locations.length + 1}`,
      countryId: null,
      cityId: null,
      countyId: null,
      districtId: null,
      address: '',
      postalCode: '',
      isNew: true,
      isEditing: true,
      isDeleted: false
    };
    
    // Add the new location to the state
    setLocations([...locations, newLocation]);
    setIsLocationFormDirty(true);
  };

  // Toggle editing for a location
  const handleEditLocation = (index: number) => {
    const updatedLocations = [...locations];
    updatedLocations[index] = {
      ...updatedLocations[index],
      isEditing: !updatedLocations[index].isEditing
    };
    
    setLocations(updatedLocations);
  };

  // Mark a location for deletion
  const handleDeleteLocation = (index: number) => {
    setIsLocationFormDirty(true);
    
    const updatedLocations = [...locations];
    
    // If it's a new unsaved location, remove it
    if (updatedLocations[index].isNew) {
      updatedLocations.splice(index, 1);
    } else {
      // Otherwise mark it for deletion
      updatedLocations[index] = {
        ...updatedLocations[index],
        isDeleted: true
      };
    }
    
    setLocations(updatedLocations);
  };

  // Function to save all location changes
  const handleSaveLocations = async () => {
    try {
      setIsLocationsLoading(true);
      console.log("Starting location save for account:", account?.id);
      console.log("Current locations state:", locations);
      
      if (!account?.id) {
        throw new Error("Account ID is required to save locations");
      }
      
      const accountId = account.id;
      const token = getAuthHeader();
      
      if (!token) {
        console.error("No authentication token available");
        throw new Error("Authentication token is required");
      }
      
      // Make sure token is properly formatted for API requests
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      
      // Extract the main location (if it exists)
      const mainLocation = locations.find(loc => loc.id?.startsWith('main-'));
      
      // Get all additional locations (excluding the main one and deleted ones)
      const additionalLocations = locations.filter(loc => 
        !loc.id?.startsWith('main-') && 
        !loc.isDeleted && 
        (loc.isNew || loc.isEditing)
      );
      
      // Prepare location objects for the mutation
      const locationInputs = additionalLocations.map(loc => ({
        id: loc.isNew ? undefined : loc.id,
        countryId: loc.countryId,
        cityId: loc.cityId,
        countyId: loc.countyId,
        districtId: loc.districtId,
        address: loc.address,
        postalCode: loc.postalCode
      }));
      
      // Find locations marked for deletion
      const locationIdsToDelete = locations.filter(loc => 
        !loc.id?.startsWith('main-') && 
        loc.isDeleted && 
        !loc.isNew
      ).map(loc => loc.id);
      
      console.log("Location update payload:", {
        accountId,
        mainLocation: mainLocation ? {
          countryId: mainLocation.countryId,
          cityId: mainLocation.cityId,
          countyId: mainLocation.countyId,
          districtId: mainLocation.districtId,
          address: mainLocation.address,
          postalCode: mainLocation.postalCode
        } : null,
        additionalLocations: locationInputs,
        locationIdsToDelete
      });
      
      // Use the standard updateAccount mutation approach
      try {
        console.log("Attempting to update account with locations via updateAccount mutation");
        
        // Call updateAccount mutation with both main location and locations array, but WITHOUT locationsToDelete
        const updateResult = await client.mutate({
          mutation: UPDATE_ACCOUNT,
          variables: {
            input: {
              id: accountId,
              // Include main location fields directly in the input
              ...(mainLocation ? {
                countryId: mainLocation.countryId,
                cityId: mainLocation.cityId,
                countyId: mainLocation.countyId,
                districtId: mainLocation.districtId,
                address: mainLocation.address,
                postalCode: mainLocation.postalCode
              } : {}),
              // Include additional locations as a separate array
              locations: locationInputs
              // NOTE: locationsToDelete is not supported by the backend schema
            }
          },
          context: {
            headers: {
              Authorization: authHeader
            }
          }
        });
        
        console.log("Update account mutation result:", updateResult);
        
        // If we have locations to delete, handle them separately via REST API
        if (locationIdsToDelete.length > 0) {
          console.log("Handling location deletions separately via REST API");
          
          // Process locations marked for deletion using REST API
          for (const locationId of locationIdsToDelete) {
            try {
              const deleteEndpoint = `${process.env.REACT_APP_API_URL}/accounts/${accountId}/locations/${locationId}`;
              await axios.delete(deleteEndpoint, {
                headers: {
                  'Authorization': authHeader
                }
              });
              console.log(`Successfully deleted location: ${locationId}`);
            } catch (deleteError) {
              console.error(`Error deleting location ${locationId}:`, deleteError);
            }
          }
        }
        
        // Update UI state after successful update
        toast.success("Lokasyon bilgileri başarıyla güncellendi");
        
        // Refresh account data to get the updated locations
        fetchAccountData();
        
        setIsLocationsLoading(false);
        return;
      } catch (mutationError) {
        console.error("Error with updateAccount mutation, falling back to REST API:", mutationError);
        // Continue to fallback approach with REST API
      }
      
      // FALLBACK APPROACH: Use REST API endpoints for location updates
      console.log("Using fallback approach with REST API endpoints");
      
      // Group locations by their status
      const locationsToUpdate = locations.filter(loc => !loc.isNew && !loc.isDeleted && loc.isEditing);
      const locationsToCreate = locations.filter(loc => loc.isNew && !loc.isDeleted);
      const locationsToDelete = locations.filter(loc => loc.isDeleted && !loc.isNew);
      
      const apiRequests: Promise<any>[] = [];
      const apiErrors: string[] = [];
      
      // Update main location if it exists and has been edited
      if (mainLocation && mainLocation.isEditing) {
        console.log("Updating main location via updateAccount", mainLocation);
        apiRequests.push(
          client.mutate({
            mutation: UPDATE_ACCOUNT,
            variables: {
              input: {
                id: accountId,
                countryId: mainLocation.countryId,
                cityId: mainLocation.cityId,
                countyId: mainLocation.countyId,
                districtId: mainLocation.districtId,
                address: mainLocation.address,
                postalCode: mainLocation.postalCode
              }
            },
            context: {
              headers: {
                Authorization: authHeader
              }
            }
          }).catch((error: Error) => {
            console.error("Error updating main location:", error);
            apiErrors.push(`Ana lokasyon güncellenirken hata: ${error.message}`);
            return null; // Return null so Promise.all continues
          })
        );
      }
      
      // Process additional locations to update
      locationsToUpdate.filter(loc => !loc.id?.startsWith('main-')).forEach(location => {
        console.log("Updating location via REST API:", location);
        const actualLocationId = location.id;
        const endpoint = `${process.env.REACT_APP_API_URL}/accounts/${accountId}/locations/${actualLocationId}`;
        
        apiRequests.push(
          axios.put(endpoint, {
            countryId: location.countryId,
            cityId: location.cityId,
            countyId: location.countyId,
            districtId: location.districtId,
            address: location.address,
            postalCode: location.postalCode
          }, {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            }
          }).catch((error: any) => {
            console.error(`Error updating location ${location.id}:`, error);
            const errorMsg = error.response?.data?.message || error.message;
            apiErrors.push(`Lokasyon güncellenirken hata: ${errorMsg}`);
            return null; // Return null so Promise.all continues
          })
        );
      });
      
      // Process locations to create
      locationsToCreate.forEach(location => {
        console.log("Creating new location:", location);
        const endpoint = `${process.env.REACT_APP_API_URL}/accounts/${accountId}/locations`;
        
        apiRequests.push(
          axios.post(endpoint, {
            countryId: location.countryId,
            cityId: location.cityId,
            countyId: location.countyId,
            districtId: location.districtId,
            address: location.address,
            postalCode: location.postalCode
          }, {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            }
          }).catch((error: any) => {
            console.error("Error creating location:", error);
            const errorMsg = error.response?.data?.message || error.message;
            apiErrors.push(`Yeni lokasyon oluşturulurken hata: ${errorMsg}`);
            return null; // Return null so Promise.all continues
          })
        );
      });
      
      // Process locations to delete
      locationsToDelete.filter(loc => !loc.id?.startsWith('main-')).forEach(location => {
        console.log("Deleting location:", location);
        const actualLocationId = location.id;
        const endpoint = `${process.env.REACT_APP_API_URL}/accounts/${accountId}/locations/${actualLocationId}`;
        
        apiRequests.push(
          axios.delete(endpoint, {
            headers: {
              'Authorization': authHeader
            }
          }).catch((error: any) => {
            console.error(`Error deleting location ${location.id}:`, error);
            const errorMsg = error.response?.data?.message || error.message;
            apiErrors.push(`Lokasyon silinirken hata: ${errorMsg}`);
            return null; // Return null so Promise.all continues
          })
        );
      });
      
      // Execute all requests in parallel
      const results = await Promise.all(apiRequests);
      console.log("All API requests completed:", results);
      
      // Check if there were any errors
      if (apiErrors.length > 0) {
        // Display the first error message
        toast.error(apiErrors[0]);
        // Log all errors for debugging
        console.error("Errors during location operations:", apiErrors);
      } else {
        // Update UI after successful operations
        toast.success("Lokasyon bilgileri başarıyla güncellendi");
      }
      
      // Refresh account data to get the updated locations
      fetchAccountData();
      
      setIsLocationsLoading(false);
    } catch (error: any) {
      console.error("Error saving locations:", error);
      setIsLocationsLoading(false);
      
      // Provide user-friendly error message
      let errorMessage = "Lokasyon bilgileri güncellenirken bir hata oluştu";
      
      // Extract more specific error details if available
      if (error.response) {
        console.error("Error response:", error.response);
        if (error.response.data && error.response.data.message) {
          errorMessage += `: ${error.response.data.message}`;
        }
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      handleError(errorMessage);
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
                                            countryOptions.find(c => c.value === location.countryId) : null
                                          }
                                          onChange={(selected: SelectOption | null) => 
                                            handleLocationChange(index, 'countryId', selected?.value)
                                          }
                                          isClearable
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                                            control: base => ({ ...base, minHeight: "34px" }),
                                            container: base => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="mb-2 fw-medium">
                                        {getCountryName(location.countryId)}
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
                                            cityOptions.find(c => c.value === location.cityId) : null
                                          }
                                          onChange={(selected: SelectOption | null) => 
                                            handleLocationChange(index, 'cityId', selected?.value)
                                          }
                                          isClearable
                                          isDisabled={!location.countryId}
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                                            control: base => ({ ...base, minHeight: "34px" }),
                                            container: base => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div>
                                        {getCityName(location.cityId)}
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
                                            countyOptions.find(c => c.value === location.countyId) : null
                                          }
                                          onChange={(selected: SelectOption | null) => 
                                            handleLocationChange(index, 'countyId', selected?.value)
                                          }
                                          isClearable
                                          isDisabled={!location.cityId}
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                                            control: base => ({ ...base, minHeight: "34px" }),
                                            container: base => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="mb-2">
                                        {getCountyName(location.countyId)}
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
                                            districtOptions.find(c => c.value === location.districtId) : null
                                          }
                                          onChange={(selected: SelectOption | null) => 
                                            handleLocationChange(index, 'districtId', selected?.value)
                                          }
                                          isClearable
                                          isDisabled={!location.countyId}
                                          menuPortalTarget={document.body}
                                          styles={{ 
                                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                                            control: base => ({ ...base, minHeight: "34px" }),
                                            container: base => ({ ...base, width: "100%" })
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div>
                                        {getDistrictName(location.districtId)}
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
          onSubmit={validation.handleSubmit}
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