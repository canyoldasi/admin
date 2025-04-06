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
      
      // Prepare account input
      const accountInput = {
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
      
      // Update account
      await updateAccountMutation({
        variables: {
          id: accountIdRef.current,
          input: accountInput
        },
        context: getAuthorizationLink()
      });
    } catch (error) {
      handleError(`Hesap güncellenirken bir hata oluştu: ${(error as Error).message}`);
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
    email: Yup.string().email("Geçerli bir e-posta adresi giriniz")
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
                
                {/* Lokasyonlar Bölümü */}
                <Card className="mb-4">
                  <CardBody className="p-0">
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light">
                      <h5 className="mb-0">Lokasyonlar</h5>
                      <Button color="primary" size="sm">Kaydet</Button>
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
                          <tr>
                            <td>
                              <div className="mb-2">
                                <Select 
                                  className="basic-single" 
                                  placeholder="Türkiye"
                                  options={[{ value: 'TR', label: 'Türkiye' }]}
                                />
                              </div>
                              <Select 
                                className="basic-single" 
                                placeholder="Ankara"
                                options={[{ value: 'ANK', label: 'Ankara' }]}
                              />
                            </td>
                            <td>
                              <div className="mb-2">
                                <Select 
                                  className="basic-single" 
                                  placeholder="Sincan"
                                  options={[{ value: 'SNC', label: 'Sincan' }]}
                                />
                              </div>
                              <Select 
                                className="basic-single" 
                                placeholder="Alçı"
                                options={[{ value: 'ALC', label: 'Alçı' }]}
                              />
                            </td>
                            <td>
                              <Input 
                                type="text" 
                                placeholder="FROM" 
                                className="form-control mb-2"
                              />
                            </td>
                            <td>
                              <Input 
                                type="textarea" 
                                placeholder="Alçı Mah. Bahçesaray Sok. No: 42 Sincan Ankara" 
                                className="form-control"
                                style={{ height: '70px' }}
                              />
                            </td>
                            <td className="text-end">
                              <Button color="link" className="text-danger">
                                <i className="ri-delete-bin-line"></i>
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </CardBody>
                </Card>
              </Col>
              
              {/* Right Column - Account Info */}
              <Col md={5}>
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
                            <td>Bağışçı, Tedarikçi</td>
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
                            <td>{account.phone || '+90 533 503 3495'}</td>
                          </tr>
                          <tr>
                            <th>E-posta</th>
                            <td>{account.email || 'hasancandan@gmail.com'}</td>
                          </tr>
                          <tr>
                            <th>Kanal</th>
                            <td>Instagram</td>
                          </tr>
                          <tr>
                            <th>Eklenme</th>
                            <td>18.10.2025 17:45</td>
                          </tr>
                          <tr>
                            <th>Ekleyen</th>
                            <td>Eşref Atak</td>
                          </tr>
                          <tr>
                            <th>Güncellenme</th>
                            <td>18.10.2025 17:45</td>
                          </tr>
                          <tr>
                            <th>Güncelleyen</th>
                            <td>Eşref Atak</td>
                          </tr>
                          <tr>
                            <th>Hesap No</th>
                            <td>134234</td>
                          </tr>
                          <tr>
                            <th>Atanan Kullanıcı</th>
                            <td>Eşref Atak</td>
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