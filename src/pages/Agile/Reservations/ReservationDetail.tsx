import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  CardHeader,
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
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormFeedback,
  Label
} from "reactstrap";
import classnames from "classnames";
import { 
  ApolloClient, 
  ApolloError, 
  InMemoryCache, 
  ApolloProvider,
  createHttpLink,
  gql,
  useQuery,
  useMutation
} from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { onError } from "@apollo/client/link/error";
import { from } from "@apollo/client";
import moment from "moment";
import Select from "react-select";
import * as Yup from "yup";
import { useFormik } from "formik";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import Loader from "../../../Components/Common/Loader";
import { 
  GET_TRANSACTION,
  GET_TRANSACTION_TYPES,
  GET_TRANSACTION_STATUSES,
  GET_USERS_LOOKUP,
  GET_CHANNELS_LOOKUP,
  GET_ACCOUNTS_LOOKUP,
  GET_PRODUCTS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS
} from "./graphql/queries";
import { UPDATE_TRANSACTION } from "./graphql/mutations";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { SelectOption, TransactionProductInput } from "../../../types/graphql";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import { debounce } from "lodash";
// Import the new ReservationForm component
import ReservationForm from "./ReservationForm";
// Import the new ReservationFormModal component
import ReservationFormModal from "./ReservationFormModal";

// Get API URL from environment variable
const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

console.log("API URL:", apiUrl);

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    console.log("Network error details:", JSON.stringify(networkError, null, 2));
  }
});

// Create auth link
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage
  const token = getAuthHeader();
  console.log("Using authentication token:", token ? "Yes (token exists)" : "No (token is null)");
  
  // Return the headers to the context
  return {
    headers: {
      ...headers,
      authorization: token ? token : "",
    }
  };
});

// Create http link
const httpLink = createHttpLink({
  uri: apiUrl,
});

// Create Apollo Client with combined links
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper function to get authorization context
const getAuthorizationLink = () => {
  const authHeader = getAuthHeader();
  console.log("Authorization header used in context:", authHeader ? "Yes (set)" : "No (not set)");
  return {
    headers: {
      Authorization: authHeader ?? '',
    }
  };
};

// Custom styling for DatePicker
const datePickerCustomStyles = {
  ".flatpickr-wrapper": {
    width: "100%"
  },
  ".flatpickr-input": {
    width: "100%"
  },
  ".flatpickr-calendar": {
    zIndex: 9999
  }
};

// Create a debounced function similar to index.tsx
const createDebouncedFormikHandlers = (originalHandleChange: Function, delay = 300) => {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // For textarea inputs, apply changes directly without debouncing
    if (e.target.tagName === 'TEXTAREA') {
      console.log(`Direct textarea update for ${e.target.name}: ${e.target.value}`);
      originalHandleChange(e);
      return;
    }
    
    // For other inputs, use debouncing
    const debounced = debounce((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      console.log(`Debounced update for ${event.target.name}: ${event.target.value}`);
      originalHandleChange(event);
    }, delay);
    
    debounced(e);
  };
};

const TransactionDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  // Add new state variables for the edit modal
  const [editModal, setEditModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Add state for transaction products editing
  const [transactionProducts, setTransactionProducts] = useState<any[]>([]);
  const [productTotal, setProductTotal] = useState<number>(0);
  // Add state for locations editing
  const [locations, setLocations] = useState<any[]>([]);
  
  // Add state for select options
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [formValues, setFormValues] = useState<any>({
    accountId: "",
    channelId: ""
  });
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState<boolean>(false);
  const [isCountiesLoading, setIsCountiesLoading] = useState<boolean>(false);
  const [isDistrictsLoading, setIsDistrictsLoading] = useState<boolean>(false);

  console.log("Reservation ID from URL:", id);

  // Debug token availability
  useEffect(() => {
    console.log("Auth token for queries:", getAuthHeader() ? "Available" : "Not available");
    const authUser = localStorage.getItem("authUser");
    console.log("authUser in localStorage:", authUser ? "Present" : "Not present");
  }, []);

  // Define validation schema
  const validationSchema = Yup.object({
    amount: Yup.number(),
    typeId: Yup.string(),
    statusId: Yup.string(),
    accountId: Yup.string(),
    assignedUserId: Yup.string(),
    channelId: Yup.string(),
    products: Yup.array(),
    no: Yup.string(),
    note: Yup.string(),
    address: Yup.string(),
    postalCode: Yup.string(),
    transactionDate: Yup.string(),
    // Yeni eklenen alanlar için validasyon
    country: Yup.string(),
    city: Yup.string(),
    district: Yup.string(),
    neighborhood: Yup.string(),
    successDate: Yup.string(),
    successNote: Yup.string(),
    transactionNote: Yup.string(),
    cancelDate: Yup.string(),
    cancelNote: Yup.string()
  });

  // Initialize formik validation
  const validation = useFormik({
    enableReinitialize: false,
    initialValues: {
      id: (transaction && transaction.id) || "",
      amount: (transaction && transaction.amount) || 0,
      no: (transaction && transaction.no) || "",
      note: (transaction && transaction.note) || "",
      typeId: (transaction && transaction.type?.id) || "",
      statusId: (transaction && transaction.status?.id) || "",
      accountId: (transaction && transaction.account?.id) || "",
      assignedUserId: (transaction && transaction.assignedUser?.id) || "",
      channelId: (transaction && transaction.channel?.id) || "",
      
      // Format products properly
      products: transaction?.transactionProducts?.map((p: any) => ({
        value: p.product.id,
        label: p.product.name
      })) || [],
      
      // Format dates properly
      date: transaction && transaction.createdAt ? moment(transaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
      transactionDate: transaction && transaction.transactionDate ? moment(transaction.transactionDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      
      // Add transaction products
      transactionProducts: (transaction && transaction.transactionProducts) || [] as TransactionProductInput[],
      
      // Location fields - make sure to use the correct fields from the API response
      address: (transaction && transaction.address) || "",
      postalCode: (transaction && transaction.postalCode) || "",
      country: (transaction && transaction.country?.id) || "",
      city: (transaction && transaction.city?.id) || "",
      district: (transaction && transaction.county?.id) || "", // county corresponds to district in our API
      neighborhood: (transaction && transaction.district?.id) || "", // district corresponds to neighborhood in our API
      
      // Format special dates with correct format
      successDate: (transaction && transaction.successDate) ? moment(transaction.successDate).format("YYYY-MM-DD HH:mm") : "",
      successNote: (transaction && transaction.successNote) || "",
      cancelDate: (transaction && transaction.cancelDate) ? moment(transaction.cancelDate).format("YYYY-MM-DD HH:mm") : "",
      cancelNote: (transaction && transaction.cancelNote) || ""
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      handleUpdateTransaction(values);
    }
  });

  // Update formValues when validation values change
  useEffect(() => {
    setFormValues({
      accountId: validation.values.accountId,
      channelId: validation.values.channelId
    });
  }, [validation.values.accountId, validation.values.channelId]);

  // Add debugging for transaction data when it's loaded
  useEffect(() => {
    if (transaction) {
      console.log("Loaded transaction data:", transaction);
      console.log("Account ID:", transaction?.account?.id);
      console.log("Channel ID:", transaction?.channel?.id);
    }
  }, [transaction]);

  // Add new useEffect to fetch dropdown options when the modal is opened
  useEffect(() => {
    if (editModal) {
      // Fetch countries
      client.query({
        query: GET_COUNTRIES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getCountries) {
          const countryOpts = data.getCountries.map((country: any) => ({ 
            value: country.id, 
            label: country.name 
          }));
          setCountryOptions(countryOpts);
          console.log("Loaded country options:", countryOpts);
          
          // If we have a country selected, fetch cities for that country
          if (validation.values.country) {
            loadCountryOptions();
          }
        }
      }).catch(err => {
        console.error("Error fetching countries:", err);
        toast.error("Ülke listesi yüklenirken hata oluştu");
      });
      
      // Fetch channels first to ensure we have the data
      client.query({
        query: GET_CHANNELS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getChannelsLookup) {
          const channelOpts = data.getChannelsLookup.map((channel: any) => ({ 
            value: channel.id, 
            label: channel.name 
          }));
          setChannelOptions(channelOpts);
          
          // Log channels for debugging
          console.log("Loaded channel options:", channelOpts);
          console.log("Current channelId value:", formValues.channelId);
          
          // If we have a channel ID but no name, try to find it in the options
          if (transaction?.channel?.id && !transaction?.channel?.name) {
            const channelInfo = channelOpts.find(c => c.value === transaction.channel.id);
            if (channelInfo) {
              setTransaction(prev => ({
                ...prev,
                channel: {
                  ...prev.channel,
                  name: channelInfo.label
                }
              }));
            }
          }
        }
      }).catch(err => {
        console.error("Error fetching channels:", err);
        toast.error("Kanal listesi yüklenirken hata oluştu");
      });

      // Fetch transaction types
      client.query({
        query: GET_TRANSACTION_TYPES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getTransactionTypesLookup) {
          setTypeOptions(data.getTransactionTypesLookup.map((type: any) => ({ value: type.id, label: type.name })));
        }
      }).catch(err => {
        console.error("Error fetching transaction types:", err);
      });

      // Fetch transaction statuses
      client.query({
        query: GET_TRANSACTION_STATUSES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getTransactionStatusesLookup) {
          setStatusOptions(data.getTransactionStatusesLookup.map((status: any) => ({ value: status.id, label: status.name })));
        }
      }).catch(err => {
        console.error("Error fetching transaction statuses:", err);
      });

      // Fetch users
      client.query({
        query: GET_USERS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getUsersLookup && data.getUsersLookup.items) {
          setUserOptions(data.getUsersLookup.items.map((user: any) => ({ value: user.id, label: user.fullName })));
        }
      }).catch(err => {
        console.error("Error fetching users:", err);
      });

      // Fetch accounts
      client.query({
        query: GET_ACCOUNTS_LOOKUP,
        variables: {
          input: {
            pageSize: 1000,
            pageIndex: 0,
            text: ""
          }
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getAccounts && data.getAccounts.items) {
          const accountOpts = data.getAccounts.items.map((account: any) => ({ 
            value: account.id, 
            label: account.name 
          }));
          setAccountOptions(accountOpts);
          
          // Log accounts for debugging
          console.log("Loaded account options:", accountOpts);
          console.log("Current accountId value:", formValues.accountId);
        }
      }).catch(err => {
        console.error("Error fetching accounts:", err);
        toast.error("Hesap listesi yüklenirken hata oluştu");
      });

      // Fetch products
      client.query({
        query: GET_PRODUCTS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getProductsLookup && data.getProductsLookup.items) {
          setProductOptions(data.getProductsLookup.items.map((product: any) => ({ value: product.id, label: product.name })));
        }
      }).catch(err => {
        console.error("Error fetching products:", err);
      });
    }
  }, [editModal, formValues.accountId, formValues.channelId, transaction]);

  // Define a function to fetch cities for a country
  const fetchCitiesForCountry = async (countryId: string) => {
    try {
      console.log(`${countryId} ülkesi için şehirler yükleniyor...`);
      setIsCitiesLoading(true);

      const { data } = await client.query({
        query: GET_CITIES,
        variables: { countryId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only" // Her zaman güncel veri al
      });

      if (data && data.getCities) {
        const options = data.getCities.map((city: any) => ({
          value: city.id,
          label: city.name,
        }));
        
        console.log(`${countryId} ülkesi için ${options.length} şehir yüklendi:`, options);
        setCityOptions(options);
        
        // Eğer mevcut lokasyonlar varsa ve bu ülkedeyse, şehir adlarını güncelle
        const updatedLocations = [...locations].map(loc => {
          if (loc.countryId === countryId && loc.cityId) {
            // Şehir adını güncelleyelim
            const matchedCity = options.find(city => city.value === loc.cityId);
            if (matchedCity) {
              return {
                ...loc,
                cityName: matchedCity.label
              };
            }
          }
          return loc;
        });
        
        // Lokasyonlarda değişiklik varsa güncelle
        if (JSON.stringify(updatedLocations) !== JSON.stringify(locations)) {
          console.log("Lokasyonların şehir isimleri güncellendi:", updatedLocations);
          setLocations(updatedLocations);
        }
      }
    } catch (error) {
      console.error("Şehirler yüklenirken hata oluştu:", error);
    } finally {
      setIsCitiesLoading(false);
    }
  };

  // Define a function to fetch counties for a city
  const fetchCountiesForCity = async (cityId: string) => {
    try {
      console.log(`${cityId} şehri için ilçeler yükleniyor...`);
      setIsCountiesLoading(true);
      
      const { data } = await client.query({
        query: GET_COUNTIES,
        variables: { cityId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only" // Her zaman güncel veri al
      });
      
      if (data && data.getCounties) {
        const options = data.getCounties.map((county: any) => ({
          value: county.id,
          label: county.name
        }));
        
        console.log(`${cityId} şehri için ${options.length} ilçe yüklendi:`, options);
        setCountyOptions(options);
        
        // Eğer mevcut lokasyonlar varsa ve bu şehirdeyse, ilçe adlarını güncelle
        const updatedLocations = [...locations].map(loc => {
          if (loc.cityId === cityId && loc.countyId) {
            // İlçe adını güncelleyelim
            const matchedCounty = options.find(county => county.value === loc.countyId);
            if (matchedCounty) {
              return {
                ...loc,
                countyName: matchedCounty.label
              };
            }
          }
          return loc;
        });
        
        // Lokasyonlarda değişiklik varsa güncelle
        if (JSON.stringify(updatedLocations) !== JSON.stringify(locations)) {
          console.log("Lokasyonların ilçe isimleri güncellendi:", updatedLocations);
          setLocations(updatedLocations);
        }
      }
    } catch (error) {
      console.error("İlçeler yüklenirken hata oluştu:", error);
    } finally {
      setIsCountiesLoading(false);
    }
  };

  // Define a function to fetch districts for a county
  const fetchDistrictsForCounty = async (countyId: string) => {
    try {
      console.log(`${countyId} ilçesi için mahalleler yükleniyor...`);
      setIsDistrictsLoading(true);
      
      const { data } = await client.query({
        query: GET_DISTRICTS,
        variables: { countyId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only" // Her zaman güncel veri al
      });
      
      if (data && data.getDistricts) {
        const options = data.getDistricts.map((district: any) => ({
          value: district.id,
          label: district.name
        }));
        
        console.log(`${countyId} ilçesi için ${options.length} mahalle yüklendi:`, options);
        setDistrictOptions(options);
        
        // Eğer mevcut lokasyonlar varsa ve bu ilçedeyse, mahalle adlarını güncelle
        const updatedLocations = [...locations].map(loc => {
          if (loc.countyId === countyId && loc.districtId) {
            // Mahalle adını güncelleyelim
            const matchedDistrict = options.find(district => district.value === loc.districtId);
            if (matchedDistrict) {
              return {
                ...loc,
                districtName: matchedDistrict.label
              };
            }
          }
          return loc;
        });
        
        // Lokasyonlarda değişiklik varsa güncelle
        if (JSON.stringify(updatedLocations) !== JSON.stringify(locations)) {
          console.log("Lokasyonların mahalle isimleri güncellendi:", updatedLocations);
          setLocations(updatedLocations);
        }
      }
    } catch (error) {
      console.error("Mahalleler yüklenirken hata oluştu:", error);
    } finally {
      setIsDistrictsLoading(false);
    }
  };

  // Function to load channels
  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data } = await client.query({
        query: GET_CHANNELS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getChannelsLookup) {
        const channelOpts = data.getChannelsLookup.map((channel: any) => ({ 
          value: channel.id, 
          label: channel.name 
        }));
        setChannelOptions(channelOpts);
        console.log("Loaded channel options:", channelOpts);
        
        // Update transaction channel data if needed
        if (transaction?.channel?.id) {
          const channelInfo = channelOpts.find(c => c.value === transaction.channel.id);
          if (channelInfo) {
            setTransaction(prev => ({
              ...prev,
              channel: {
                id: channelInfo.value,
                name: channelInfo.label
              }
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
      toast.error("Kanal listesi yüklenirken hata oluştu");
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Load channels on component mount and when transaction data changes
  useEffect(() => {
    loadChannels();
  }, [transaction?.id]);

  // Fetch transaction details
  const fetchTransactionData = async () => {
    try {
      setLoading(true);
      
      // Önce localStorage'da işlem bilgilerini ara
      const cachedTransaction = localStorage.getItem(`transaction_${id}`);
      
      if (cachedTransaction) {
        console.log("Rezervasyon bilgileri localStorage'dan alındı");
        const transactionData = JSON.parse(cachedTransaction);
        
        // Cache'den alınan verileri kullan
        setTransaction(transactionData);
        
        // Ürün listesini yükle, eğer henüz yüklenmemişse
        let products = productOptions;
        if (products.length === 0) {
          products = await loadProductOptions();
        }
        
        // Cache'den alınan bilgileri kullanarak ürünleri ayarla
        if (transactionData.transactionProducts && transactionData.transactionProducts.length > 0) {
          // Ürün bilgilerini zenginleştirelim
          const enrichedProducts = transactionData.transactionProducts.map((product: any) => {
            // Ürün adını products'dan al eğer varsa
            const productInfo = products.find((p: any) => p.value === product.product.id);
            if (productInfo) {
              return {
                ...product,
                product: {
                  ...product.product,
                  name: productInfo.label
                }
              };
            }
            return product;
          });
          
          setTransactionProducts(enrichedProducts);
          
          // Calculate total
          const total = enrichedProducts.reduce(
            (sum: number, product: any) => sum + (product.totalPrice || 0), 
            0
          );
          setProductTotal(total);
        }
        
        // Rezervasyon tamamlandıktan sonra localStorage'dan temizle
        localStorage.removeItem(`transaction_${id}`);
      } else {
        // Cache'de yoksa API'dan al
        console.log("Rezervasyon bilgileri API'dan alınıyor");
        
        // Şu anda lokasyonların doğru yüklendiğinden emin olmak için veri önbelleğini tamamen atlayalım
        // fetchPolicy: "no-cache" -> "network-only" olarak değiştirildi
        const { data } = await client.query({
          query: GET_TRANSACTION,
          variables: { id },
          context: getAuthorizationLink(),
          fetchPolicy: "network-only" // Sunucudan taze veri al, önbelleği güncelle
        });
        
        if (data && data.getTransaction) {
          // API'den gelen veriyi detaylı şekilde logla - lokasyonlarda sorun var mı görelim
          console.log("API'den gelen transaction detayları:", data.getTransaction);
          
          if (data.getTransaction.locations) {
            console.log(`API'den ${data.getTransaction.locations.length} lokasyon geldi:`, 
              data.getTransaction.locations);
          }
          
          // Tüm veriyi state'e kaydet
          setTransaction(data.getTransaction);
          
          // Ürün listesini yükle, eğer henüz yüklenmemişse
          let products = productOptions;
          if (products.length === 0) {
            products = await loadProductOptions();
          }
          
          if (data.getTransaction.transactionProducts && data.getTransaction.transactionProducts.length > 0) {
            // Ürün bilgilerini zenginleştirelim
            const enrichedProducts = data.getTransaction.transactionProducts.map((product: any) => {
              // Ürün adını products'dan al eğer varsa
              const productInfo = products.find((p: any) => p.value === product.product.id);
              if (productInfo) {
                return {
                  ...product,
                  product: {
                    ...product.product,
                    name: productInfo.label
                  }
                };
              }
              return product;
            });
            
            setTransactionProducts(enrichedProducts);
            
            // Calculate total
            const total = enrichedProducts.reduce(
              (sum: number, product: any) => sum + (product.totalPrice || 0), 
              0
            );
            setProductTotal(total);
          }
        } else {
          toast.error("Rezervasyon bulunamadı");
        }
      }
    } catch (error: unknown) {
      console.error("Rezervasyon detayları alınırken hata oluştu:", error);
      toast.error("Rezervasyon detayları alınırken bir hata oluştu");
      
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      } else {
        console.error("Unknown error type:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde işlem verilerini getir
  useEffect(() => {
    if (id) {
      fetchTransactionData();
    }
  }, [id]);

  useEffect(() => {
    document.title = "Reservation Details";
  }, []);

  // Rezervasyon detayı yüklendiğinde çalışacak
  useEffect(() => {
    if (transaction && transaction.id) {
      // Kayıtlı ürünleri localStorage'dan yükle
      const savedProducts = loadTransactionProducts(transaction.id);
      
      if (savedProducts && savedProducts.length > 0) {
        // Kaydedilmiş ürünleri doğru formata dönüştür
        const formattedProducts = savedProducts.map((item: any) => ({
          id: null,
          product: {
            id: item.productId,
            name: item.productName
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }));
        
        setTransactionProducts(formattedProducts);
        
        // Toplam tutarı hesapla
        const total = formattedProducts.reduce(
          (sum: number, product: any) => sum + (product.totalPrice || 0), 
          0
        );
        setProductTotal(total);
        
        console.log("Kayıtlı ürünler yüklendi:", formattedProducts);
      }
    }
  }, [transaction]);

  // Define update mutation
  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    onCompleted: (data) => {
      console.log("Reservation updated successfully:", data);
      toast.success("Rezervasyon başarıyla güncellendi");
      setEditModal(false);
      setIsSubmitting(false);
      
      // Refresh the transaction data
      fetchTransactionData();
    },
    onError: (error) => {
      console.error("Error in updateTransaction mutation:", error);
      setIsSubmitting(false);
      
      // Enhanced error logging
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error("GraphQL Error Details:", JSON.stringify(error.graphQLErrors, null, 2));
        
        // Show a more specific error message
        const errorMessage = error.graphQLErrors[0].message;
        toast.error(`Güncelleme hatası: ${errorMessage}`);
      } else if (error.networkError) {
        toast.error("Ağ hatası. Lütfen bağlantınızı kontrol edin.");
      } else {
        toast.error("Rezervasyon güncellenirken bir hata oluştu");
      }
    }
  });
  
  // Function to handle form submission
  const handleUpdateTransaction = async (values: any) => {
    try {
    setIsSubmitting(true);
      
      console.log("Form values for update:", values);
      console.log("Current transaction products:", transactionProducts);
      console.log("Selected products from form:", values.products);
      
      // Calculate total amount - use form amount if no products
      const amount = values.amount ? Number(values.amount) : (
        transactionProducts.reduce((sum, product) => {
          const quantity = Number(product.quantity) || 1;
          const unitPrice = Number(product.unitPrice) || 0;
          return sum + (quantity * unitPrice);
        }, 0)
      );

      console.log("Using amount for update:", amount);
    
      // Get selected products from form values
      const formSelectedProducts = values.products || [];
      
      // Combine existing transaction products with any newly selected products
      let combinedProducts = [...transactionProducts];
      
      // Add any newly selected products that aren't already in the list
      formSelectedProducts.forEach((selectedProduct: any) => {
        // Check if product is already in the transaction products
        const existingProductIndex = combinedProducts.findIndex(
          p => p.product.id === selectedProduct.value
        );
        
        // If it's a new product, add it to the list
        if (existingProductIndex === -1) {
          combinedProducts.push({
            id: null, // New product doesn't have an ID yet
            product: {
              id: selectedProduct.value,
              name: selectedProduct.label
            },
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0
          });
        }
      });
      
      // Remove any products that are no longer selected
      combinedProducts = combinedProducts.filter(product => 
        formSelectedProducts.some((selected: any) => selected.value === product.product.id)
      );
      
      console.log("Combined products for update:", combinedProducts);
    
    // Create the input object for update
      const input = {
      id: values.id,
        amount: amount, // Use the calculated or form amount
      no: values.no || "",
      note: values.note || "",
      typeId: values.typeId,
      statusId: values.statusId,
      accountId: values.accountId,
      assignedUserId: values.assignedUserId,
        channelId: values.channelId || "",
      transactionDate: values.transactionDate,
      address: values.address || "",
        postalCode: values.postalCode || "",
        // Fixed location fields - use correct property names
        countryId: values.country || null,
        cityId: values.city || null,
        countyId: values.district || null, // district maps to county in API
        districtId: values.neighborhood || null, // neighborhood maps to district in API
        // Added cancelDate and cancelNote
        cancelDate: values.cancelDate || null,
        cancelNote: values.cancelNote || "",
        // Added successDate and successNote
        successDate: values.successDate || null,
        successNote: values.successNote || "",
        // Format products according to the API requirements - use the combined products list
        products: combinedProducts.map(product => {
          const quantity = Number(product.quantity) || 1;
          const unitPrice = Number(product.unitPrice) || 0;
          return {
            id: product.id || null,
            productId: product.product.id,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: quantity * unitPrice
          };
        }),
        locations: locations.map(location => ({
          countryId: location.countryId,
          cityId: location.cityId,
          countyId: location.countyId,
          districtId: location.districtId,
          code: location.code,
          address: location.address,
          plannedDate: location.plannedDate
        }))
      };
    
    console.log("Update transaction input:", input);
    
    // Call the update mutation
      const { data } = await updateTransaction({
      variables: { input },
      context: getAuthorizationLink()
    });
      
      console.log("API response:", data);
      
        // Update local state with the returned data
        setTransaction({
          ...data.updateTransaction,
          amount: amount // Ensure we use our calculated amount
        });
        
        // Update products state with the new data
        if (data.updateTransaction.transactionProducts) {
          const updatedProducts = data.updateTransaction.transactionProducts.map((product: any) => ({
            ...product,
            product: {
              id: product.product.id,
              name: product.product.name
            },
            quantity: Number(product.quantity),
            unitPrice: Number(product.unitPrice),
            totalPrice: Number(product.quantity) * Number(product.unitPrice)
          }));
          
          setTransactionProducts(updatedProducts);
          
          // Recalculate total
          const total = updatedProducts.reduce(
            (sum: number, product: any) => sum + (Number(product.quantity) * Number(product.unitPrice)),
            0
          );
          setProductTotal(total);
        }
        
        // Close the modal
        setEditModal(false);
        
        // Show success message
        toast.success("Rezervasyon başarıyla güncellendi");
        
        // Refresh the data
        fetchTransactionData();
    } catch (error) {
      console.error("Error updating transaction:", error);
      
      // Show detailed error message
      if (error.graphQLErrors?.length > 0) {
        const errorMessage = error.graphQLErrors[0].message;
        toast.error(`Güncelleme hatası: ${errorMessage}`);
      } else if (error.networkError) {
        toast.error("Ağ hatası. Lütfen bağlantınızı kontrol edin.");
      } else {
        toast.error("Rezervasyon güncellenirken bir hata oluştu");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Ürünleri kaydetmek için yardımcı fonksiyon (frontend-only)
  const saveTransactionProducts = (transactionId: string, products: any[]) => {
    try {
      // Bu fonksiyon normalde bir API endpoint'ine istek yapmalı
      // Burada sadece localStorage'a kaydediyoruz
      const key = `transaction_${transactionId}_products`;
      const productsData = products.map(product => ({
        productId: product.product.id,
        productName: product.product.name,
        quantity: product.quantity || 1,
        unitPrice: product.unitPrice || 0,
        totalPrice: product.totalPrice || 0
      }));
      
      localStorage.setItem(key, JSON.stringify(productsData));
      console.log("Ürünler localStorage'a kaydedildi:", productsData);
      
      return true;
    } catch (error) {
      console.error("Ürünleri kaydetme hatası:", error);
      return false;
    }
  };
  
  // Ürünleri yüklemek için yardımcı fonksiyon (frontend-only)
  const loadTransactionProducts = (transactionId: string) => {
    try {
      const key = `transaction_${transactionId}_products`;
      const savedProducts = localStorage.getItem(key);
      
      if (savedProducts) {
        const products = JSON.parse(savedProducts);
        console.log("Ürünler localStorage'dan yüklendi:", products);
        return products;
      }
      
      return null;
    } catch (error) {
      console.error("Ürünleri yükleme hatası:", error);
      return null;
    }
  };
  
  // Add handler for saving products
  const handleSaveProducts = async () => {
    try {
      setIsSubmitting(true);
      
      // Kanal ID'sini kontrol et
      const channelId = transaction.channel?.id || "";
      console.log("Current channel ID:", channelId);
      
      // Validasyon: Tüm ürünlerin geçerli product.id değeri olduğundan emin ol
      const invalidProducts = transactionProducts.filter(product => !product.product?.id);
      if (invalidProducts.length > 0) {
        toast.error("Bazı ürünler için ürün seçimi yapılmamış. Lütfen tüm ürünler için ürün seçiniz.");
        setIsSubmitting(false);
        return;
      }
      
      // Ürünlerin toplam tutarını hesapla - bu işlemin amount değeri olacak
      const totalAmount = transactionProducts.reduce((sum, product) => {
        return sum + (product.totalPrice || 0);
      }, 0);
      
      // Ürün listesini API'nin beklediği formata dönüştür
      const formattedProducts = transactionProducts.map(product => ({
          productId: product.product.id,
          quantity: product.quantity || 1,
          unitPrice: product.unitPrice || 0,
          totalPrice: product.totalPrice || 0
      }));
      
      // Rezervasyoni ve tutarı güncellemek için tüm zorunlu alanları içeren input hazırla
      const input = {
        id: transaction.id,
        amount: totalAmount, // Ürünlerin toplam tutarını amount olarak kullan
        typeId: transaction.type?.id || "", 
        statusId: transaction.status?.id || "", 
        accountId: transaction.account?.id || "", 
        assignedUserId: transaction.assignedUser?.id || "", 
        channelId: channelId, // Kanal ID'sini mutlaka gönder (boş string bile olsa)
        no: transaction.no,
        note: transaction.note,
        transactionDate: transaction.transactionDate,
        address: transaction.address || "",
        postalCode: transaction.postalCode || "",
        // Fixed location fields - use correct property names
        countryId: transaction.country?.id || null,
        cityId: transaction.city?.id || null,
        countyId: transaction.county?.id || null, // district maps to county in API
        districtId: transaction.district?.id || null, // neighborhood maps to district in API
        // Added cancelDate and cancelNote
        cancelDate: transaction.cancelDate || null,
        cancelNote: transaction.cancelNote || "",
        // Added successDate and successNote
        successDate: transaction.successDate || null,
        successNote: transaction.successNote || "",
        // GraphQL hatası gösteriyor ki "transactionProducts" değil, "products" olmalı
        products: formattedProducts,
        locations: locations.map(location => ({
          countryId: location.countryId,
          cityId: location.cityId,
          countyId: location.countyId,
          districtId: location.districtId,
          code: location.code,
          address: location.address,
          plannedDate: location.plannedDate
        }))
      };
      
      console.log("Rezervasyon güncelleme gönderilen veri:", input);
      console.log("Ürün listesi öğeleri:", formattedProducts);
      
      // API'ye ürün bilgilerini içeren tam veriyi gönder
      const result = await updateTransaction({
        variables: { input },
        context: getAuthorizationLink()
      });
      
      console.log("API yanıtı:", result);
      
      // Backend'e göndermeye çalıştık, yine de localStorage'a da kaydedelim
      saveTransactionProducts(transaction.id, transactionProducts);
      
      toast.success("Rezervasyon ve ürünler başarıyla güncellendi");
      
      // Veriyi yenile
      fetchTransactionData();
    } catch (error) {
      console.error("Rezervasyon güncelleme hatası:", error);
      console.error("Hata detayları:", JSON.stringify(error, null, 2));
      
      // Daha detaylı hata mesajı
      const errorObj = error as any;
      if (errorObj.graphQLErrors && errorObj.graphQLErrors.length > 0) {
        const errorMessage = errorObj.graphQLErrors[0]?.message || "Bilinmeyen hata";
        toast.error(`Rezervasyon güncellenirken hata oluştu: ${errorMessage}`);
      } else {
        toast.error("Rezervasyon güncellenirken bir hata oluştu. API yanıtını kontrol ediniz.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle location field changes
  const handleLocationChange = (index: number, field: string, value: any) => {
    console.log(`Lokasyon #${index}'de ${field} değişti:`, value);
    
    // Mevcut lokasyonların derin bir kopyasını al
    const updatedLocations = JSON.parse(JSON.stringify(locations));
    
    // Belirtilen indeksteki lokasyonu güncelle
    if (!updatedLocations[index]) {
      console.error(`${index} indeksinde lokasyon bulunamadı`);
      return;
    }
    
    // Değere göre state güncelleme
    updatedLocations[index][field] = value;
    
    // İlişkili alanları güncelle
    if (field === 'countryId') {
      // Ülke değiştiğinde, şehir/ilçe/mahalle resetlenir
      updatedLocations[index].cityId = null;
      updatedLocations[index].cityName = '';
      updatedLocations[index].countyId = null;
      updatedLocations[index].countyName = '';
      updatedLocations[index].districtId = null;
      updatedLocations[index].districtName = '';
      
      // Ülke adını bul ve güncelle
      if (value) {
        const country = countryOptions.find(c => c.value === value);
        if (country) {
          console.log(`Ülke adı bulundu ve atanıyor: ${country.label}`);
          updatedLocations[index].countryName = country.label;
        }
      } else {
        updatedLocations[index].countryName = '';
      }
      
      // Şehir listesini yükle
      if (value) {
        console.log(`${value} ülkesi için şehirler yükleniyor...`);
        // Burada doğrudan fetchCitiesForCountry çağrılıyor ancak sonucu beklemiyoruz
        // Bu, dropdown'ın güncellemesi için gereklidir
        fetchCitiesForCountry(value);
      }
    } else if (field === 'cityId') {
      // Şehir değiştiğinde ilçe/mahalle resetlenir
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
      
      // İlçe listesini yükle
      if (value) {
        console.log(`${value} şehri için ilçeler yükleniyor...`);
        fetchCountiesForCity(value);
      }
    } else if (field === 'countyId') {
      // İlçe değiştiğinde mahalle sıfırlanır
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
      
      // Mahalle listesini yükle
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
    
    // Tamamen yeni bir referansla state'i güncelle
    setLocations([...updatedLocations]);
  };
  
  // Add a new location
  const handleAddLocation = () => {
    console.log("Yeni lokasyon ekleniyor...");
    console.log("Mevcut lokasyonlar:", locations);
    
    // Önce tüm lokasyonları inceleyerek güvenli bir başlangıç yap
    // Lokasyonları kopyalarken derin kopya kullanın (silinmiş lokasyonları da dahil et)
    const existingLocations = JSON.parse(JSON.stringify(locations));
    
    // Varolan lokasyonları kontrol et - eğer varsa son lokasyon düzenleniyor mu?
    if (existingLocations.length > 0) {
      const lastLocation = existingLocations[existingLocations.length - 1];
      // Eğer son lokasyon düzenleniyorsa, bu yeni ekleme sırasında düzenleme modunu kapat
      if (lastLocation.isEditing) {
        console.log("Son lokasyon düzenleme modunda, modunu kapatıyorum:", lastLocation);
        lastLocation.isEditing = false;
      }
    }
    
    // İlk önce var olan lokasyonları kaydet - siliniş olanlar dahil hepsini koru, state'i korumak için
    const updatedLocations = [...existingLocations];
    
    // Yeni boş lokasyon oluştur ve tüm alanları tanımla
    const newLocation = {
      id: `new-${Date.now()}`,
      code: '',
      address: '',
      countryId: null,
      countryName: '',
      cityId: null,
      cityName: '',
      countyId: null,
      countyName: '',
      districtId: null,
      districtName: '',
      plannedDate: null,
      isNew: true,
      isEditing: true,
      isDeleted: false
    };
    
    console.log("Oluşturulan yeni lokasyon:", newLocation);
    
    // Yeni lokasyonu ekle - var olanların sonuna
    updatedLocations.push(newLocation);
    
    console.log("Güncellenmiş lokasyonlar:", updatedLocations);
    
    // Yeni referansla state'i güncelle
    setLocations([...updatedLocations]);
    
    // Biraz bekleyip, en aşağıya scroll yaparak yeni eklenen lokasyonu göster
    setTimeout(() => {
      const locationTables = document.querySelectorAll('.table-responsive');
      if (locationTables.length > 0) {
        const locationTable = locationTables[1]; // İkinci tablo muhtemelen lokasyon tablosudur
        locationTable.scrollTop = locationTable.scrollHeight;
      }
    }, 100);
  };
  
  // Toggle editing mode for a location
  const handleEditLocation = (index: number) => {
    console.log(`Lokasyon #${index} düzenleme modu değiştiriliyor`);
    console.log("Lokasyon orijinal durumu:", locations[index]);
    
    // Mevcut lokasyonların derin bir kopyasını al
    const existingLocations = JSON.parse(JSON.stringify(locations));
    
    // Önce tüm lokasyonların düzenleme modunu kapat
    existingLocations.forEach((loc: any, idx: number) => {
      if (idx !== index && loc.isEditing) {
        console.log(`Lokasyon #${idx} düzenleme modu kapatılıyor`);
        loc.isEditing = false;
      }
    });
    
    // Sonra belirtilen lokasyonun düzenleme durumunu değiştir
    existingLocations[index] = {
      ...existingLocations[index],
      isEditing: !existingLocations[index].isEditing
    };
    
    console.log("Lokasyon yeni durumu:", existingLocations[index]);
    
    // Düzenleme modu açıldığında dropdown verilerini yükle
    if (existingLocations[index].isEditing) {
      console.log(`Lokasyon #${index} için dropdown verilerini yüklüyorum`);
      
      const location = existingLocations[index];
      
      // Ülke seçili ise, şehir verilerini yükle
      if (location.countryId) {
        console.log(`${location.countryId} ülkesi için şehirler yükleniyor...`);
        fetchCitiesForCountry(location.countryId);
        
        // Şehir seçili ise, ilçe verilerini yükle
        if (location.cityId) {
          console.log(`${location.cityId} şehri için ilçeler yükleniyor...`);
          fetchCountiesForCity(location.cityId);
          
          // İlçe seçili ise, mahalle verilerini yükle
          if (location.countyId) {
            console.log(`${location.countyId} ilçesi için mahalleler yükleniyor...`);
            fetchDistrictsForCounty(location.countyId);
          }
        }
      }
    }
    
    // Tamamen yeni bir referansla state'i güncelle
    setLocations([...existingLocations]);
  };
  
  // Remove a location
  const handleRemoveLocation = (index: number) => {
    console.log(`Lokasyon #${index} siliniyor`);
    console.log("Silinecek lokasyon:", locations[index]);
    
    // Mevcut lokasyonları derin kopyala
    const existingLocations = JSON.parse(JSON.stringify(locations));
    
    // If it's a new unsaved location, remove it
    if (existingLocations[index].isNew) {
      console.log("Yeni eklenen lokasyon tamamen kaldırılıyor");
      existingLocations.splice(index, 1);
      
      // Eğer bu işlem sonrası hiç lokasyon kalmazsa, boş bir tane ekle
      if (existingLocations.filter(loc => !loc.isDeleted).length === 0) {
        console.log("Silinme sonrası lokasyon kalmadı, yeni boş lokasyon ekleniyor");
        
        const emptyLocation = {
          id: `new-${Date.now()}`,
          countryId: null,
          countryName: '',
          cityId: null,
          cityName: '',
          countyId: null,
          countyName: '',
          districtId: null,
          districtName: '',
          code: '',
          address: '',
          plannedDate: null,
          isNew: true,
          isEditing: true,
          isDeleted: false
        };
        
        existingLocations.push(emptyLocation);
      }
    } else {
      // Otherwise mark it for deletion (UI'dan gizlenecek)
      console.log("Var olan lokasyon silindi olarak işaretleniyor");
      existingLocations[index] = {
        ...existingLocations[index],
        isDeleted: true
      };
      
      // Eğer bu işlem sonrası görünür lokasyon kalmazsa, boş bir tane ekle
      if (existingLocations.filter(loc => !loc.isDeleted).length === 0) {
        console.log("Silme sonrası görünür lokasyon kalmadı, yeni boş lokasyon ekleniyor");
        
        const emptyLocation = {
          id: `new-${Date.now()}`,
          countryId: null,
          countryName: '',
          cityId: null,
          cityName: '',
          countyId: null,
          countyName: '',
          districtId: null,
          districtName: '',
          code: '',
          address: '',
          plannedDate: null,
          isNew: true,
          isEditing: true,
          isDeleted: false
        };
        
        existingLocations.push(emptyLocation);
      }
    }
    
    console.log("Güncellenmiş lokasyonlar:", existingLocations);
    
    // Tamamen yeni bir referansla state'i güncelle
    setLocations([...existingLocations]);
  };

  // Add handler for adding new product
  const handleAddProduct = () => {
    // Only add if product options are available
    if (productOptions.length > 0) {
      // Varsayılan olarak ilk ürünü değil, boş bir seçim oluştur
      const newProduct = {
        id: null,
        product: {
          id: "",  // Boş ID ile başla
          name: "" // Boş isim ile başla
        },
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      };
      
      const updatedProducts = [...transactionProducts, newProduct];
      setTransactionProducts(updatedProducts);
      
      // Toplam tutarı yeniden hesapla (eklenen ürün 0 TL olduğu için değişmeyecek)
      const total = updatedProducts.reduce(
        (sum: number, product: any) => sum + (product.totalPrice || 0), 
        0
      );
      setProductTotal(total);
      
      // Tablonun en altına scroll yaparak kullanıcının yeni eklenen ürünü görmesini sağla
      setTimeout(() => {
        const tables = document.querySelectorAll('table.table-bordered');
        if (tables.length > 0) {
          tables[0].scrollTop = tables[0].scrollHeight;
        }
      }, 100);
    } else {
      toast.warning("Ürün seçenekleri yüklenemedi");
    }
  };
  
  // Add handler for removing a product
  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...transactionProducts];
    updatedProducts.splice(index, 1);
    setTransactionProducts(updatedProducts);
    
    // Toplam tutarı yeniden hesapla
    const total = updatedProducts.reduce(
      (sum: number, product: any) => sum + (product.totalPrice || 0), 
      0
    );
    setProductTotal(total);
    
    console.log(`Ürün silindi - Yeni toplam tutar: ${total}`);
  };

  // Bu fonksiyonu handleUpdateTransaction yardımcı fonksiyonları arasına ekle
  const loadProductOptions = async () => {
    try {
      const { data } = await client.query({
        query: GET_PRODUCTS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getProductsLookup && data.getProductsLookup.items) {
        const options = data.getProductsLookup.items.map((product: any) => ({
          value: product.id,
          label: product.name
        }));
        setProductOptions(options);
        console.log("Ürün seçenekleri yüklendi:", options.length);
        return options;
      }
      return [];
    } catch (err) {
      console.error("Ürün seçenekleri yüklenirken hata oluştu:", err);
      toast.error("Ürün listesi yüklenemedi");
      return [];
    }
  };

  // Add this line before the return statement
  const debouncedHandleChange = createDebouncedFormikHandlers(validation.handleChange, 500);

  // Fetch function for cities based on country selection
  const loadCountryOptions = async () => {
    try {
      console.log("Ülke listesi yükleniyor...");
      const { data } = await client.query({
        query: GET_COUNTRIES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      console.log("API'den gelen ülke verisi:", data);
      
      // Handle both 'countries' and 'getCountries' response formats
      const countriesData = data.getCountries || data.countries || [];
      
      if (countriesData && countriesData.length > 0) {
        const options = countriesData.map((country: any) => ({
          value: country.id,
          label: country.name
        }));
        
        setCountryOptions(options);
        console.log("Ülke seçenekleri yüklendi:", options);
        return options; // Return options for chaining
      } else {
        console.warn("API'den ülke listesi alınamadı veya boş geldi");
        return [];
      }
    } catch (error) {
      console.error("Ülke seçenekleri yüklenirken hata oluştu:", error);
      console.error("Hata detayları:", JSON.stringify(error, null, 2));
      return []; // Return empty array in case of error
    }
  };

  useEffect(() => {
    // Load initial options for dropdowns when component mounts
    loadProductOptions();
    loadCountryOptions(); // Ülke seçeneklerini her zaman yükle
    
    fetchTransactionData();
  }, [id]);

  // Function to load initial locations from transaction
  const loadLocationsFromTransaction = async () => {
    try {
      if (!transaction) return;
      
      console.log("Loading locations from transaction:", transaction);
      
      // Derin kopyalama ile yeni array oluştur
      const locationsArray = [];
      
      // Önce mevcut locations state'inin bir kopyasını alalım
      // Bu ref yeni eklenen ama henüz kaydedilmemiş lokasyonları korumak için
      const currentLocations = [...locations];
      const currentLocationsMap = new Map();
      
      // Mevcut lokasyonları ID'ye göre map'e ekle (sadece silinmemiş ve yeni eklenenler)
      currentLocations
        .filter(loc => !loc.isDeleted)
        .forEach(loc => {
          if (loc.isNew) {
            // Yeni lokasyonları koru
            locationsArray.push(loc);
          } else {
            // Var olan lokasyonları map'e ekle - sonra yerini güncellemek için
            if (loc.id) {
              currentLocationsMap.set(loc.id, loc);
            }
          }
        });
      
      console.log("Mevcut lokasyonlar (yeni eklenmiş):", locationsArray);
      
      // Check if transaction has location properties first (ana lokasyon)
      if (transaction.country?.id) {
        console.log("Reservation has main location data");
        
        // Ana lokasyon ID'si
        const mainLocationId = transaction.id ? `main-${transaction.id}` : `main-${Date.now()}`;
        
        // Eğer bu lokasyon zaten map'te varsa, onu kullan yoksa yeni oluştur
        const existingMainLocation = currentLocationsMap.get(mainLocationId);
        
        if (existingMainLocation) {
          // Var olan lokasyonu güncelle
          console.log("Ana lokasyon zaten var, güncelleniyor:", existingMainLocation);
          
          // Önceki değerleri koru, sadece API'den gelen değerler için update et
          const updatedMainLocation = {
            ...existingMainLocation,
            countryId: transaction.country?.id || existingMainLocation.countryId,
            countryName: transaction.country?.name || existingMainLocation.countryName,
            cityId: transaction.city?.id || existingMainLocation.cityId,
            cityName: transaction.city?.name || existingMainLocation.cityName,
            countyId: transaction.county?.id || existingMainLocation.countyId,
            countyName: transaction.county?.name || existingMainLocation.countyName,
            districtId: transaction.district?.id || existingMainLocation.districtId,
            districtName: transaction.district?.name || existingMainLocation.districtName,
            code: transaction.postalCode || existingMainLocation.code,
            address: transaction.address || existingMainLocation.address,
            // Düzenleme durumunu koru
            isEditing: existingMainLocation.isEditing
          };
          
          locationsArray.push(updatedMainLocation);
          console.log("Ana lokasyon güncellendi:", updatedMainLocation);
        } else {
          // Yeni ana lokasyon oluştur
          const mainLocation = {
            id: mainLocationId,
            countryId: transaction.country?.id || null,
            countryName: transaction.country?.name || '',
            cityId: transaction.city?.id || null,
            cityName: transaction.city?.name || '',
            countyId: transaction.county?.id || null,
            countyName: transaction.county?.name || '',
            districtId: transaction.district?.id || null,
            districtName: transaction.district?.name || '',
            code: transaction.postalCode || '',
            address: transaction.address || '',
            plannedDate: null,
            isNew: false,
            isEditing: false,
            isDeleted: false
          };
          
          locationsArray.push(mainLocation);
          console.log("Yeni ana lokasyon eklendi:", mainLocation);
        }
      }
      
      // Then check for separate location entries if they exist (ek lokasyonlar)
      if (transaction.locations && transaction.locations.length > 0) {
        console.log(`Reservation has ${transaction.locations.length} additional locations`);
        
        // Her bir lokasyon için detaylı bilgiler ile doldur
        for (let index = 0; index < transaction.locations.length; index++) {
          const location = transaction.locations[index];
          
          // DEBUGGING - Ek lokasyon verilerini kontrol et
          console.log(`Detailed location ${index} data:`, {
            id: location.id,
            country: location.country,
            city: location.city,
            county: location.county,
            district: location.district,
            postalCode: location.postalCode,
            address: location.address,
            plannedDate: location.plannedDate
          });
          
          // Eğer bu lokasyon zaten map'te varsa, onu kullan yoksa yeni oluştur
          const existingLocation = location.id ? currentLocationsMap.get(location.id) : null;
          
          if (existingLocation) {
            // Var olan lokasyonu güncelle ama düzenleme durumunu koru
            console.log(`Lokasyon #${index} zaten var, güncelleniyor:`, existingLocation);
            
            const updatedLocation = {
              ...existingLocation,
              countryId: location.country?.id || existingLocation.countryId,
              countryName: location.country?.name || existingLocation.countryName,
              cityId: location.city?.id || existingLocation.cityId,
              cityName: location.city?.name || existingLocation.cityName,
              countyId: location.county?.id || existingLocation.countyId,
              countyName: location.county?.name || existingLocation.countyName,
              districtId: location.district?.id || existingLocation.districtId,
              districtName: location.district?.name || existingLocation.districtName,
              code: location.postalCode || existingLocation.code,
              address: location.address || existingLocation.address,
              plannedDate: location.plannedDate || existingLocation.plannedDate,
              // Düzenleme durumunu koru
              isEditing: existingLocation.isEditing
            };
            
            locationsArray.push(updatedLocation);
            console.log(`Lokasyon #${index} güncellendi:`, updatedLocation);
          } else {
            // Yeni lokasyon oluştur
            const locationObj = {
              id: location.id || `location-${Date.now()}-${index}`,
              countryId: location.country?.id || null,
              countryName: location.country?.name || '',
              cityId: location.city?.id || null,
              cityName: location.city?.name || '',
              countyId: location.county?.id || null,
              countyName: location.county?.name || '',
              districtId: location.district?.id || null,
              districtName: location.district?.name || '',
              code: location.postalCode || '',
              address: location.address || '',
              plannedDate: location.plannedDate || null,
              isNew: false,  // API'den gelen lokasyonlar yeni değil
              isEditing: false,
              isDeleted: false
            };
            
            locationsArray.push(locationObj);
            console.log(`Yeni lokasyon #${index} eklendi:`, locationObj);
          }
        }
      }
      
      // If no locations were found, add an empty one
      if (locationsArray.length === 0) {
        console.log("No locations found, adding default empty location");
        
        const emptyLocation = {
          id: `new-${Date.now()}`,
          countryId: null,
          countryName: '',
          cityId: null,
          cityName: '',
          countyId: null,
          countyName: '',
          districtId: null,
          districtName: '',
          code: '',
          address: '',
          plannedDate: null,
          isNew: true,
          isEditing: true,
          isDeleted: false
        };
        
        locationsArray.push(emptyLocation);
      }
      
      // Tüm lokasyonlar yüklendikten sonra gerekli dropdown verilerini yükle
      try {
        // Load country options if not already loaded
        if (countryOptions.length === 0) {
          console.log("Loading country options");
          await loadCountryOptions();
        }
        
        // Preload location reference data for each location
        console.log("Preloading reference data for locations");
        
        // Ön yükleme işlemlerini promise'lerle birlikte yap (parallel processing)
        const loadingPromises = [];
        
        for (const location of locationsArray) {
          if (location.countryId) {
            console.log(`Preloading cities for country ${location.countryName}`);
            loadingPromises.push(fetchCitiesForCountry(location.countryId));
            
            if (location.cityId) {
              console.log(`Preloading counties for city ${location.cityName}`);
              loadingPromises.push(fetchCountiesForCity(location.cityId));
              
              if (location.countyId) {
                console.log(`Preloading districts for county ${location.countyName}`);
                loadingPromises.push(fetchDistrictsForCounty(location.countyId));
              }
            }
          }
        }
        
        // Tüm referans veri yüklemelerinin tamamlanmasını bekleyin
        await Promise.all(loadingPromises);
        
        console.log("Finished preloading all reference data");
      } catch (error) {
        console.error("Error preloading reference data:", error);
      }
      
      console.log("Setting locations state with:", locationsArray);
      // Use a new array reference to ensure React detects the change
      setLocations([...locationsArray]);
      
    } catch (error) {
      console.error("Error loading locations from transaction:", error);
    }
  };

  // Call the loadLocationsFromTransaction when transaction changes
  useEffect(() => {
    if (transaction) {
      console.log("Reservation data changed, loading locations");
      loadLocationsFromTransaction();
    }
  }, [transaction]);

  // Handle Save Locations
  const handleSaveLocations = async () => {
    try {
      setIsSubmitting(true);

      if (!transaction || !transaction.id) {
        toast.error("Rezervasyon bilgisi bulunamadı");
        setIsSubmitting(false);
        return;
      }

      console.log("Lokasyonlar kaydediliyor:", locations);

      // Yalnızca düzgün lokasyonları al - silinmiş ve geçersiz lokasyonları filtrele
      const locationInputs = locations
        .filter(loc => !loc.isDeleted)
        .filter(loc => loc.countryId) // Sadece ülkesi olan lokasyonları tut
        .map(loc => {
          // Temel lokasyon verileri
          const locationData: {
            id?: string;
            countryId: string | null;
            cityId: string | null;
            countyId: string | null;
            districtId: string | null;
            postalCode: string | null;
            address: string | null;
            plannedDate: string | null;
          } = {
            countryId: loc.countryId,
            cityId: loc.cityId || null,
            countyId: loc.countyId || null,
            districtId: loc.districtId || null,
            code: loc.code || null,
            address: loc.address || null,
            plannedDate: loc.plannedDate || null
          };

          // Sadece var olan lokasyonlar için ID ekle (yeni olanlar için değil)
          if (!loc.isNew && loc.id && !loc.id.startsWith('new-') && !loc.id.startsWith('location-') && !loc.id.startsWith('main-')) {
            locationData.id = loc.id;
          }

          return locationData;
        });

      console.log("Hazırlanan lokasyon verileri:", locationInputs);

      // Ana işlem verileri
      const transactionInput = {
        id: transaction.id,
        // Rezervasyonin ilk lokasyonu olarak ilk lokasyonu kullan (ana lokasyon)
        countryId: locations[0]?.countryId || null,
        cityId: locations[0]?.cityId || null,
        countyId: locations[0]?.countyId || null,
        districtId: locations[0]?.districtId || null,
        postalCode: transaction.postalCode || null,
        address: locations[0]?.address || null,
        // Önceki değerleri koru
        amount: transaction.amount,
        typeId: transaction.type?.id,
        statusId: transaction.status?.id, 
        accountId: transaction.account?.id,
        assignedUserId: transaction.assignedUser?.id,
        channelId: transaction.channel?.id,
        no: transaction.no,
        note: transaction.note,
        transactionDate: transaction.transactionDate,
        cancelDate: transaction.cancelDate,
        cancelNote: transaction.cancelNote,
        successDate: transaction.successDate,
        successNote: transaction.successNote,
        // İlk lokasyon dışındaki tüm lokasyonları locations dizisine ekle
        locations: locationInputs.slice(1)
      };

      console.log("Rezervasyon güncelleme verisi:", transactionInput);

      // Apollo client ile doğrudan mutation kullan
      const UPDATE_TRANSACTION_WITH_LOCATIONS = gql`
        mutation UpdateTransaction($input: CreateUpdateTransactionDTO!) {
          updateTransaction(input: $input) {
            id
            address
            postalCode
            code
            country {
              id
              name
            }
            city {
              id
              name
            }
            county {
              id
              name
            }
            district {
              id
              name
            }
            locations {
              id
              address
              postalCode
              code
              country {
                id
                name
              }
              city {
                id
                name
              }
              county {
                id
                name
              }
              district {
                id
                name
              }
              plannedDate
            }
          }
        }
      `;

      const result = await client.mutate({
        mutation: UPDATE_TRANSACTION_WITH_LOCATIONS,
        variables: { input: transactionInput },
        context: getAuthorizationLink()
      });

      console.log("API yanıtı:", result);

      if (result.errors) {
        console.error("GraphQL hataları:", result.errors);
        throw new Error(result.errors[0]?.message || "GraphQL hatası");
      }

      if (!result.data) {
        throw new Error("API'den veri dönmedi");
      }

      toast.success("Lokasyon bilgileri başarıyla güncellendi");

      // Veriyi yenile
      await fetchTransactionData();
      
    } catch (error: any) {
      console.error("Lokasyon güncelleme hatası:", error);

      // Detaylı hata mesajı
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const errorMessage = error.graphQLErrors[0]?.message || "Bilinmeyen hata";
        toast.error(`Lokasyon güncellenirken hata oluştu: ${errorMessage}`);
      } else {
        toast.error(error?.message || "Lokasyon güncellenirken bir hata oluştu");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle edit modal
  const toggleEditModal = () => {
    // If opening the modal, fetch fresh transaction data
    if (!editModal) {
      setLoading(true);
      
      // Fetch fresh transaction data from the server
      console.log("Fetching fresh transaction data for edit modal...");
      client.query({
        query: GET_TRANSACTION,
        variables: { id },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only" // Force fetch from server
      })
      .then(({ data }) => {
        console.log("Received fresh transaction data:", data);
        if (data && data.getTransaction) {
          // Debug geographic fields
          console.log("Geographic data in transaction:", {
            country: data.getTransaction.country ? {id: data.getTransaction.country.id, name: data.getTransaction.country.name} : null,
            city: data.getTransaction.city ? {id: data.getTransaction.city.id, name: data.getTransaction.city.name} : null,
            district: data.getTransaction.district ? {id: data.getTransaction.district.id, name: data.getTransaction.district.name} : null,
            county: data.getTransaction.county ? {id: data.getTransaction.county.id, name: data.getTransaction.county.name} : null
          });
          
          // Debug dates - raw format
          console.log("Date fields in transaction (raw):", {
            cancelDate: data.getTransaction.cancelDate,
            successDate: data.getTransaction.successDate,
            transactionDate: data.getTransaction.transactionDate
          });
          
          // Debug notes
          console.log("Note fields in transaction:", {
            note: data.getTransaction.note,
            cancelNote: data.getTransaction.cancelNote,
            successNote: data.getTransaction.successNote
          });
          
          // Store a copy of the original transaction data for reference
          const originalTransaction = { ...data.getTransaction };
          
          // Format the transaction data and update the state
          setTransaction(originalTransaction);
          
          // Now update all form values for the edit form
          const updatedValues = {
            id: originalTransaction.id || "",
            amount: originalTransaction.amount || 0,
            no: originalTransaction.no || "",
            note: originalTransaction.note || "",
            typeId: originalTransaction.type?.id || "",
            statusId: originalTransaction.status?.id || "",
            accountId: originalTransaction.account?.id || "",
            assignedUserId: originalTransaction.assignedUser?.id || "",
            channelId: originalTransaction.channel?.id || "",
            
            // Format products properly
            products: originalTransaction.transactionProducts?.map((p: any) => ({
              value: p.product.id,
              label: p.product.name
            })) || [],
            
            // Format dates properly
            date: originalTransaction.createdAt ? moment(originalTransaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
            transactionDate: originalTransaction.transactionDate ? moment(originalTransaction.transactionDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
            
            // Add transaction products
            transactionProducts: originalTransaction.transactionProducts || [] as TransactionProductInput[],
            
            // Location fields - make sure to use the correct fields from the API response
            address: originalTransaction.address || "",
            postalCode: originalTransaction.postalCode || "",
            country: originalTransaction.country?.id || "",
            city: originalTransaction.city?.id || "",
            district: originalTransaction.county?.id || "", // county corresponds to district in our API
            neighborhood: originalTransaction.district?.id || "", // district corresponds to neighborhood in our API
            
            // Format special dates with correct format
            successDate: originalTransaction.successDate ? moment(originalTransaction.successDate).format("YYYY-MM-DD HH:mm") : "",
            successNote: originalTransaction.successNote || "",
            cancelDate: originalTransaction.cancelDate ? moment(originalTransaction.cancelDate).format("YYYY-MM-DD HH:mm") : "",
            cancelNote: originalTransaction.cancelNote || ""
          };
          
          console.log("Setting form values for edit:", updatedValues);
          
          // Update all form fields at once
          validation.setValues(updatedValues);
          
          // Now fetch the related dropdowns based on the selected values
          if (originalTransaction.country?.id) {
            loadCountryOptions();
          }
          
          if (originalTransaction.city?.id) {
            fetchCountiesForCity(originalTransaction.city.id);
          }
          
          if (originalTransaction.county?.id) {
            fetchDistrictsForCounty(originalTransaction.county.id);
          }
          
          // Update the local state for products to display in the product table
          if (originalTransaction.transactionProducts && originalTransaction.transactionProducts.length > 0) {
            const formattedProducts = originalTransaction.transactionProducts.map((product: any) => ({
              id: product.id,
              product: {
                id: product.product.id,
                name: product.product.name
              },
              quantity: Number(product.quantity) || 1,
              unitPrice: Number(product.unitPrice) || 0,
              totalPrice: (Number(product.quantity) || 1) * (Number(product.unitPrice) || 0)
            }));
            
            // Update the state
            setTransactionProducts(formattedProducts);
            
            // Calculate total
            const total = formattedProducts.reduce(
              (sum: number, product: any) => sum + ((Number(product.quantity) || 1) * (Number(product.unitPrice) || 0)),
              0
            );
            setProductTotal(total);
            
            // Log the formatted products
            console.log("Formatted transaction products for the table:", formattedProducts);
          }
        }
        
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching transaction data:", error);
        toast.error("Rezervasyon verileri yüklenirken bir hata oluştu");
        setLoading(false);
      });
    }
    
    setEditModal(!editModal);
  };
  
  // Add handler for product changes
  const handleProductChange = (index: number, field: string, value: any) => {
    const updatedProducts = [...transactionProducts];
    const product = { ...updatedProducts[index] };
    
    if (field === 'product') {
      // Ürün seçimi yapıldığında, o ürüne ait verileri ürünlerden al
      const selectedProduct = productOptions.find(p => p.value === value.id);
      if (selectedProduct) {
        product.product = {
          id: selectedProduct.value,
          name: selectedProduct.label
        };
        // Burada API'dan ürün bilgilerini alıp doldurabiliriz
        // Şimdilik sadece ürün seçimi yapıyoruz
      }
    } else if (field === 'quantity') {
      product.quantity = Number(value);
      // Miktar değiştiğinde toplam fiyatı güncelle
      product.totalPrice = product.quantity * (product.unitPrice || 0);
    } else if (field === 'unitPrice') {
      product.unitPrice = Number(value);
      // Birim fiyat değiştiğinde toplam fiyatı güncelle
      product.totalPrice = (product.quantity || 1) * product.unitPrice;
    }
    
    updatedProducts[index] = product;
    setTransactionProducts(updatedProducts);
    
    // Toplam tutarı hesapla ve güncelle
    const total = updatedProducts.reduce(
      (sum: number, product: any) => sum + (product.totalPrice || 0), 
      0
    );
    setProductTotal(total);
    
    console.log(`Ürün değiştirildi - Yeni toplam tutar: ${total}`);
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Yükleniyor...</span>
            </div>
            <p className="mt-2">Rezervasyon detayları yükleniyor...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="alert alert-danger">
            Rezervasyon detayları yüklenirken bir hata oluştu.
          </div>
        </Container>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Reservation Details" pageTitle="Reservations" />
          
          <Card>
            <CardHeader className="d-flex align-items-center justify-content-start bg-white">
              <div>
                <Link to="/reservations" className="btn btn-soft-primary btn-sm me-2">
                  <i className="ri-arrow-left-line align-middle"></i> Reservations
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <Row>
                {/* Right Column - Stacked Cards */}
                <Col md={6}>
                  {/* Reservation Details */}
                  <Card className="border mb-3">
                    <CardHeader className="bg-white border-bottom d-flex align-items-center justify-content-between">
                      <h6 className="mb-0">Reservation Details</h6>
                      <Button color="primary" size="sm" onClick={toggleEditModal}>
                        <i className="ri-pencil-line align-middle me-1"></i> Edit
                      </Button>
                    </CardHeader>
                    <CardBody className="p-0">
                      <Table className="mb-0" borderless>
                        <tbody>
                          <tr>
                            <th className="ps-3">Assigned Account</th>
                            <td>
                                {
                                    transaction.account
                                    ?
                                        <Link to={`/accounts/detail/${transaction.account?.id}`} className="text-primary">
                                        {transaction.account.name}
                                        </Link>
                                    : "-"
                                }
                            </td>
                          </tr>
                          <tr>
                            <th className="ps-3">Status</th>
                            <td>{transaction.status?.name || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Reservation No</th>
                            <td>{transaction.no || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Passenger Name</th>
                            <td>{transaction.name || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Passenger Phone</th>
                            <td>{transaction.phone || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Passenger Count</th>
                            <td>{transaction.transactionProducts?.[0]?.quantity ?? "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Amount</th>
                            <td>{transaction.amount ?? "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Product</th>
                            <td>{transaction.transactionProducts?.[0]?.product?.name ?? "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Note</th>
                            <td>{transaction.note ?? "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">From</th>
                            <td>{transaction.locations?.find(loc => loc.code === 'FROM')?.address ?? "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">To</th>
                            <td>{transaction.locations?.find(loc => loc.code === 'TO')?.address ?? "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Flight Number</th>
                            <td>{transaction.flightNumber || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Planned Date</th>
                            <td>{transaction.locations?.find(loc => loc.code === 'FROM')?.plannedDate ?? "-"}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </CardBody>
                  </Card>
                  
                </Col>
                <Col md={6}>
                  
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Container>
        <ToastContainer closeButton={false} limit={1} />
        
        {/* Replace the Edit Modal with the new component */}
        <ReservationFormModal
          isOpen={editModal}
          toggle={toggleEditModal}
          title="Rezervasyon Düzenle"
          onSubmit={(e) => validation.handleSubmit(e)}
          submitText="Güncelle"
          isDetail={false}
          isSubmitting={isSubmitting}
          validation={validation}
          accountOptions={accountOptions}
          statusOptions={statusOptions}
          userOptions={userOptions}
          typeOptions={typeOptions}
          productOptions={productOptions}
          countryOptions={countryOptions}
          cityOptions={cityOptions}
          countyOptions={countyOptions}
          districtOptions={districtOptions}
          channelOptions={channelOptions}
          isLoadingChannels={isLoadingChannels}
          safelyUpdateFormField={(fieldName, value) => validation.setFieldValue(fieldName, value, true)}
          debouncedHandleChange={debouncedHandleChange}
          getCities={fetchCitiesForCountry ? (variables) => fetchCitiesForCountry(variables.variables.countryId) : undefined}
          getCounties={fetchCountiesForCity ? (variables) => fetchCountiesForCity(variables.variables.cityId) : undefined}
          getDistricts={fetchDistrictsForCounty ? (variables) => fetchDistrictsForCounty(variables.variables.countyId) : undefined}
          transaction={transaction}
        />
      </div>
    </React.Fragment>
  );
};

// Wrap the component with ApolloProvider
const ReservationDetail: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <TransactionDetailContent />
    </ApolloProvider>
  );
};

export default ReservationDetail; 