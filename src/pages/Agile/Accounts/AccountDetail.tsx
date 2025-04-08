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
  GET_DISTRICTS
} from "../../../graphql/queries/accountQueries";
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
  id?: string;
  countryId?: string | null;
  cityId?: string | null;
  countyId?: string | null;
  districtId?: string | null;
  address?: string;
  postalCode?: string;
  isNew?: boolean;
  isEditing?: boolean;
  isDeleted?: boolean;
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
  
  // Reference data state
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  
  // Add state for locations management
  const [locations, setLocations] = useState<LocationForm[]>([]);
  const [isLocationFormDirty, setIsLocationFormDirty] = useState<boolean>(false);
  
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
  const fetchCitiesForCountry = (countryId: string) => {
    try {
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
        }
      });
    } catch (error) {
      handleError("Şehir verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Fetch counties for a city
  const fetchCountiesForCity = (cityId: string) => {
    try {
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
        }
      });
    } catch (error) {
      handleError("İlçe verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Fetch districts for a county
  const fetchDistrictsForCounty = (countyId: string) => {
    try {
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
        }
      });
    } catch (error) {
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
        
        // Konum verilerini yükle
        try {
          if (accountCopy.country?.id) {
            console.log("Loading cities for country:", accountCopy.country.id);
            fetchCitiesForCountry(accountCopy.country.id);
            
            if (accountCopy.city?.id) {
              console.log("Loading counties for city:", accountCopy.city.id);
              fetchCountiesForCity(accountCopy.city.id);
              
              if (accountCopy.county?.id) {
                console.log("Loading districts for county:", accountCopy.county.id);
                fetchDistrictsForCounty(accountCopy.county.id);
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
      
      // Log the values to be updated
      console.log("Updating account with values:", values);
      
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
      
      // Fetch the updated account data to refresh the UI
      await fetchAccountData();
      
      // Close the modal after successful update
      setShowEditModal(false);
      
      // Show success message
      toast.success("Hesap başarıyla güncellendi");
    } catch (error) {
      console.error("Error updating account:", error);
      
      // Check for unique constraint violation
      const errorMessage = (error as Error).message || "";
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
        handleError(`Hesap güncellenirken bir hata oluştu: ${(error as Error).message}`);
      }
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Toggle edit modal
  const toggleEditModal = () => {
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
  
  // Load data for location dropdowns
  useEffect(() => {
    // First, check if we have locations directly from the getAccount response
    if (account) {
      const locations: LocationForm[] = [];
      
      // Check if account has a main location (country, city, etc.)
      if (account.country || account.city || account.county || account.district || account.address || account.postalCode) {
        // Add the main location from account data
        locations.push({
          id: `main-${account.id}`,
          countryId: account.country?.id || null,
          cityId: account.city?.id || null,
          countyId: account.county?.id || null,
          districtId: account.district?.id || null,
          address: account.address || '',
          postalCode: account.postalCode || '',
          isNew: false,
          isEditing: false,
          isDeleted: false
        });
        
        // If account has a main location with country, load its cities
        if (account.country?.id) {
          fetchCitiesForCountry(account.country.id);
        }
        
        // If account has city, load counties
        if (account.city?.id) {
          fetchCountiesForCity(account.city.id);
        }
        
        // If account has county, load districts
        if (account.county?.id) {
          fetchDistrictsForCounty(account.county.id);
        }
      }
      
      // Check if account also has additional locations array
      if (account.locations && account.locations.length > 0) {
        // Add locations from the locations array
        const additionalLocations = account.locations.map(location => ({
          id: location.id,
          countryId: location.country?.id || null,
          cityId: location.city?.id || null,
          countyId: location.county?.id || null,
          districtId: location.district?.id || null,
          address: location.address || '',
          postalCode: location.postalCode || '',
          isNew: false,
          isEditing: false,
          isDeleted: false
        }));
        
        // Merge the main location with additional locations
        locations.push(...additionalLocations);
        
        // Load location-related data for additional locations
        additionalLocations.forEach(location => {
          if (location.countryId) {
            fetchCitiesForCountry(location.countryId);
          }
          
          if (location.cityId) {
            fetchCountiesForCity(location.cityId);
          }
          
          if (location.countyId) {
            fetchDistrictsForCounty(location.countyId);
          }
        });
      }
      
      // Update locations state with all locations
      setLocations(locations);
      
      // Load countries if not already loaded
      if (countryOptions.length === 0) {
        loadCountryOptions();
      }
    } else {
      // No account data, set empty array
      setLocations([]);
    }
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
    setIsLocationFormDirty(true);
    
    const newLocation: LocationForm = {
      countryId: null,
      cityId: null,
      countyId: null,
      districtId: null,
      address: '',
      postalCode: '',
      isNew: true,
      isEditing: true
    };
    
    setLocations([...locations, newLocation]);
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

  // Save all locations using REST API endpoints
  const handleSaveLocations = async () => {
    try {
      console.log("Current locations state:", locations);
      
      // Get the auth token
      const token = getAuthHeader();
      const apiUrl = process.env.REACT_APP_API_URL || 'https://app.agiletechlondon.com:4000';
      
      // 1. First update the main account with basic info
      await updateAccountMutation({
        variables: {
          input: {
            id: accountIdRef.current,
            name: account?.name || '',
            // Add other fields from the main location
            countryId: locations.find(loc => loc.id?.startsWith('main-'))?.countryId || account?.country?.id,
            cityId: locations.find(loc => loc.id?.startsWith('main-'))?.cityId || account?.city?.id,
            countyId: locations.find(loc => loc.id?.startsWith('main-'))?.countyId || account?.county?.id,
            districtId: locations.find(loc => loc.id?.startsWith('main-'))?.districtId || account?.district?.id,
            address: locations.find(loc => loc.id?.startsWith('main-'))?.address || account?.address,
            postalCode: locations.find(loc => loc.id?.startsWith('main-'))?.postalCode || account?.postalCode
          }
        },
        context: getAuthorizationLink()
      });
      
      // 2. Prepare locations for processing
      // Filter out the main-* location since it's part of the account itself
      const locationsToUpdate = locations.filter(loc => !loc.isDeleted && !loc.isNew && !loc.id?.startsWith('main-'));
      const locationsToCreate = locations.filter(loc => !loc.isDeleted && loc.isNew);
      const locationsToDelete = locations.filter(loc => loc.isDeleted && !loc.isNew && !loc.id?.startsWith('main-'));
      
      console.log("Locations to update:", locationsToUpdate.length);
      console.log("Locations to create:", locationsToCreate.length);
      console.log("Locations to delete:", locationsToDelete.length);
      
      // 3. Update existing locations
      for (const location of locationsToUpdate) {
        if (!location.id) continue;
        
        console.log(`Updating location ${location.id}`);
        // Remove /graphql from the path - it should be just /accounts/...
        const endpoint = `${apiUrl}/accounts/${accountIdRef.current}/locations/${location.id}`;
        
        const locationData = {
          countryId: location.countryId,
          cityId: location.cityId,
          countyId: location.countyId,
          districtId: location.districtId,
          address: location.address,
          postalCode: location.postalCode
        };
        
        console.log("Update location payload:", locationData);
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token || ''
          },
          body: JSON.stringify(locationData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error updating location ${location.id}:`, errorText);
          throw new Error(`Error updating location: ${response.status} ${errorText}`);
        }
      }
      
      // 4. Create new locations
      for (const location of locationsToCreate) {
        console.log("Creating new location");
        // Remove /graphql from the path
        const endpoint = `${apiUrl}/accounts/${accountIdRef.current}/locations`;
        
        const locationData = {
          countryId: location.countryId,
          cityId: location.cityId,
          countyId: location.countyId,
          districtId: location.districtId,
          address: location.address,
          postalCode: location.postalCode
        };
        
        console.log("Create location payload:", locationData);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token || ''
          },
          body: JSON.stringify(locationData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error creating location:", errorText);
          throw new Error(`Error creating location: ${response.status} ${errorText}`);
        }
      }
      
      // 5. Delete marked locations
      for (const location of locationsToDelete) {
        if (!location.id) continue;
        
        console.log(`Deleting location ${location.id}`);
        // Remove /graphql from the path
        const endpoint = `${apiUrl}/accounts/${accountIdRef.current}/locations/${location.id}`;
        
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': token || ''
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error deleting location ${location.id}:`, errorText);
          throw new Error(`Error deleting location: ${response.status} ${errorText}`);
        }
      }
      
      // Reset form state
      setIsLocationFormDirty(false);
      
      // Show success message
      toast.success("Lokasyonlar başarıyla güncellendi");
      
      // Refresh account data
      await fetchAccountData();
    } catch (error) {
      console.error("Error saving locations:", error);
      
      // Show a more detailed error message
      const errorMsg = (error as Error).message;
      console.log("Detailed error:", errorMsg);
      
      handleError(`Lokasyonlar kaydedilirken bir hata oluştu: ${errorMsg}`);
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
                          <tr>
                            <td>18.10.2025 00:45</td>
                            <td>Kurban, Genel Bağış</td>
                            <td>180 TL</td>
                            <td>Tamamlandı</td>
                            <td className="text-end">
                              <Button 
                                color="link" 
                                size="sm" 
                                className="text-decoration-none text-dark me-1"
                              >
                                Detaylar
                              </Button>
                            </td>
                          </tr>
                          <tr>
                            <td>19.10.2025 12:35</td>
                            <td>Zekat</td>
                            <td>100 TL</td>
                            <td>İptal Edildi</td>
                            <td className="text-end">
                              <Button 
                                color="link" 
                                size="sm" 
                                className="text-decoration-none text-dark me-1"
                              >
                                Detaylar
                              </Button>
                            </td>
                          </tr>
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
                    
                    <div className="table-responsive">
                      <Table className="align-middle mb-0" hover>
                        <thead className="table-light">
                          <tr>
                            <th scope="col">Ülke/Şehir</th>
                            <th scope="col">İlçe/Mahalle</th>
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
                                  <td>
                                    {location.isEditing ? (
                                      <div className="mb-2">
                                        <Select 
                                          className="basic-single" 
                                          placeholder="Ülke Seçiniz"
                                          options={countryOptions}
                                          value={location.countryId ? 
                                            countryOptions.find(c => c.value === location.countryId) : null
                                          }
                                          onChange={(selected: SelectOption | null) => 
                                            handleLocationChange(index, 'countryId', selected?.value)
                                          }
                                          isClearable
                                        />
                                      </div>
                                    ) : (
                                      <div className="mb-2 fw-medium">
                                        {getCountryName(location.countryId)}
                                      </div>
                                    )}
                                    
                                    {location.isEditing ? (
                                      <Select 
                                        className="basic-single" 
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
                                      />
                                    ) : (
                                      <div>
                                        {getCityName(location.cityId)}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {location.isEditing ? (
                                      <div className="mb-2">
                                        <Select 
                                          className="basic-single" 
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
                                        />
                                      </div>
                                    ) : (
                                      <div className="mb-2">
                                        {getCountyName(location.countyId)}
                                      </div>
                                    )}
                                    
                                    {location.isEditing ? (
                                      <Select 
                                        className="basic-single" 
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
                                      />
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
                              ) : (
                                account.personType === 'INDIVIDUAL' ? 'Bireysel' : 
                                account.personType === 'CORPORATE' ? 'Kurumsal' : '-'
                              )}
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
        onDeleteClick={handleDeleteConfirm}
        onCloseClick={closeDeleteModal}
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