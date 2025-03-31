import React, { useEffect, useState, useCallback, useMemo } from "react";
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

//Import actions
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import moment from "moment";
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

// Helper function to convert empty strings to null for GraphQL
const nullIfEmpty = (value: string | null | undefined) => {
  return value === "" ? null : value;
};

const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

// Create auth link
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage or wherever
  const token = getAuthHeader();
  
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
// Create a memoized version that doesn't request a new token for each call
const getAuthorizationLink = () => {
  // Use a memoized token to prevent excessive localStorage reads
  return {
    headers: {
      Authorization: getAuthHeader() ?? '',
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
  return debounce((e: React.ChangeEvent<any>) => {
    originalHandleChange(e);
  }, delay);
};

// Extend the Transaction type to include createdAt, channel, and transactionDate
interface TransactionWithCreatedAt extends Transaction {
  createdAt?: string;
  channel?: {
    id: string;
    name: string;
  };
  transactionDate?: string;
  // New fields
  address?: string;
  postalCode?: string;
  successDate?: string;
  successNote?: string;
  transactionNote?: string;
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
  orderDirection = "DESC",
  statusIds = null,
  typeIds = null,
  accountIds = null,
  assignedUserIds = null,
  createdAtStart = null,
  createdAtEnd = null
}: GetTransactionsDTO = {pageSize: 10, pageIndex: 0}): Promise<PaginatedResponse<Transaction> | null> {
  try {
    // Simply use a minimal input to test the connection
    const input = {
      pageSize: 10,
      pageIndex: 0
    };
    
    // Log parameters and full query for debugging
    console.log("GraphQL Query:", GET_TRANSACTIONS);
    console.log("Full query text:", GET_TRANSACTIONS.loc?.source.body);
    console.log("Input being sent:", JSON.stringify({ input }, null, 2));
    console.log("Authorization header present:", getAuthHeader() ? "Yes" : "No");
    
    // Log parameters
    console.log("Minimal API Parameters:", input);
    console.log("Using query:", GET_TRANSACTIONS.loc?.source.body);
    
    try {
      // Call API with minimal parameters
      const { data } = await client.query({
        query: GET_TRANSACTIONS,
        variables: { input },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only",
      });
      
      console.log("API response:", data);
      if (data && data.getTransactions) {
        const transactionData = data.getTransactions;
        console.log("Transaction Data:", transactionData);
        return transactionData;
      } else {
        console.error("No data returned from query or data structure is unexpected");
        console.log("Full response:", JSON.stringify(data, null, 2));
        
        // Return sample data if API returns no data
        console.log("Using sample data instead");
        toast.info("API'den veri alınamadı. Örnek veriler gösteriliyor.");
        const sampleData = generateSampleTransactions();
        return {
          items: sampleData,
          itemCount: sampleData.length,
          pageCount: 1
        };
      }
    } catch (error) {
      console.error("Error with API call, using sample data instead:", error);
      // Return sample data if API call throws an error
      toast.warning("API hatası nedeniyle örnek veriler gösteriliyor.");
      const sampleData = generateSampleTransactions();
      return {
        items: sampleData,
        itemCount: sampleData.length,
        pageCount: 1
      };
    }
  } catch (error: any) {
    console.error("Error fetching transaction data:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    if (error.graphQLErrors) {
      console.error("GraphQL Errors:", JSON.stringify(error.graphQLErrors, null, 2));
    }
    if (error.networkError) {
      console.error("Network Error:", error.networkError);
      // Log error details without accessing specific properties
      console.error("Network Error Details:", JSON.stringify(error.networkError, null, 2));
      toast.error("Transaction verileri yüklenirken hata oluştu: " + error.message);
    }
    
    toast.error("API bağlantısında hata. Örnek veriler gösteriliyor.", { 
      autoClose: 5000,
      hideProgressBar: false,
    });
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
  const location = useLocation();
  const navigate = useNavigate();
  
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

  // State variables for transaction options
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);

  // Add state for submission loading
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Add state for country and city options
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  
  // Create a memoized auth context that only updates when needed
  const memoizedAuthContext = useMemo(() => {
    return getAuthorizationLink();
  }, []);
  
  // Use this context for all queries and mutations that don't need to be real-time
  const getStaticAuthContext = () => memoizedAuthContext;
  
  // For form submission, get a fresh token only once per submission
  const getFreshAuthContext = () => getAuthorizationLink();
  
  // Define fetchInitialData function
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current URL parameters
      const queryParams = new URLSearchParams(location.search);
      
      // Extract parameters
      const search = queryParams.get("searchText") || "";
      const status = queryParams.get("status") || null;
      const createdAtStart = queryParams.get("createdAtStart") || null;
      const createdAtEnd = queryParams.get("createdAtEnd") || null;
      const typeIds = queryParams.get("typeIds")?.split(",") || null;
      const assignedUserIds = queryParams.get("assignedUserIds")?.split(",") || null;
      
      // Create API parameters
      const apiParams = {
        pageSize,
        pageIndex,
        text: search,
        orderBy,
        orderDirection,
        statusIds: status ? [status] : null,
        typeIds,
        assignedUserIds,
        createdAtStart,
        createdAtEnd
      };
      
      // Fetch data with parameters
      const result = await fetchTransactionData(apiParams);
      
      if (result) {
        const formattedData = result.items.map((item: any) => ({
          ...item,
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        
        setAllTransactions(formattedData);
        setFilteredTransactions(formattedData);
        setItemCount(result.itemCount);
        setPageCount(result.pageCount);
      }
    } catch (error) {
      console.error("Error in fetchInitialData:", error);
      setError("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Add utility function for updating URL parameters
  const updateUrlParams = (params: any) => {
    const queryParams = new URLSearchParams();
    
    // Add parameters to URL
    if (params.searchText) queryParams.set("searchText", params.searchText);
    if (params.activeFilter !== null) queryParams.set("status", params.activeFilter ? "active" : "inactive");
    if (params.createdAtStart) queryParams.set("createdAtStart", params.createdAtStart);
    if (params.createdAtEnd) queryParams.set("createdAtEnd", params.createdAtEnd);
    if (params.typeIds && params.typeIds.length > 0) queryParams.set("typeIds", params.typeIds.join(","));
    if (params.assignedUserIds && params.assignedUserIds.length > 0) queryParams.set("assignedUserIds", params.assignedUserIds.join(","));
    if (params.productIds && params.productIds.length > 0) queryParams.set("productIds", params.productIds.join(","));
    if (params.cityIds && params.cityIds.length > 0) queryParams.set("cityIds", params.cityIds.join(","));
    if (params.channelIds && params.channelIds.length > 0) queryParams.set("channelIds", params.channelIds.join(","));
    if (params.countryId) queryParams.set("countryId", params.countryId);
    
    // Additional parameters
    if (orderBy) queryParams.set("orderBy", orderBy);
    if (orderDirection) queryParams.set("orderDirection", orderDirection);
    if (pageSize) queryParams.set("pageSize", pageSize.toString());
    if (pageIndex) queryParams.set("pageIndex", pageIndex.toString());
    
    // Update the URL
    navigate({
      pathname: location.pathname,
      search: queryParams.toString()
    }, { replace: true });
  };

  // Add handleSort function
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        return {
          key,
          direction: prevConfig.direction === "asc" ? "desc" : "asc"
        };
      }
      return {
        key,
        direction: "asc"
      };
    });
  };
  
  // Add page change handlers
  const handlePageChange = (page: number) => {
    setPageIndex(page);
    fetchInitialData();
  };
  
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageIndex(0);
    fetchInitialData();
  };
  
  // First, update the validation schema to include the products field
  const validationSchema = Yup.object({
    // We're not validating fields on the frontend anymore
    // All validation will be handled by the backend
  });

  // ... existing code ...

  // Update the validation initial values to include products
  const validation = useFormik({
    enableReinitialize: true,
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
      transactionNote: (transaction && transaction.transactionNote) || ""
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
            status: nullIfEmpty(values.statusId), // Add status field with same value as statusId
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
            transactionNote: nullIfEmpty(values.transactionNote)
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
            amount: Number(values.amount),
            no: nullIfEmpty(values.no),
            note: nullIfEmpty(values.note),
            typeId: nullIfEmpty(values.typeId),
            statusId: nullIfEmpty(values.statusId),
            status: nullIfEmpty(values.statusId),
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
            transactionNote: nullIfEmpty(values.transactionNote)
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

  // Fetch channel options using getChannelsLookup
  const { loading: channelsLoading } = useQuery(GET_CHANNELS_LOOKUP, {
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getChannelsLookup) {
        const options = data.getChannelsLookup.map((channel: any) => ({ 
          value: channel.id, 
          label: channel.name 
        }));
        setChannelOptions(options);
        console.log("Channel options loaded:", options);
          } else {
        console.warn("No channels returned from API");
        setChannelOptions([]);
      }
    },
    onError: (error) => {
      console.error("Error fetching channels:", error);
      toast.error("Kanal listesi yüklenirken hata oluştu");
      setChannelOptions([]);
    }
  });

  // Initialize with sample account options directly
  useEffect(() => {
    // Try to fetch real accounts first - don't set sample accounts yet
    console.log("Initial load - attempting to fetch real accounts");
    fetchAccounts();
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

  // Load cities when country changes - moved here after validation is defined
  useEffect(() => {
    if (validation.values.country) {
      getCities({
        variables: {
          countryId: validation.values.country
        }
      });
    }
  }, [validation.values.country, getCities]);

  // Load counties when city changes
  useEffect(() => {
    if (validation.values.city) {
      getCounties({
        variables: {
          cityId: validation.values.city
        }
      });
    }
  }, [validation.values.city, getCounties]);

  // Load districts when county changes
  useEffect(() => {
    if (validation.values.district) {
      getDistricts({
        variables: {
          countyId: validation.values.district
        }
      });
    }
  }, [validation.values.district, getDistricts]);

  const handleClose = () => {
    // Modal kapanırken tüm form durumlarını sıfırlayalım
    validation.resetForm();
    setIsEdit(false);
    setIsDetail(false);
    
    // Check if we're in edit mode from URL
    const match = location.pathname.match(/\/işlemler\/edit\/([^/]+)/);
    if (match && match[1]) {
      // We came from edit route, navigate back to detail page
      const transactionId = match[1];
      navigate(`/işlemler/detay/${transactionId}`);
    } else {
      // Normal closing behavior
    setTransaction(null);
    setModal(false);
    
    // Filtrelerle birlikte sayfa verilerini yeniden yükle
    fetchInitialData();
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
    (selectedTransaction: any) => {
      setTransaction(selectedTransaction);
      setIsDetail(false);
      setIsEdit(true);
      // Formik değerlerini ayarlayalım
      validation.setValues({
        id: selectedTransaction.id || "",
        amount: selectedTransaction.amount || 0,
        no: selectedTransaction.no || "",
        note: selectedTransaction.note || "",
        typeId: selectedTransaction.type?.id || "",
        statusId: selectedTransaction.status?.id || "",
        // Removed status field to fix lint error
        accountId: selectedTransaction.account?.id || "",
        assignedUserId: selectedTransaction.assignedUser?.id || "",
        channelId: selectedTransaction.channel?.id || "",
        products: selectedTransaction.transactionProducts?.map((p: any) => ({
          value: p.product.id,
          label: p.product.name
        })) || [],
        date: selectedTransaction.createdAt ? moment(selectedTransaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        transactionDate: selectedTransaction.transactionDate ? moment(selectedTransaction.transactionDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
        transactionProducts: selectedTransaction.transactionProducts || [],
        // Geographic fields
        country: selectedTransaction.country || "",
        city: selectedTransaction.city || "",
        district: selectedTransaction.district || "",
        neighborhood: selectedTransaction.neighborhood || "",
        address: selectedTransaction.address || "",
        postalCode: selectedTransaction.postalCode || "",
        successDate: selectedTransaction.successDate || moment().format("YYYY-MM-DD HH:mm"),
        successNote: selectedTransaction.successNote || "",
        transactionNote: selectedTransaction.transactionNote || ""
      });
      setModal(true);
    },
    [validation]
  );

  const handleDetailClick = useCallback(
    async (selectedTransaction: any) => {
      navigate(`/işlemler/detay/${selectedTransaction.id}`);
    },
    [navigate]
  );

  const handleDeleteConfirm = async () => {
    if (selectedRecordForDelete) {
      try {
        const result = await deleteTransaction({
          variables: { id: selectedRecordForDelete.id },
          context: getAuthorizationLink()
        });
        
        if (result && result.data && result.data.deleteTransaction) {
          toast.success("Transaction başarıyla silindi.");
          fetchInitialData();
        } else {
          toast.error("Transaction silinirken bir hata oluştu.");
        }
      } catch (error) {
        console.error("Error deleting transaction:", error);
        toast.error("Transaction silinirken hata oluştu.");
      }
    }
    setDeleteModal(false);
    setSelectedRecordForDelete(null);
  };

  const handleFilterApply = async (filters: TransactionFilterState): Promise<any[]> => {
    console.log("Applying filters:", filters);
    
    // Update state variables
    setSearchText(filters.searchText || "");
    
    // Update status value - if null, get all statuses
    if (filters.status) {
      setActiveFilter(filters.status.value.toLowerCase() === "aktif" ? true : false);
    } else {
      setActiveFilter(null);
    }
    
    // Format dates for API
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (filters.startDate) {
      const date = filters.startDate;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      startDateStr = `${year}-${month}-${day}`;
      
      console.log("Start date set:", startDateStr);
    }
    
    if (filters.endDate) {
      const date = filters.endDate;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      endDateStr = `${year}-${month}-${day}`;
      
      console.log("End date set:", endDateStr);
    }
    
    // Get the selected transaction types
    const transactionTypeIds = filters.transactionTypes && filters.transactionTypes.length > 0 
      ? filters.transactionTypes.map((type: SelectOption) => type.value) 
      : null;
    
    // Get the selected assigned users
    const assignedUserIds = filters.assignedUsers && filters.assignedUsers.length > 0 
      ? filters.assignedUsers.map((user: SelectOption) => user.value) 
      : null;
    
    // Get the selected products
    const productIds = filters.products && filters.products.length > 0 
      ? filters.products.map((product: SelectOption) => product.value) 
      : null;
    
    // Get the selected cities
    const cityIds = filters.cities && filters.cities.length > 0 
      ? filters.cities.map((city: SelectOption) => city.value) 
      : null;
    
    // Get the selected channels
    const channelIds = filters.channels && filters.channels.length > 0 
      ? filters.channels.map((channel: SelectOption) => channel.value) 
      : null;
    
    // Get the country
    const countryId = filters.country ? filters.country.value : null;
    
    // Reset page index
    setPageIndex(0);
    
    try {
      // API call parameters with minimal approach
      const input: GetTransactionsDTO = {
        pageSize: 10,
        pageIndex: 0
      };
      
      console.log("Simplified API parameters:", JSON.stringify(input, null, 2));
      
      // Execute query using fetchTransactionData with minimal params
      const data = await fetchTransactionData(input);
      
      console.log("API response:", data);
      
      if (data && data.items) {
        const formattedData = data.items.map((item: Transaction) => ({
          ...item,
          // Format dates for the UI
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        setAllTransactions(formattedData);
        setFilteredTransactions(formattedData);
        setItemCount(data.itemCount);
        setPageCount(data.pageCount);
        
        // Update URL parameters
        updateUrlParams({
          searchText: filters.searchText || "",
          activeFilter: filters.status
            ? filters.status.value.toLowerCase() === "aktif"
              ? true
              : false
            : null,
          createdAtStart: startDateStr,
          createdAtEnd: endDateStr,
          typeIds: transactionTypeIds || [],
          assignedUserIds: assignedUserIds || [],
          productIds: productIds || [],
          cityIds: cityIds || [],
          channelIds: channelIds || [],
          countryId: countryId
        });
        
        return formattedData;
      } else {
        setAllTransactions([]);
        setFilteredTransactions([]);
        setItemCount(0);
        setPageCount(0);
        
        // Update URL parameters even when no data is found
        updateUrlParams({
          searchText: filters.searchText || "",
          activeFilter: filters.status
            ? filters.status.value.toLowerCase() === "aktif"
              ? true
              : false
            : null,
          createdAtStart: startDateStr,
          createdAtEnd: endDateStr,
          typeIds: transactionTypeIds || [],
          assignedUserIds: assignedUserIds || [],
          productIds: productIds || [],
          cityIds: cityIds || [],
          channelIds: channelIds || [],
          countryId: countryId
        });
        
        toast.error("No data found matching your filters.");
        return [];
      }
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      toast.error("Error loading transaction data.");
      return [];
    }
  };

  // Error handler function for form validation
  const handleError = (message: string) => {
    toast.error(message);
    setIsSubmitting(false);
  };

  const handleSubmit = useCallback((validation: any) => {
    setIsSubmitting(true);
    
    // Get a fresh token only once per submission
    const freshAuthContext = getFreshAuthContext();
    
    // First check if any accounts are available - we still need this check
    if (accountOptions.length === 0) {
      toast.error("Hesap listesi boş. İşlem oluşturulamaz. Lütfen önce hesap oluşturun veya API bağlantısını kontrol edin.");
      console.error("Cannot create transaction: No accounts available");
      setIsSubmitting(false);
      return;
    }
    
    // No additional frontend validation - send directly to backend
    console.log("Submitting form with values:", validation.values);
    
    // Submit the form with the fresh auth context
    // This ensures we only get a new token once per form submission
    if (isEdit) {
      // Get the input object from validation values
      const input: any = {
        id: validation.values.id,
        amount: Number(validation.values.amount) || 0,
        no: nullIfEmpty(validation.values.no),
        note: nullIfEmpty(validation.values.note),
        typeId: nullIfEmpty(validation.values.typeId),
        statusId: nullIfEmpty(validation.values.statusId),
        status: nullIfEmpty(validation.values.statusId), // Add status field with same value as statusId
        accountId: nullIfEmpty(validation.values.accountId),
        assignedUserId: nullIfEmpty(validation.values.assignedUserId),
        channelId: nullIfEmpty(validation.values.channelId),
        transactionDate: nullIfEmpty(validation.values.transactionDate),
        // Coğrafi alan adlarını hata mesajlarından alıyoruz
        ...(validation.values.country ? { countryId: validation.values.country } : {}),
        ...(validation.values.city ? { cityId: validation.values.city } : {}),
        ...(validation.values.district ? { countyId: validation.values.district } : {}), // district -> countyId olarak değişti
        address: nullIfEmpty(validation.values.address),
        postalCode: nullIfEmpty(validation.values.postalCode),
        successDate: nullIfEmpty(validation.values.successDate),
        successNote: nullIfEmpty(validation.values.successNote),
        transactionNote: nullIfEmpty(validation.values.transactionNote)
      };
      
      // Add products to the input if selected
      if (validation.values.products && validation.values.products.length > 0) {
        input.products = validation.values.products.map((product: any) => ({
          productId: product.value,
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0
        }));
      }
      
      console.log("Update transaction input:", input);
      
      // Use the fresh auth context for the actual submission
      updateTransaction({
        variables: { input },
        context: freshAuthContext
      });
    } else {
      // Create transaction input - ensure all required fields are included
      const input: any = {
        amount: Number(validation.values.amount) || 0,
        no: nullIfEmpty(validation.values.no),
        note: nullIfEmpty(validation.values.note),
        typeId: nullIfEmpty(validation.values.typeId),
        statusId: nullIfEmpty(validation.values.statusId),
        status: nullIfEmpty(validation.values.statusId),
        accountId: nullIfEmpty(validation.values.accountId),
        assignedUserId: nullIfEmpty(validation.values.assignedUserId),
        channelId: nullIfEmpty(validation.values.channelId),
        transactionDate: nullIfEmpty(validation.values.transactionDate) || moment().format("YYYY-MM-DD"),
        // Coğrafi alan adlarını doğru hiyerarşi ile düzenliyoruz
        ...(validation.values.country ? { countryId: validation.values.country } : {}),
        ...(validation.values.city ? { cityId: validation.values.city } : {}),
        ...(validation.values.district ? { countyId: validation.values.district } : {}), // district -> countyId olarak değişti
        address: nullIfEmpty(validation.values.address),
        postalCode: nullIfEmpty(validation.values.postalCode),
        successDate: nullIfEmpty(validation.values.successDate),
        successNote: nullIfEmpty(validation.values.successNote)
      };
      
      // Add products to the input if selected
      if (validation.values.products && validation.values.products.length > 0) {
        input.products = validation.values.products.map((product: any) => ({
          productId: product.value,
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0
        }));
      }
      
      // Add detailed logging to see what we're sending
      console.log("Transaction input being sent:", JSON.stringify(input, null, 2));
      
      // Send to backend with all required fields
      createTransaction({
        variables: { input },
        context: getFreshAuthContext()
      });
    }
    
    // Don't return anything (void return type expected by Formik)
  }, [accountOptions, isEdit, validation, validation.values, validation.touched, validation.errors, validation.values.amount, validation.values.no, validation.values.note, validation.values.typeId, validation.values.statusId, validation.values.accountId, validation.values.assignedUserId, validation.values.channelId, validation.values.transactionDate, validation.values.country, validation.values.city, validation.values.district, validation.values.postalCode, validation.values.successDate, validation.values.successNote, validation.values.products]);

  const columns = useMemo(
    () => [
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
                onClick={() => handleTransactionClick(cellProps.row.original)}
              >
                Düzenle
              </button>
            </li>
            <li className="list-inline-item" title="Delete">
              <button
                className="remove-item-btn btn p-0 border-none"
                onClick={() => {
                  setSelectedRecordForDelete(cellProps.row.original);
                  setDeleteModal(true);
                }}
              >
                Sil
              </button>
            </li>
          </ul>
        ),
      },
    ],
    [handleTransactionClick, handleSort, sortConfig, handleDetailClick]
  );

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
    fetchInitialData();
    
    // Also ensure we load account and user data explicitly
    fetchAccounts().catch(error => {
      console.error("Failed to load accounts during initial load:", error);
    });
    
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
      validation.resetForm(); // Reset the form values
      
      // Explicitly fetch fresh account data from API
      fetchAccounts()
        .then((accounts) => {
          console.log("Account data refreshed for new transaction form");
          
          // Check if any accounts were loaded
          if (accounts && accounts.length > 0) {
            console.log(`${accounts.length} accounts loaded successfully`);
          } else {
            console.warn("No accounts available - cannot create transaction without valid accounts");
            toast.error("Hesap bulunamadığı için işlem oluşturulamaz. Lütfen önce hesap oluşturun veya API bağlantısını kontrol edin.");
          }
        })
        .catch(error => {
          console.error("Failed to refresh account data:", error);
          toast.error("Hesap verisi yüklenemedi. İşlem oluşturmak için geçerli hesap gereklidir.");
        });
    };
    
    window.addEventListener('TransactionsAddClick', handleAddButtonClick);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('TransactionsAddClick', handleAddButtonClick);
    };
  }, []);  // Sadece bileşen monte olduğunda çalışacak

  // Define createTransaction mutation with updated error handling
  const [createTransaction] = useMutation(CREATE_TRANSACTION, {
    onCompleted: (data) => {
      console.log("Transaction created successfully:", data);
      toast.success("Transaction başarıyla oluşturuldu");
      setIsSubmitting(false);
      handleClose();
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error in createTransaction mutation:", error);
      setIsSubmitting(false);
      
      // Enhanced error handling for backend validation errors
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        // Extract specific validation errors if available
        const graphQLError = error.graphQLErrors[0];
        
        // Check if there's a meaningful error message from the backend
        if (graphQLError.message) {
          toast.error(`Kayıt hatası: ${graphQLError.message}`);
        } else {
          toast.error("Transaction oluşturulurken bir hata oluştu");
        }
        
        // Log detailed error information
        console.error("GraphQL Error Details:", JSON.stringify(error.graphQLErrors, null, 2));
      } else if (error.networkError) {
        toast.error("Ağ hatası. Lütfen bağlantınızı kontrol edin.");
      } else {
        toast.error("İşlem oluşturulurken bir hata oluştu");
      }
    }
  });

  // Define deleteTransaction mutation
  const [deleteTransaction] = useMutation(DELETE_TRANSACTION, {
    onCompleted: () => {
      toast.success("Transaction başarıyla silindi");
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error deleting transaction:", error);
      toast.error("Transaction silinirken bir hata oluştu");
    }
  });

  // Make sure user options are loaded when the component mounts
  useEffect(() => {
    try {
      // Try to fetch real accounts first
      console.log("Initial load - attempting to fetch accounts, users, and other lookup data");
      fetchAccounts();
      
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
    const match = location.pathname.match(/\/işlemler\/edit\/([^/]+)/);
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
            navigate("/işlemler");
          }
        } catch (error: any) {
          console.error("Error fetching transaction for edit:", error);
          toast.error("İşlem detayları yüklenirken hata oluştu");
          navigate("/işlemler");
        }
      };
      
      fetchTransactionForEdit();
    }
  }, [location.pathname, navigate]);
  
  // Define updateTransaction mutation with updated error handling
  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    onCompleted: (data) => {
      console.log("Transaction updated successfully:", data);
      toast.success("İşlem başarıyla güncellendi");
      
      // Check if we're in edit mode from URL and navigate accordingly
      const match = location.pathname.match(/\/işlemler\/edit\/([^/]+)/);
      if (match && match[1]) {
        navigate(`/işlemler/detay/${match[1]}`);
      } else {
        setIsSubmitting(false);
        handleClose();
        fetchInitialData();
      }
    },
    onError: (error) => {
      console.error("Error in updateTransaction mutation:", error);
      setIsSubmitting(false);
      
      // Enhanced error handling for backend validation errors
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        // Extract specific validation errors if available
        const graphQLError = error.graphQLErrors[0];
        
        // Check if there's a meaningful error message from the backend
        if (graphQLError.message) {
          toast.error(`Güncelleme hatası: ${graphQLError.message}`);
        } else {
          toast.error("İşlem güncellenirken bir hata oluştu");
        }
        
        // Log detailed error information
        console.error("GraphQL Error Details:", JSON.stringify(error.graphQLErrors, null, 2));
      } else if (error.networkError) {
        toast.error("Ağ hatası. Lütfen bağlantınızı kontrol edin.");
      } else {
        toast.error("İşlem güncellenirken bir hata oluştu");
      }
    }
  });

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

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Transactions" />
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
                        const result = await handleFilterApply(filters);
                        return result; // Promise döndür
                      } catch (error) {
                        console.error("Filtre uygulama hatası:", error);
                        return []; // Hata durumunda boş dizi döndür
                      }
                    }}
                    // Remove the changing key to maintain component state
                  />
                  
                  {loading ? (
                    <div className="text-center">
                      <Loader />
                    </div>
                  ) : error ? (
                    <div className="alert alert-danger">{error}</div>
                  ) : (
                    <div>
                      {filteredTransactions.length === 0 ? (
                        <div className="text-center">Görüntülenecek veri bulunamadı.</div>
                      ) : (
                        <TableContainer
                          columns={columns}
                          data={filteredTransactions}
                          isGlobalFilter={false}
                          customPageSize={pageSize}
                          divClass="table-responsive table-card"
                          tableClass="align-middle"
                          theadClass="table-light"
                          isPagination={pageCount > 1}
                          totalCount={itemCount}
                          pageCount={pageCount}
                          currentPage={pageIndex}
                          onPageChange={handlePageChange}
                          onPageSizeChange={handlePageSizeChange}
                          sortConfig={sortConfig}
                        />
                      )}
                    </div>
                  )}
                  <Modal id="showModal" isOpen={modal} toggle={toggle} centered size="lg">
                    <ModalHeader className="bg-light p-3" toggle={toggle}>
                      {!!isEdit ? "İşlem Düzenle" : isDetail ? "İşlem Detay" : "Yeni İşlem"}
                    </ModalHeader>
                    <Form className="tablelist-form" onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit(validation);
                    }}>
                      <ModalBody>
                        <Input type="hidden" id="id-field" />
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="accountId-field" className="form-label">
                              Hesap
                              </Label>
                            {/* API Endpoint: getAccountsLookup - as shown in the image */}
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                              <Select
                                options={accountOptions}
                                name="accountId"
                                onChange={(selected: any) =>
                                  validation.setFieldValue("accountId", selected?.value)
                                }
                                value={
                                  validation.values.accountId
                                    ? {
                                        value: validation.values.accountId,
                                        label:
                                          accountOptions.find((a) => a.value === validation.values.accountId)?.label || "",
                                      }
                                    : null
                                }
                                placeholder="Seçiniz"
                                isDisabled={isDetail}
                                isLoading={false}
                                />
                              ) : (
                              <div>
                                {accountOptions.find((a) => a.value === validation.values.accountId)?.label}
                              </div>
                            )}
                            {validation.touched.accountId && validation.errors.accountId && (
                              <FormFeedback>{validation.errors.accountId as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="statusId-field" className="form-label">
                              İşlem Durumu
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <Select
                                options={statusOptions}
                                name="statusId"
                                onChange={(selected: any) =>
                                  validation.setFieldValue("statusId", selected?.value)
                                }
                                value={
                                  validation.values.statusId
                                    ? {
                                        value: validation.values.statusId,
                                        label:
                                          statusOptions.find((s) => s.value === validation.values.statusId)?.label || "",
                                      }
                                    : null
                                }
                                placeholder="Seçiniz"
                                isDisabled={isDetail}
                              />
                            ) : (
                              <div>
                                {statusOptions.find((s) => s.value === validation.values.statusId)?.label}
                            </div>
                            )}
                            {validation.touched.statusId && validation.errors.statusId && (
                              <FormFeedback>{validation.errors.statusId as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="assignedUserId-field" className="form-label">
                              Kullanıcı
                              </Label>
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                              <Select
                                options={userOptions}
                                name="assignedUserId"
                                onChange={(selected: any) =>
                                  validation.setFieldValue("assignedUserId", selected?.value)
                                }
                                value={
                                  validation.values.assignedUserId
                                    ? {
                                        value: validation.values.assignedUserId,
                                        label:
                                          userOptions.find((u) => u.value === validation.values.assignedUserId)?.label || "",
                                      }
                                    : null
                                }
                                placeholder="Seçiniz"
                                isDisabled={isDetail}
                                />
                              ) : (
                              <div>
                                {userOptions.find((u) => u.value === validation.values.assignedUserId)?.label}
                              </div>
                            )}
                            {validation.touched.assignedUserId && validation.errors.assignedUserId && (
                              <FormFeedback>{validation.errors.assignedUserId as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="typeId-field" className="form-label">
                              İşlem Türü
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <Select
                                options={typeOptions}
                                name="typeId"
                                onChange={(selected: any) =>
                                  validation.setFieldValue("typeId", selected?.value)
                                }
                                value={
                                  validation.values.typeId
                                    ? {
                                        value: validation.values.typeId,
                                        label:
                                          typeOptions.find((t) => t.value === validation.values.typeId)?.label || "",
                                      }
                                    : null
                                }
                                placeholder="Seçiniz"
                                isDisabled={isDetail}
                              />
                            ) : (
                              <div>
                                {typeOptions.find((t) => t.value === validation.values.typeId)?.label}
                            </div>
                            )}
                            {validation.touched.typeId && validation.errors.typeId && (
                              <FormFeedback>{validation.errors.typeId as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                        
                        {/* Products Field */}
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="products-field" className="form-label">
                              Ürünler
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <Select
                                options={productOptions}
                                isMulti
                                name="products"
                                onChange={(selected: any) =>
                                  validation.setFieldValue("products", selected || [])
                                }
                                value={validation.values.products}
                                placeholder="Ürün Seçiniz"
                                isDisabled={isDetail}
                                isLoading={productsLoading}
                                className="basic-multi-select"
                                classNamePrefix="select"
                              />
                            ) : (
                              <div>
                                {validation.values.products?.map((product: any, index: number) => (
                                  <span key={index}>
                                    {product.label}{index < validation.values.products.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="note-field" className="form-label">
                                Not
                              </Label>
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                                <DebouncedInput
                                  name="note"
                                  id="note-field"
                                  className="form-control"
                                  type="textarea"
                                  rows={3}
                                  onChange={debouncedHandleChange}
                                  onBlur={validation.handleBlur}
                                  value={validation.values.note}
                                  invalid={validation.touched.note && validation.errors.note ? true : false}
                                />
                              ) : (
                                <div>{validation.values.note}</div>
                              )}
                            {validation.touched.note && validation.errors.note && (
                              <FormFeedback>{validation.errors.note as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="country-field" className="form-label">
                              Ülke
                              </Label>
                            {/* API Endpoint: getCountries - as shown in the image */}
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                                <Select
                                options={countryOptions}
                                name="country"
                                onChange={(selected: any) => {
                                  validation.setFieldValue("country", selected?.value);
                                  // When country changes, load cities for that country
                                  if (selected?.value) {
                                    getCities({
                                      variables: {
                                        countryId: selected.value
                                      }
                                    });
                                  }
                                }}
                                  value={
                                  validation.values.country
                                      ? {
                                        value: validation.values.country,
                                        label: countryOptions.find(c => c.value === validation.values.country)?.label || "Türkiye"
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  isDisabled={isDetail}
                                isLoading={false}
                                />
                              ) : (
                                <div>
                                {countryOptions.find(c => c.value === validation.values.country)?.label || validation.values.country}
                                </div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="city-field" className="form-label">
                              Şehir
                              </Label>
                            {/* API Endpoint: getCities(countryId) - as shown in the image */}
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                                <Select
                                options={cityOptions}
                                name="city"
                                  onChange={(selected: any) =>
                                  validation.setFieldValue("city", selected?.value)
                                  }
                                  value={
                                  validation.values.city
                                      ? {
                                        value: validation.values.city,
                                        label: cityOptions.find(c => c.value === validation.values.city)?.label || ""
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                isDisabled={isDetail || !validation.values.country}
                                isLoading={citiesLoading}
                                />
                              ) : (
                                <div>
                                {cityOptions.find(c => c.value === validation.values.city)?.label || validation.values.city}
                                </div>
                              )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="district-field" className="form-label">
                              İlçe
                              </Label>
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                                <Select
                                options={countyOptions}
                                name="district"
                                  onChange={(selected: any) => {
                                    validation.setFieldValue("district", selected?.value);
                                    // When district changes, load neighborhoods for that district
                                    if (selected?.value) {
                                      getDistricts({
                                        variables: {
                                          countyId: selected.value
                                        }
                                      });
                                    }
                                  }}
                                  value={
                                  validation.values.district
                                    ? {
                                        value: validation.values.district,
                                        label: countyOptions.find(c => c.value === validation.values.district)?.label || ""
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  isDisabled={isDetail || !validation.values.city}
                                  isLoading={countiesLoading}
                                />
                              ) : (
                              <div>{countyOptions.find(c => c.value === validation.values.district)?.label || validation.values.district}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="neighborhood-field" className="form-label">
                              Mahalle
                              </Label>
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                                <Select
                                options={districtOptions}
                                name="neighborhood"
                                  onChange={(selected: any) =>
                                  validation.setFieldValue("neighborhood", selected?.value)
                                  }
                                  value={
                                  validation.values.neighborhood
                                      ? {
                                        value: validation.values.neighborhood,
                                        label: districtOptions.find(d => d.value === validation.values.neighborhood)?.label || ""
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  isDisabled={isDetail || !validation.values.district}
                                  isLoading={districtsLoading}
                                />
                              ) : (
                              <div>{districtOptions.find(d => d.value === validation.values.neighborhood)?.label || validation.values.neighborhood}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="address-field" className="form-label">
                              Adres
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <DebouncedInput
                                name="address"
                                id="address-field"
                                className="form-control"
                                type="textarea"
                                rows={3}
                                onChange={debouncedHandleChange}
                                onBlur={validation.handleBlur}
                                value={validation.values.address || ""}
                              />
                            ) : (
                              <div>{validation.values.address}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="postal-code-field" className="form-label">
                              Posta Kodu
                              </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <DebouncedInput
                                name="postalCode"
                                id="postal-code-field"
                                className="form-control"
                                type="text"
                                onChange={debouncedHandleChange}
                                onBlur={validation.handleBlur}
                                value={validation.values.postalCode || ""}
                              />
                            ) : (
                              <div>{validation.values.postalCode}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="no-field" className="form-label">
                              İşlem No
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <Input
                                name="no"
                                id="no-field"
                                className="form-control"
                                type="text"
                                onChange={validation.handleChange}
                                onBlur={validation.handleBlur}
                                value={validation.values.no}
                                invalid={validation.touched.no && validation.errors.no ? true : false}
                              />
                            ) : (
                              <div>{validation.values.no}</div>
                            )}
                            {validation.touched.no && validation.errors.no && (
                              <FormFeedback>{validation.errors.no as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="success-date-field" className="form-label">
                              Başarı Tarihi
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <Flatpickr
                                className="form-control"
                                name="successDate"
                                id="success-date-field"
                                placeholder="Tarih Seçiniz"
                                options={{
                                  dateFormat: "d/m/Y H:i",
                                  altInput: true,
                                  altFormat: "d/m/Y H:i",
                                  enableTime: true,
                                }}
                                value={validation.values.successDate || ""}
                                onChange={(date) => {
                                  if (date[0]) {
                                    validation.setFieldValue("successDate", moment(date[0]).format("YYYY-MM-DD HH:mm"));
                                  }
                                }}
                              />
                            ) : (
                              <div>{validation.values.successDate}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="success-note-field" className="form-label">
                              Başarı Notu
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <DebouncedInput
                                name="successNote"
                                id="success-note-field"
                                className="form-control"
                                type="textarea"
                                rows={3}
                                onChange={debouncedHandleChange}
                                onBlur={validation.handleBlur}
                                value={validation.values.successNote || ""}
                              />
                            ) : (
                              <div>{validation.values.successNote}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="transactionDate-field" className="form-label">
                              İşlem Tarihi
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <Flatpickr
                                className="form-control"
                                name="transactionDate"
                                id="transactionDate-field"
                                placeholder="Tarih Seçiniz"
                                options={{
                                  dateFormat: "d/m/Y H:i",
                                  altInput: true,
                                  altFormat: "d/m/Y H:i",
                                  enableTime: true,
                                }}
                                value={validation.values.transactionDate}
                                onChange={(date) => {
                                  if (date[0]) {
                                    validation.setFieldValue("transactionDate", moment(date[0]).format("YYYY-MM-DD HH:mm"));
                                  } else {
                                    validation.setFieldValue("transactionDate", moment().format("YYYY-MM-DD HH:mm"));
                                  }
                                }}
                              />
                            ) : (
                              <div>{validation.values.transactionDate}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="transaction-note-field" className="form-label">
                              İşlem Notu
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <DebouncedInput
                                name="transactionNote"
                                id="transaction-note-field"
                                className="form-control"
                                type="textarea"
                                rows={3}
                                onChange={debouncedHandleChange}
                                onBlur={validation.handleBlur}
                                value={validation.values.transactionNote || ""}
                              />
                            ) : (
                              <div>{validation.values.transactionNote}</div>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="channelId-field" className="form-label">
                              Kanal
                            </Label>
                          </Col>
                          <Col md={8}>
                              {!isDetail ? (
                                <Select
                                options={channelOptions}
                                name="channelId"
                                  onChange={(selected: any) =>
                                  validation.setFieldValue("channelId", selected?.value)
                                  }
                                  value={
                                  validation.values.channelId
                                      ? {
                                        value: validation.values.channelId,
                                          label:
                                          channelOptions.find((c) => c.value === validation.values.channelId)?.label || "",
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  isDisabled={isDetail}
                                  isLoading={channelsLoading}
                                />
                              ) : (
                                <div>
                                {channelOptions.find((c) => c.value === validation.values.channelId)?.label}
                                </div>
                              )}
                            {validation.touched.channelId && validation.errors.channelId && (
                              <FormFeedback>{validation.errors.channelId as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Label htmlFor="amount-field" className="form-label">
                              Tutar
                            </Label>
                          </Col>
                          <Col md={8}>
                            {!isDetail ? (
                              <Input
                                name="amount"
                                id="amount-field"
                                className="form-control"
                                type="number"
                                onChange={validation.handleChange}
                                onBlur={validation.handleBlur}
                                value={validation.values.amount}
                                invalid={validation.touched.amount && validation.errors.amount ? true : false}
                              />
                            ) : (
                              <div>{validation.values.amount}</div>
                            )}
                            {validation.touched.amount && validation.errors.amount && (
                              <FormFeedback>{validation.errors.amount as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                      </ModalBody>
                      <ModalFooter>
                        <div className="hstack gap-2 justify-content-end">
                          <button type="button" className="btn btn-light" onClick={handleClose}>
                            İptal
                          </button>
                          {!isDetail && (
                            <button type="submit" className="btn btn-success" id="add-btn" disabled={isSubmitting}>
                              {/* 
                                API Endpoint for Save button:
                                createTransaction mutation with fields:
                                - typeId (required)
                                - statusId (required)
                                - accountId (required)
                                - assignedUserId (required)
                                - channelId (required)
                                - amount (required)
                                - transactionDate (required)
                                - no, note and other fields are optional
                              */}
                              {isSubmitting ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Kaydediliyor...
                                </>
                              ) : (
                                "Kaydet"
                              )}
                          </button>
                        )}
                        </div>
                      </ModalFooter>
                    </Form>
                  </Modal>
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