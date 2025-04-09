import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Button,
  Table,
  Badge
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";

import Select from "react-select";
import { useMutation, useQuery, useLazyQuery, ApolloClient, InMemoryCache, createHttpLink, ApolloProvider } from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DeleteModal from "../../../Components/Common/DeleteModal";
import Loader from "../../../Components/Common/Loader";
import AccountFilter, { AccountFilterState } from "./AccountFiler";
// Import DB
import {
  CREATE_ACCOUNT,
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT,
} from "../../../graphql/mutations/accountMutations";
import { 
  GET_ACCOUNTS, 
  GET_ACCOUNT,
  GET_USERS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS,
  GET_SEGMENTS,
  GET_ACCOUNT_TYPES
} from "../../../graphql/queries/accountQueries";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { useParams } from "react-router-dom";
import { PaginatedResponse, GetAccountsDTO, Account, SelectOption } from "../../../types/graphql";
import { ApolloError } from "@apollo/client";

// Add import for DebouncedInput 
import DebouncedInput from "../../../Components/Common/DebouncedInput";

// Import section
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import moment from "moment";

// Import the new AccountFormModal component
import AccountFormModal from "./AccountFormModal";

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

interface AccountWithCreatedAt extends Partial<Account> {
  createdAt?: string;
  date?: string; // UI formatting field
  // Additional fields needed for UI
  address?: string;
  postalCode?: string;
  country?: string | any;
  city?: string | any;
  district?: string | any;
  neighborhood?: string;
  no?: string;
  accountType?: any;
  accountTypes?: any[];
  segments?: any[];
  assignedUser?: any;
}

// A function to fetch accounts data
async function fetchAccountsData({
  pageSize = 10,
  pageIndex = 0,
  text = "",
  orderBy = "createdAt",
  orderDirection = "DESC" as "ASC" | "DESC",
  assignedUserIds = null,
  createdAtStart = null,
  createdAtEnd = null,
  cityIds = null,
  countryId = null,
  segmentIds = null,
  accountTypeIds = null,
  channelIds = null
}: GetAccountsDTO = {pageSize: 10, pageIndex: 0}): Promise<PaginatedResponse<Account> | null> {
  try {
    // Create the input object for the API call
    const input = { 
      pageSize, 
      pageIndex, 
      text,
      orderBy,
      orderDirection,
      assignedUserIds,
      createdAtStart,
      createdAtEnd,
      cityIds,
      countryId,
      segmentIds,
      accountTypeIds,
      channelIds
    };
    
    // Initial API call with provided parameters - using network-only to ensure fresh data
    const result = await client.query({
      query: GET_ACCOUNTS,
      variables: { input },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only"
    });
    
    if (result.data && result.data.getAccounts) {
      return result.data.getAccounts;
    } else {
      console.error("API returned empty or invalid data");
      return null;
    }
  } catch (error) {
    // Handle specific Apollo errors
    if (error instanceof ApolloError) {
      console.error("Apollo error while fetching accounts:", error.message);
      
      // Check for network errors
      if (error.networkError) {
        console.error("Network error details:", error.networkError);
        toast.error("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.");
      } 
      // Check for GraphQL errors
      else if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error("GraphQL errors:", error.graphQLErrors);
        const errorMessage = error.graphQLErrors[0].message;
        toast.error(`Veri alınırken hata oluştu: ${errorMessage}`);
      }
      // Generic Apollo error
      else {
        toast.error("Hesaplar yüklenirken bir hata oluştu");
      }
    } 
    // Handle general errors
    else {
      console.error("Error fetching accounts data:", error);
      toast.error("Hesaplar yüklenirken beklenmeyen bir hata oluştu");
    }
    
    return null;
  }
}

// A function to fetch account detail
async function fetchAccountDetail(accountId: string): Promise<AccountWithCreatedAt | null> {
  try {
    console.log("Fetching account detail for ID:", accountId);
    
    const result = await client.query({
      query: GET_ACCOUNT,
      variables: { id: accountId },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only"
    });
    
    if (result.data && result.data.getAccount) {
      console.log("Account detail fetched successfully:", result.data.getAccount);
      return result.data.getAccount;
    } else {
      console.error("API returned empty or invalid account data");
      toast.error("Hesap detayı bulunamadı");
      return null;
    }
  } catch (error) {
    // Handle specific Apollo errors
    if (error instanceof ApolloError) {
      console.error("Apollo error while fetching account detail:", error.message);
      
      // Check for network errors
      if (error.networkError) {
        console.error("Network error details:", error.networkError);
        toast.error("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.");
      } 
      // Check for GraphQL errors
      else if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error("GraphQL errors:", error.graphQLErrors);
        const errorMessage = error.graphQLErrors[0].message;
        toast.error(`Hesap detayı alınırken hata oluştu: ${errorMessage}`);
      }
      // Generic Apollo error
      else {
        toast.error("Hesap detayı yüklenirken bir hata oluştu");
      }
    } 
    // Handle general errors
    else {
      console.error("Error fetching account detail:", error);
      toast.error("Hesap detayı yüklenirken beklenmeyen bir hata oluştu");
    }
    return null;
  }
}

// Main component for the Accounts page
const AccountsContent: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountWithCreatedAt[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({
    key: "createdAt",
    direction: "desc"
  });
  
  // State for form 
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Filter states
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [segmentOptions, setSegmentOptions] = useState<SelectOption[]>([]);
  const [accountTypeOptions, setAccountTypeOptions] = useState<SelectOption[]>([]);
  
  // URL parameter handling
  const location = useLocation();
  const navigate = useNavigate();
  
  // Error handling function
  const handleError = (message: string) => {
    toast.error(message);
    console.error(message);
  };
  
  // Fetch data with current filters
  const fetchDataWithCurrentFilters = useCallback(async () => {
    try {
      // Parse URL parameters for filtering
      const params = new URLSearchParams(location.search);
      const urlOrderDirection = params.get("orderDirection")?.toUpperCase();
      
      // Cast the direction to the proper type
      let orderDirection: "ASC" | "DESC" | null = null;
      if (urlOrderDirection === "ASC") {
        orderDirection = "ASC";
      } else if (urlOrderDirection === "DESC") {
        orderDirection = "DESC";
      } else if (sortConfig?.direction) {
        orderDirection = sortConfig.direction.toUpperCase() as "ASC" | "DESC";
      } else {
        orderDirection = "DESC";
      }
      
      const urlParams = {
        pageIndex: parseInt(params.get("page") || "0"),
        pageSize: parseInt(params.get("size") || "10"),
        text: params.get("search") || "",
        assignedUserIds: params.get("assignedUsers") ? params.get("assignedUsers")?.split(",") : null,
        createdAtStart: params.get("startDate") || null,
        createdAtEnd: params.get("endDate") || null,
        cityIds: params.get("cities") ? params.get("cities")?.split(",") : null,
        countryId: params.get("country") || null,
        segmentIds: params.get("segments") ? params.get("segments")?.split(",") : null,
        accountTypeIds: params.get("accountTypes") ? params.get("accountTypes")?.split(",") : null,
        channelIds: params.get("channels") ? params.get("channels")?.split(",") : null,
        orderBy: params.get("orderBy") || sortConfig?.key || "createdAt",
        orderDirection
      };
      
      console.log("Fetching data with URL parameters:", urlParams);
      
      // Make the API call with a timeout to avoid UI freezes
      setTimeout(async () => {
        const result = await fetchAccountsData(urlParams);
        
        if (result) {
          setAccounts(result.items as AccountWithCreatedAt[]);
          setPageCount(result.pageCount);
          setTotalCount(result.itemCount);
          setCurrentPage(urlParams.pageIndex);
          setPageSize(urlParams.pageSize);
          setSearchText(urlParams.text);
          
          // Update sort config from URL if present
          if (params.has('orderBy') && params.has('orderDirection')) {
            const orderBy = params.get('orderBy') || 'createdAt';
            const orderDirection = (params.get('orderDirection')?.toLowerCase() || 'desc') as 'asc' | 'desc';
            
            setSortConfig({
              key: orderBy,
              direction: orderDirection
            });
          }
        }
        setLoading(false);
      }, 0);
    } catch (error) {
      handleError("Hesap verileri yüklenirken bir hata oluştu");
      setLoading(false);
    }
  }, [location.search, sortConfig]);
  
  // Add a new reference to track initial loading
  const initialLoadingRef = useRef<boolean>(true);

  // Modify the fetchInitialData function to be more efficient
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      initialLoadingRef.current = true;
      
      // Start loading reference data and account data in parallel
      const referenceDataPromise = Promise.all([
        loadCountries(),
        loadUserOptions(),
        loadSegmentOptions(),
        loadAccountTypeOptions()
      ]);
      
      // Parse URL parameters for immediate data fetch
      const params = new URLSearchParams(location.search);
      const urlOrderDirection = params.get("orderDirection")?.toUpperCase();
      
      // Cast the direction to the proper type
      let orderDirection: "ASC" | "DESC" | null = null;
      if (urlOrderDirection === "ASC") {
        orderDirection = "ASC";
      } else if (urlOrderDirection === "DESC") {
        orderDirection = "DESC";
      } else if (sortConfig?.key) {
        orderDirection = sortConfig.direction.toUpperCase() as "ASC" | "DESC";
      } else {
        orderDirection = "DESC";
      }
      
      const urlParams = {
        pageIndex: parseInt(params.get("page") || "0"),
        pageSize: parseInt(params.get("size") || "10"),
        text: params.get("search") || "",
        assignedUserIds: params.get("assignedUsers") ? params.get("assignedUsers")?.split(",") : null,
        createdAtStart: params.get("startDate") || null,
        createdAtEnd: params.get("endDate") || null,
        cityIds: params.get("cities") ? params.get("cities")?.split(",") : null,
        countryId: params.get("country") || null,
        segmentIds: params.get("segments") ? params.get("segments")?.split(",") : null,
        accountTypeIds: params.get("accountTypes") ? params.get("accountTypes")?.split(",") : null,
        channelIds: params.get("channels") ? params.get("channels")?.split(",") : null,
        orderBy: params.get("orderBy") || sortConfig?.key || "createdAt",
        orderDirection
      };
      
      // Start both data loads in parallel for faster loading
      const [_, accountsResult] = await Promise.all([
        referenceDataPromise,
        fetchAccountsData(urlParams)
      ]);
      
      if (accountsResult) {
        setAccounts(accountsResult.items as AccountWithCreatedAt[]);
        setPageCount(accountsResult.pageCount);
        setTotalCount(accountsResult.itemCount);
        setCurrentPage(urlParams.pageIndex);
        setPageSize(urlParams.pageSize);
        setSearchText(urlParams.text);
        
        // Update sort config from URL if present
        if (params.has('orderBy') && params.has('orderDirection')) {
          const orderBy = params.get('orderBy') || 'createdAt';
          const orderDirection = (params.get('orderDirection')?.toLowerCase() || 'desc') as 'asc' | 'desc';
          
          setSortConfig({
            key: orderBy,
            direction: orderDirection
          });
        }
      }
    } catch (error) {
      handleError("Veri yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
      initialLoadingRef.current = false;
    }
  };
  
  // Load functions for reference data
  const loadCountries = async () => {
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
  
  // Load cities based on country
  const loadCities = async (countryId: string) => {
    try {
      const { data } = await client.query({
        query: GET_CITIES,
        variables: { countryId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getCities) {
        const options = data.getCities.map((city: any) => ({
          value: city.id,
          label: city.name
        }));
        setCityOptions(options);
      }
    } catch (error) {
      handleError("Şehir verileri yüklenirken bir hata oluştu");
    }
  };
  
  const loadSegmentOptions = async () => {
    try {
      const { data } = await client.query({
        query: GET_SEGMENTS,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getSegmentsLookup) {
        const options = data.getSegmentsLookup.map((segment: any) => ({
          value: segment.id,
          label: segment.name
        }));
        setSegmentOptions(options);
      }
    } catch (error) {
      handleError("Segment verileri yüklenirken bir hata oluştu");
    }
  };
  
  const loadAccountTypeOptions = async () => {
    try {
      const { data } = await client.query({
        query: GET_ACCOUNT_TYPES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getAccountTypesLookup) {
        const options = data.getAccountTypesLookup.map((type: any) => ({
          value: type.id,
          label: type.name
        }));
        setAccountTypeOptions(options);
      }
    } catch (error) {
      handleError("Hesap tipi verileri yüklenirken bir hata oluştu");
    }
  };
  
  // URL parameter update function
  const updateUrlParams = (
    searchText?: string,
    createdAtStart?: string | null,
    createdAtEnd?: string | null,
    assignedUserIds?: string[] | null,
    cityIds?: string[] | null,
    countryId?: string | null,
    segmentIds?: string[] | null,
    accountTypeIds?: string[] | null,
    pageIndex?: number,
    pageSize?: number
  ) => {
    const params = new URLSearchParams();
    
    if (searchText) params.set("search", searchText);
    if (createdAtStart) params.set("startDate", createdAtStart);
    if (createdAtEnd) params.set("endDate", createdAtEnd);
    if (assignedUserIds && assignedUserIds.length > 0) params.set("assignedUsers", assignedUserIds.join(","));
    if (cityIds && cityIds.length > 0) params.set("cities", cityIds.join(","));
    if (countryId) params.set("country", countryId);
    if (segmentIds && segmentIds.length > 0) params.set("segments", segmentIds.join(","));
    if (accountTypeIds && accountTypeIds.length > 0) params.set("accountTypes", accountTypeIds.join(","));
    if (pageIndex !== undefined) params.set("page", pageIndex.toString());
    if (pageSize !== undefined) params.set("size", pageSize.toString());
    
    // Update URL without refreshing page
    navigate({
      pathname: location.pathname,
      search: params.toString()
    }, { replace: true });
  };
  
  // Format account for UI display
  const formatAccountForUI = (account: Account): AccountWithCreatedAt => {
    return {
      ...account,
      date: account.createdAt ? moment(account.createdAt).format("DD.MM.YYYY") : ""
    } as AccountWithCreatedAt;
  };
  
  // Handle filter apply
  const handleFilterApply = async (filters: AccountFilterState): Promise<any[]> => {
    try {
      setFilterLoading(true);
      
      // Prepare filter parameters
      const filterParams = {
        pageIndex: 0,
        pageSize: pageSize,
        text: filters.searchText || "",
        assignedUserIds: filters.assignedUsers.length > 0 ? filters.assignedUsers.map((user: any) => user.value) : null,
        createdAtStart: filters.startDate ? moment(filters.startDate).format("YYYY-MM-DD") : null,
        createdAtEnd: filters.endDate ? moment(filters.endDate).format("YYYY-MM-DD") : null,
        cityIds: filters.cities.length > 0 ? filters.cities.map((city: any) => city.value) : null,
        countryId: filters.country ? filters.country.value : null,
        segmentIds: filters.segments.length > 0 ? filters.segments.map((segment: any) => segment.value) : null,
        accountTypeIds: filters.accountTypes ? filters.accountTypes.map((type: any) => type.value) : null,
        orderBy: sortConfig?.key || "createdAt",
        orderDirection: (sortConfig?.direction.toUpperCase() || "DESC") as "ASC" | "DESC"
      };

      console.log("Applying filters with sort config:", { sortConfig, filterParams });
      
      // Update URL with all parameters including sort
      const params = new URLSearchParams();
      if (filters.searchText) params.set("search", filters.searchText);
      if (filters.startDate) params.set("startDate", moment(filters.startDate).format("YYYY-MM-DD"));
      if (filters.endDate) params.set("endDate", moment(filters.endDate).format("YYYY-MM-DD"));
      if (filters.accountTypes.length > 0) params.set("accountTypes", filters.accountTypes.map(t => t.value).join(","));
      if (filters.channels.length > 0) params.set("channels", filters.channels.map(c => c.value).join(","));
      if (filters.segments.length > 0) params.set("segments", filters.segments.map(s => s.value).join(","));
      if (filters.assignedUsers.length > 0) params.set("assignedUsers", filters.assignedUsers.map(u => u.value).join(","));
      if (filters.country) params.set("country", filters.country.value);
      if (filters.cities.length > 0) params.set("cities", filters.cities.map(c => c.value).join(","));
      if (sortConfig?.key) params.set("orderBy", sortConfig.key);
      if (sortConfig?.direction) params.set("orderDirection", sortConfig.direction.toUpperCase());
      
      // Update URL without refreshing page
      navigate({
        pathname: location.pathname,
        search: params.toString()
      }, { replace: true });
      
      // Fetch filtered data with sort parameters
      const result = await fetchAccountsData(filterParams);
      
      if (result) {
        setAccounts(result.items as AccountWithCreatedAt[]);
        setPageCount(result.pageCount);
        setTotalCount(result.itemCount);
        setCurrentPage(0);
        setSearchText(filterParams.text);
        setFilterVisible(false);
        return result.items;
      }
      
      return [];
    } catch (error) {
      handleError("Filtre uygulanırken bir hata oluştu");
      return [];
    } finally {
      setFilterLoading(false);
    }
  };
  
  // Add/Edit account form functions
  const handleAddButtonClick = () => {
    setEditAccount(null);
    setShowForm(true);
  };
  
  // Create mutation for accounts
  const [createAccountMutation] = useMutation(CREATE_ACCOUNT, {
    onCompleted: (data) => {
      toast.success("Hesap başarıyla oluşturuldu");
      setShowForm(false);
      fetchDataWithCurrentFilters();
    },
    onError: (error) => {
      handleError(`Hesap oluşturulurken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Update mutation for accounts
  const [updateAccountMutation] = useMutation(UPDATE_ACCOUNT, {
    onCompleted: (data) => {
      toast.success("Hesap başarıyla güncellendi");
      setShowForm(false);
      fetchDataWithCurrentFilters();
    },
    onError: (error) => {
      handleError(`Hesap güncellenirken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Delete mutation for accounts
  const [deleteAccountMutation] = useMutation(DELETE_ACCOUNT, {
    onCompleted: (data) => {
      toast.success("Hesap başarıyla silindi");
      setShowDeleteModal(false);
      fetchDataWithCurrentFilters();
    },
    onError: (error) => {
      handleError(`Hesap silinirken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Edit handler
  const editHandler = (params: any) => {
    const fetchAccountForEdit = async () => {
      try {
        console.log("Fetching account for edit with ID:", params.id);
        
        // Use the getAccount query to fetch detailed account data
        const result = await client.query({
          query: GET_ACCOUNT,
          variables: { id: params.id },
          context: getAuthorizationLink(),
          fetchPolicy: "network-only"
        });
        
        if (result.data && result.data.getAccount) {
          console.log("Fetched account data for edit:", result.data.getAccount);
          setEditAccount(result.data.getAccount);
          setShowForm(true);
        } else {
          console.error("No account data returned from query");
          toast.error("Hesap bilgisi bulunamadı");
        }
      } catch (error) {
        console.error("Error fetching account data for edit:", error);
        toast.error("Hesap bilgisi yüklenirken bir hata oluştu");
      }
    };
    
    fetchAccountForEdit();
  };
  
  // Delete handler
  const deleteHandler = (accountId: string) => {
    setAccountToDelete(accountId);
    setShowDeleteModal(true);
  };
  
  // Handle detail view
  const handleDetailView = (accountId: string) => {
    // Log the navigation for debugging
    console.log("Navigating to account detail for ID:", accountId);
    
    try {
      // First check if the account ID is valid
      if (!accountId) {
        console.error("Invalid account ID for detail view");
        toast.error("Geçersiz hesap ID'si");
        return;
      }
      
      // Use React Router's navigate function to go to the detail page
      // The correct URL format should match your route configuration
      const detailUrl = `/accounts/detail/${accountId}`;
      console.log("Navigating to:", detailUrl);
      
      // Perform the navigation
      navigate(detailUrl);
    } catch (error) {
      console.error("Navigation error:", error);
      toast.error("Hesap detay sayfasına giderken bir hata oluştu");
    }
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (accountToDelete) {
      try {
        await deleteAccountMutation({
          variables: { id: accountToDelete },
          context: getAuthorizationLink()
        });
      } catch (error) {
        handleError(`Hesap silinirken bir hata oluştu: ${(error as Error).message}`);
      }
    }
  };
  
  // Close form
  const handleClose = () => {
    setShowForm(false);
  };
  
  // Toggle filter visibility
  const toggleFilter = () => {
    setFilterVisible(!filterVisible);
  };
  
  // Pagination change handlers
  const handlePageChange = useCallback((pageNumber: number) => {
    // Add validation to prevent invalid page numbers
    if (pageNumber < 0 || pageNumber >= pageCount) return;
    
    console.log(`Sayfa değişimi: ${currentPage} -> ${pageNumber}`);
    
    // Set loading state immediately
    setLoading(true);
    
    // Update URL parameters while preserving all existing parameters
    const params = new URLSearchParams(location.search);
    params.set("page", pageNumber.toString());
    
    // Update currentPage state immediately
    setCurrentPage(pageNumber);
    
    // Navigate and fetch data synchronously without setTimeout
    navigate({
      pathname: location.pathname,
      search: params.toString()
    }, { replace: true });
    
    fetchDataWithCurrentFilters();
  }, [currentPage, pageCount, location.search, navigate]);
  
  // Add handleSort function
  const handleSort = (key: string) => {
    setSortConfig((prevSort): { key: string; direction: "asc" | "desc" } => {
      const direction: "asc" | "desc" = prevSort && prevSort.key === key && prevSort.direction === "asc" ? "desc" : "asc";
      return {
        key,
        direction
      };
    });
  };
  
  // Add useEffect to trigger data fetch when sort changes
  useEffect(() => {
    if (sortConfig) {
      console.log("Sort config changed, fetching data with:", sortConfig);
      fetchDataWithCurrentFilters();
    }
  }, [sortConfig]);
  
  // Fetch initial data on component mount
  useEffect(() => {
    fetchInitialData();
    document.title = 'Hesaplar';
  }, []);
  
  // Set up event listener for Add button click
  useEffect(() => {
    const handleAccountsAddClick = () => {
      handleAddButtonClick();
    };
    
    window.addEventListener('AccountsAddClick', handleAccountsAddClick);
    
    return () => {
      window.removeEventListener('AccountsAddClick', handleAccountsAddClick);
    };
  }, []);

  // Add this state to track selected accounts
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // Add function to handle the "select all" checkbox
  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      // If all are selected, deselect all
      setSelectedAccounts([]);
    } else {
      // Otherwise select all
      setSelectedAccounts(accounts.map(account => account.id || '').filter(id => id !== ''));
    }
  };

  // Add function to handle individual row selection
  const handleSelectRow = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      // If already selected, remove from selection
      setSelectedAccounts(selectedAccounts.filter(id => id !== accountId));
    } else {
      // Otherwise add to selection
      setSelectedAccounts([...selectedAccounts, accountId]);
    }
  };

  // Add a useMemo for accounts to prevent re-renders and optimize performance
  const memoizedAccounts = useMemo(() => accounts, [accounts]);

  // Add inline styles for skeleton loaders at the top of the component
  const skeletonStyle = {
    height: '20px',
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'loading 1.5s infinite',
    borderRadius: '4px'
  };

  // Define keyframes in a style tag
  const keyframesStyle = `
  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  `;

  // Main render
  return (
    <React.Fragment>
      <style>{keyframesStyle}</style>
      <div className="page-content">
        <Container fluid>
          <div className="d-flex align-items-center mb-2">
            <h4 className="mb-0">Hesaplar</h4>
          </div>
          
          {/* Combined Card for Filter and Table */}
          <Card>
            <CardBody>
              {/* Filter Component */}
              <AccountFilter
                show={true}
                onCloseClick={() => {}}
                onFilterApply={handleFilterApply}
              />
            </CardBody>
            
            <CardBody className="p-0 border-top">
              {loading && <div className="text-center p-4"><Loader /></div>}
              
              {!loading && memoizedAccounts.length === 0 && !initialLoadingRef.current ? (
                <div className="text-center py-5">
                  <h5>Hesap bulunamadı</h5>
                  <p className="text-muted">Yeni bir hesap eklemek için "Ekle" butonuna tıklayın.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table className="align-middle mb-0" hover>
                      <thead className="table-light">
                        <tr>
                          <th scope="col" className="ps-3" style={{ width: "40px" }}>
                            <div className="form-check">
                              <Input
                                type="checkbox"
                                className="form-check-input"
                                id="checkAll"
                                checked={selectedAccounts.length === accounts.length && accounts.length > 0}
                                onChange={handleSelectAll}
                              />
                            </div>
                          </th>
                          <th scope="col" onClick={() => handleSort("no")} style={{ cursor: "pointer" }}>
                            Hesap No {sortConfig?.key === "no" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                          </th>
                          <th scope="col" onClick={() => handleSort("createdAt")} style={{ cursor: "pointer" }}>
                            Eklenme {sortConfig?.key === "createdAt" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                          </th>
                          <th scope="col" onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                            Adı {sortConfig?.key === "name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                          </th>
                          <th scope="col" onClick={() => handleSort("accountTypes")} style={{ cursor: "pointer" }}>
                            Hesap Türü {sortConfig?.key === "accountTypes" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                          </th>
                          <th scope="col" onClick={() => handleSort("email")} style={{ cursor: "pointer" }}>
                            E-posta {sortConfig?.key === "email" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                          </th>
                          <th scope="col" onClick={() => handleSort("phone")} style={{ cursor: "pointer" }}>
                            Telefon {sortConfig?.key === "phone" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                          </th>
                          <th scope="col" onClick={() => handleSort("assignedUser")} style={{ cursor: "pointer" }}>
                            Atanan Kullanıcı {sortConfig?.key === "assignedUser" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                          </th>
                          <th scope="col" className="text-end">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          // Show skeleton rows while loading
                          Array.from({ length: 5 }).map((_, index) => (
                            <tr key={`skeleton-${index}`}>
                              <td className="ps-3">
                                <div style={{...skeletonStyle, width: "20px", height: "20px"}}></div>
                              </td>
                              <td><div style={{...skeletonStyle, width: "80px"}}></div></td>
                              <td><div style={{...skeletonStyle, width: "120px"}}></div></td>
                              <td><div style={{...skeletonStyle, width: "150px"}}></div></td>
                              <td><div style={{...skeletonStyle, width: "180px"}}></div></td>
                              <td><div style={{...skeletonStyle, width: "120px"}}></div></td>
                              <td><div style={{...skeletonStyle, width: "120px"}}></div></td>
                              <td><div style={{...skeletonStyle, width: "140px"}}></div></td>
                              <td className="text-end"><div style={{...skeletonStyle, width: "180px", float: "right"}}></div></td>
                            </tr>
                          ))
                        ) : (
                          memoizedAccounts.map((account) => (
                            <tr key={account.id}>
                              <td className="ps-3">
                                <div className="form-check">
                                  <Input
                                    type="checkbox"
                                    className="form-check-input"
                                    id={`check-${account.id}`}
                                    checked={account.id ? selectedAccounts.includes(account.id) : false}
                                    onChange={() => account.id && handleSelectRow(account.id)}
                                  />
                                </div>
                              </td>
                              <td>{account.no || '-'}</td>
                              <td>{account.createdAt ? moment(account.createdAt).format('DD.MM.YYYY HH:mm') : '-'}</td>
                              <td>{account.name || `${account.firstName || ''} ${account.lastName || ''}`}</td>
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
                              <td>{account.email || '-'}</td>
                              <td>{account.phone || '-'}</td>
                              <td>{account.assignedUser?.fullName || '-'}</td>
                              <td className="text-end">
                                <Button 
                                  color="link" 
                                  size="sm" 
                                  className="text-decoration-none text-dark me-1"
                                  onClick={() => handleDetailView(account.id!)}
                                >
                                  Detaylar
                                </Button>
                                <Button 
                                  color="link" 
                                  size="sm" 
                                  className="text-decoration-none text-dark me-1"
                                  onClick={() => editHandler(account)}
                                >
                                  Düzenle
                                </Button>
                                <Button 
                                  color="link" 
                                  size="sm" 
                                  className="text-decoration-none text-dark"
                                  onClick={() => deleteHandler(account.id!)}
                                >
                                  Sil
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {pageCount > 1 && (
                    <div className="pagination-wrapper p-3">
                      <Row className="justify-content-between align-items-center">
                        <Col>
                          <div className="text-muted">
                            <span>{totalCount}</span> sonuçtan <span>{Math.min((currentPage + 1) * pageSize, totalCount)}</span> tanesi gösteriliyor
                          </div>
                        </Col>
                        <Col className="col-auto">
                          <div className="d-flex align-items-center gap-2">
                            <ul className="pagination justify-content-center mb-0">
                              <li className={`page-item ${currentPage === 0 ? "disabled" : ""}`}>
                                <button
                                  className="page-link"
                                  style={{ width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0" }}
                                  onClick={() => {
                                    if (currentPage > 0 && !loading) {
                                      const newPage = currentPage - 1;
                                      // Set state and update URL directly
                                      setCurrentPage(newPage);
                                      setLoading(true);
                                      
                                      // Update URL and fetch data in one go
                                      const params = new URLSearchParams(location.search);
                                      params.set("page", newPage.toString());
                                      
                                      navigate({
                                        pathname: location.pathname,
                                        search: params.toString()
                                      }, { replace: true });
                                      
                                      // Directly call API fetch function without setTimeout
                                      fetchAccountsData({
                                        pageIndex: newPage,
                                        pageSize: pageSize,
                                        text: searchText,
                                        orderBy: sortConfig?.key || "createdAt",
                                        orderDirection: (sortConfig?.direction.toUpperCase() || "DESC") as "ASC" | "DESC",
                                        // Include other filter params from URL
                                        assignedUserIds: new URLSearchParams(location.search).get("assignedUsers") ? 
                                          new URLSearchParams(location.search).get("assignedUsers")?.split(",") : null,
                                        createdAtStart: new URLSearchParams(location.search).get("startDate") || null,
                                        createdAtEnd: new URLSearchParams(location.search).get("endDate") || null,
                                        cityIds: new URLSearchParams(location.search).get("cities") ? 
                                          new URLSearchParams(location.search).get("cities")?.split(",") : null,
                                        countryId: new URLSearchParams(location.search).get("country") || null,
                                        segmentIds: new URLSearchParams(location.search).get("segments") ? 
                                          new URLSearchParams(location.search).get("segments")?.split(",") : null,
                                        accountTypeIds: new URLSearchParams(location.search).get("accountTypes") ? 
                                          new URLSearchParams(location.search).get("accountTypes")?.split(",") : null,
                                        channelIds: new URLSearchParams(location.search).get("channels") ? 
                                          new URLSearchParams(location.search).get("channels")?.split(",") : null
                                      }).then(result => {
                                        if (result) {
                                          setAccounts(result.items as AccountWithCreatedAt[]);
                                          setPageCount(result.pageCount);
                                          setTotalCount(result.itemCount);
                                          setLoading(false);
                                        } else {
                                          setLoading(false);
                                          toast.error("Hesaplar yüklenirken bir hata oluştu");
                                        }
                                      }).catch(error => {
                                        setLoading(false);
                                        handleError("Hesap verileri yüklenirken bir hata oluştu");
                                      });
                                    }
                                  }}
                                  disabled={currentPage === 0 || loading}
                                  aria-label="Önceki sayfa"
                                >
                                  <i className="mdi mdi-chevron-left"></i>
                                </button>
                              </li>
                              {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                                let pageNum = i;
                                
                                // Adjust page numbers when current page is toward the end
                                if (currentPage > 2 && pageCount > 5) {
                                  pageNum = currentPage - 2 + i;
                                  if (pageNum >= pageCount) return null;
                                }
                                
                                return (
                                  <li key={pageNum} className={`page-item ${currentPage === pageNum ? "active" : ""}`}>
                                    <button
                                      className="page-link"
                                      style={{ width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0" }}
                                      onClick={() => {
                                        if (pageNum !== currentPage && !loading) {
                                          // Set state and update URL directly
                                          setCurrentPage(pageNum);
                                          setLoading(true);
                                          
                                          // Update URL and fetch data in one go
                                          const params = new URLSearchParams(location.search);
                                          params.set("page", pageNum.toString());
                                          
                                          navigate({
                                            pathname: location.pathname,
                                            search: params.toString()
                                          }, { replace: true });
                                          
                                          // Directly call API fetch function
                                          fetchAccountsData({
                                            pageIndex: pageNum,
                                            pageSize: pageSize,
                                            text: searchText,
                                            orderBy: sortConfig?.key || "createdAt",
                                            orderDirection: (sortConfig?.direction.toUpperCase() || "DESC") as "ASC" | "DESC",
                                            // Include other filter params from URL
                                            assignedUserIds: new URLSearchParams(location.search).get("assignedUsers") ? 
                                              new URLSearchParams(location.search).get("assignedUsers")?.split(",") : null,
                                            createdAtStart: new URLSearchParams(location.search).get("startDate") || null,
                                            createdAtEnd: new URLSearchParams(location.search).get("endDate") || null,
                                            cityIds: new URLSearchParams(location.search).get("cities") ? 
                                              new URLSearchParams(location.search).get("cities")?.split(",") : null,
                                            countryId: new URLSearchParams(location.search).get("country") || null,
                                            segmentIds: new URLSearchParams(location.search).get("segments") ? 
                                              new URLSearchParams(location.search).get("segments")?.split(",") : null,
                                            accountTypeIds: new URLSearchParams(location.search).get("accountTypes") ? 
                                              new URLSearchParams(location.search).get("accountTypes")?.split(",") : null,
                                            channelIds: new URLSearchParams(location.search).get("channels") ? 
                                              new URLSearchParams(location.search).get("channels")?.split(",") : null
                                          }).then(result => {
                                            if (result) {
                                              setAccounts(result.items as AccountWithCreatedAt[]);
                                              setPageCount(result.pageCount);
                                              setTotalCount(result.itemCount);
                                              setLoading(false);
                                            } else {
                                              setLoading(false);
                                              toast.error("Hesaplar yüklenirken bir hata oluştu");
                                            }
                                          }).catch(error => {
                                            setLoading(false);
                                            handleError("Hesap verileri yüklenirken bir hata oluştu");
                                          });
                                        }
                                      }}
                                    >
                                      {pageNum + 1}
                                    </button>
                                  </li>
                                );
                              })}
                              <li className={`page-item ${currentPage >= pageCount - 1 ? "disabled" : ""}`}>
                                <button
                                  className="page-link"
                                  style={{ width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0" }}
                                  onClick={() => {
                                    if (currentPage < pageCount - 1 && !loading) {
                                      const newPage = currentPage + 1;
                                      // Set state and update URL directly
                                      setCurrentPage(newPage);
                                      setLoading(true);
                                      
                                      // Update URL and fetch data in one go
                                      const params = new URLSearchParams(location.search);
                                      params.set("page", newPage.toString());
                                      
                                      navigate({
                                        pathname: location.pathname,
                                        search: params.toString()
                                      }, { replace: true });
                                      
                                      // Directly call API fetch function
                                      fetchAccountsData({
                                        pageIndex: newPage,
                                        pageSize: pageSize,
                                        text: searchText,
                                        orderBy: sortConfig?.key || "createdAt",
                                        orderDirection: (sortConfig?.direction.toUpperCase() || "DESC") as "ASC" | "DESC",
                                        // Include other filter params from URL
                                        assignedUserIds: new URLSearchParams(location.search).get("assignedUsers") ? 
                                          new URLSearchParams(location.search).get("assignedUsers")?.split(",") : null,
                                        createdAtStart: new URLSearchParams(location.search).get("startDate") || null,
                                        createdAtEnd: new URLSearchParams(location.search).get("endDate") || null,
                                        cityIds: new URLSearchParams(location.search).get("cities") ? 
                                          new URLSearchParams(location.search).get("cities")?.split(",") : null,
                                        countryId: new URLSearchParams(location.search).get("country") || null,
                                        segmentIds: new URLSearchParams(location.search).get("segments") ? 
                                          new URLSearchParams(location.search).get("segments")?.split(",") : null,
                                        accountTypeIds: new URLSearchParams(location.search).get("accountTypes") ? 
                                          new URLSearchParams(location.search).get("accountTypes")?.split(",") : null,
                                        channelIds: new URLSearchParams(location.search).get("channels") ? 
                                          new URLSearchParams(location.search).get("channels")?.split(",") : null
                                      }).then(result => {
                                        if (result) {
                                          setAccounts(result.items as AccountWithCreatedAt[]);
                                          setPageCount(result.pageCount);
                                          setTotalCount(result.itemCount);
                                          setLoading(false);
                                        } else {
                                          setLoading(false);
                                          toast.error("Hesaplar yüklenirken bir hata oluştu");
                                        }
                                      }).catch(error => {
                                        setLoading(false);
                                        handleError("Hesap verileri yüklenirken bir hata oluştu");
                                      });
                                    }
                                  }}
                                  disabled={currentPage >= pageCount - 1 || loading}
                                  aria-label="Sonraki sayfa"
                                >
                                  <i className="mdi mdi-chevron-right"></i>
                                </button>
                              </li>
                            </ul>
                            
                            <Select
                              className="pagination-select"
                              options={[
                                { value: 10, label: '10' },
                                { value: 20, label: '20' },
                                { value: 30, label: '30' },
                                { value: 40, label: '40' },
                                { value: 50, label: '50' }
                              ]}
                              value={{ value: pageSize, label: pageSize.toString() }}
                              onChange={(option: any) => {
                                const newSize = option.value;
                                setPageSize(newSize);
                                setCurrentPage(0);
                                
                                // Update URL parameters
                                const params = new URLSearchParams(location.search);
                                params.set("page", "0");
                                params.set("size", newSize.toString());
                                
                                navigate({
                                  pathname: location.pathname,
                                  search: params.toString()
                                }, { replace: true });
                                
                                fetchDataWithCurrentFilters();
                              }}
                              styles={{
                                control: (base: any) => ({
                                  ...base,
                                  minHeight: '38px',
                                  width: '80px',
                                  border: '1px solid #ced4da'
                                })
                              }}
                            />
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
      
      {/* Account Form Modal */}
      <AccountFormModal
        isOpen={showForm}
        toggle={handleClose}
        account={editAccount}
        title={editAccount ? "Hesabı Düzenle" : "Yeni Hesap Ekle"}
        submitText={editAccount ? "Güncelle" : "Kaydet"}
        onSubmit={() => fetchDataWithCurrentFilters()}
        validation={{
          values: {},
          errors: {},
          touched: {},
          handleChange: () => {},
          handleBlur: () => {},
          handleSubmit: () => {},
          isSubmitting: false,
          submitForm: () => Promise.resolve()
        }}
        isSubmitting={formSubmitting}
      />
      
      {/* Delete Modal */}
      <DeleteModal
        show={showDeleteModal}
        onDeleteClick={handleDeleteConfirm}
        onCloseClick={() => setShowDeleteModal(false)}
      />
      
      <ToastContainer closeButton={false} position="top-right" />
    </React.Fragment>
  );
};

// Main Accounts component
const Accounts: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <AccountsContent />
    </ApolloProvider>
  );
};

export default Accounts; 