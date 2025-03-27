import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Col,
  Container,
  Row,
  Card,
  CardHeader,
  CardBody,
  Input,
  ModalHeader,
  ModalBody,
  Label,
  ModalFooter,
  Modal,
  Form,
  FormFeedback,
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import moment from "moment";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import DeleteModal from "../../../Components/Common/DeleteModal";

// Tablo bileşeni
import TableContainer from "../../../Components/Common/TableContainer";

// Formik ve Yup
import * as Yup from "yup";
import { useFormik } from "formik";

import Loader from "../../../Components/Common/Loader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";
import { 
  useQuery, 
  useLazyQuery, 
  useMutation, 
  ApolloClient, 
  InMemoryCache,
  ApolloProvider,
  createHttpLink,
  from,
  ApolloLink,
  HttpLink
} from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import TransactionFilter, { TransactionFilterState } from "./transactions";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { 
  GET_TRANSACTIONS, 
  GET_TRANSACTION, 
  GET_TRANSACTION_TYPES, 
  GET_TRANSACTION_STATUSES,
  GET_USERS_LOOKUP
} from "../../../graphql/queries/transactionQueries";
import { CREATE_TRANSACTION, UPDATE_TRANSACTION, DELETE_TRANSACTION } from "../../../graphql/mutations/transactionMutations";
import { Transaction, Role, SelectOption, PaginatedResponse } from "../../../types/graphql";

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

// Create Apollo Client with combined links
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
  },
});

// Helper function to get context for individual queries
const getAuthorizationLink = () => {
  return {
    headers: {
      Authorization: getAuthHeader() ?? '',
    }
  };
};

// Extend the Transaction type to include createdAt
interface TransactionWithCreatedAt extends Transaction {
  createdAt?: string;
}

// Define GetTransactionsDTO for TypeScript type checking
interface GetTransactionsDTO {
  pageSize: number;
  pageIndex: number;
  text?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  statusIds?: string[] | null;
  typeIds?: string[] | null;
  accountIds?: string[] | null;
  assignedUserIds?: string[] | null;
  createdAtStart?: string | null;
  createdAtEnd?: string | null;
}

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
      return null;
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
      if (error.networkError.result) {
        console.error("Network Error Result:", JSON.stringify(error.networkError.result, null, 2));
      }
      if (error.networkError.statusCode) {
        console.error("Status Code:", error.networkError.statusCode);
      }
    }
    
    toast.error("Transaction verileri yüklenirken hata oluştu: " + error.message);
    return null;
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
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
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

  // Delete transaction mutation
  const [deleteTransaction] = useMutation(DELETE_TRANSACTION, {
    context: getAuthorizationLink(),
    onCompleted: () => {
      toast.success("Transaction başarıyla silindi.");
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error deleting transaction:", error);
      toast.error("Transaction silinirken hata oluştu.");
    }
  });

  // Add mutation hooks for transaction operations
  const [createTransaction] = useMutation(CREATE_TRANSACTION, {
    context: getAuthorizationLink(),
    onCompleted: () => {
      toast.success("Transaction başarıyla eklendi.");
      handleClose();
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error creating transaction:", error);
      toast.error("Transaction eklenirken hata oluştu: " + error.message);
    }
  });

  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    context: getAuthorizationLink(),
    onCompleted: () => {
      toast.success("Transaction başarıyla güncellendi.");
      handleClose();
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error updating transaction:", error);
      toast.error("Transaction güncellenirken hata oluştu: " + error.message);
    }
  });

  // Sayfa ilk yüklendiğinde URL parametrelerine göre içeriği yükle
  const fetchInitialData = async () => {
    console.log("fetchInitialData başlatıldı");
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      // LocalStorage'dan kaydedilmiş filtreleri oku (varsa)
      let storedFilters = null;
      try {
        const storedFiltersString = localStorage.getItem("agile_transactions_filters");
        if (storedFiltersString) {
          storedFilters = JSON.parse(storedFiltersString);
        }
      } catch (error) {
        console.error("Kaydedilmiş filtreler okunurken hata:", error);
      }
      
      // URL parametrelerini al
      const params = new URLSearchParams(location.search);
      const pageIndexParam = params.get('pageIndex') ? parseInt(params.get('pageIndex')!) : 0;
      const pageSizeParam = params.get('pageSize') ? parseInt(params.get('pageSize')!) : 10;
      const searchTextParam = params.get('title') || "";
      const orderByParam = params.get('orderBy') || "createdAt";
      const orderDirectionParam = (params.get('orderDirection') as "ASC" | "DESC") || "DESC";
      const statusParam = params.get('status');
      const createdAtStartParam = params.get('createdAtStart') || undefined;
      const createdAtEndParam = params.get('createdAtEnd') || undefined;
      const rolesParam = params.get('roles');
      
      // Diğer filtre değerlerini belirleyelim...
      let activeFilterValue = null;
      if (statusParam !== null) {
        activeFilterValue = statusParam.toLowerCase() === "aktif";
      } else if (storedFilters && storedFilters.status) {
        activeFilterValue = storedFilters.status.value === "Aktif";
      }
      
      let roleIds = null;
      if (rolesParam) {
        roleIds = rolesParam.split(',');
      } else if (storedFilters && storedFilters.roles && storedFilters.roles.length > 0) {
        roleIds = storedFilters.roles.map((role: { value: string }) => role.value);
      }
      
      // Önemli: Parent state'i de güncelleyelim
      setPageIndex(pageIndexParam);
      setPageSize(pageSizeParam);
      
      console.log("Veri yükleme öncesi parametreler:", {
        pageIndex: pageIndexParam,
        pageSize: pageSizeParam,
        searchText: searchTextParam,
        orderBy: orderByParam,
        orderDirection: orderDirectionParam,
        activeFilter: activeFilterValue,
        createdAtStart: createdAtStartParam,
        createdAtEnd: createdAtEndParam,
        roleIds
      });
      
      // Filtre değerleriyle veri yükle
      // @ts-ignore - Bypass type checking for loadData parameters temporarily
      await loadData({
        pageIndex: pageIndexParam,
        pageSize: pageSizeParam,
        searchText: searchTextParam,
        orderBy: orderByParam,
        orderDirection: orderDirectionParam,
        activeFilter: activeFilterValue,
        createdAtStart: createdAtStartParam,
        createdAtEnd: createdAtEndParam,
        roleIds,
        updateUrl: false // URL'yi güncelleme, çünkü zaten URL parametrelerini kullanıyoruz
      });
      
      console.log("Veri yükleme tamamlandı, allTransactions:", allTransactions.length, "filteredTransactions:", filteredTransactions.length);
      
    } catch (error) {
      console.error("Veri yüklenirken hata oluştu:", error);
      toast.error("Veriler yüklenirken bir hata oluştu.");
      setError("Veri yüklenirken hata oluştu. Lütfen sayfayı yenileyin.");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (customParams?: { 
    pageSize?: number; 
    pageIndex?: number; 
    searchText?: string;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
    updateUrl?: boolean;
    roleIds?: string[];
    createdAtStart?: string;
    createdAtEnd?: string;
    activeFilter?: boolean | null;
  }) => {
    // Clear errors and set loading state
    setError(null);
    setLoading(true);
    
    try {
      // @ts-ignore - Temporarily ignore TypeScript errors to fix the GraphQL issue
      const data = await fetchTransactionData({
        pageSize: 10,
        pageIndex: 0
      });
      
      console.log("API response:", data);
      
      // Create temporary values for missing variables
      const searchTextParam = searchText;
      let formattedStartDate = null;
      let formattedEndDate = null;
      const apiOrderBy = orderBy;
      const apiOrderDirection = orderDirection;
      
      if (data && data.items) {
        console.log("Alınan transaction sayısı:", data.items.length);
        const formattedData = data.items.map((item: TransactionWithCreatedAt) => ({
          ...item,
          // Format dates for the UI
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        console.log("Formatlanmış veri:", formattedData);
        setAllTransactions(formattedData);
        setFilteredTransactions(formattedData);
        setItemCount(data.itemCount);
        setPageCount(data.pageCount);

        // API dönüşü sonrası state güncellemeleri
        if (customParams?.orderBy) {
          setOrderBy(customParams.orderBy);
        }
        if (customParams?.orderDirection) {
          setOrderDirection(customParams.orderDirection);
        }
        if (searchTextParam !== undefined) {
          setSearchText(searchTextParam);
        }
        
        // sortConfig state'ini de güncelleyelim
        if (customParams?.orderBy && customParams?.orderDirection) {
          // API'deki sütun adını UI sütun adına dönüştürme
          let columnKey = customParams.orderBy;
          // Özel sütun eşleştirmeleri - API adı -> UI adı
          const columnMappingsReverse: { [key: string]: string } = {
            "fullName": "fullName",
            "username": "username",
            "role.name": "role",
            "isActive": "status",
            "createdAt": "date"
          };
          
          // Eğer özel sütun eşleştirmelerinde varsa, UI adını kullan
          Object.entries(columnMappingsReverse).forEach(([apiName, uiName]) => {
            if (customParams.orderBy === apiName) {
              columnKey = uiName;
            }
          });
          
          setSortConfig({
            key: columnKey,
            direction: customParams.orderDirection.toLowerCase() as "asc" | "desc"
          });
          
          console.log("Sıralama güncellendi:", columnKey, customParams.orderDirection.toLowerCase());
        }
        
        // URL'yi güncelle (eğer updateUrl parametresi true ise - varsayılan olarak true)
        const shouldUpdateUrl = customParams?.updateUrl !== false;
        if (shouldUpdateUrl) {
          updateUrlParams({
            ...customParams,
            searchText: searchTextParam,
            createdAtStart: formattedStartDate,
            createdAtEnd: formattedEndDate,
            orderBy: apiOrderBy,
            orderDirection: apiOrderDirection
          });
        }
      } else {
        console.log("API'den veri alınamadı veya boş dönüş");
        setAllTransactions([]);
        setFilteredTransactions([]);
        setItemCount(0);
        setPageCount(0);
        setError("Veri bulunamadı. Filtreleri değiştirmeyi deneyin.");
      }
    } catch (error) {
      console.error("Veri yüklenirken hata oluştu:", error);
      toast.error("Veri yüklenirken hata oluştu.");
      setError("Veri yüklenirken hata oluştu. Lütfen sayfayı yenileyin.");
    } finally {
      setLoading(false);
    }
  };

  const updateUrlParams = (params: {
    searchText?: string;
    activeFilter?: boolean | null;
    createdAtStart?: string | null;
    createdAtEnd?: string | null;
    typeIds?: string[];
    assignedUserIds?: string[];
    productIds?: string[];
    cityIds?: string[];
    channelIds?: string[];
    countryId?: string | null;
    pageIndex?: number;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
  }) => {
    const queryParams = new URLSearchParams(location.search);
    
    // Create new URL parameters
    const newParams = new URLSearchParams();
    
    // Preserve existing pagination parameter
    const pageSize = queryParams.get("pageSize");
    if (pageSize) newParams.set("pageSize", pageSize);
    
    // Page index parameter
    if (params.pageIndex !== undefined) {
      newParams.set("pageIndex", params.pageIndex.toString());
    } else {
      const currentPageIndex = queryParams.get("pageIndex");
      if (currentPageIndex) newParams.set("pageIndex", currentPageIndex);
    }
    
    // Sorting parameters
    if (params.orderBy) {
      newParams.set("orderBy", params.orderBy);
    } else {
      const currentOrderBy = queryParams.get("orderBy");
      if (currentOrderBy) newParams.set("orderBy", currentOrderBy);
    }
    
    if (params.orderDirection) {
      newParams.set("orderDirection", params.orderDirection);
    } else {
      const currentOrderDirection = queryParams.get("orderDirection");
      if (currentOrderDirection) newParams.set("orderDirection", currentOrderDirection);
    }
    
    // Filter parameters - searchText parameter
    if (params.searchText !== undefined && params.searchText !== "") {
      newParams.set("searchText", params.searchText);
    } else {
      // Keep existing searchText if not specified
      const currentSearchText = queryParams.get("searchText");
      if (currentSearchText) newParams.set("searchText", currentSearchText);
    }
    
    // Status parameter
    if (params.activeFilter === true) {
      newParams.set("status", "Aktif");
    } else if (params.activeFilter === false) {
      newParams.set("status", "Pasif");
    } else if (params.activeFilter === null) {
      // If activeFilter is null, remove status parameter
      // This shows all status values (active/inactive)
      newParams.delete("status");
    } else if (params.activeFilter === undefined) {
      // If activeFilter isn't specified, keep existing value
      const currentStatus = queryParams.get("status");
      if (currentStatus) newParams.set("status", currentStatus);
    }
    
    // Date parameters
    if (params.createdAtStart) newParams.set("createdAtStart", params.createdAtStart);
    if (params.createdAtEnd) newParams.set("createdAtEnd", params.createdAtEnd);
    
    // Transaction type parameter
    if (params.typeIds && params.typeIds.length > 0) {
      newParams.set("typeIds", params.typeIds.join(","));
    }
    
    // Assigned users parameter
    if (params.assignedUserIds && params.assignedUserIds.length > 0) {
      newParams.set("assignedUserIds", params.assignedUserIds.join(","));
    }
    
    // Products parameter
    if (params.productIds && params.productIds.length > 0) {
      newParams.set("productIds", params.productIds.join(","));
    }
    
    // Cities parameter
    if (params.cityIds && params.cityIds.length > 0) {
      newParams.set("cityIds", params.cityIds.join(","));
    }
    
    // Channels parameter
    if (params.channelIds && params.channelIds.length > 0) {
      newParams.set("channelIds", params.channelIds.join(","));
    }
    
    // Country parameter
    if (params.countryId) {
      newParams.set("countryId", params.countryId);
    }
    
    // Update URL
    navigate({
      pathname: location.pathname,
      search: newParams.toString(),
    }, { replace: true });
  };

  // Sayfalama değişince bu fonksiyon çalışacak
  const handlePageChange = useCallback((newPage: number) => {
    console.log("Sayfa değişti:", newPage);
    
    // pageCount'u kontrol et, eğer newPage geçerli değilse işlem yapma
    if (newPage < 0 || (pageCount > 0 && newPage >= pageCount)) {
      console.log("Geçersiz sayfa numarası:", newPage);
      return;
    }
    
    setPageIndex(newPage);
    
    // API'den yeni sayfayı yükle
    loadData({
      pageIndex: newPage,
      updateUrl: true
    });
    
    // URL'yi güncelle
    updateUrlParams({
      pageIndex: newPage
    });
  }, [pageCount, loadData, updateUrlParams]);
  
  // Sayfa başına öğe sayısı değişince bu fonksiyon çalışacak
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    console.log("Sayfa boyutu değişti:", newPageSize);
    setPageSize(newPageSize);
    setPageIndex(0); // Sayfa boyutu değiştiğinde ilk sayfaya dön
    
    // API'den yeni sayfayı yükle
    loadData({
      pageSize: newPageSize,
      pageIndex: 0,
      updateUrl: true
    });
    
    // URL'yi güncelle, pageSize parametresini de ekle
    const params = new URLSearchParams(location.search);
    params.set("pageSize", newPageSize.toString());
    params.set("pageIndex", "0");
    
    navigate({
      pathname: location.pathname,
      search: params.toString()
    }, { replace: true });
  }, [loadData, navigate, location]);

  // Sıralama fonksiyonunu güncelle
  const handleSort = (column: string) => {
    // API ve UI arasındaki kolon isim eşleştirmesi
    const columnMappings: { [key: string]: string } = {
      "fullName": "fullName",
      "username": "username",
      "role": "role.name",
      "status": "isActive",
      "date": "createdAt"
    };
    
    let apiColumn = columnMappings[column] || column;
    console.log("Tıklanan kolon:", column, "API kolonu:", apiColumn);
    
    // Şu anki sıralama durumunu kontrol edip, yeni sıralama yönünü belirle
    let direction: "ASC" | "DESC";
    let uiDirection: "asc" | "desc";
    
    if (sortConfig && sortConfig.key === column) {
      // Aynı kolona tekrar tıklandığında sıralama yönünü değiştir
      // UI state için lowercase, API state için uppercase kullanıyoruz
      uiDirection = sortConfig.direction === "asc" ? "desc" : "asc";
      direction = uiDirection.toUpperCase() as "ASC" | "DESC";
    } else {
      // Yeni bir kolona tıklandığında varsayılan sıralama: azalan
      direction = "DESC";
      uiDirection = "desc";
    }
    
    console.log("Sıralama yönü (API):", direction);
    console.log("Sıralama yönü (UI):", uiDirection);
    
    // UI ve API state'lerini güncelle
    setSortConfig({ key: column, direction: uiDirection });
    setOrderBy(apiColumn);
    setOrderDirection(direction);
  
    // Load data from API with new sorting
    loadData({
      orderBy: apiColumn,
      orderDirection: direction
    });
  };

  // Form validation for transaction
  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: (transaction && transaction.id) || "",
      amount: (transaction && transaction.amount) || 0,
      details: (transaction && transaction.details) || "",
      no: (transaction && transaction.no) || "",
      note: (transaction && transaction.note) || "",
      typeId: (transaction && transaction.type?.id) || "",
      statusId: (transaction && transaction.status?.id) || "",
      accountId: (transaction && transaction.account?.id) || "",
      assignedUserId: (transaction && transaction.assignedUser?.id) || "",
      date: transaction && transaction.createdAt ? moment(transaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
    },
    validationSchema: Yup.object({
      amount: Yup.number().required("Tutar alanı zorunludur"),
      typeId: Yup.string().required("İşlem tipi seçimi zorunludur"),
      statusId: Yup.string().required("Durum seçimi zorunludur"),
      accountId: Yup.string().required("Hesap seçimi zorunludur"),
      assignedUserId: Yup.string().required("Atanan kullanıcı seçimi zorunludur"),
    }),
    onSubmit: async (values) => {
      if (isEdit) {
        try {
          await updateTransaction({
            variables: {
              input: {
                id: values.id,
                amount: values.amount,
                details: values.details,
                no: values.no,
                note: values.note,
                typeId: values.typeId,
                statusId: values.statusId,
                accountId: values.accountId,
                assignedUserId: values.assignedUserId
              }
            },
            context: getAuthorizationLink()
          });
        } catch (error) {
          console.error("Error updating transaction:", error);
        }
      } else {
        try {
          await createTransaction({
            variables: {
              input: {
                amount: values.amount,
                details: values.details,
                no: values.no,
                note: values.note,
                typeId: values.typeId,
                statusId: values.statusId,
                accountId: values.accountId,
                assignedUserId: values.assignedUserId
              }
            },
            context: getAuthorizationLink()
          });
        } catch (error) {
          console.error("Error creating transaction:", error);
        }
      }
    },
  });

  const handleClose = () => {
    // Modal kapanırken tüm form durumlarını sıfırlayalım
    validation.resetForm();
    setIsEdit(false);
    setIsDetail(false);
    setTransaction(null);
    setModal(false);
    
    // Filtrelerle birlikte sayfa verilerini yeniden yükle
    fetchInitialData();
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
        details: selectedTransaction.details || "",
        no: selectedTransaction.no || "",
        note: selectedTransaction.note || "",
        typeId: selectedTransaction.type?.id || "",
        statusId: selectedTransaction.status?.id || "",
        accountId: selectedTransaction.account?.id || "",
        assignedUserId: selectedTransaction.assignedUser?.id || "",
        date: selectedTransaction.createdAt ? moment(selectedTransaction.createdAt).format("DD.MM.YYYY") : "",
      });
      setModal(true);
    },
    [validation]
  );

  const handleDetailClick = useCallback(
    async (selectedTransaction: any) => {
      try {
        const transactionDetail = await fetchTransactionDetail(selectedTransaction.id);
        if (transactionDetail) {
          setTransaction(transactionDetail);
          setIsDetail(true);
          setIsEdit(false);
          // Formik değerlerini ayarlayalım
          validation.setValues({
            id: transactionDetail.id || "",
            amount: transactionDetail.amount || 0,
            details: transactionDetail.details || "",
            no: transactionDetail.no || "",
            note: transactionDetail.note || "",
            typeId: transactionDetail.type?.id || "",
            statusId: transactionDetail.status?.id || "",
            accountId: transactionDetail.account?.id || "",
            assignedUserId: transactionDetail.assignedUser?.id || "",
            date: transactionDetail.createdAt ? moment(transactionDetail.createdAt).format("DD.MM.YYYY") : "",
          });
          setModal(true);
        }
      } catch (error) {
        console.error("Error fetching transaction detail:", error);
      }
    },
    [validation]
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validation.handleSubmit();
    return false;
  };

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
    
    // Event listener for the Add button click in TransactionFilter
    const handleAddButtonClick = () => {
      setTransaction(null);
      setModal(true);
      setIsEdit(false);
      setIsDetail(false);
      validation.resetForm(); // Reset the form values
    };
    
    window.addEventListener('TransactionsAddClick', handleAddButtonClick);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('TransactionsAddClick', handleAddButtonClick);
    };
  }, []);  // Sadece bileşen monte olduğunda çalışacak

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
                        const result = await handleFilterApply(filters);
                        return result; // Promise döndür
                      } catch (error) {
                        console.error("Filtre uygulama hatası:", error);
                        return []; // Hata durumunda boş dizi döndür
                      }
                    }}
                    key={`${location.search}-${new Date().getTime()}`} // Benzersiz key ile formun her açılışta yenilenmesini sağlıyoruz
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
                  <Modal id="showModal" isOpen={modal} toggle={toggle} centered>
                    <ModalHeader className="bg-light p-3" toggle={toggle}>
                      Transaction
                    </ModalHeader>
                    <Form className="tablelist-form" onSubmit={handleSubmit}>
                      <ModalBody>
                        <Input type="hidden" id="id-field" />
                        <Row className="g-3">
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="amount-field" className="form-label me-2 mb-0 w-25">
                                Tutar
                              </Label>
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
                            </div>
                            {validation.touched.amount && validation.errors.amount && (
                              <FormFeedback>{validation.errors.amount as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="no-field" className="form-label me-2 mb-0 w-25">
                                No
                              </Label>
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
                            </div>
                            {validation.touched.no && validation.errors.no && (
                              <FormFeedback>{validation.errors.no as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="details-field" className="form-label me-2 mb-0 w-25">
                                Detaylar
                              </Label>
                              {!isDetail ? (
                                <Input
                                  name="details"
                                  id="details-field"
                                  className="form-control"
                                  type="textarea"
                                  onChange={validation.handleChange}
                                  onBlur={validation.handleBlur}
                                  value={validation.values.details}
                                  invalid={validation.touched.details && validation.errors.details ? true : false}
                                />
                              ) : (
                                <div>{validation.values.details}</div>
                              )}
                            </div>
                            {validation.touched.details && validation.errors.details && (
                              <FormFeedback>{validation.errors.details as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="note-field" className="form-label me-2 mb-0 w-25">
                                Not
                              </Label>
                              {!isDetail ? (
                                <Input
                                  name="note"
                                  id="note-field"
                                  className="form-control"
                                  type="textarea"
                                  onChange={validation.handleChange}
                                  onBlur={validation.handleBlur}
                                  value={validation.values.note}
                                  invalid={validation.touched.note && validation.errors.note ? true : false}
                                />
                              ) : (
                                <div>{validation.values.note}</div>
                              )}
                            </div>
                            {validation.touched.note && validation.errors.note && (
                              <FormFeedback>{validation.errors.note as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="typeId-field" className="form-label me-2 mb-0 w-25">
                                İşlem Tipi
                              </Label>
                              {!isDetail ? (
                                <Select
                                  options={roleOptions}
                                  name="typeId"
                                  onChange={(selected: any) =>
                                    validation.setFieldValue("typeId", selected?.value)
                                  }
                                  value={
                                    validation.values.typeId
                                      ? {
                                          value: validation.values.typeId,
                                          label:
                                            roleOptions.find((r) => r.value === validation.values.typeId)?.label || "",
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  className="flex-grow-1"
                                  isDisabled={isDetail}
                                />
                              ) : (
                                <div>
                                  {roleOptions.find((r) => r.value === validation.values.typeId)?.label}
                                </div>
                              )}
                            </div>
                            {validation.touched.typeId && validation.errors.typeId && (
                              <FormFeedback>{validation.errors.typeId as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="statusId-field" className="form-label me-2 mb-0 w-25">
                                Durum
                              </Label>
                              {!isDetail ? (
                                <Select
                                  options={roleOptions}
                                  name="statusId"
                                  onChange={(selected: any) =>
                                    validation.setFieldValue("statusId", selected?.value)
                                  }
                                  value={
                                    validation.values.statusId
                                      ? {
                                          value: validation.values.statusId,
                                          label:
                                            roleOptions.find((r) => r.value === validation.values.statusId)?.label || "",
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  className="flex-grow-1"
                                  isDisabled={isDetail}
                                />
                              ) : (
                                <div>
                                  {roleOptions.find((r) => r.value === validation.values.statusId)?.label}
                                </div>
                              )}
                            </div>
                            {validation.touched.statusId && validation.errors.statusId && (
                              <FormFeedback>{validation.errors.statusId as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="accountId-field" className="form-label me-2 mb-0 w-25">
                                Hesap
                              </Label>
                              {!isDetail ? (
                                <Select
                                  options={roleOptions}
                                  name="accountId"
                                  onChange={(selected: any) =>
                                    validation.setFieldValue("accountId", selected?.value)
                                  }
                                  value={
                                    validation.values.accountId
                                      ? {
                                          value: validation.values.accountId,
                                          label:
                                            roleOptions.find((r) => r.value === validation.values.accountId)?.label || "",
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  className="flex-grow-1"
                                  isDisabled={isDetail}
                                />
                              ) : (
                                <div>
                                  {roleOptions.find((r) => r.value === validation.values.accountId)?.label}
                                </div>
                              )}
                            </div>
                            {validation.touched.accountId && validation.errors.accountId && (
                              <FormFeedback>{validation.errors.accountId as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="assignedUserId-field" className="form-label me-2 mb-0 w-25">
                                Atanan Kullanıcı
                              </Label>
                              {!isDetail ? (
                                <Select
                                  options={roleOptions}
                                  name="assignedUserId"
                                  onChange={(selected: any) =>
                                    validation.setFieldValue("assignedUserId", selected?.value)
                                  }
                                  value={
                                    validation.values.assignedUserId
                                      ? {
                                          value: validation.values.assignedUserId,
                                          label:
                                            roleOptions.find((r) => r.value === validation.values.assignedUserId)?.label || "",
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  className="flex-grow-1"
                                  isDisabled={isDetail}
                                />
                              ) : (
                                <div>
                                  {roleOptions.find((r) => r.value === validation.values.assignedUserId)?.label}
                                </div>
                              )}
                            </div>
                            {validation.touched.assignedUserId && validation.errors.assignedUserId && (
                              <FormFeedback>{validation.errors.assignedUserId as string}</FormFeedback>
                            )}
                          </Col>
                        </Row>
                      </ModalBody>
                      <ModalFooter>
                        {!isDetail ? (
                          <button type="submit" className="btn btn-success w-100">
                            Kaydet
                          </button>
                        ) : (
                          <button type="button" className="btn btn-light w-100" onClick={handleClose}>
                            Kapat
                          </button>
                        )}
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