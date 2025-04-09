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
import { DebouncedInput } from "../../../Components/Common/DebouncedInput";

// Tablo bileşeni
import TableContainer from "../../../Components/Common/TableContainer";

// Formik ve Yup
import * as Yup from "yup";
import { useFormik } from "formik";

import Loader from "../../../Components/Common/Loader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";
// Replace axios with Apollo Client
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
import UserFilter, { UserFilterState } from "./UserFilter";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { GET_USERS, GET_USER, GET_ROLES } from "../../../graphql/queries/userQueries";
import { CREATE_USER, UPDATE_USER, DELETE_USER } from "../../../graphql/mutations/userMutations";
import { User, Role, SelectOption, PaginatedResponse, GetUsersInput } from "../../../types/graphql";

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

async function fetchUserData({
  pageSize = 10,
  pageIndex = 0,
  text = "",
  orderBy = "createdAt",
  orderDirection = "DESC",
  isActive = null,
  roleIds = null,
  createdAtStart = null,
  createdAtEnd = null
}: GetUsersInput = {}): Promise<PaginatedResponse<User> | null> {
  try {
    // Prepare input variables for the GraphQL query based on the Postman collection
    const variables = {
      input: {
        pageSize,
        pageIndex,
        text,
        orderBy,
        orderDirection,
      } as GetUsersInput,
    };

    // Add optional parameters only if they are provided
    if (isActive !== null && isActive !== undefined) {
      variables.input.isActive = isActive;
    }

    if (roleIds && roleIds.length > 0) {
      variables.input.roleIds = roleIds;
      console.log("roleIds parameter added:", roleIds);
    } else {
      console.log("roleIds parameter is empty, skipped");
    }

    if (createdAtStart) {
      variables.input.createdAtStart = createdAtStart;
      console.log("createdAtStart parameter added:", createdAtStart);
    }

    if (createdAtEnd) {
      // Add end of day time for the end date
      const endDateWithTime = `${createdAtEnd}T23:59:59`;
      variables.input.createdAtEnd = endDateWithTime;
      console.log("createdAtEnd parameter added (end of day):", endDateWithTime);
    }

    console.log("Apollo Query Variables:", variables);

    // Execute the query with fresh auth headers
    const { data } = await client.query({
      query: GET_USERS,
      variables,
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    console.log("Response:", data);
    if (data && data.getUsers) {
      const userData = data.getUsers;
      console.log("User Data:", userData);
      return userData;
    } else {
      console.error("No data returned from query");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    toast.error("Kullanıcı verileri yüklenirken hata oluştu.");
    return null;
  }
}

async function fetchUserDetail(userId: string): Promise<User | null> {
  try {
    const { data } = await client.query({
      query: GET_USER,
      variables: { id: userId },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    console.log("User Detail Response:", data);
    if (data && data.getUser) {
      const userData = data.getUser;
      return userData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user detail:", error);
    toast.error("Kullanıcı detayları getirilirken hata oluştu.");
    return null;
  }
}

// Create the main component inner content as a separate component
const UsersContent: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [modal, setModal] = useState<boolean>(false);
  const [isInfoDetails, setIsInfoDetails] = useState<boolean>(false);
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
  const [selectedRecordForDelete, setSelectedRecordForDelete] = useState<User | null>(null);
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

  // Use Apollo hooks for queries and mutations
  const { loading: rolesLoading } = useQuery(GET_ROLES, {
    variables: {
      input: {
        permissions: ["UserRead"],
        pageSize: 100,
        pageIndex: 0
      }
    },
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getRoles) {
        setRoleOptions(data.getRoles.map((role: Role) => ({ value: role.id, label: role.name })));
      }
    },
    onError: (error) => {
      console.error("Error fetching roles:", error);
    }
  });

  // Delete user mutation
  const [deleteUser] = useMutation(DELETE_USER, {
    context: getAuthorizationLink(),
    onCompleted: () => {
      toast.success("Kullanıcı başarıyla silindi.");
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast.error("Kullanıcı silinirken hata oluştu.");
    }
  });

  // Add mutation hooks for user operations
  const [createUser] = useMutation(CREATE_USER, {
    context: getAuthorizationLink(),
    onCompleted: () => {
      toast.success("Kullanıcı başarıyla eklendi.");
      handleClose();
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      toast.error("Kullanıcı eklenirken hata oluştu: " + error.message);
    }
  });

  const [updateUser] = useMutation(UPDATE_USER, {
    context: getAuthorizationLink(),
    onCompleted: () => {
      toast.success("Kullanıcı başarıyla güncellendi.");
      handleClose();
      fetchInitialData();
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      toast.error("Kullanıcı güncellenirken hata oluştu: " + error.message);
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
        const storedFiltersString = localStorage.getItem("agile_users_filters");
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
      const createdAtStartParam = params.get('createdAtStart') || null;
      const createdAtEndParam = params.get('createdAtEnd') || null;
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
      
      console.log("Veri yükleme tamamlandı, allUsers:", allUsers.length, "filteredUsers:", filteredUsers.length);
      
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
    activeFilter?: boolean | null;
    createdAtStart?: string | null;
    createdAtEnd?: string | null;
    updateUrl?: boolean;
    roleIds?: string[] | null;
  }) => {
    console.log("loadData başlatıldı");
    setLoading(true);
    setError(null); // Clear any previous errors
    
    // API çağrısından önce yapılacak işlemler
    const queryParams = new URLSearchParams(location.search);
    const rolesParam = queryParams.get("roles");
    
    // Custom roleIds parametresi varsa onu kullan, yoksa URL'den al
    const selectedRoleIds = customParams?.roleIds !== undefined 
      ? customParams.roleIds 
      : (rolesParam ? rolesParam.split(",") : null);  // Dizi olarak al
    
    // URL'den başlık parametresini alalım, customParams öncelikli 
    let searchTextParam = null;
    
    if (customParams?.searchText !== undefined) {
      // Eğer customParams'da açıkça belirtilmişse, o değeri kullan
      searchTextParam = customParams.searchText;
    } else {
      // Aksi takdirde URL'den al
      searchTextParam = queryParams.get("title") || searchText;
    }
    
    // URL'den tarih parametrelerini alalım, customParams öncelikli
    let createdAtStartParam = null;
    let createdAtEndParam = null;
    
    if (customParams?.createdAtStart !== undefined) {
      // Eğer customParams'da açıkça belirtilmişse, o değeri kullan (null olsa bile)
      createdAtStartParam = customParams.createdAtStart;
    } else {
      // Aksi takdirde URL'den al
      createdAtStartParam = queryParams.get("createdAtStart");
    }
    
    if (customParams?.createdAtEnd !== undefined) {
      // Eğer customParams'da açıkça belirtilmişse, o değeri kullan (null olsa bile)
      createdAtEndParam = customParams.createdAtEnd;
    } else {
      // Aksi takdirde URL'den al
      createdAtEndParam = queryParams.get("createdAtEnd");
    }
    
    console.log("loadData çağrıldı. Parametreler:", {
      roleIds: selectedRoleIds,
      createdAtStartParam,
      createdAtEndParam,
      searchText: searchTextParam,
      customParamsStart: customParams?.createdAtStart,
      customParamsEnd: customParams?.createdAtEnd
    });
    
    // API'ye gönderilecek orderBy ve orderDirection parametreleri
    const apiOrderBy = customParams?.orderBy ?? orderBy;
    const apiOrderDirection = customParams?.orderDirection ?? orderDirection;
    
    // Tarih işlemleri için düzeltme
    let formattedStartDate = createdAtStartParam;
    let formattedEndDate = createdAtEndParam;
    
    try {
      const data = await fetchUserData({
        pageSize: customParams?.pageSize ?? pageSize,
        pageIndex: customParams?.pageIndex ?? pageIndex,
        text: searchTextParam,
        orderBy: apiOrderBy,
        orderDirection: apiOrderDirection,
        isActive: customParams?.activeFilter ?? activeFilter,
        roleIds: selectedRoleIds,  // Doğrudan dizi olarak gönder
        createdAtStart: formattedStartDate,
        createdAtEnd: formattedEndDate
      });
      
      console.log("API'den gelen veri:", data);
      
      if (data && data.items) {
        console.log("Alınan kullanıcı sayısı:", data.items.length);
        const formattedData = data.items.map((item: User) => ({
          ...item,
          // Eklenme alanı createdAt üzerinden hesaplanıyor.
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        console.log("Formatlanmış veri:", formattedData);
        setAllUsers(formattedData);
        setFilteredUsers(formattedData);
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
        setAllUsers([]);
        setFilteredUsers([]);
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
    roles?: string[];
    pageIndex?: number;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
  }) => {
    const queryParams = new URLSearchParams(location.search);
    
    // Yeni URL parametrelerini oluştur
    const newParams = new URLSearchParams();
    
    // Mevcut sayfalama parametresini koru
    const pageSize = queryParams.get("pageSize");
    if (pageSize) newParams.set("pageSize", pageSize);
    
    // Sayfa indeksi parametresi
    if (params.pageIndex !== undefined) {
      newParams.set("pageIndex", params.pageIndex.toString());
    } else {
      const currentPageIndex = queryParams.get("pageIndex");
      if (currentPageIndex) newParams.set("pageIndex", currentPageIndex);
    }
    
    // Sıralama parametreleri
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
    
    // Filtre parametreleri - title parametresi için düzeltme
    if (params.searchText !== undefined && params.searchText !== "") {
      newParams.set("title", params.searchText);
    } else {
      // title parametresi belirtilmemişse, mevcut değeri koru
      const currentTitle = queryParams.get("title");
      if (currentTitle) newParams.set("title", currentTitle);
    }
    
    // Status parametresi - activeFilter kullanılıyorsa, onu ayarla, yoksa mevcut değeri koru
    if (params.activeFilter === true) {
      newParams.set("status", "Aktif");
    } else if (params.activeFilter === false) {
      newParams.set("status", "Pasif");
    } else if (params.activeFilter === null) {
      // activeFilter null ise, status parametresini URL'den kaldır
      // Böylece tüm durum değerleri (aktif/pasif) gösterilir
      newParams.delete("status");
    } else if (params.activeFilter === undefined) {
      // activeFilter belirtilmemişse, mevcut değeri koru
      const currentStatus = queryParams.get("status");
      if (currentStatus) newParams.set("status", currentStatus);
    }
    
    if (params.createdAtStart) newParams.set("createdAtStart", params.createdAtStart);
    if (params.createdAtEnd) newParams.set("createdAtEnd", params.createdAtEnd);
    
    // Rol parametresi - mevcut URL'den alma, filtreleme sırasında seçimi korumak için
    const currentRolesParam = queryParams.get("roles");
    if (params.roles && params.roles.length > 0) {
      newParams.set("roles", params.roles.join(","));
    } else if (currentRolesParam) {
      newParams.set("roles", currentRolesParam);
    }
    
    // URL güncelleme
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

  // Formik; status alanı artık Boolean olarak yönetiliyor.
  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: (user && user.id) || "",
      name: (user && user.fullName) || "",
      user: (user && user.username) || "",
      role: (user && user.role?.id) || "",
      status: user ? user.isActive : true,
      date: user && user.createdAt ? moment(user.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
      password: (user && user.password) || "",
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Ad alanı zorunludur"),
      user: Yup.string().required("Kullanıcı adı zorunludur"),
      password: isEdit ? Yup.string() : Yup.string().required("Şifre zorunludur"),
      role: Yup.string().required("Rol seçimi zorunludur"),
    }),
    onSubmit: async (values) => {
      if (isEdit) {
        try {
          await updateUser({
            variables: {
              input: {
                id: values.id,
                fullName: values.name,
                username: values.user,
                password: values.password || undefined,
                isActive: values.status,
                roleId: values.role
              }
            },
            context: getAuthorizationLink()
          });
        } catch (error) {
          console.error("Error updating user:", error);
        }
      } else {
        try {
          await createUser({
            variables: {
              input: {
                fullName: values.name,
                username: values.user,
                password: values.password,
                isActive: values.status,
                roleId: values.role
              }
            },
            context: getAuthorizationLink()
          });
        } catch (error) {
          console.error("Error creating user:", error);
        }
      }
    },
  });

  const handleClose = () => {
    // Modal kapanırken tüm form durumlarını sıfırlayalım
    validation.resetForm();
    setIsEdit(false);
    setIsDetail(false);
    setUser(null);
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

  const handleUserClick = useCallback(
    (selectedUser: any) => {
      setUser(selectedUser);
      setIsDetail(false);
      setIsEdit(true);
      // Formik değerlerini ayarlayalım
      validation.setValues({
        id: selectedUser.id || "",
        name: selectedUser.fullName || "",
        user: selectedUser.username || "",
        role: selectedUser.role?.id || "",
        status: selectedUser.isActive,
        date: selectedUser.createdAt ? moment(selectedUser.createdAt).format("DD.MM.YYYY") : "",
        password: selectedUser.password || "",
      });
      setModal(true); // toggle yerine doğrudan açıyoruz
    },
    [validation]
  );

  const handleDetailClick = useCallback(
    async (selectedUser: any) => {
      try {
        const userDetail = await fetchUserDetail(selectedUser.id);
        if (userDetail) {
          setUser(userDetail);
          setIsDetail(true);
          setIsEdit(false);
          // Formik değerlerini ayarlayalım
          validation.setValues({
            id: userDetail.id || "",
            name: userDetail.fullName || "",
            user: userDetail.username || "",
            role: userDetail.role?.id || "",
            status: userDetail.isActive,
            date: userDetail.createdAt ? moment(userDetail.createdAt).format("DD.MM.YYYY") : "",
            password: userDetail.password || "",
          });
          setModal(true); // toggle yerine doğrudan açıyoruz
        }
      } catch (error) {
        console.error("Error fetching user detail:", error);
      }
    },
    [validation]
  );

  const handleDeleteConfirm = async () => {
    if (selectedRecordForDelete) {
      try {
        const result = await deleteUser({
          variables: { id: selectedRecordForDelete.id },
          context: getAuthorizationLink()
        });
        
        if (result && result.data && result.data.deleteUser) {
          toast.success("Kullanıcı başarıyla silindi.");
          fetchInitialData();
        } else {
          toast.error("Kullanıcı silinirken bir hata oluştu.");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Kullanıcı silinirken hata oluştu.");
      }
    }
    setDeleteModal(false);
    setSelectedRecordForDelete(null);
  };

  const handleFilterApply = async (filters: UserFilterState): Promise<any[]> => {
    console.log("Uygulanan filtreler:", filters);
    
    // State değişkenlerini güncelle
    setSearchText(filters.title || "");
    
    // Status değerini güncelle - null ise, tüm durumları getir
    if (filters.status) {
      setActiveFilter(filters.status.value.toLowerCase() === "aktif" ? true : false);
    } else {
      setActiveFilter(null);
    }
    
    // Tarih filtresi için değişkenler
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (filters.dateRange && filters.dateRange.length >= 1) {
      if (filters.dateRange[0]) {
        // Manuel tarih formatlaması ile YYYY-MM-DD formatını oluştur
        const date = filters.dateRange[0];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Ay 0-11 arası
        const day = String(date.getDate()).padStart(2, '0');
        startDateStr = `${year}-${month}-${day}`;
        
        console.log("Başlangıç tarihi ayarlandı:", startDateStr, "Orijinal tarih:", filters.dateRange[0]);
      }
      
      if (filters.dateRange.length >= 2 && filters.dateRange[1]) {
        // Manuel tarih formatlaması ile YYYY-MM-DD formatını oluştur
        const date = filters.dateRange[1];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Ay 0-11 arası
        const day = String(date.getDate()).padStart(2, '0');
        endDateStr = `${year}-${month}-${day}`;
        
        console.log("Bitiş tarihi ayarlandı:", endDateStr, "Orijinal tarih:", filters.dateRange[1]);
      }
    } else {
      // Tarih aralığı temizlendiyse, açıkça null olarak ayarla
      console.log("Tarih aralığı temizlendi, tarih değerleri null olarak ayarlandı");
      startDateStr = null;
      endDateStr = null;
    }
    
    // Seçilen rolleri al - artık tam bir dizi olarak kullanılacak
    const selectedRoleIds = filters.roles && filters.roles.length > 0 
      ? filters.roles.map((role: SelectOption) => role.value) 
      : null;
    
    // Sayfa indeksini sıfırla
    setPageIndex(0);
    
    try {
      // API çağrısı parametreleri
      const input: GetUsersInput = {
        pageSize,
        pageIndex: 0,
        text: filters.title || "",
        orderBy,
        orderDirection,
        isActive: filters.status
          ? filters.status.value.toLowerCase() === "aktif"
            ? true
            : false
          : null,
        roleIds: selectedRoleIds,
        createdAtStart: startDateStr,
        createdAtEnd: endDateStr
      };
      
      console.log("API'ye gönderilen parametreler:", input);
      
      // Execute query using fetchUserData which now uses Apollo Client
      const data = await fetchUserData(input);
      
      console.log("API'den dönen veri:", data);
      
      if (data && data.items) {
        const formattedData = data.items.map((item: User) => ({
          ...item,
          // Format dates for the UI
          date: item.createdAt ? moment(item.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
        }));
        setAllUsers(formattedData);
        setFilteredUsers(formattedData);
        setItemCount(data.itemCount);
        setPageCount(data.pageCount);
        
        // URL parametrelerini güncelle
        updateUrlParams({
          searchText: filters.title || "",
          activeFilter: filters.status
            ? filters.status.value.toLowerCase() === "aktif"
              ? true
              : false
            : null,
          createdAtStart: startDateStr,
          createdAtEnd: endDateStr,
          roles: selectedRoleIds || []
        });
        
        return formattedData;
      } else {
        setAllUsers([]);
        setFilteredUsers([]);
        setItemCount(0);
        setPageCount(0);
        
        // Veri bulunamadı durumunda da URL güncelle
        updateUrlParams({
          searchText: filters.title || "",
          activeFilter: filters.status
            ? filters.status.value.toLowerCase() === "aktif"
              ? true
              : false
            : null,
          createdAtStart: startDateStr,
          createdAtEnd: endDateStr,
          roles: selectedRoleIds || []
        });
        
        toast.error("Uygun veri bulunamadı.");
        return [];
      }
    } catch (error) {
      console.error("Kullanıcı verileri getirilirken hata oluştu:", error);
      toast.error("Kullanıcı verileri getirilirken hata oluştu.");
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
            aria-label="Select all users"
          />
        ),
        cell: (cell: any) => (
          <input
            type="checkbox"
            className="usersCheckBox form-check-input"
            value={cell.getValue()}
            onChange={() => {}}
            aria-label={`Select user ${cell.row?.id || ''}`}
          />
        ),
        id: "#",
        enableSorting: false,
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("fullName")}>
            Adı {sortConfig?.key === "fullName" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "fullName",
        enableColumnFilter: false,
        cell: (cell: any) => <div className="d-flex align-items-center">{cell.getValue()}</div>,
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("username")}>
            Kullanıcı {sortConfig?.key === "username" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "username",
        enableColumnFilter: false,
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("role")}>
            Rol {sortConfig?.key === "role" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "role.name",
        enableColumnFilter: false,
        cell: (cell: any) => (cell.getValue() ? cell.getValue() : ""),
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>
            Durum {sortConfig?.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "isActive",
        enableColumnFilter: false,
        cell: (cell: any) => (cell.getValue() ? "Aktif" : "Pasif"),
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
                onClick={() => handleUserClick(cellProps.row.original)}
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
    [handleUserClick, handleSort, sortConfig, handleDetailClick]
  );

  // Filtre paneli açıldığında URL parametrelerini kontrol et ve yenile
  useEffect(() => {
    if (isInfoDetails) {
      console.log("Filtre paneli açıldı, URL parametreleri kontrol ediliyor...");
      
      // URL'den mevcut parametreler alınır ve UserFilter bileşenine key prop'u aracılığıyla aktarılır
      // Bu sayede her açılışta doğru status değerini gösterebiliriz
      const queryParams = new URLSearchParams(location.search);
      const statusParam = queryParams.get("status");
      
      console.log("Açılışta URL'deki status parametresi:", statusParam);
      
      // Bu useEffect, isInfoDetails değiştiğinde ve true olduğunda
      // UserFilter bileşeninin yeniden yüklenmesini sağlar
    }
  }, [isInfoDetails, location.search]);

  // ilk yükleme
  useEffect(() => {
    // Fetch initial data when component mounts
    fetchInitialData();
    
    // Add event listener for the Add button click in UserFilter
    const handleAddButtonClick = () => {
      setUser(null);
      setModal(true);
      setIsEdit(false);
      setIsDetail(false);
      validation.resetForm(); // Reset the form values
    };
    
    window.addEventListener('UsersAddClick', handleAddButtonClick);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('UsersAddClick', handleAddButtonClick);
    };
  }, []);  // Sadece bileşen monte olduğunda çalışacak

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Sistem Kullanıcıları" />
          <Row>
            <Col lg={12}>
              <Card id="usersList">
                <CardHeader className="border-0">
                  <Row className="g-4 align-items-center">
                    <div className="col-sm-auto ms-auto">
                      <div className="hstack gap-2">
                      </div>
                    </div>
                  </Row>
                </CardHeader>
                <CardBody className="pt-3">
                  <UserFilter
                    show={isInfoDetails}
                    onCloseClick={() => setIsInfoDetails(false)}
                    onFilterApply={async (filters: UserFilterState) => {
                      try {
                        const result = await handleFilterApply(filters);
                        return result; // Promise döndür
                      } catch (error) {
                        console.error("Filtre uygulama hatası:", error);
                        return []; // Hata durumunda boş dizi döndür
                      }
                    }}
                    key={location.search}
                  />
                  
                  {loading ? (
                    <div className="text-center">
                      <Loader />
                    </div>
                  ) : error ? (
                    <div className="alert alert-danger">{error}</div>
                  ) : (
                    <div>
                      {filteredUsers.length === 0 ? (
                        <div className="text-center">Görüntülenecek veri bulunamadı.</div>
                      ) : (
                        <TableContainer
                          columns={columns}
                          data={filteredUsers}
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
                      Kullanıcı
                    </ModalHeader>
                    <Form className="tablelist-form" onSubmit={handleSubmit} autoComplete="off">
                      <ModalBody>
                        <Input type="hidden" id="id-field" />
                        <Row className="g-3">
                          <Col lg={12} className="mb-3">
                            <div className="form-check">
                              <Input
                                type="checkbox"
                                id="status-field"
                                name="status"
                                className="form-check-input"
                                checked={validation.values.status}
                                onChange={(e) => {
                                  if (!isDetail) {
                                    validation.setFieldValue("status", e.target.checked);
                                  }
                                }}
                                disabled={isDetail}
                              />
                              <Label className="form-check-label" htmlFor="status-field">
                                Aktif
                              </Label>
                            </div>
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="name-field" className="form-label me-2 mb-0 w-25">
                                Adı
                              </Label>
                              {!isDetail ? (
                                <DebouncedInput
                                  name="name"
                                  id="customername-field"
                                  className="form-control"
                                  type="text"
                                  onChange={validation.handleChange}
                                  onBlur={validation.handleBlur}
                                  value={validation.values.name}
                                  invalid={validation.touched.name && validation.errors.name ? true : false}
                                />
                              ) : (
                                <div>{validation.values.name}</div>
                              )}
                            </div>
                            {validation.touched.name && validation.errors.name && (
                              <FormFeedback>{validation.errors.name as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="user-field" className="form-label me-2 mb-0 w-25">
                                Kullanıcı
                              </Label>
                              {!isDetail ? (
                                <DebouncedInput
                                  name="user"
                                  id="user-field"
                                  className="form-control"
                                  type="text"
                                  onChange={validation.handleChange}
                                  onBlur={validation.handleBlur}
                                  value={validation.values.user}
                                  invalid={validation.touched.user && validation.errors.user ? true : false}
                                  autoComplete="off"
                                />
                              ) : (
                                <div>{validation.values.user}</div>
                              )}
                            </div>
                            {validation.touched.user && validation.errors.user && (
                              <FormFeedback>{validation.errors.user as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="password-field" className="form-label me-2 mb-0 w-25">
                                Parola
                              </Label>
                              {!isDetail ? (
                                <DebouncedInput
                                  name="password"
                                  id="password-field"
                                  className="form-control"
                                  type={isEdit ? "text" : "password"}
                                  onChange={validation.handleChange}
                                  onBlur={validation.handleBlur}
                                  value={validation.values.password}
                                  invalid={validation.touched.password && validation.errors.password ? true : false}
                                  autoComplete="off"
                                />
                              ) : (
                                <div>{validation.values.password || "Parola yok"}</div>
                              )}
                            </div>
                            {validation.touched.password && validation.errors.password && (
                              <FormFeedback>{validation.errors.password as string}</FormFeedback>
                            )}
                          </Col>
                          <Col lg={12} className="mb-3">
                            <div className="d-flex flex-row align-items-center">
                              <Label htmlFor="role-field" className="form-label me-2 mb-0 w-25">
                                Rol
                              </Label>
                              {!isDetail ? (
                                <Select
                                  options={roleOptions}
                                  name="role"
                                  onChange={(selected: any) =>
                                    validation.setFieldValue("role", selected?.value)
                                  }
                                  value={
                                    validation.values.role
                                      ? {
                                          value: validation.values.role,
                                          label:
                                            roleOptions.find((r) => r.value === validation.values.role)?.label || "",
                                        }
                                      : null
                                  }
                                  placeholder="Seçiniz"
                                  className="flex-grow-1"
                                  isDisabled={isDetail}
                                />
                              ) : (
                                <div>
                                  {roleOptions.find((r) => r.value === validation.values.role)?.label}
                                </div>
                              )}
                            </div>
                            {validation.touched.role && validation.errors.role && (
                              <FormFeedback>{validation.errors.role as string}</FormFeedback>
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
const Users: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <UsersContent />
    </ApolloProvider>
  );
};

export default Users;