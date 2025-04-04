import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Input,
  Label,
  Row,
  Modal,
  ModalHeader,
  ModalBody,
  Form,
  FormFeedback,
  ModalFooter,
  Button,
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import TableContainer from "../../../Components/Common/TableContainer";

// Custom CSS for table loading effect
const tableLoadingCSS = `
  .table-loading {
    opacity: 0.6;
    transition: opacity 0.3s ease;
  }
  
  .table-loading td {
    position: relative;
    overflow: hidden;
  }
  
  .table-loading td::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    transform: translateX(-100%);
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
`;

//Import actions
import Select from "react-select";
import * as Yup from "yup";
import { useFormik } from "formik";
import { useMutation, useQuery, useLazyQuery, ApolloClient, InMemoryCache, createHttpLink, ApolloProvider } from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DeleteModal from "../../../Components/Common/DeleteModal";
import Loader from "../../../Components/Common/Loader";
import TransactionFilter, { TransactionFilterState } from "./transactions";
// Import DB
import {
  CREATE_TRANSACTION,
  UPDATE_TRANSACTION,
  DELETE_TRANSACTION,
} from "../../../graphql/mutations/transactionMutations";
import { 
  GET_TRANSACTIONS, 
  GET_TRANSACTION, 
  GET_TRANSACTION_TYPES, 
  GET_TRANSACTION_STATUSES,
  GET_ACCOUNTS_LOOKUP,
  GET_USERS_LOOKUP,
  GET_PRODUCTS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS,
  GET_CHANNELS_LOOKUP
} from "../../../graphql/queries/transactionQueries";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { useParams } from "react-router-dom";
import { PaginatedResponse, GetTransactionsDTO, Transaction, TransactionProductInput, SelectOption } from "../../../types/graphql";
import { ApolloError, ServerError, ServerParseError } from "@apollo/client";

// Add import for DebouncedInput 
import DebouncedInput from "../../../Components/Common/DebouncedInput";

// Import section
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import moment from "moment";

// Import the new TransactionForm component
import TransactionForm from "./TransactionForm";

// Import the new TransactionFormModal component
import TransactionFormModal from "./TransactionFormModal";

// Helper function to convert empty strings to null for GraphQL
const nullIfEmpty = (value: string | null | undefined) => {
  // If the value is undefined, null, or an empty string, return null
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

// Create auth link
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage or wherever
  const token = getAuthHeader();
  
  // Debug auth token
  console.log("Auth Link - Token Available:", !!token);
  if (token) {
    console.log("Auth Link - Token Preview:", `${token.substring(0, 15)}...`);
  } else {
    console.log("Auth Link - No token available");
  }
  
  // Return the headers to the context so httpLink can read them
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
    console.log("Auth Context - No token available");
  }
  
  return {
    headers: {
      Authorization: token || '',
      'Content-Type': 'application/json',
    }
  };
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

// Update the formik configuration to use debounced handlers
// In the validation setup, add debounced change handlers
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

// Extend the Transaction type to include createdAt, channel, and transactionDate
interface TransactionWithCreatedAt extends Transaction {
  createdAt?: string;
  channel?: {
    id: string;
    name: string;
  };
  transactionDate?: string;
  date?: string; // Eklenen date alanı, UI formatlaması için kullanılır
  // New fields
  address?: string;
  postalCode?: string;
  successDate?: string;
  successNote?: string;
  transactionNote?: string;
  cancelDate?: string;
  cancelNote?: string;
  country?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
}

// Function to generate sample transactions data
const generateSampleTransactions = (): TransactionWithCreatedAt[] => {
  const sampleTypeOptions = [
    { id: '1', name: 'Satış', code: 'SALE' },
    { id: '2', name: 'Alış', code: 'PURCHASE' },
    { id: '3', name: 'Transfer', code: 'TRANSFER' }
  ];
  
  const sampleStatusOptions = [
    { id: '1', name: 'Tamamlandı', code: 'COMPLETED' },
    { id: '2', name: 'Beklemede', code: 'PENDING' },
    { id: '3', name: 'İptal Edildi', code: 'CANCELLED' }
  ];
  
  const sampleAccounts = [
    { id: '1', name: 'Firma A' },
    { id: '2', name: 'Firma B' },
    { id: '3', name: 'Müşteri C' }
  ];
  
  const sampleUsers = [
    { id: '1', fullName: 'Ahmet Yılmaz' },
    { id: '2', fullName: 'Mehmet Kaya' },
    { id: '3', fullName: 'Ayşe Demir' }
  ];
  
  const sampleProducts = [
    { id: '1', name: 'Ürün A' },
    { id: '2', name: 'Ürün B' },
    { id: '3', name: 'Ürün C' }
  ];
  
  return Array.from({ length: 10 }, (_, index) => {
    const typeIndex = index % sampleTypeOptions.length;
    const statusIndex = index % sampleStatusOptions.length;
    const accountIndex = index % sampleAccounts.length;
    const userIndex = index % sampleUsers.length;
    
    // Create a date with different values for each sample record
    const date = new Date();
    date.setDate(date.getDate() - index);
    
    return {
      id: `sample-${index + 1}`,
      no: `TRX-${1000 + index}`,
      amount: Math.floor(Math.random() * 10000) / 100,
      note: `Örnek işlem notu ${index + 1}`,
      createdAt: date.toISOString(),
      type: sampleTypeOptions[typeIndex],
      status: sampleStatusOptions[statusIndex],
      account: sampleAccounts[accountIndex],
      assignedUser: sampleUsers[userIndex],
      transactionProducts: [
        {
          id: `prod-${index}-1`,
          product: sampleProducts[index % sampleProducts.length],
          quantity: Math.floor(Math.random() * 10) + 1,
          unitPrice: Math.floor(Math.random() * 1000) / 100,
          totalPrice: Math.floor(Math.random() * 10000) / 100
        }
      ]
    };
  });
};

// Use sample data in fetchTransactionData function when API fails
async function fetchTransactionData({
  pageSize = 10,
  pageIndex = 0,
  text = "",
  orderBy = "createdAt",
  orderDirection = "DESC", // Büyük harfle değiştirildi
  statusIds = null,
  typeIds = null,
  assignedUserIds = null,
  createdAtStart = null,
  createdAtEnd = null,
  productIds = null,
  cityIds = null,
  channelIds = null,
  countryId = null,
  minAmount = null,
  maxAmount = null
}: GetTransactionsDTO = {pageSize: 10, pageIndex: 0}): Promise<PaginatedResponse<Transaction> | null> {
  try {
    // Yetkilendirme token'ını al
    const authToken = getAuthHeader();
    console.log("API isteği için token kullanılıyor, uzunluk:", authToken ? authToken.length : 0);
    
    // Parametreleri hazırla
    const inputParams: any = {
      pageSize,
      pageIndex
    };

    // Zorunlu olmayan parametreleri ekle
    if (text) inputParams.text = text;
    if (orderBy) inputParams.orderBy = orderBy;
    
    // orderDirection'ı BÜYÜK harfle gönder (API sadece ASC ve DESC kabul ediyor)
    if (orderDirection) {
      inputParams.orderDirection = orderDirection.toUpperCase();
    }
    
    // Diğer filtreleme parametrelerini ekle
    if (statusIds) inputParams.statusIds = statusIds;
    if (typeIds) inputParams.typeIds = typeIds;
    if (assignedUserIds) inputParams.assignedUserIds = assignedUserIds;
    if (createdAtStart) inputParams.createdAtStart = createdAtStart;
    if (createdAtEnd) inputParams.createdAtEnd = createdAtEnd;
    if (productIds) inputParams.productIds = productIds;
    if (cityIds) inputParams.cityIds = cityIds;
    if (channelIds) inputParams.channelIds = channelIds;
    if (countryId) inputParams.countryId = countryId;
    
    console.log("GraphQL sorgusu:", GET_TRANSACTIONS.loc?.source.body);
    console.log("Gönderilen parametreler:", JSON.stringify({ input: inputParams }, null, 2));
    
    // API isteğini yap
    console.log("API isteği yapılıyor...");
    const response = await client.query({
        query: GET_TRANSACTIONS,
      variables: { input: inputParams },
      context: {
        headers: {
          Authorization: authToken || ""
        }
      },
        fetchPolicy: "network-only",
      });
      
    console.log("API yanıtı alındı:", response?.data ? "Data var" : "Data yok");
    
    // Yanıtı kontrol et ve verileri döndür
    const responseData = response.data;
    
    if (responseData && responseData.getTransactions) {
      const transactionData = responseData.getTransactions;
      console.log("API'den dönen işlem sayısı:", transactionData.items?.length || 0);
        return transactionData;
      } else {
      console.error("API yanıtında veri bulunamadı veya beklenen format değil");
      console.log("Tam yanıt:", JSON.stringify(responseData, null, 2));
      console.log("Tam yanıt tipi:", typeof responseData);
      
      // Sonraki adım: Örnek veri döndür
      console.log("Örnek veriler kullanılıyor...");
      const sampleData = generateSampleTransactions();
      return {
        items: sampleData,
        itemCount: sampleData.length,
        pageCount: 1
      };
    }
  } catch (error: any) {
    console.error("İşlem verileri getirilirken hata:", error);
    
    // Hata detaylarını logla
    if (error.graphQLErrors && error.graphQLErrors.length > 0) {
      console.error("GraphQL Hataları:", JSON.stringify(error.graphQLErrors, null, 2));
      toast.error(`GraphQL hatası: ${error.graphQLErrors[0].message}`);
    } else if (error.networkError) {
      console.error("Ağ Hatası:", JSON.stringify(error.networkError, null, 2));
      toast.error(`Ağ hatası: ${error.message}`);
    } else {
      toast.error(`API hatası: ${error.message}`);
    }
    
    // Örnek veri döndür
    console.log("Hata nedeniyle örnek veriler kullanılıyor");
    const sampleData = generateSampleTransactions();
    return {
      items: sampleData,
      itemCount: sampleData.length,
      pageCount: 1
    };
  }
}

async function fetchTransactionDetail(transactionId: string): Promise<TransactionWithCreatedAt | null> {
  try {
    console.log("Fetching transaction with ID:", transactionId);
    console.log("GraphQL Query:", GET_TRANSACTION);
    
    const { data } = await client.query({
      query: GET_TRANSACTION,
      variables: { id: transactionId },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    console.log("Transaction Detail Response:", data);
    if (data && data.getTransaction) {
      const transactionData = data.getTransaction;
      return transactionData;
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching transaction detail:", error);
    if (error.graphQLErrors) {
      console.error("GraphQL Errors:", JSON.stringify(error.graphQLErrors, null, 2));
    }
    if (error.networkError) {
      console.error("Network Error:", error.networkError);
    }
    toast.error("Transaction detayları getirilirken hata oluştu.");
    return null;
  }
}

// Create the main component inner content as a separate component
const TransactionsContent: React.FC = () => {
  // First declare all state variables
  const [allTransactions, setAllTransactions] = useState<TransactionWithCreatedAt[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithCreatedAt[]>([]);
  const [transaction, setTransaction] = useState<TransactionWithCreatedAt | null>(null);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [modal, setModal] = useState<boolean>(false);
  const [isInfoDetails, setIsInfoDetails] = useState<boolean>(false);
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
  const [selectedRecordForDelete, setSelectedRecordForDelete] = useState<TransactionWithCreatedAt | null>(null);
  const [isDetail, setIsDetail] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Then declare mutations
  const [createTransaction] = useMutation(CREATE_TRANSACTION, {
    onCompleted: () => {
      setIsSubmitting(false);
      toast.success("İşlem başarıyla oluşturuldu");
      handleClose();
      // Only fetch data after successful creation
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error creating transaction:", error);
      setIsSubmitting(false);
      if (error.networkError) {
        toast.error("Ağ hatası: İşlem oluşturulamadı");
      } else if (error.graphQLErrors.length > 0) {
        toast.error(`Hata: ${error.graphQLErrors[0].message}`);
      } else {
        toast.error("İşlem oluşturulurken bir hata oluştu");
      }
    }
  });

  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    onCompleted: () => {
      setIsSubmitting(false);
      toast.success("İşlem başarıyla güncellendi");
      handleClose();
      // Only fetch data after successful update
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error updating transaction:", error);
      setIsSubmitting(false);
      if (error.networkError) {
        toast.error("Ağ hatası: İşlem güncellenemedi");
      } else if (error.graphQLErrors.length > 0) {
        toast.error(`Hata: ${error.graphQLErrors[0].message}`);
      } else {
        toast.error("İşlem güncellenirken bir hata oluştu");
      }
    }
  });
  
  // Pagination ve sıralama state'leri
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [itemCount, setItemCount] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<string>("id");
  const [orderDirection, setOrderDirection] = useState<"ASC" | "DESC">("DESC");
  const [searchText, setSearchText] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Add state variables for transaction options
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  // Add state for country and city options
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  // Add a new state to track when filters are being applied
  const [isFilteringInProgress, setIsFilteringInProgress] = useState<boolean>(false);
  
  // Create a memoized auth context that only updates when needed
  const memoizedAuthContext = useMemo(() => {
    return getAuthorizationLink();
  }, []);
  
  // Use this context for all queries and mutations that don't need to be real-time
  const getStaticAuthContext = () => memoizedAuthContext;
  
  // For form submission, get a fresh token only once per submission
  const getFreshAuthContext = () => getAuthorizationLink();
  
  // Add state for data cache
  const [dataCache, setDataCache] = useState<{ [key: string]: any }>({});
  
  // Add fetchDataWithCurrentFilters to fetch data with current state
  const fetchDataWithCurrentFilters = async () => {
    // Skip if filtering is in progress to avoid duplicate calls
    if (isFilteringInProgress) {
      console.log("Filtering in progress, skipping fetchDataWithCurrentFilters");
      return;
    }
    
    try {
      console.log("Mevcut filtrelerle veri yükleniyor...");
      console.log("Şu anki sayfa indeksi:", pageIndex);
      console.log("Şu anki sayfa boyutu:", pageSize);
      
      // Only show loading indicator if we don't have cached data
      const urlParams = new URLSearchParams(location.search);
      const cacheKey = `${pageIndex}-${pageSize}-${urlParams.toString()}`;
      
      const cachedData = dataCache[cacheKey];
      if (!cachedData) {
        // If we're not showing skeleton content, show the loading indicator
      setLoading(true);
      }
      
      setError(null);
      
      // API çağrısı için parametreleri hazırla - Server-side pagination için mevcut pageIndex ve pageSize kullan
      const apiParams: GetTransactionsDTO = {
        pageSize: pageSize,
        pageIndex: pageIndex,
        text: urlParams.get('searchText') || "",
        orderBy,
        orderDirection: orderDirection.toUpperCase() as "ASC" | "DESC", // API ASC ve DESC bekliyor
        statusIds: urlParams.get('status') ? urlParams.get('status')?.split(',') : null,
        typeIds: urlParams.get('typeIds') ? urlParams.get('typeIds')?.split(',') : null,
        assignedUserIds: urlParams.get('assignedUserIds') ? urlParams.get('assignedUserIds')?.split(',') : null,
        createdAtStart: urlParams.get('createdAtStart') || null,
        createdAtEnd: urlParams.get('createdAtEnd') || null,
        productIds: urlParams.get('productIds') ? urlParams.get('productIds')?.split(',') : null,
        cityIds: urlParams.get('cityIds') ? urlParams.get('cityIds')?.split(',') : null,
        channelIds: urlParams.get('channelIds') ? urlParams.get('channelIds')?.split(',') : null,
        countryId: urlParams.get('countryId') || null,
      };
      
      // Tutar aralığı parametrelerini URL'den al
      const minAmountParam = urlParams.get('minAmount');
      const maxAmountParam = urlParams.get('maxAmount');
      const minAmount = minAmountParam ? parseFloat(minAmountParam) : null;
      const maxAmount = maxAmountParam ? parseFloat(maxAmountParam) : null;
      
      console.log("API parametreleri:", JSON.stringify(apiParams, null, 2));
      
      // Sadece mevcut sayfa için veri getir
      const result = await fetchTransactionData(apiParams);
      
      if (result) {
        // Verileri işle
        let formattedTransactions = result.items.map((item: any) => ({
          ...item,
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        
        // İstemci tarafında tutar filtresi uygula
        if (minAmount !== null || maxAmount !== null) {
          console.log("Tutar aralığı filtreleniyor:", minAmount, "-", maxAmount);
          formattedTransactions = formattedTransactions.filter(transaction => {
            const amount = parseFloat(transaction.amount?.toString() || "0");
            
            if (minAmount !== null && amount < minAmount) return false;
            if (maxAmount !== null && amount > maxAmount) return false;
            
            return true;
          });
          
          console.log("Tutar filtresi sonrası kalan işlemler:", formattedTransactions.length);
        }
        
        // Update cache with the new data
        setDataCache(prevCache => ({
          ...prevCache,
          [cacheKey]: {
            transactions: formattedTransactions,
            itemCount: result.itemCount,
            pageCount: result.pageCount
          }
        }));
        
        // State'leri güncelle
        setFilteredTransactions(formattedTransactions);
        setAllTransactions(formattedTransactions);
        
        // API'den gelen toplam sayfa ve öğe sayısını kullan
        setItemCount(result.itemCount);
        setPageCount(result.pageCount);
        
        console.log(`Sayfalama: Toplam ${result.itemCount} işlem, Sayfa ${pageIndex + 1}/${result.pageCount}`);
      } else {
        // Sonuç bulunamadı
        setAllTransactions([]);
        setFilteredTransactions([]);
        setItemCount(0);
        setPageCount(0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Veri getirme hatası:", error);
      setError("Veriler yüklenirken bir hata oluştu.");
      setLoading(false);
    }
  };
  
  // Define fetchInitialData function
  const fetchInitialData = async () => {
    // Skip if filtering is in progress to avoid duplicate calls
    if (isFilteringInProgress) {
      console.log("Filtering in progress, skipping fetchInitialData");
      return;
    }
    
    try {
      console.log("Başlangıç verileri yükleniyor...");
      setLoading(true);
      setError(null);
      
      // URL parametrelerini al
      const urlParams = new URLSearchParams(location.search);
      
      // URL'den sayfa bilgilerini al
      const pageIndexParam = urlParams.get('pageIndex');
      const pageSizeParam = urlParams.get('pageSize');
      
      const currentPageIndex = pageIndexParam ? parseInt(pageIndexParam) : 0;
      const currentPageSize = pageSizeParam ? parseInt(pageSizeParam) : pageSize;
      
      // State'leri güncelle
      setPageIndex(currentPageIndex);
      setPageSize(currentPageSize);
      
      // API çağrısı için parametreleri hazırla - Server-side pagination için
      const apiParams: GetTransactionsDTO = {
        pageSize: currentPageSize,
        pageIndex: currentPageIndex,
        text: urlParams.get('searchText') || "",
        orderBy: urlParams.get('orderBy') || orderBy,
        orderDirection: (urlParams.get('orderDirection') || orderDirection).toUpperCase() as "ASC" | "DESC",
        statusIds: urlParams.get('status') ? urlParams.get('status')?.split(',') : null,
        typeIds: urlParams.get('typeIds') ? urlParams.get('typeIds')?.split(',') : null,
        assignedUserIds: urlParams.get('assignedUserIds') ? urlParams.get('assignedUserIds')?.split(',') : null,
        createdAtStart: urlParams.get('createdAtStart') || null,
        createdAtEnd: urlParams.get('createdAtEnd') || null,
        productIds: urlParams.get('productIds') ? urlParams.get('productIds')?.split(',') : null,
        cityIds: urlParams.get('cityIds') ? urlParams.get('cityIds')?.split(',') : null,
        channelIds: urlParams.get('channelIds') ? urlParams.get('channelIds')?.split(',') : null,
        countryId: urlParams.get('countryId') || null,
      };
      
      // Tutar aralığı parametrelerini URL'den al
      const minAmountParam = urlParams.get('minAmount');
      const maxAmountParam = urlParams.get('maxAmount');
      const minAmount = minAmountParam ? parseFloat(minAmountParam) : null;
      const maxAmount = maxAmountParam ? parseFloat(maxAmountParam) : null;
      
      console.log("API parametreleri:", JSON.stringify(apiParams, null, 2));
      console.log("Mevcut sayfalama: Sayfa", currentPageIndex, "Boyut", currentPageSize);
      
      // API çağrısı yap
      const result = await fetchTransactionData(apiParams);
      
      if (result) {
        // Verileri işle
        let formattedTransactions = result.items.map((item: any) => ({
          ...item,
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        
        // İstemci tarafında tutar filtresi uygula
        if (minAmount !== null || maxAmount !== null) {
          console.log("Tutar aralığı filtreleniyor:", minAmount, "-", maxAmount);
          formattedTransactions = formattedTransactions.filter(transaction => {
            const amount = parseFloat(transaction.amount?.toString() || "0");
            
            if (minAmount !== null && amount < minAmount) return false;
            if (maxAmount !== null && amount > maxAmount) return false;
            
            return true;
          });
          
          console.log("Tutar filtresi sonrası kalan işlemler:", formattedTransactions.length);
        }
        
        // Verileri state'e kaydet
        setFilteredTransactions(formattedTransactions);
        setAllTransactions(formattedTransactions);
        
        // API'den gelen toplam sayfa ve öğe sayısını kullan
        setItemCount(result.itemCount);
        setPageCount(result.pageCount);
        
        console.log(`Sayfalama: Toplam ${result.itemCount} işlem, Sayfa ${currentPageIndex + 1}/${result.pageCount}`);
      } else {
        // Sonuç bulunamadı
        setAllTransactions([]);
        setFilteredTransactions([]);
        setItemCount(0);
        setPageCount(0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Veri getirme hatası:", error);
      setError("Veriler yüklenirken bir hata oluştu.");
      setLoading(false);
    }
  };

  // updateUrlParams fonksiyonuna yeni parametre eklenmesi gerek, fakat çağrılar güncellenmemiş gibi görünüyor
  // Bu fonksiyonun çağrılarını kontrol edelim ve düzeltelim
  
  const updateUrlParams = (
    searchText?: string,
    status?: string[] | null,
    createdAtStart?: string | null,
    createdAtEnd?: string | null,
    typeIds?: string[] | null,
    assignedUserIds?: string[] | null,
    productIds?: string[] | null,
    cityIds?: string[] | null,
    channelIds?: string[] | null,
    countryId?: string | null,
    pageIndex?: number,
    pageSize?: number,
    minAmount?: number | null,
    maxAmount?: number | null
  ) => {
    // Create a new URLSearchParams object
    const searchParams = new URLSearchParams();
    
    // Arama parametrelerini URL'e ekle
    if (searchText) searchParams.set('searchText', searchText);
    
    // Status parametrelerini URL'e ekle
    if (status && status.length > 0) {
      searchParams.set('status', status.join(','));
    }
    
    // Tarih aralığı parametrelerini URL'e ekle
    if (createdAtStart) searchParams.set('createdAtStart', createdAtStart);
    if (createdAtEnd) searchParams.set('createdAtEnd', createdAtEnd);
    
    // İşlem tipleri, atanan kullanıcılar, ürünler, şehirler, kanallar ve ülke parametrelerini URL'e ekle
    if (typeIds && typeIds.length > 0) searchParams.set('typeIds', typeIds.join(','));
    if (assignedUserIds && assignedUserIds.length > 0) searchParams.set('assignedUserIds', assignedUserIds.join(','));
    if (productIds && productIds.length > 0) searchParams.set('productIds', productIds.join(','));
    if (cityIds && cityIds.length > 0) searchParams.set('cityIds', cityIds.join(','));
    if (channelIds && channelIds.length > 0) searchParams.set('channelIds', channelIds.join(','));
    if (countryId) searchParams.set('countryId', countryId);
    
    // Sayfalama parametrelerini URL'e ekle
    if (pageIndex !== undefined) searchParams.set('pageIndex', pageIndex.toString());
    if (pageSize) searchParams.set('pageSize', pageSize.toString());
    
    // Tutar aralığı parametrelerini URL'e ekle
    if (minAmount !== undefined && minAmount !== null) searchParams.set('minAmount', minAmount.toString());
    if (maxAmount !== undefined && maxAmount !== null) searchParams.set('maxAmount', maxAmount.toString());
    
    // Log URL parameters
    console.log("URL parametreleri (updateUrlParams):", searchParams.toString());
    
    // URL'i güncelle, geçmiş girişini değiştirmek yerine bir sonraki girişi ekle
    navigate({
      pathname: location.pathname,
      search: `?${searchParams.toString()}`
    }, { replace: true });
  };

  // Add handleSort function
  const handleSort = (key: string) => {
    // Special case for products column - handle client-side
    if (key === "products") {
      console.log("Applying client-side sorting for products column");
    setSortConfig(prevConfig => {
        const newDirection = prevConfig?.key === key 
          ? (prevConfig.direction === "asc" ? "desc" : "asc") 
          : "asc";
        
        // Sort the transactions array based on products
        const sortedTransactions = [...filteredTransactions].sort((a, b) => {
          const productsA = a.transactionProducts || [];
          const productsB = b.transactionProducts || [];
          
          const productNamesA = productsA.map((p: any) => p.product?.name || "").join(", ");
          const productNamesB = productsB.map((p: any) => p.product?.name || "").join(", ");
          
          if (newDirection === "asc") {
            return productNamesA.localeCompare(productNamesB);
          } else {
            return productNamesB.localeCompare(productNamesA);
          }
        });
        
        // Update state with sorted transactions
        setFilteredTransactions(sortedTransactions);
        
        return {
          key,
          direction: newDirection
        };
      });
      return;
    }
    
    // For all other columns, use server-side sorting
    // Map display column keys to API field names
    const apiFieldMap: Record<string, string> = {
      "date": "createdAt",
      "account.name": "account",
      "type.name": "type",
      "status.name": "status",
      "assignedUser.fullName": "assignedUser",
      "amount": "amount",
    };

    // Get the correct API field name for sorting
    const apiField = apiFieldMap[key] || key;

    setSortConfig(prevConfig => {
      const newDirection = prevConfig?.key === key 
        ? (prevConfig.direction === "asc" ? "desc" : "asc") 
        : "asc";
      
      // Update orderBy and orderDirection states with the API field name
      setOrderBy(apiField);
      setOrderDirection(newDirection.toUpperCase() as "ASC" | "DESC");
      
      // Update URL parameters
      const urlParams = new URLSearchParams(location.search);
      urlParams.set('orderBy', apiField);
      urlParams.set('orderDirection', newDirection);
      
      // Update URL without page refresh
      navigate({
        pathname: location.pathname,
        search: urlParams.toString()
      }, { replace: true });
      
      // Fetch data with new sorting
      setLoading(true);
      
      // Create API parameters with the new sort settings
      const apiParams: GetTransactionsDTO = {
        pageSize: pageSize,
        pageIndex: pageIndex,
        text: urlParams.get('searchText') || "",
        orderBy: apiField,
        orderDirection: newDirection.toUpperCase() as "ASC" | "DESC",
        statusIds: urlParams.get('status') ? urlParams.get('status')?.split(',') : null,
        typeIds: urlParams.get('typeIds') ? urlParams.get('typeIds')?.split(',') : null,
        assignedUserIds: urlParams.get('assignedUserIds') ? urlParams.get('assignedUserIds')?.split(',') : null,
        createdAtStart: urlParams.get('createdAtStart') || null,
        createdAtEnd: urlParams.get('createdAtEnd') || null,
        productIds: urlParams.get('productIds') ? urlParams.get('productIds')?.split(',') : null,
        cityIds: urlParams.get('cityIds') ? urlParams.get('cityIds')?.split(',') : null,
        channelIds: urlParams.get('channelIds') ? urlParams.get('channelIds')?.split(',') : null,
        countryId: urlParams.get('countryId') || null,
      };
      
      console.log("Sıralama değişimi API parametreleri:", JSON.stringify(apiParams, null, 2));
      console.log("Sıralama alanı dönüşümü:", key, "->", apiField);
      
      // Fetch data with new sort parameters
      fetchTransactionData(apiParams)
        .then(result => {
          if (result) {
            // Process the data
            const formattedTransactions = result.items.map((item: any) => ({
              ...item,
              date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
            }));
            
            // Update states
            setFilteredTransactions(formattedTransactions);
            setAllTransactions(formattedTransactions);
            setItemCount(result.itemCount);
            setPageCount(result.pageCount);
            console.log(`Sıralama değişimi sonrası: Toplam ${result.itemCount} işlem, Sayfa ${pageIndex + 1}/${result.pageCount}`);
          } else {
            // No results
            setAllTransactions([]);
            setFilteredTransactions([]);
            setItemCount(0);
            setPageCount(0);
          }
          setLoading(false);
        })
        .catch(error => {
          console.error("Sıralama değişimi veri getirme hatası:", error);
          setError("Veriler yüklenirken bir hata oluştu.");
          setLoading(false);
        });
      
      return {
        key,
        direction: newDirection
      };
    });
  };
  
  // Add page change handlers
  const handlePageChange = (page: number) => {
    console.log(`Sayfa değişimi: ${pageIndex} -> ${page}`);
    
    // URL parametrelerini güncelle
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('pageIndex', page.toString());
    
    // URL'yi güncelle
    navigate({
      pathname: location.pathname,
      search: urlParams.toString()
    }, { replace: true });
    
    // Sayfa indeksini güncelle ve ardından veri çekme işlemini yap
    // İki kez tıklama sorununu önlemek için önce state'i güncelle, sonra veri çek
    setPageIndex(page);
    
    // Sayfa değişimi sırasında eski veri gösterilmesin
    setLoading(true);
    
    // Doğrudan API çağrısı yap, setTimeout kullanma
    // pageIndex yerine doğrudan page değerini kullan
    const apiParams: GetTransactionsDTO = {
      pageSize: pageSize,
      pageIndex: page, // State güncellemesini beklemeden doğrudan gelen değeri kullan
      text: urlParams.get('searchText') || "",
      orderBy,
      orderDirection: orderDirection.toUpperCase() as "ASC" | "DESC",
      statusIds: urlParams.get('statusIds') ? urlParams.get('statusIds')?.split(',') : null,
      typeIds: urlParams.get('typeIds') ? urlParams.get('typeIds')?.split(',') : null,
      assignedUserIds: urlParams.get('assignedUserIds') ? urlParams.get('assignedUserIds')?.split(',') : null,
      createdAtStart: urlParams.get('createdAtStart') || null,
      createdAtEnd: urlParams.get('createdAtEnd') || null,
      productIds: urlParams.get('productIds') ? urlParams.get('productIds')?.split(',') : null,
      cityIds: urlParams.get('cityIds') ? urlParams.get('cityIds')?.split(',') : null,
      channelIds: urlParams.get('channelIds') ? urlParams.get('channelIds')?.split(',') : null,
      countryId: urlParams.get('countryId') || null,
    };
    
    console.log("Sayfa Değişimi API parametreleri:", JSON.stringify(apiParams, null, 2));
    
    // Direkt olarak API çağrısı yap
    fetchTransactionData(apiParams)
      .then(result => {
        if (result) {
          // Verileri işle
          const formattedTransactions = result.items.map((item: any) => ({
            ...item,
            date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
          }));
          
          // State'leri güncelle
          setFilteredTransactions(formattedTransactions);
          setAllTransactions(formattedTransactions);
          setItemCount(result.itemCount);
          setPageCount(result.pageCount);
          console.log(`Sayfalama: Toplam ${result.itemCount} işlem, Sayfa ${page + 1}/${result.pageCount}`);
        } else {
          // Sonuç bulunamadı
          setAllTransactions([]);
          setFilteredTransactions([]);
          setItemCount(0);
          setPageCount(0);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Sayfa değişimi veri getirme hatası:", error);
        setError("Veriler yüklenirken bir hata oluştu.");
        setLoading(false);
      });
  };
  
  const handlePageSizeChange = (size: number) => {
    console.log(`Sayfa boyutu değişimi: ${pageSize} -> ${size}`);
    
    // URL parametrelerini güncelle
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('pageSize', size.toString());
    urlParams.set('pageIndex', '0'); // Sayfa boyutu değiştiğinde ilk sayfaya dön
    
    // URL'yi güncelle
    navigate({
      pathname: location.pathname,
      search: urlParams.toString()
    }, { replace: true });
    
    // State'leri güncelle
    setPageSize(size);
    setPageIndex(0);
    
    // Sayfa değişimi sırasında eski veri gösterilmesin
    setLoading(true);
    
    // Doğrudan API çağrısı yap
    const apiParams: GetTransactionsDTO = {
      pageSize: size, // State güncellemesini beklemeden doğrudan gelen değeri kullan
      pageIndex: 0,
      text: urlParams.get('searchText') || "",
      orderBy,
      orderDirection: orderDirection.toUpperCase() as "ASC" | "DESC",
      statusIds: urlParams.get('statusIds') ? urlParams.get('statusIds')?.split(',') : null,
      typeIds: urlParams.get('typeIds') ? urlParams.get('typeIds')?.split(',') : null,
      assignedUserIds: urlParams.get('assignedUserIds') ? urlParams.get('assignedUserIds')?.split(',') : null,
      createdAtStart: urlParams.get('createdAtStart') || null,
      createdAtEnd: urlParams.get('createdAtEnd') || null,
      productIds: urlParams.get('productIds') ? urlParams.get('productIds')?.split(',') : null,
      cityIds: urlParams.get('cityIds') ? urlParams.get('cityIds')?.split(',') : null,
      channelIds: urlParams.get('channelIds') ? urlParams.get('channelIds')?.split(',') : null,
      countryId: urlParams.get('countryId') || null,
    };
    
    console.log("Sayfa Boyutu Değişimi API parametreleri:", JSON.stringify(apiParams, null, 2));
    
    // Direkt olarak API çağrısı yap
    fetchTransactionData(apiParams)
      .then(result => {
        if (result) {
          // Verileri işle
          const formattedTransactions = result.items.map((item: any) => ({
            ...item,
            date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
          }));
          
          // State'leri güncelle
          setFilteredTransactions(formattedTransactions);
          setAllTransactions(formattedTransactions);
          setItemCount(result.itemCount);
          setPageCount(result.pageCount);
          console.log(`Sayfalama: Toplam ${result.itemCount} işlem, Sayfa 1/${result.pageCount}`);
        } else {
          // Sonuç bulunamadı
          setAllTransactions([]);
          setFilteredTransactions([]);
          setItemCount(0);
          setPageCount(0);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Sayfa boyutu değişimi veri getirme hatası:", error);
        setError("Veriler yüklenirken bir hata oluştu.");
        setLoading(false);
      });
  };
  
  // First, update the validation schema to include the products field
  const validationSchema = Yup.object({
    // We're not validating fields on the frontend anymore
    // All validation will be handled by the backend
  });

  // ... existing code ...

  // Add a utility function to safely update Formik values
  const safelyUpdateFormField = (fieldName: string, value: any) => {
    // Create a copy of current values
    const currentValues = { ...validation.values };
    
    // Update only the specified field
    validation.setFieldValue(fieldName, value);
    
    // Log the update to verify values are preserved
    console.log(`Updated ${fieldName} to ${value}. Form values:`, validation.values);
  };

  // Update the validation initial values to include products
  const validation = useFormik({
    // Be more careful with reinitialization to prevent losing form values
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
      // Add products field
      products: transaction?.transactionProducts?.map((p: any) => ({
        value: p.product.id,
        label: p.product.name
      })) || [],
      date: transaction && transaction.createdAt ? moment(transaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
      transactionDate: transaction && transaction.transactionDate ? moment(transaction.transactionDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      transactionProducts: (transaction && transaction.transactionProducts) || [] as TransactionProductInput[],
      country: (transaction && transaction.country) || "",
      city: (transaction && transaction.city) || "",
      district: (transaction && transaction.district) || "",
      neighborhood: (transaction && transaction.neighborhood) || "",
      address: (transaction && transaction.address) || "",
      postalCode: (transaction && transaction.postalCode) || "",
      successDate: (transaction && transaction.successDate) || moment().format("YYYY-MM-DD HH:mm"),
      successNote: (transaction && transaction.successNote) || "",
      transactionNote: (transaction && transaction.transactionNote) || "",
      cancelDate: (transaction && transaction.cancelDate) || moment().format("YYYY-MM-DD HH:mm"),
      cancelNote: (transaction && transaction.cancelNote) || ""
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      if (isEdit) {
        try {
          // Get transaction ID
          const transactionId = values.id;
          
          // Create the input object for update
          const input: any = {
            id: transactionId,
            amount: Number(values.amount),
            no: nullIfEmpty(values.no),
            note: nullIfEmpty(values.note),
            typeId: nullIfEmpty(values.typeId),
            statusId: nullIfEmpty(values.statusId),
            accountId: nullIfEmpty(values.accountId),
            assignedUserId: nullIfEmpty(values.assignedUserId),
            channelId: nullIfEmpty(values.channelId),
            transactionDate: nullIfEmpty(values.transactionDate),
            // Coğrafi alan adlarını hata mesajlarından alıyoruz
            ...(values.country ? { countryId: values.country } : {}),
            ...(values.city ? { cityId: values.city } : {}),
            ...(values.district ? { countyId: values.district } : {}), // district -> countyId olarak değişti
            address: nullIfEmpty(values.address),
            postalCode: nullIfEmpty(values.postalCode),
            successDate: nullIfEmpty(values.successDate),
            successNote: nullIfEmpty(values.successNote),
            cancelDate: nullIfEmpty(values.cancelDate),
            cancelNote: nullIfEmpty(values.cancelNote)
          };
          
          // Add products to the input if selected
          if (values.products && values.products.length > 0) {
            input.transactionProducts = values.products.map((product: any) => ({
              productId: product.value,
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0
            }));
          }
          
          console.log("Update transaction input:", input);
          
          // Call the update mutation
          updateTransaction({
            variables: { input },
            context: getFreshAuthContext()
          });
        } catch (error: any) {
          console.error("Error updating transaction:", error);
        }
      } else {
        try {
          // Log values before sending
          console.log("Creating transaction with values:", values);
          
          // Create transaction input for new transaction
          const input: any = {
            amount: Number(values.amount) || 0,
            no: nullIfEmpty(values.no),
            note: nullIfEmpty(values.note),
            typeId: nullIfEmpty(values.typeId),
            statusId: nullIfEmpty(values.statusId),
            accountId: nullIfEmpty(values.accountId),
            assignedUserId: nullIfEmpty(values.assignedUserId),
            channelId: nullIfEmpty(values.channelId),
            transactionDate: nullIfEmpty(values.transactionDate) || moment().format("YYYY-MM-DD"),
            // Coğrafi alan adlarını doğru hiyerarşi ile düzenliyoruz
            ...(values.country ? { countryId: values.country } : {}),
            ...(values.city ? { cityId: values.city } : {}),
            ...(values.district ? { countyId: values.district } : {}), // district -> countyId olarak değişti
            address: nullIfEmpty(values.address),
            postalCode: nullIfEmpty(values.postalCode),
            successDate: nullIfEmpty(values.successDate),
            successNote: nullIfEmpty(values.successNote),
            cancelDate: nullIfEmpty(values.cancelDate),
            cancelNote: nullIfEmpty(values.cancelNote)
          };
          
          // Add products to the input if selected
          if (values.products && values.products.length > 0) {
            input.products = values.products.map((product: any) => ({
              productId: product.value,
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0
            }));
          }
          
          console.log("Create transaction input:", JSON.stringify(input, null, 2));
          
          // Call create mutation
          createTransaction({
            variables: { input },
            context: getFreshAuthContext()
          });
        } catch (error: any) {
          console.error("Error creating transaction:", error);
        }
      }
    }
  });

  // Create debounced handlers for form inputs to prevent excessive token requests
  const debouncedHandleChange = createDebouncedFormikHandlers(validation.handleChange, 500);
  
  // Function to replace standard Formik handlers with debounced versions
  const getFormikFieldProps = (fieldName: string) => {
    const originalProps = validation.getFieldProps(fieldName);
    return {
      ...originalProps,
      onChange: debouncedHandleChange
    };
  };

  // ... existing code ...

  // Add queries for countries and cities
  const { loading: countriesLoading } = useQuery(GET_COUNTRIES, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getCountries) {
        const options = data.getCountries.map((country: any) => ({ value: country.id, label: country.name }));
        setCountryOptions(options);
        console.log("Country options loaded:", options);
      } else {
        console.warn("No countries returned from API");
        setCountryOptions([]);
      }
    },
    onError: (error) => {
      console.error("Error fetching countries:", error);
      toast.error("Ülke listesi yüklenirken hata oluştu");
      setCountryOptions([]);
    }
  });
  
  // Use lazy query for cities since we need to pass countryId
  const [getCities, { loading: citiesLoading }] = useLazyQuery(GET_CITIES, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getCities) {
        const options = data.getCities.map((city: any) => ({ value: city.id, label: city.name }));
        setCityOptions(options);
        console.log("City options loaded:", options);
      } else {
        console.warn("No cities returned from API for selected country");
        setCityOptions([]);
      }
    },
    onError: (error) => {
      console.error("Error fetching cities:", error);
      toast.error("Şehir listesi yüklenirken hata oluştu");
      setCityOptions([]);
    }
  });
  
  // Use lazy query for counties since we need to pass cityId
  const [getCounties, { loading: countiesLoading }] = useLazyQuery(GET_COUNTIES, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getCounties) {
        const options = data.getCounties.map((county: any) => ({ value: county.id, label: county.name }));
        setCountyOptions(options);
        console.log("County options loaded:", options);
      } else {
        console.warn("No counties returned from API for selected city");
        setCountyOptions([]);
      }
    },
    onError: (error: any) => {
      console.error("Error fetching counties:", error);
      toast.error("İlçe listesi yüklenirken hata oluştu");
      setCountyOptions([]);
    }
  });
  
  // Use lazy query for districts since we need to pass countyId
  const [getDistricts, { loading: districtsLoading }] = useLazyQuery(GET_DISTRICTS, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getDistricts) {
        const options = data.getDistricts.map((district: any) => ({ value: district.id, label: district.name }));
        setDistrictOptions(options);
        console.log("District options loaded:", options);
          } else {
        console.warn("No districts returned from API for selected county");
        setDistrictOptions([]);
      }
    },
    onError: (error: any) => {
      console.error("Error fetching districts:", error);
      toast.error("Mahalle listesi yüklenirken hata oluştu");
      setDistrictOptions([]);
    }
  });
  
  // Use Apollo hooks for queries and mutations
  const { loading: rolesLoading } = useQuery(GET_TRANSACTION_TYPES, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getTransactionTypesLookup) {
        setRoleOptions(data.getTransactionTypesLookup.map((role: any) => ({ value: role.id, label: role.name })));
      }
    },
    onError: (error) => {
      console.error("Error fetching roles:", error);
    }
  });

  const { loading: typesLoading } = useQuery(GET_TRANSACTION_TYPES, {
    context: getStaticAuthContext(),
    fetchPolicy: "cache-first", // Use cache when possible
    onCompleted: (data) => {
      if (data && data.getTransactionTypesLookup) {
        setTypeOptions(data.getTransactionTypesLookup.map((type: any) => ({ value: type.id, label: type.name })));
      }
    },
    onError: (error) => {
      console.error("Error fetching transaction types:", error);
    }
  });

  const { loading: statusesLoading } = useQuery(GET_TRANSACTION_STATUSES, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getTransactionStatusesLookup) {
        const options = data.getTransactionStatusesLookup.map((status: any) => ({ value: status.id, label: status.name }));
        setStatusOptions(options);
        console.log("Status options loaded:", options);
      }
    },
    onError: (error) => {
      console.error("Error fetching transaction statuses:", error);
    }
  });

  // Add function to load channels
  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data } = await client.query({
        query: GET_CHANNELS_LOOKUP,
    context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getChannelsLookup) {
        const options = data.getChannelsLookup.map((channel: any) => ({ 
          value: channel.id, 
          label: channel.name 
        }));
        setChannelOptions(options);
        console.log("Channel options loaded:", options);
      }
    } catch (error) {
      console.error("Error loading channels:", error);
      toast.error("Kanal listesi yüklenirken hata oluştu");
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Load channels when the form opens
  useEffect(() => {
    if (modal && !isEdit) {
      setIsLoadingChannels(true);
      client.query({
        query: GET_CHANNELS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data?.getChannelsLookup) {
          const channelOpts = data.getChannelsLookup.map((channel: any) => ({
            value: channel.id,
            label: channel.name
          }));
          setChannelOptions(channelOpts);
          console.log("Channels loaded for new transaction:", channelOpts);
        }
      }).catch(error => {
        console.error("Failed to load channels:", error);
        toast.error("Kanal listesi yüklenemedi");
      }).finally(() => {
        setIsLoadingChannels(false);
      });
    }
  }, [modal, isEdit]);

  // Initialize with sample account options directly
  useEffect(() => {
    // Try to fetch real accounts first - don't set sample accounts yet
    console.log("Initial load - attempting to fetch real accounts");
    // Removing unnecessary fetchAccounts call - only needed when adding/editing transactions
  }, []);

  // Function to fetch accounts with different fallback approaches
  const fetchAccounts = async () => {
    try {
      console.log("Fetching accounts - starting API call");
      console.log("Using API URL:", process.env.REACT_APP_API_URL);
      
      // Create a new Apollo client for a direct API call
      const directClient = new ApolloClient({
        link: authLink.concat(httpLink),
        cache: new InMemoryCache()
      });
      
      // Log request details for debugging
      console.log("Sending GET_ACCOUNTS_LOOKUP query with parameters:", {
        pageSize: 100,
        pageIndex: 0
      });
      
      // Try using the query with only pageSize and pageIndex parameters
      const result = await directClient.query({
        query: GET_ACCOUNTS_LOOKUP,
        variables: { 
          input: { 
            pageSize: 100,
            pageIndex: 0
          } 
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only" // Ensure we get fresh data from the server
      });
      
      // Process the result
      if (result.data && result.data.getAccounts && result.data.getAccounts.items) {
        const accounts = result.data.getAccounts.items;
        if (accounts.length > 0) {
          const options = accounts.map((account: any) => ({
            value: account.id,
            label: account.name
          }));
          setAccountOptions(options);
          console.log(`Accounts loaded successfully: ${options.length} accounts found`);
          return options; // Return options for further use
        } else {
          console.warn("API returned empty accounts list");
          toast.warning("Hesap listesi boş. API'den veri alınamadı.");
          
          // Don't use sample accounts, just return an empty array
          const emptyAccounts: SelectOption[] = [];
          setAccountOptions(emptyAccounts);
          console.warn("Using empty account list - no accounts available from API");
          return emptyAccounts;
        }
      } else {
        // API response structure issue
        console.error("Invalid API response structure:", result.data);
        toast.error("API yanıtı geçersiz format içeriyor.");
        throw new Error("Invalid API response structure");
      }
    } catch (error: any) { // Type assertion to 'any' to access Apollo error properties
      console.error("Error in manual accounts fetch:", error);
      
      // Provide detailed error information
      if (error.graphQLErrors) {
        console.error("GraphQL errors:", JSON.stringify(error.graphQLErrors, null, 2));
      }
      if (error.networkError) {
        console.error("Network error:", JSON.stringify(error.networkError, null, 2));
      }
      
      // Don't use sample accounts, just return an empty array
      const emptyAccounts: SelectOption[] = [];
      setAccountOptions(emptyAccounts);
      console.error("API error occurred. Using empty account list.");
      toast.error("API bağlantı hatası. Hesap listesi boş.");
      
      // Re-throw for caller to handle
      throw error;
    }
  };

  const handleClose = () => {
    // Reset form state
    validation.resetForm();
    setIsEdit(false);
    setIsDetail(false);
    
    // Check if we're in edit mode from URL
    const match = location.pathname.match(/\/transactions\/edit\/([^/]+)/);
    if (match && match[1]) {
      // We came from edit route, navigate back to detail page
      const transactionId = match[1];
      navigate(`/transactions/detail/${transactionId}`);
    } else {
      // Normal closing behavior
    setTransaction(null);
    setModal(false);
    }
  };

  const toggle = useCallback(() => {
    if (modal) {
      // Modal kapanırken durumu sıfırlayalım
      handleClose();
    } else {
      // Önceki durumları koruyarak modalı açıyoruz
      setModal(true);
    }
  }, [modal]);

  const handleTransactionClick = useCallback(
    async (selectedTransaction: any) => {
      try {
        setLoading(true);
      setIsDetail(false);
      setIsEdit(true);
        
        console.log("Fetching complete transaction data for editing, ID:", selectedTransaction.id);
        
        // Önce önbellekte transaction var mı kontrol et
        const cachedData = client.readQuery({
          query: GET_TRANSACTION,
          variables: { id: selectedTransaction.id }
        });
        
        let completeTransaction;
        
        if (cachedData && cachedData.getTransaction) {
          // Önbellekte veri varsa, API çağrısı yapma
          console.log("Using cached transaction data");
          completeTransaction = cachedData.getTransaction;
        } else {
          // Get complete transaction data from API instead of using the list data
          const { data } = await client.query({
            query: GET_TRANSACTION,
            variables: { id: selectedTransaction.id },
            fetchPolicy: "no-cache", // Önbelleği kullanma, her zaman ağdan taze veri al
            context: getAuthorizationLink()
          });
          
          if (!data || !data.getTransaction) {
            toast.error("İşlem detayları alınamadı");
            setLoading(false);
            return;
          }
          
          // Use the complete transaction data from the API
          completeTransaction = data.getTransaction;
        }
        
        console.log("Complete transaction data:", completeTransaction);
        
        // Add explicit logging for geographic data
        console.log("Geographic data details:", {
          county: completeTransaction.county ? {id: completeTransaction.county.id, name: completeTransaction.county.name} : null,
          district: completeTransaction.district ? {id: completeTransaction.district.id, name: completeTransaction.district.name} : null
        });
        
        // Önbellekte hesap bilgileri var mı kontrol et
        if (accountOptions.length === 0) {
          console.log("Loading accounts for dropdown");
          await fetchAccounts();
        } else {
          console.log("Using existing account options:", accountOptions.length);
        }
        
        // Önbellekte kanal bilgileri var mı kontrol et
        if (channelOptions.length === 0) {
          console.log("Loading channels for dropdown");
          await loadChannels();
        } else {
          console.log("Using existing channel options:", channelOptions.length);
        }
        
        // Process transaction products to ensure valid values
        const processedProducts = completeTransaction.transactionProducts?.map((product: any) => {
          const quantity = Number(product.quantity) || 1;
          const unitPrice = Number(product.unitPrice) || 0;
          // Calculate totalPrice if it's null
          const totalPrice = product.totalPrice !== null ? Number(product.totalPrice) : quantity * unitPrice;
          
          return {
            ...product,
            quantity,
            unitPrice,
            totalPrice
          };
        }) || [];
        
        // Calculate total amount from products if needed
        const calculatedAmount = processedProducts.reduce((sum: number, product: any) => {
          return sum + (product.totalPrice || 0);
        }, 0);
        
        // Update the transaction with processed products
        const updatedTransaction = {
          ...completeTransaction,
          transactionProducts: processedProducts,
          // Use calculatedAmount if original amount is 0 or null
          amount: completeTransaction.amount || calculatedAmount
        };
        
        // Set current transaction with complete data
        setTransaction(updatedTransaction);
        
        // Create a complete form value object with all fields
        const formValues = {
          id: updatedTransaction.id || "",
          amount: updatedTransaction.amount || 0,
          no: updatedTransaction.no || "",
          note: updatedTransaction.note || "",
          typeId: updatedTransaction.type?.id || "",
          statusId: updatedTransaction.status?.id || "",
          accountId: updatedTransaction.account?.id || "",
          assignedUserId: updatedTransaction.assignedUser?.id || "",
          channelId: updatedTransaction.channel?.id || "",
          products: updatedTransaction.transactionProducts?.map((p: any) => ({
          value: p.product.id,
          label: p.product.name
        })) || [],
          date: updatedTransaction.createdAt ? moment(updatedTransaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
          transactionDate: updatedTransaction.transactionDate ? moment(updatedTransaction.transactionDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
          transactionProducts: updatedTransaction.transactionProducts || [],
          // Geographic fields - use empty string for null values
          country: updatedTransaction.country?.id || "",
          city: updatedTransaction.city?.id || "",
          district: updatedTransaction.county?.id || "",
          // Handle null district gracefully
          neighborhood: updatedTransaction.district?.id || "",
          address: updatedTransaction.address || "",
          postalCode: updatedTransaction.postalCode || "",
          successDate: updatedTransaction.successDate || moment().format("YYYY-MM-DD HH:mm"),
          successNote: updatedTransaction.successNote || "",
          transactionNote: updatedTransaction.note || "",
          cancelDate: updatedTransaction.cancelDate || moment().format("YYYY-MM-DD HH:mm"),
          cancelNote: updatedTransaction.cancelNote || ""
        };
        
        console.log("Form values being set:", {
          country: formValues.country,
          city: formValues.city,
          district: formValues.district,
          neighborhood: formValues.neighborhood,
          accountId: formValues.accountId,
          products: formValues.products
        });
        
        // Log the accountId to verify
        console.log("Setting account ID in form:", formValues.accountId);
        
        // Add this code to ensure account options include the account from the transaction
        if (updatedTransaction.account && updatedTransaction.account.id) {
          const accountId = updatedTransaction.account.id;
          const accountExists = accountOptions.some(option => option.value === accountId);
          
          if (!accountExists && updatedTransaction.account.name) {
            console.log(`Adding account ${accountId} to options`);
            // Add the account to the options if it's not already there
            setAccountOptions(prev => [
              ...prev,
              {
                value: accountId,
                label: updatedTransaction.account.name
              }
            ]);
          }
        }
        
        // Reset form completely and then set values to avoid partial updates
        validation.resetForm();
        validation.setValues(formValues);
        
        // Log form values again to ensure account was set
        console.log("Account ID in form after setting:", validation.values.accountId);
        
        // Now fix the function that loads location data in handleTransactionClick
        if (formValues.country) {
          try {
            // Önce önbellekte cities var mı kontrol et
            const cachedCities = client.readQuery({
              query: GET_CITIES,
              variables: { countryId: formValues.country }
            });
            
            if (!cachedCities || !cachedCities.getCities) {
              console.log(`Loading cities for country ID: ${formValues.country}`);
              const cityResult = await getCities({
                variables: {
                  countryId: formValues.country
                },
                fetchPolicy: "cache-first" // Önbellekten kontrol et, yoksa ağ isteği yap
              });
              
              console.log("Cities loaded successfully:", cityResult?.data?.getCities?.length || 0, "cities");
            } else {
              console.log("Using cached cities:", cachedCities.getCities.length);
            }
            
            if (formValues.city) {
              // Önce önbellekte counties var mı kontrol et
              const cachedCounties = client.readQuery({
                query: GET_COUNTIES,
                variables: { cityId: formValues.city }
              });
              
              if (!cachedCounties || !cachedCounties.getCounties) {
                console.log(`Loading counties for city ID: ${formValues.city}`);
                const countyResult = await getCounties({
                  variables: {
                    cityId: formValues.city
                  },
                  fetchPolicy: "cache-first" // Önbellekten kontrol et, yoksa ağ isteği yap
                });
                
                console.log("Counties loaded successfully:", countyResult?.data?.getCounties?.length || 0, "counties");
              } else {
                console.log("Using cached counties:", cachedCounties.getCounties.length);
              }
              
              if (formValues.district) {
                // Önce önbellekte districts var mı kontrol et
                const cachedDistricts = client.readQuery({
                  query: GET_DISTRICTS,
                  variables: { countyId: formValues.district }
                });
                
                if (!cachedDistricts || !cachedDistricts.getDistricts) {
                  console.log(`Loading districts for county ID: ${formValues.district}`);
                  const districtResult = await getDistricts({
                    variables: {
                      countyId: formValues.district
                    },
                    fetchPolicy: "cache-first" // Önbellekten kontrol et, yoksa ağ isteği yap
                  });
                  
                  console.log("Districts loaded successfully:", districtResult?.data?.getDistricts?.length || 0, "districts");
                } else {
                  console.log("Using cached districts:", cachedDistricts.getDistricts.length);
                }
              }
            }
          } catch (error) {
            console.error("Error loading location data:", error);
            // Continue even if location data loading fails
          }
        }
        
        // Open modal after setting up all form data
      setModal(true);
        setLoading(false);
      } catch (error) {
        console.error("Error setting up transaction form:", error);
        toast.error("İşlem detayları yüklenirken bir hata oluştu");
        setLoading(false);
      }
    },
    [fetchAccounts, loadChannels, getCities, getCounties, getDistricts, accountOptions, channelOptions, validation]
  );

  const handleDetailClick = useCallback(
    async (selectedTransaction: any) => {
      try {
        console.log("İşlem detayına gidiliyor:", selectedTransaction.id);
        
        // İşlem verilerini getTransactions sorgusu üzerinden al ve localStorage'a kaydet
        // Bu, detay sayfasının doğru veriyi göstermesini sağlar
        const result = await client.query({
          query: GET_TRANSACTION,
          variables: { id: selectedTransaction.id },
          context: getAuthorizationLink(),
          fetchPolicy: "network-only" // Her zaman taze veri al
        });
        
        if (result && result.data && result.data.getTransaction) {
          // İşlem detaylarını localStorage'a kaydet
          const transactionData = result.data.getTransaction;
          localStorage.setItem(`transaction_${selectedTransaction.id}`, JSON.stringify(transactionData));
          console.log("İşlem detayları localStorage'a kaydedildi:", transactionData);
        } else {
          console.warn("İşlem detayları alınamadı");
        }
        
        // Detay sayfasına yönlendir
        navigate(`/transactions/detail/${selectedTransaction.id}`);
      } catch (error) {
        console.error("İşlem detayları alınırken hata oluştu:", error);
        toast.error("İşlem detayları alınırken bir hata oluştu");
        // Yine de detay sayfasına yönlendir, sayfa kendi sorgusunu yapacak
        navigate(`/transactions/detail/${selectedTransaction.id}`);
      }
    },
    [navigate, client, getAuthorizationLink]
  );

  const handleDeleteConfirm = async () => {
    console.log("handleDeleteConfirm called");
    console.log("selectedRecordForDelete:", selectedRecordForDelete);
    
    if (selectedRecordForDelete && selectedRecordForDelete.id) {
      try {
        // İşlem ID'sinin tipini ve değerini kontrol et
        console.log("Silinen işlem ID (tip):", typeof selectedRecordForDelete.id);
        console.log("Silinen işlem ID (değer):", selectedRecordForDelete.id);

        // ID null veya undefined mi diye kontrol et
        if (selectedRecordForDelete.id === null || selectedRecordForDelete.id === undefined) {
          console.error("ID değeri null veya undefined!");
          toast.error("Geçersiz işlem ID'si.");
          setDeleteModal(false);
          setSelectedRecordForDelete(null);
          return;
        }

        // ID içeriğini kontrol edelim ve düzgün bir string'e çevirelim
        // Tip dönüşümü garantiye alalım - API'nin beklediği String! türüne uygun olmalı
        let idValue = String(selectedRecordForDelete.id).trim();
        
        if (!idValue) {
          console.error("ID değeri boş string olarak çevrildi!");
          toast.error("Geçersiz işlem ID'si.");
          setDeleteModal(false);
          setSelectedRecordForDelete(null);
          return;
        }
        
        console.log("Kullanılan final ID değeri:", idValue);
        console.log("DELETE_TRANSACTION mutation yapısı:", DELETE_TRANSACTION.loc?.source?.body);
        
        // Sunucuya gönderilecek tam payload'ı logla
        const deletePayload = { id: idValue };
        console.log("deleteTransaction payload:", JSON.stringify(deletePayload));
        
        // Mutation için saf string türünde ID kullanın
        console.log("Silme isteği gönderiliyor...");
        
        // Silme işlemini gerçekleştir
        const result = await deleteTransaction({
          variables: { 
            id: idValue 
          },
          context: {
            ...getAuthorizationLink(),
            headers: {
              ...getAuthorizationLink().headers,
              'Content-Type': 'application/json'
            }
          },
          fetchPolicy: "no-cache" 
        });
        
        console.log("Silme operasyonunun sonucu:", result);
        
        if (result && result.data && result.data.deleteTransaction) {
          toast.success("İşlem başarıyla silindi.");
          if (!isFilteringInProgress) {
          fetchInitialData();
          }
        } else {
          console.error("Silme işlemi başarısız - sonuç:", result);
          toast.error("İşlem silinirken bir hata oluştu.");
        }
      } catch (error: any) {
        console.error("Error deleting transaction:", error);
        
        if (error.graphQLErrors && error.graphQLErrors.length > 0) {
          console.error("GraphQL hatası (detaylı):", JSON.stringify(error.graphQLErrors, null, 2));
          error.graphQLErrors.forEach((err: any) => {
            toast.error(`Silme hatası: ${err.message}`);
          });
        } else if (error.networkError) {
          console.error("Ağ hatası (detaylı):", JSON.stringify(error.networkError, null, 2));
          if (error.networkError.result && error.networkError.result.errors) {
            error.networkError.result.errors.forEach((err: any) => {
              console.error("Sunucu hatası:", err.message);
              toast.error(`Silme hatası: ${err.message}`);
            });
          }
          toast.error("Sunucu bağlantı hatası. Lütfen ağ bağlantınızı kontrol edin.");
        } else {
          toast.error("İşlem silinirken bir hata oluştu.");
        }
      }
    } else {
      console.error("Silinecek işlem seçilmedi veya ID yok!");
      console.error("selectedRecordForDelete değeri:", selectedRecordForDelete);
      toast.error("Silinecek işlem seçilmedi.");
    }
    setDeleteModal(false);
    setSelectedRecordForDelete(null);
  };

  // Transaction verisini UI için formatlama fonksiyonu
  const formatTransactionForUI = (transaction: Transaction): TransactionWithCreatedAt => {
    return {
      ...transaction,
      date: transaction.createdAt ? moment(transaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
    };
  };

  const handleFilterApply = async (filters: TransactionFilterState): Promise<any[]> => {
    try {
      console.log("Filtreler uygulanıyor...");
      console.log("Current pageSize state value:", pageSize);
      
      // Set filtering in progress flag to prevent duplicate calls
      setIsFilteringInProgress(true);
      
      // Show loading state for the table
      setLoading(true);
      
      // Reset page index to 0 immediately when filtering
      setPageIndex(0);
      
      // Convert filters to API format
      const statusIds = filters.status && filters.status.length > 0
        ? filters.status.map((s: SelectOption) => s.value).join(',')
        : undefined;
      
      const transactionTypes = filters.transactionTypes && filters.transactionTypes.length > 0
        ? filters.transactionTypes.map((t: SelectOption) => t.value).join(',')
        : undefined;
      
      const assignedUsers = filters.assignedUsers && filters.assignedUsers.length > 0
        ? filters.assignedUsers.map((u: SelectOption) => u.value).join(',')
        : undefined;
      
      const products = filters.products && filters.products.length > 0
        ? filters.products.map((p: SelectOption) => p.value).join(',')
        : undefined;
        
      const cities = filters.cities && filters.cities.length > 0
        ? filters.cities.map((c: SelectOption) => c.value).join(',')
        : undefined;
        
      const channels = filters.channels && filters.channels.length > 0
        ? filters.channels.map((c: SelectOption) => c.value).join(',')
        : undefined;
        
      const country = filters.country
        ? filters.country.value
        : undefined;
      
      // Tarih formatını düzelt
      const startDate = filters.startDate
        ? moment(filters.startDate).format("YYYY-MM-DD")
        : undefined;
        
      const endDate = filters.endDate
        ? moment(filters.endDate).format("YYYY-MM-DD")
        : undefined;
      
      // Tutar aralığı değerlerini al
      const minAmount = filters.minAmount !== null ? filters.minAmount : undefined;
      const maxAmount = filters.maxAmount !== null ? filters.maxAmount : undefined;
      
      // API çağrısı için parametreleri hazırla - Server-side pagination için
      // Always set pageIndex to 0 when applying filters, regardless of current state
      const apiParams: GetTransactionsDTO = {
        pageSize: pageSize,
        pageIndex: 0, // Always return to first page when filtering
        text: filters.searchText || "",
        orderBy,
        orderDirection: orderDirection.toUpperCase() as "ASC" | "DESC",
        statusIds: statusIds ? statusIds.split(',') : null,
        typeIds: transactionTypes ? transactionTypes.split(',') : null,
        assignedUserIds: assignedUsers ? assignedUsers.split(',') : null,
        createdAtStart: startDate || null,
        createdAtEnd: endDate || null,
        productIds: products ? products.split(',') : null,
        cityIds: cities ? cities.split(',') : null,
        channelIds: channels ? channels.split(',') : null,
        countryId: country || null
      };
      
      console.log("API parametreleri:", JSON.stringify(apiParams, null, 2));
      console.log("API'ye gönderilen sayfa boyutu (pageSize):", apiParams.pageSize);
      console.log("API'ye gönderilen sayfa indeksi (pageIndex):", apiParams.pageIndex);
      
      // Update URL params - Ensure pageIndex is set to 0 in URL
      updateUrlParams(
        filters.searchText || undefined,
        statusIds ? statusIds.split(',') : undefined,
        startDate,
        endDate,
        transactionTypes ? transactionTypes.split(',') : undefined,
        assignedUsers ? assignedUsers.split(',') : undefined,
        products ? products.split(',') : undefined,
        cities ? cities.split(',') : undefined,
        channels ? channels.split(',') : undefined,
        country,
        0, // Explicitly set pageIndex to 0 in URL when filtering
        pageSize,
        minAmount,
        maxAmount
      );
      
      // API'den sadece mevcut sayfa için veri getir
      const result = await fetchTransactionData(apiParams);
      
      if (result) {
        // Verileri işle
        let formattedTransactions = result.items.map((item: any) => ({
          ...item,
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        
        // İstemci tarafında tutar filtresi uygula
        if (minAmount !== undefined || maxAmount !== undefined) {
          console.log("Tutar aralığı filtreleniyor:", minAmount, "-", maxAmount);
          formattedTransactions = formattedTransactions.filter(transaction => {
            const amount = parseFloat(transaction.amount?.toString() || "0");
            
            if (minAmount !== undefined && amount < minAmount) return false;
            if (maxAmount !== undefined && amount > maxAmount) return false;
            
            return true;
          });
          
          console.log("Tutar filtresi sonrası kalan işlemler:", formattedTransactions.length);
        }
        
        // State'leri güncelle
        setFilteredTransactions(formattedTransactions);
        setAllTransactions(formattedTransactions);
        
        // API'den gelen toplam sayfa ve öğe sayısını kullan
        setItemCount(result.itemCount);
        setPageCount(result.pageCount);
        
        console.log(`Sayfalama: Toplam ${result.itemCount} işlem, Sayfa 1/${result.pageCount}`);
        
        return formattedTransactions;
      } else {
        // Sonuç bulunamadı
        setAllTransactions([]);
        setFilteredTransactions([]);
        setItemCount(0);
        setPageCount(0);
        // Show a toast message when no results are found
        toast.info("Filtrelere uygun sonuç bulunamadı");
        return [];
      }
    } catch (error: any) {
      console.error("Filtreleme hatası:", error);
      setError("Filtreler uygulanırken bir hata oluştu.");
      
      // Show detailed error message in toast
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const graphQLError = error.graphQLErrors[0];
        toast.error(`Filtreleme hatası: ${graphQLError.message}`);
      } else if (error.networkError) {
        toast.error(`Ağ hatası: ${error.message || 'Sunucuya bağlanılamadı'}`);
      } else {
        toast.error(`Filtreleme hatası: ${error.message || 'Bilinmeyen hata'}`);
      }
      
        return [];
    } finally {
      // Reset the loading states when done
      setIsFilteringInProgress(false);
      setLoading(false);
    }
  };

  // Error handler function for form validation
  const handleError = (message: string) => {
    toast.error(message);
    setIsSubmitting(false);
  };

  // Remove the handleSubmit function from its current location
  // const handleSubmit = useCallback(async (validation: any) => { ... });

  // Add it after all other declarations, just before the return statement
  const handleSubmit = useCallback(async (validation: any) => {
    try {
    setIsSubmitting(true);
    
      // Get fresh auth context
    const freshAuthContext = getFreshAuthContext();
    
    console.log("Submitting form with values:", validation.values);
    
    if (isEdit) {
      // Get the input object from validation values
      const input: any = {
        id: validation.values.id,
        amount: Number(validation.values.amount) || 0,
          no: nullIfEmpty(validation.values.no),
          note: nullIfEmpty(validation.values.note),
          typeId: nullIfEmpty(validation.values.typeId),
          statusId: nullIfEmpty(validation.values.statusId),
          accountId: nullIfEmpty(validation.values.accountId),
          assignedUserId: nullIfEmpty(validation.values.assignedUserId),
          channelId: nullIfEmpty(validation.values.channelId),
          transactionDate: nullIfEmpty(validation.values.transactionDate),
          ...(validation.values.country ? { countryId: validation.values.country } : {}),
          ...(validation.values.city ? { cityId: validation.values.city } : {}),
          ...(validation.values.district ? { countyId: validation.values.district } : {}),
          ...(validation.values.neighborhood ? { districtId: validation.values.neighborhood } : {}),
          address: nullIfEmpty(validation.values.address),
          postalCode: nullIfEmpty(validation.values.postalCode),
          successDate: nullIfEmpty(validation.values.successDate),
          successNote: nullIfEmpty(validation.values.successNote),
          cancelDate: nullIfEmpty(validation.values.cancelDate),
          cancelNote: nullIfEmpty(validation.values.cancelNote)
        };
        
        // Add products if selected
      if (validation.values.products && validation.values.products.length > 0) {
        input.products = validation.values.products.map((product: any) => ({
          productId: product.value,
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0
        }));
      }
      
      console.log("Update transaction input:", input);
      
        await updateTransaction({
        variables: { input },
        context: freshAuthContext
      });
    } else {
        // Create transaction input
        console.log("Channel ID before preparation:", validation.values.channelId);
        
        // Log all geographic and channel values from form
        console.log("Form values for geographic data:", {
          country: validation.values.country,
          city: validation.values.city,
          district: validation.values.district,
          neighborhood: validation.values.neighborhood,
          channelId: validation.values.channelId
        });
        
      const input: any = {
        amount: Number(validation.values.amount) || 0,
          no: nullIfEmpty(validation.values.no),
          note: nullIfEmpty(validation.values.note),
          typeId: nullIfEmpty(validation.values.typeId),
          statusId: nullIfEmpty(validation.values.statusId),
          accountId: nullIfEmpty(validation.values.accountId),
          assignedUserId: nullIfEmpty(validation.values.assignedUserId),
          // Ensure channelId is properly handled
          channelId: validation.values.channelId || null,
          transactionDate: nullIfEmpty(validation.values.transactionDate) || moment().format("YYYY-MM-DD"),
          // Geographic fields - ensure they're included if present
          countryId: validation.values.country || undefined,
          cityId: validation.values.city || undefined,
          countyId: validation.values.district || undefined,
          districtId: validation.values.neighborhood || undefined,
          address: nullIfEmpty(validation.values.address),
          postalCode: nullIfEmpty(validation.values.postalCode),
          successDate: nullIfEmpty(validation.values.successDate),
          successNote: nullIfEmpty(validation.values.successNote),
          cancelDate: nullIfEmpty(validation.values.cancelDate),
          cancelNote: nullIfEmpty(validation.values.cancelNote)
        };
        
        // Log the final input object
        console.log("Final input object for createTransaction:", {
          ...input,
          geographic: {
            countryId: input.countryId,
            cityId: input.cityId,
            countyId: input.countyId,
            districtId: input.districtId
          },
          channelId: input.channelId
        });
        
        // Debug logging for channel
        console.log("Channel details:", {
          formValue: validation.values.channelId,
          inputValue: input.channelId,
          channelOptions: channelOptions.map(opt => ({ value: opt.value, label: opt.label }))
        });
        
        // Add products if selected
      if (validation.values.products && validation.values.products.length > 0) {
        input.products = validation.values.products.map((product: any) => ({
          productId: product.value,
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0
        }));
      }
      
        console.log("Creating new transaction with input:", input);
      
        // API'nin desteklemediği transactionNote alanını kaldır
        if (input.transactionNote !== undefined) {
          delete input.transactionNote;
        }
      
        await createTransaction({
        variables: { input },
        context: freshAuthContext
      });
    }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      setIsSubmitting(false);
      toast.error("İşlem kaydedilirken bir hata oluştu");
    }
  }, [accountOptions, isEdit, createTransaction, updateTransaction]);

  // Define memoized handlers first
  
  // Modify the handleEditClick function to prevent triggering unnecessary table refresh
  const handleEditClick = useCallback(async (transactionId: string) => {
    try {
      console.log("Edit clicked for transaction ID:", transactionId);
      
      // Set isEdit flag to true first to prevent table refresh in the useEffect
      setIsEdit(true);
      
      // Kullanıcı arayüzünde sadece seçili satırı vurgula/göster
      console.log("Editing transaction with ID:", transactionId);
      
      // Önce önbellekte transaction var mı kontrol et
      const cachedData = client.readQuery({
        query: GET_TRANSACTION,
        variables: { id: transactionId }
      });
      
      let transaction;
      
      if (cachedData && cachedData.getTransaction) {
        // Önbellekte veri varsa, API çağrısı yapma
        console.log("Using cached transaction data");
        transaction = cachedData.getTransaction;
        setTransaction(transaction);
      } else {
        // Önbellekte veri yoksa, yükleme durumunu göster ve API'den getir
        setLoading(true);
        
        // Get transaction data from API
        const { data } = await client.query({
          query: GET_TRANSACTION,
          variables: { id: transactionId },
          fetchPolicy: "network-only", // Açıkça network-only kullan, cache-first yerine
          context: getAuthorizationLink()
        });
        
        if (!data || !data.getTransaction) {
          toast.error("İşlem detayları alınamadı");
          setLoading(false);
          setIsEdit(false); // Reset edit flag
          return;
        }
        
        transaction = data.getTransaction;
        setTransaction(transaction);
        setLoading(false);
      }
      
      console.log("Transaction data:", transaction);
      
      // Pre-load location data in correct sequence before opening modal
      try {
        if (transaction.country?.id) {
          console.log(`Pre-loading cities for country: ${transaction.country.id}`);
          
          // Önce önbellekte city verisi var mı kontrol et
          const cachedCities = client.readQuery({
            query: GET_CITIES,
            variables: { countryId: transaction.country.id }
          });
          
          if (!cachedCities) {
            // Önbellekte yoksa yükle
            const citiesResult = await getCities({
              variables: { countryId: transaction.country.id },
              fetchPolicy: "cache-first"
            });
            
            console.log("Cities loaded successfully:", citiesResult?.data?.getCities?.length || 0, "cities");
          } else {
            console.log("Using cached cities data");
          }
          
          // Wait for cities to load, then load counties if city is selected
          if (transaction.city?.id) {
            console.log(`Pre-loading counties for city: ${transaction.city.id}`);
            
            // Önce önbellekte county verisi var mı kontrol et
            const cachedCounties = client.readQuery({
              query: GET_COUNTIES,
              variables: { cityId: transaction.city.id }
            });
            
            if (!cachedCounties) {
              // Önbellekte yoksa yükle
              const countiesResult = await getCounties({
                variables: { cityId: transaction.city.id },
                fetchPolicy: "cache-first"
              });
              
              console.log("Counties loaded successfully:", countiesResult?.data?.getCounties?.length || 0, "counties");
            } else {
              console.log("Using cached counties data");
            }
            
            // Check which county ID to use
            const countyId = transaction.county?.id;
            if (countyId) {
              console.log(`Pre-loading districts for county: ${countyId}`);
              
              // Önce önbellekte district verisi var mı kontrol et
              const cachedDistricts = client.readQuery({
                query: GET_DISTRICTS,
                variables: { countyId }
              });
              
              if (!cachedDistricts) {
                // Önbellekte yoksa yükle
                const districtsResult = await getDistricts({
                  variables: { countyId },
                  fetchPolicy: "cache-first"
                });
                
                console.log("Districts loaded successfully:", districtsResult?.data?.getDistricts?.length || 0, "districts");
              } else {
                console.log("Using cached districts data");
              }
            }
          }
        }
        
        // All location data loaded, now open the modal
        // This prevents flickering or loading states in the UI
        setModal(true);
        
        // Initialize form with transaction data
        // Your existing form initialization code
      } catch (error) {
        console.error("Error pre-loading location data:", error);
        // Continue with modal display even if location data loading fails
        setModal(true);
      }
    } catch (error) {
      console.error("Error in edit transaction flow:", error);
      toast.error("İşlem detayları yüklenirken bir hata oluştu");
      setIsEdit(false); // Reset edit flag on error
    }
  }, [client, getCities, getCounties, getDistricts, getAuthorizationLink]);

  // Memoize the columns configuration to prevent unnecessary rerenders
  const columns = useMemo(() => [
    {
      header: (
        <input
          type="checkbox"
          className="form-check-input"
          id="checkBoxAll"
          onClick={() => {}}
          aria-label="Select all transactions"
        />
      ),
      cell: (cell: any) => (
        <input
          type="checkbox"
          className="transactionsCheckBox form-check-input"
          value={cell.getValue()}
          onChange={() => {}}
          aria-label={`Select transaction ${cell.row?.id || ''}`}
        />
      ),
      id: "#",
      enableSorting: false,
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("no")}>
          İşlem No {sortConfig?.key === "no" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "no",
      enableColumnFilter: false,
      cell: (cell: any) => (cell.row.original.no || "-")
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("date")}>
          Eklenme {sortConfig?.key === "date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "date",
      enableColumnFilter: false,
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("account.name")}>
          Hesap {sortConfig?.key === "account.name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "account.name",
      enableColumnFilter: false,
      cell: (cell: any) => <div className="d-flex align-items-center">{cell.row.original.account?.name || "-"}</div>,
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("type.name")}>
          İşlem Tipi {sortConfig?.key === "type.name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "type.name",
      enableColumnFilter: false,
      cell: (cell: any) => (cell.row.original.type?.name || "-")
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("status.name")}>
          Durum {sortConfig?.key === "status.name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "status.name",
      enableColumnFilter: false,
      cell: (cell: any) => (cell.row.original.status?.name || "-")
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("assignedUser.fullName")}>
          Atanan Kullanıcı {sortConfig?.key === "assignedUser.fullName" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "assignedUser.fullName",
      enableColumnFilter: false,
      cell: (cell: any) => (cell.row.original.assignedUser?.fullName || "-")
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("amount")}>
          Tutar {sortConfig?.key === "amount" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "amount",
      enableColumnFilter: false,
      cell: (cell: any) => `${cell.getValue()} TL`
    },
    {
      header: (
        <span style={{ cursor: "pointer" }} onClick={() => handleSort("products")}>
          Ürünler {sortConfig?.key === "products" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      ),
      accessorKey: "products",
      enableColumnFilter: false,
      cell: (cell: any) => {
        const products = cell.row.original.transactionProducts || [];
        return products.length > 0 
          ? products.map((p: any) => p.product?.name).join(", ") 
          : "-";
      }
    },
    {
      header: " ",
      cell: (cellProps: any) => (
        <ul className="list-inline hstack gap-2 mb-0">
          <li className="list-inline-item" title="View">
            <button
              className="view-item-btn btn p-0 border-none"
              type="button"
              onClick={() => handleDetailClick(cellProps.row.original)}
            >
              Detaylar
            </button>
          </li>
          <li className="list-inline-item" title="Edit">
            <button
              className="edit-item-btn btn p-0 border-none"
              type="button"
              onClick={() => handleEditClick(cellProps.row.original.id)}
            >
              Düzenle
            </button>
          </li>
          <li className="list-inline-item" title="Delete">
            <button
              className="remove-item-btn btn p-0 border-none"
              onClick={() => {
                const transaction = cellProps.row.original;
                // Ensure ID is valid before proceeding
                if (!transaction || !transaction.id) {
                  toast.error("Geçersiz işlem verisi. Silme işlemi yapılamaz.");
                  return;
                }
                // Store the transaction with explicit ID conversion to string type
                // Ensure that the ID is a proper string as expected by the GraphQL API
                setSelectedRecordForDelete({
                  ...transaction,
                  id: String(transaction.id) // Explicit conversion to String type
                });
                setDeleteModal(true);
              }}
            >
              Sil
            </button>
          </li>
        </ul>
      ),
    },
  ], [handleSort, sortConfig, handleDetailClick, handleEditClick]);

  // Filtre paneli açıldığında URL parametrelerini kontrol et ve yenile
  useEffect(() => {
    if (isInfoDetails) {
      console.log("Filtre paneli açıldı, URL parametreleri kontrol ediliyor...");
      
      // URL'den mevcut parametreler alınır ve TransactionFilter bileşenine key prop'u aracılığıyla aktarılır
      // Bu sayede her açılışta doğru status değerini gösterebiliriz
      const queryParams = new URLSearchParams(location.search);
      const statusParam = queryParams.get("status");
      
      console.log("Açılışta URL'deki status parametresi:", statusParam);
      
      // Bu useEffect, isInfoDetails değiştiğinde ve true olduğunda
      // TransactionFilter bileşeninin yeniden yüklenmesini sağlar
    }
  }, [isInfoDetails, location.search]);

  // ilk yükleme
  useEffect(() => {
    // Fetch initial data when component mounts
    // Skip if filtering is in progress
    if (!isFilteringInProgress) {
    fetchInitialData();
    }
    
    // Removing unnecessary fetchAccounts call - only needed when adding/editing transactions
    
    // Load user data
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
          console.log(`Users loaded successfully: ${options.length} users found`);
        } else {
          console.warn("API returned empty users list");
        }
      } catch (error: any) {
        console.error("Error loading users:", error);
      }
    };
    
    loadUserOptions();
    
    // Event listener for the Add button click in TransactionFilter
    const handleAddButtonClick = () => {
      // Reset form state
      setTransaction(null);
      setModal(true);
      setIsEdit(false);
      setIsDetail(false);
      
      // Set default values for a new transaction form
      const defaultTransactionValues = {
        id: "",
        amount: 0,
        no: "",
        note: "",
        typeId: "",
        statusId: "",
        accountId: "",
        assignedUserId: "",
        channelId: "", // Keep as empty string for type compatibility
        products: [],
        date: moment().format("DD.MM.YYYY"),
        transactionDate: moment().format("YYYY-MM-DD"),
        transactionProducts: [],
        country: "",
        city: "",
        county: "",
        district: "",
        neighborhood: "",
        address: "",
        postalCode: "",
        successDate: moment().format("YYYY-MM-DD HH:mm"),
        successNote: "",
        transactionNote: "",
        cancelDate: moment().format("YYYY-MM-DD HH:mm"),
        cancelNote: ""
      };
      
      // Reset form with default values
      validation.resetForm();
      validation.setValues(defaultTransactionValues);
      
      console.log("Form initialized with default values for new transaction");
      
      // Load fresh data
      Promise.all([
        client.query({
          query: GET_CHANNELS_LOOKUP,
          context: getAuthorizationLink(),
          fetchPolicy: "network-only"
        }),
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
        })
      ]).then(([channelsResult, accountsResult]) => {
        // Handle channels
        if (channelsResult.data?.getChannelsLookup) {
          const channelOpts = channelsResult.data.getChannelsLookup.map((channel: any) => ({
            value: channel.id,
            label: channel.name
          }));
          setChannelOptions(channelOpts);
          console.log("Channels loaded for new transaction:", channelOpts);
        }

        // Handle accounts
        if (accountsResult.data?.getAccounts?.items) {
          const accountOpts = accountsResult.data.getAccounts.items.map((account: any) => ({
            value: account.id,
            label: account.name
          }));
          setAccountOptions(accountOpts);
          console.log("Accounts loaded for new transaction:", accountOpts);
        } else {
          console.warn("No accounts available");
          toast.error("Hesap bulunamadığı için işlem oluşturulamaz");
        }
      }).catch(error => {
        console.error("Failed to load form data:", error);
        toast.error("Form verileri yüklenemedi");
        });
    };
    
    window.addEventListener('TransactionsAddClick', handleAddButtonClick);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('TransactionsAddClick', handleAddButtonClick);
    };
  }, [isFilteringInProgress]);  // Add isFilteringInProgress to dependencies

  // Define deleteTransaction mutation
  const [deleteTransaction] = useMutation(DELETE_TRANSACTION, {
    onCompleted: (data) => {
      console.log("Delete mutation completed successfully:", data);
      if (data && data.deleteTransaction) {
        toast.success("İşlem başarıyla silindi");
      // Only fetch initial data if filtering is not in progress
      if (!isFilteringInProgress) {
      fetchInitialData();
        }
      } else {
        console.error("deleteTransaction response is falsy:", data);
        toast.error("İşlem silinirken beklenmeyen bir hata oluştu");
      }
    },
    onError: (error) => {
      console.error("Error deleting transaction:", error);
      
      // Show detailed error information
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error("GraphQL Errors:", error.graphQLErrors);
        error.graphQLErrors.forEach((err) => {
          console.error(`GraphQL Error: ${err.message}`);
          toast.error(`Silme hatası: ${err.message}`);
        });
      } else if (error.networkError) {
        console.error("Network Error:", error.networkError);
        // @ts-ignore
        if (error.networkError.result && error.networkError.result.errors) {
          // @ts-ignore
          error.networkError.result.errors.forEach((err) => {
            console.error(`Server Error: ${err.message}`);
            toast.error(`Sunucu hatası: ${err.message}`);
          });
        }
        toast.error("Sunucu bağlantı hatası. Lütfen ağ bağlantınızı kontrol edin.");
      } else {
        toast.error("İşlem silinirken bir hata oluştu");
      }
    }
  });

  // Make sure user options are loaded when the component mounts
  useEffect(() => {
    try {
      // Remove unnecessary fetchAccounts call - only needed when adding/editing transactions
      
      // Also ensure we load user data
      const fetchUserOptions = async () => {
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
            console.log(`Users loaded successfully: ${options.length} users found`);
          } else {
            console.warn("API returned empty users list");
          }
        } catch (error: any) {
          console.error("Error loading users:", error);
        }
      };
      
      fetchUserOptions();
    } catch (error) {
      console.error("Error in initial data load:", error);
    }
  }, []);

  // Add new useEffect to check for edit/:id in URL and open edit modal
  useEffect(() => {
    // Check if we're on the edit route
    const match = location.pathname.match(/\/transactions\/edit\/([^/]+)/);
    if (match && match[1]) {
      const transactionId = match[1];
      console.log("Edit mode detected for transaction ID:", transactionId);
      
      // Fetch the transaction data
      const fetchTransactionForEdit = async () => {
        try {
          console.log("Fetching transaction data for editing");
          const { data } = await client.query({
            query: GET_TRANSACTION,
            variables: { id: transactionId },
            context: getAuthorizationLink(),
            fetchPolicy: "network-only"
          });
          
          if (data && data.getTransaction) {
            console.log("Transaction data loaded for edit:", data.getTransaction);
            // Set the transaction and open the edit modal
            handleTransactionClick(data.getTransaction);
          } else {
            console.error("No transaction data found for ID:", transactionId);
            toast.error("İşlem bulunamadı");
            navigate("/transactions");
          }
        } catch (error: any) {
          console.error("Error fetching transaction for edit:", error);
          toast.error("İşlem detayları yüklenirken hata oluştu");
          navigate("/transactions");
        }
      };
      
      fetchTransactionForEdit();
    }
  }, [location.pathname, navigate]);

  // Keep the products query as it's needed for the dropdown
  const { loading: productsLoading } = useQuery(GET_PRODUCTS_LOOKUP, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getProductsLookup && data.getProductsLookup.items) {
        const options = data.getProductsLookup.items.map((product: any) => ({
          value: product.id,
          label: product.name
        }));
        setProductOptions(options);
        console.log("Product options loaded:", options.length);
      } else {
        console.warn("No products returned from API");
        setProductOptions([]);
      }
    },
    onError: (error) => {
      console.error("Error fetching products:", error);
      toast.error("Ürün listesi yüklenirken hata oluştu");
      setProductOptions([]);
    }
  });

  // Add channel loading to the form initialization
  useEffect(() => {
    if (modal && !isEdit) {
      // Load channels for new transaction
      client.query({
        query: GET_CHANNELS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data?.getChannelsLookup) {
          const channelOpts = data.getChannelsLookup.map((channel: any) => ({
            value: channel.id,
            label: channel.name
          }));
          setChannelOptions(channelOpts);
          console.log("Channels loaded for new transaction:", channelOpts);
        }
      }).catch(error => {
        console.error("Failed to load channels:", error);
        toast.error("Kanal listesi yüklenemedi");
      });
    }
  }, [modal, isEdit]);

  // Add a ref to track the previous modal state to prevent unnecessary refreshes
  const previousModalState = useRef({ isEdit: false, isOpen: false });

  // Update the useEffect that handles grid refresh based on URL changes
  useEffect(() => {
    // Skip refresh when edit modal is open
    if (modal || isEdit) {
      console.log("Modal is open, skipping table refresh");
      
      // Update ref to track that modal is open
      previousModalState.current = { isEdit, isOpen: modal };
      return;
    }
    
    // If modal just closed (was previously open), don't refresh grid yet
    if (previousModalState.current.isEdit || previousModalState.current.isOpen) {
      console.log("Modal just closed, preventing immediate table refresh");
      
      // Reset the previous state tracker
      previousModalState.current = { isEdit: false, isOpen: false };
      
      // Exit early to prevent refresh
      return;
    }

    // Check if we're in an edit route (URL containing /edit/)
    const isEditOperation = location.pathname.includes('/edit/');
    
    // Skip refresh if we're in an edit route
    if (isEditOperation) {
      console.log("Edit operation detected, skipping table refresh");
      return;
    }
    
    // Check if we have cached data for this URL
    const urlParams = new URLSearchParams(location.search);
    const cacheKey = `${pageIndex}-${pageSize}-${urlParams.toString()}`;
    const cachedData = dataCache[cacheKey];
    
    if (cachedData) {
      console.log("Using cached data for this URL:", cacheKey);
      // Immediately update with cached data for a smooth UI experience
      setFilteredTransactions(cachedData.transactions);
      setAllTransactions(cachedData.transactions);
      setItemCount(cachedData.itemCount);
      setPageCount(cachedData.pageCount);
      
      // Optionally fetch in the background for fresh data, but with delay
      // Comment this out if you don't want background refreshes
      /*
      setTimeout(() => {
        fetchDataWithCurrentFilters();
      }, 500);
      */
    } else {
      // Only fetch data if we're not already filtering
      if (!isFilteringInProgress) {
        console.log("No cached data, fetching from API");
        fetchDataWithCurrentFilters();
      }
    }
  }, [location.search, location.pathname, modal, isEdit, pageIndex, pageSize, dataCache, isFilteringInProgress]);

  // Find the existing editHandler or actions cell renderer and update it to use handleEditClick
  const editHandler = (params: any) => {
    const transactionId = params.data.id;
    handleEditClick(transactionId);
  };

  // Fix the modal opening useEffect to prevent infinite loops
  useEffect(() => {
    if (modal) {
      // When modal opens, load all necessary lookups
      const loadInitialData = async () => {
        try {
          console.log("Modal opened, loading initial data");
          await loadChannels();
          await fetchAccounts();
          console.log("Initial data loaded successfully");
        } catch (error) {
          console.error("Error loading initial data:", error);
        }
      };
      
      loadInitialData();
    }
  }, [modal]); // Remove loadChannels and fetchAccounts from dependencies

  // Fix the account loading effect for edit mode
  useEffect(() => {
    if (modal && isEdit) {
      // Load accounts when editing a transaction
      const loadAccountsOnce = async () => {
        try {
          console.log("Loading accounts for edit modal");
          await fetchAccounts();
          console.log("Accounts loaded successfully for edit");
        } catch (err) {
          console.error("Error loading accounts:", err);
        }
      };
      
      loadAccountsOnce();
    }
  }, [modal, isEdit]); // Remove fetchAccounts from dependencies
  
  // Add the location data loading effects back with safeguards
  // Add these after the account loading effect
  
  // Add refs to track if location data loading is in progress
  const isLoadingCities = useRef(false);
  const isLoadingCounties = useRef(false);
  const isLoadingDistricts = useRef(false);
  
  // Load cities when country changes - but only once
  useEffect(() => {
    const countryId = validation.values.country;
    if (!countryId || isLoadingCities.current) return;
    
    const loadCities = async () => {
      isLoadingCities.current = true;
      try {
        console.log(`Loading cities for country: ${countryId}`);
        await getCities({
          variables: { countryId },
          fetchPolicy: "cache-first" // Use cache when available
        });
        console.log("Cities loaded successfully");
      } catch (error) {
        console.error("Error loading cities:", error);
      } finally {
        isLoadingCities.current = false;
      }
    };
    
    loadCities();
  }, [validation.values.country]); // Only depend on country value
  
  // Load counties when city changes - but only once
  useEffect(() => {
    const cityId = validation.values.city;
    if (!cityId || isLoadingCounties.current) return;
    
    const loadCounties = async () => {
      isLoadingCounties.current = true;
      try {
        console.log(`Loading counties for city: ${cityId}`);
        await getCounties({
          variables: { cityId },
          fetchPolicy: "cache-first" // Use cache when available
        });
        console.log("Counties loaded successfully");
      } catch (error) {
        console.error("Error loading counties:", error);
      } finally {
        isLoadingCounties.current = false;
      }
    };
    
    loadCounties();
  }, [validation.values.city]); // Only depend on city value
  
  // Load districts when district/county changes - but only once
  useEffect(() => {
    const countyId = validation.values.district;
    if (!countyId || isLoadingDistricts.current) return;
    
    const loadDistricts = async () => {
      isLoadingDistricts.current = true;
      try {
        console.log(`Loading districts for county: ${countyId}`);
        await getDistricts({
          variables: { countyId },
          fetchPolicy: "cache-first" // Use cache when available
        });
        console.log("Districts loaded successfully");
      } catch (error) {
        console.error("Error loading districts:", error);
      } finally {
        isLoadingDistricts.current = false;
      }
    };
    
    loadDistricts();
  }, [validation.values.district]); // Only depend on district value

  // Add styles for the table loading overlay
  const tableLoadingStyles = {
    overlay: {
      position: "relative" as const,
    },
    loadingIndicator: {
      position: "absolute" as const,
      top: "50px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 10,
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "10px 20px",
      borderRadius: "4px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
    }
  };

  // Create a memoized grid component to prevent unnecessary rerenders
  // Define this component outside of the main component
  interface MemoizedGridProps {
    columns: any[];
    data: any[];
    isGlobalFilter: boolean;
    customPageSize: number;
    totalCount: number;
    pageIndex: number;
    className?: string;
    divClass?: string;
    tableClass?: string;
    theadClass: string;
    isPagination?: boolean;
    pageCount?: number;
    currentPage?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    loading: boolean;
    sortConfig?: { key: string; direction: "asc" | "desc" } | null;
  }

  const MemoizedGrid = memo(
    ({
      columns,
      data,
      isGlobalFilter,
      customPageSize,
      totalCount,
      pageIndex,
      className,
      divClass,
      tableClass,
      theadClass,
      isPagination,
      pageCount,
      currentPage,
      onPageChange,
      onPageSizeChange,
      loading,
      sortConfig
    }: MemoizedGridProps) => {
      console.log("MemoizedGrid rendering with", data.length, "rows");
      
      return (
        <TableContainer
          columns={columns}
          data={data}
          isGlobalFilter={isGlobalFilter}
          customPageSize={customPageSize}
          totalCount={totalCount}
          divClass={divClass || "table-responsive table-card"}
          tableClass={tableClass || (loading ? "align-middle table-loading" : "align-middle")}
          theadClass={theadClass}
          isPagination={isPagination || pageCount! > 1}
          pageCount={pageCount}
          currentPage={currentPage || pageIndex}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          sortConfig={sortConfig}
        />
      );
    },
    // Custom comparison function to prevent unnecessary rerenders
    (prevProps, nextProps) => {
      // Only rerender if these props change
      const dataChanged = prevProps.data !== nextProps.data;
      const loadingChanged = prevProps.loading !== nextProps.loading;
      const pageSizeChanged = prevProps.customPageSize !== nextProps.customPageSize;
      const pageIndexChanged = prevProps.pageIndex !== nextProps.pageIndex;
      const totalChanged = prevProps.totalCount !== nextProps.totalCount;
      
      // If any of these changed, we need to rerender
      const shouldRerender = dataChanged || loadingChanged || pageSizeChanged || 
                             pageIndexChanged || totalChanged;
      
      // If no changes that would affect rendering, prevent rerender
      return !shouldRerender;
    }
  );

  return (
    <React.Fragment>
      {/* Inject CSS for table loading */}
      <style>{tableLoadingCSS}</style>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="İşlemler" pageTitle="İşlemler" />
          <Row>
            <Col lg={12}>
              <Card id="transactionsList">
                <CardHeader className="border-0">
                  <Row className="g-4 align-items-center">
                    <div className="col-sm-auto ms-auto">
                      <div className="hstack gap-2">
                      </div>
                    </div>
                  </Row>
                </CardHeader>
                <CardBody className="pt-3">
                  <TransactionFilter
                    show={true}
                    onCloseClick={() => setIsInfoDetails(false)}
                    onFilterApply={async (filters: TransactionFilterState) => {
                      try {
                        console.log("Applying filters from index.tsx:", JSON.stringify(filters, null, 2));
                        setLoading(true); // Filtreleme başladığında loading state'ini aktifleştir
                        const result = await handleFilterApply(filters);
                        return result; // Promise döndür
                      } catch (error: any) {
                        console.error("Filtre uygulama hatası:", error);
                        setError("Filtreleme sırasında bir hata oluştu."); // Hata mesajını ayarla
                        
                        // Show toast error message
                        if (error.graphQLErrors && error.graphQLErrors.length > 0) {
                          const graphQLError = error.graphQLErrors[0];
                          toast.error(`Filtreleme hatası: ${graphQLError.message}`);
                        } else if (error.networkError) {
                          toast.error(`Ağ hatası: ${error.message || 'Sunucuya bağlanılamadı'}`);
                        } else {
                          toast.error(`Filtreleme hatası: ${error.message || 'Bilinmeyen hata'}`);
                        }
                        
                        return []; // Always return an empty array in case of error
                      } finally {
                        setLoading(false); // İşlem bittiğinde loading state'ini devre dışı bırak
                      }
                    }}
                    key="transaction-filter" // Sabit bir key değeri ekleyerek bileşenin doğru şekilde render edilmesini sağla
                  />
                  
                  {loading ? (
                    <div style={tableLoadingStyles.overlay}>
                      <div style={tableLoadingStyles.loadingIndicator}>
                        <Loader size="sm" />
                      </div>
                      {/* Keep showing the previous data with reduced opacity */}
                      <MemoizedGrid
                        columns={columns}
                        data={filteredTransactions.length > 0 ? filteredTransactions : Array(5).fill({id: "loading"})}
                        isGlobalFilter={false}
                        customPageSize={pageSize}
                        totalCount={itemCount}
                        pageIndex={pageIndex}
                        className="table-responsive table-card"
                        theadClass="table-light"
                        loading={loading}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        sortConfig={sortConfig}
                      />
                    </div>
                  ) : error ? (
                    <div className="alert alert-danger">{error}</div>
                  ) : (
                    <div>
                      {filteredTransactions.length === 0 ? (
                        <div className="text-center">Görüntülenecek veri bulunamadı.</div>
                      ) : (
                        <MemoizedGrid
                          columns={columns}
                          data={filteredTransactions}
                          isGlobalFilter={false}
                          customPageSize={pageSize}
                          totalCount={itemCount}
                          pageIndex={pageIndex}
                          className="table-responsive table-card"
                          theadClass="table-light"
                          loading={loading}
                          onPageChange={handlePageChange}
                          onPageSizeChange={handlePageSizeChange}
                          sortConfig={sortConfig}
                        />
                      )}
                    </div>
                  )}
                  {/* Replace the entire Modal with our new component */}
                  <TransactionFormModal
                    isOpen={modal}
                    toggle={toggle}
                    title={!!isEdit ? "İşlem Düzenle" : isDetail ? "İşlem Detay" : "Yeni İşlem"}
                    onSubmit={(e) => handleSubmit(validation)}
                    submitText="Kaydet"
                    isDetail={isDetail}
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
                    citiesLoading={citiesLoading}
                    countiesLoading={countiesLoading}
                    districtsLoading={districtsLoading}
                    productsLoading={productsLoading}
                    safelyUpdateFormField={safelyUpdateFormField}
                    debouncedHandleChange={debouncedHandleChange}
                    getCities={getCities}
                    getCounties={getCounties}
                    getDistricts={getDistricts}
                    transaction={transaction}
                  />
                  <ToastContainer closeButton={false} limit={1} />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <DeleteModal
        show={deleteModal}
        onDeleteClick={handleDeleteConfirm}
        onCloseClick={() => {
          setDeleteModal(false);
          setSelectedRecordForDelete(null);
        }}
        recordId={selectedRecordForDelete?.id}
      />
    </React.Fragment>
  );
};

// Wrap the component with ApolloProvider
const Transactions: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <TransactionsContent />
    </ApolloProvider>
  );
};

export default Transactions;