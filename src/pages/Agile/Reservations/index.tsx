import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  CardTitle,
  Input,
  Badge,
} from 'reactstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BreadCrumb from '../../../Components/Common/BreadCrumb';
import {
  useQuery,
  useLazyQuery,
  useMutation,
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloProvider,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeleteModal from '../../../Components/Common/DeleteModal';
import Loader from '../../../Components/Common/Loader';
import { getAuthHeader } from '../../../helpers/jwt-token-access/accessToken';

// Rezervasyon Bileşenleri
import ReservationFilter, { ReservationFilterState } from './components/Filter';
import PaginationComponent from '../../../Components/Agile/Reservations/Pagination';

// CSS
import './reservations.scss';

// GraphQL Sorguları ve Mutasyonları
import {
  GET_TRANSACTIONS,
  GET_TRANSACTION_STATUSES,
  GET_TRANSACTION_TYPES,
  GET_USERS_LOOKUP,
  GET_ACCOUNTS_LOOKUP,
  GET_TRANSACTIONS_AS_EXCEL,
} from '../../../graphql/queries/transactionQueries';
import { DELETE_TRANSACTION } from '../../../graphql/mutations/transactionMutations';
import moment from 'moment';

// API URL'ini çek
const apiUrl: string = process.env.REACT_APP_API_URL ?? '';
if (!apiUrl) {
  throw new Error('API URL is not defined in the environment variables.');
}

// Auth link oluştur
const authLink = setContext((_, { headers }) => {
  const token = getAuthHeader();
  return {
    headers: {
      ...headers,
      authorization: token ? token : '',
    },
  };
});

// HTTP link oluştur
const httpLink = createHttpLink({
  uri: apiUrl,
});

// Apollo Client oluştur
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
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
});

// Transaction tipi
interface Transaction {
  id: string;
  no: string;
  amount: number;
  createdAt?: string;
  transactionDate?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  note?: string;
  flightNumber?: string;
  address?: string;
  postalCode?: string;
  externalId?: string;
  cancelDate?: string;
  cancelNote?: string;
  successDate?: string;
  successNote?: string;
  currency?: {
    id: string;
    name: string;
    symbol?: string;
    code?: string;
  };
  type?: {
    id: string;
    name: string;
    code?: string;
  };
  status?: {
    id: string;
    name: string;
    code?: string;
    isCancel?: boolean;
    isSuccess?: boolean;
  };
  account?: {
    id: string;
    name: string;
  };
  assignedUser?: {
    id: string;
    fullName: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  country?: {
    id: string;
    name: string;
  };
  city?: {
    id: string;
    name: string;
  };
  county?: {
    id: string;
    name: string;
  };
  district?: {
    id: string;
    name: string;
  };
  transactionProducts?: Array<{
    id: string;
    product: {
      id: string;
      name: string;
    };
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number | null;
  }>;
  locations?: Array<{
    id: string;
    code: string;
    address: string;
    plannedDate?: string;
    actualDate?: string;
    note?: string;
    postalCode?: string;
    latitude?: string;
    longitude?: string;
    city?: {
      id: string;
      name: string;
    };
    country?: {
      id: string;
      name: string;
    };
    county?: {
      id: string;
      name: string;
    };
    district?: {
      id: string;
      name: string;
    };
  }>;
}

// Filtre tipi
interface TransactionFilterState {
  text: string;
  statusIds: string[] | null;
  accountIds: string[] | null;
  typeIds: string[] | null;
  transactionDateStart: string | null;
  transactionDateEnd: string | null;
}

// PaginatedResponse tipi
interface PaginatedResponse {
  items: Transaction[];
  itemCount: number;
  pageCount: number;
}

const ReservationsContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State yönetimi
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterState, setFilterState] = useState<TransactionFilterState>({
    text: '',
    statusIds: null,
    accountIds: null,
    typeIds: null,
    transactionDateStart: null,
    transactionDateEnd: null,
  });

  // Silme modalı için state
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null,
  );

  // Filtre seçenekleri için stateler
  const [statuses, setStatuses] = useState<
    Array<{ id: string; name: string; code?: string }>
  >([]);
  const [types, setTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string }>>(
    [],
  );
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  // GraphQL sorguları
  const [getTransactions, { loading: transactionsLoading }] = useLazyQuery(
    GET_TRANSACTIONS,
    {
      fetchPolicy: 'network-only',
      onCompleted: (data) => {
        if (data && data.getTransactions) {
          setTransactions(data.getTransactions.items);
          setTotalCount(data.getTransactions.itemCount);
          setPageCount(data.getTransactions.pageCount);
          setLoading(false);
        }
      },
      onError: (error) => {
        toast.error(`Veri yüklenirken bir hata oluştu: ${error.message}`);
        setLoading(false);
      },
    },
  );

  const [getTransactionsAsExcel, { loading: exportLoading }] = useLazyQuery(
    GET_TRANSACTIONS_AS_EXCEL,
  );

  // Veri çekme işlemi
  const fetchData = useCallback(() => {
    setLoading(true);
    getTransactions({
      variables: {
        input: {
          pageSize,
          pageIndex,
          text: filterState.text || undefined,
          statusIds:
            filterState.statusIds && filterState.statusIds.length > 0
              ? filterState.statusIds
              : undefined,
          accountIds:
            filterState.accountIds && filterState.accountIds.length > 0
              ? filterState.accountIds
              : undefined,
          typeIds:
            filterState.typeIds && filterState.typeIds.length > 0
              ? filterState.typeIds
              : undefined,
          transactionDateStart: filterState.transactionDateStart || undefined,
          transactionDateEnd: filterState.transactionDateEnd || undefined,
          orderBy: 'transactionDate',
          orderDirection: 'ASC',
        },
      },
    });
  }, [getTransactions, pageSize, pageIndex, filterState]);

  // Lookup verilerini çek
  const fetchLookupData = useCallback(async () => {
    try {
      // Transaction Statuses
      const { data: statusData } = await client.query({
        query: GET_TRANSACTION_STATUSES,
      });
      if (statusData && statusData.getTransactionStatusesLookup) {
        setStatuses(statusData.getTransactionStatusesLookup);
      }

      // Transaction Types
      const { data: typesData } = await client.query({
        query: GET_TRANSACTION_TYPES,
      });
      if (typesData && typesData.getTransactionTypesLookup) {
        setTypes(typesData.getTransactionTypesLookup);
      }

      // Users Lookup
      const { data: usersData } = await client.query({
        query: GET_USERS_LOOKUP,
      });
      if (
        usersData &&
        usersData.getUsersLookup &&
        usersData.getUsersLookup.items
      ) {
        setUsers(usersData.getUsersLookup.items);
      }

      // Accounts Lookup
      const { data: accountsData } = await client.query({
        query: GET_ACCOUNTS_LOOKUP,
        variables: {
          input: {
            pageSize: 100,
            pageIndex: 0,
          },
        },
      });
      if (
        accountsData &&
        accountsData.getAccounts &&
        accountsData.getAccounts.items
      ) {
        setAccounts(accountsData.getAccounts.items);
      }
    } catch (error) {
      toast.error('Veri yüklenirken bir hata oluştu');
      console.error('Error fetching lookup data:', error);
    }
  }, []);

  // URL parametrelerini işle
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const newFilterState: TransactionFilterState = {
      text: params.get('text') || '',
      statusIds: params.get('statusIds')
        ? params.get('statusIds')?.split(',') || null
        : null,
      transactionDateStart: params.get('transactionDateStart') || null,
      transactionDateEnd: params.get('transactionDateEnd') || null,
      accountIds: params.get('accountIds')
        ? params.get('accountIds')?.split(',') || null
        : null,
      typeIds: params.get('typeIds')
        ? params.get('typeIds')?.split(',') || null
        : null
    };

    setFilterState(newFilterState);
    setPageIndex(Number(params.get('pageIndex') || 0));
    setPageSize(Number(params.get('pageSize') || 10));
  }, [location.search]);

  // İlk yükleme ve lookup verisi çekme
  useEffect(() => {
    fetchLookupData();
  }, [fetchLookupData]);

  // Location state'ini kontrol et
  useEffect(() => {
    if (location.state?.refreshData) {
      fetchData();
      // State'i temizle
      navigate(location.pathname + location.search, { replace: true });
    }
  }, [location.state]);

  // Filtreleme ve sayfalama değişikliklerinde veri çekme
  useEffect(() => {
    fetchData();
  }, [fetchData, pageIndex, pageSize, filterState]);

  // URL parametrelerini güncelle
  const updateUrlParams = (
    newFilters?: TransactionFilterState,
    newPageIndex?: number,
    newPageSize?: number,
  ) => {
    const filters = newFilters || filterState;
    const params = new URLSearchParams();

    if (filters.text) params.set('text', filters.text);
    if (filters.statusIds?.length)
      params.set('statusIds', filters.statusIds.join(','));
    if (filters.transactionDateStart) params.set('transactionDateStart', filters.transactionDateStart);
    if (filters.transactionDateEnd) params.set('transactionDateEnd', filters.transactionDateEnd);
    if (filters.accountIds?.length)
      params.set('accountIds', filters.accountIds.join(','));
    if (filters.typeIds?.length)
      params.set('typeIds', filters.typeIds.join(','));
    
    params.set(
      'pageIndex',
      (newPageIndex !== undefined ? newPageIndex : pageIndex).toString(),
    );
    params.set(
      'pageSize',
      (newPageSize !== undefined ? newPageSize : pageSize).toString(),
    );

    navigate({ pathname: location.pathname, search: params.toString() });
  };

  // Filtre uygulama
  const handleFilterApply = (filters: TransactionFilterState) => {
    setFilterState(filters);
    setPageIndex(0); // Filtre değiştiğinde ilk sayfaya dön
    updateUrlParams(filters, 0);
  };

  // Sayfa değiştirme
  const handlePageChange = (page: number) => {
    setPageIndex(page - 1); // API 0-tabanlı, UI 1-tabanlı
    updateUrlParams(undefined, page - 1);
  };

  // Yeni işlem oluşturma
  const handleAddTransaction = () => {
    navigate('/agile/reservations/addnew');
  };

  // İşlemleri görüntüleme
  const handleViewTransaction = (id: string) => {
    navigate(`/agile/reservations/view/${id}`);
  };

  // İşlem düzenleme
  const handleEditTransaction = (id: string) => {
    navigate(`/agile/reservations/edit/${id}`);
  };

  // İşlem silme
  const handleDeleteTransaction = (id: string) => {
    setTransactionToDelete(id);
    setDeleteModal(true);
  };

  // Silme işlemini onayla
  const [deleteTransaction] = useMutation(DELETE_TRANSACTION, {
    onCompleted: () => {
      toast.success('İşlem başarıyla silindi');
      setDeleteModal(false);
      setTransactionToDelete(null);
      fetchData();
    },
    onError: (error) => {
      toast.error(`Silme işlemi başarısız: ${error.message}`);
    },
  });

  const handleDeleteConfirm = async () => {
    if (transactionToDelete) {
      try {
        await deleteTransaction({
          variables: { id: transactionToDelete },
        });
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  // Durum badgeleri için renkler
  const getStatusBadgeColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (
      statusLower.includes('completed') ||
      statusLower.includes('tamamlandı') ||
      statusLower.includes('onaylandı')
    ) {
      return 'success';
    } else if (
      statusLower.includes('pending') ||
      statusLower.includes('beklemede')
    ) {
      return 'warning';
    } else if (
      statusLower.includes('cancelled') ||
      statusLower.includes('iptal')
    ) {
      return 'danger';
    } else {
      return 'info';
    }
  };

  // Tarih formatla
  const formatDate = (dateString: string): string => {
    return moment(dateString).format('DD.MM.YYYY');
  };

  const handleExportToExcel = async () => {
    try {
      const { data } = await getTransactionsAsExcel({
        variables: {
          input: {
            ...filterState,
            format: 'excel',
            excelOptions: {
                columns: [
                    {
                        key: 'transactionDate',
                        title: 'TARİH',
                        type: 'date',
                        width: 20,
                    },
                    {
                        key: 'transactionDate',
                        title: 'saat',
                        type: 'date',
                        width: 20,
                    },
                    {
                        key: 'account.name',
                        title: 'ACENTA',
                        width: 20,
                    },
                    {
                        key: 'flightNumber',
                        title: 'UCUSKOD',
                        width: 15,
                    },
                    {
                        key: 'locations[0].address',
                        title: 'BASLAMA',
                        width: 15,
                    },
                    {
                        key: 'locations[1].address',
                        title: 'BITIS',
                        width: 15,
                    },
                    {
                        key: 'locations[1].address',
                        title: 'ADRES',
                        width: 15,
                    },
                    {
                        key: 'transactionProducts[0].quantity',
                        title: 'YOLCU',
                        width: 15,
                    },
                    {
                        key: 'name',
                        title: 'YOLCULISTE',
                        width: 15,
                    },
                    {
                        title: 'TC',
                        width: 15,
                    },
                    {
                        key: 'transactionProducts[0].product.name',
                        title: 'ARAC',
                        width: 15,
                    },
                    {
                        key: 'phone',
                        title: 'TELEFON',
                        width: 15,
                    },
                    {
                        key: 'no',
                        title: 'RESNO',
                        width: 15,
                    },
                    {
                        title: 'SFR',
                        width: 15,
                    },
                    {
                        title: 'TFIYAT',
                        width: 15,
                    },
                ],
                headerStyle: {
                    font: { bold: true, color: 'FFFFFFFF' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: 'FF0070C0' },
                    alignment: { horizontal: 'center', vertical: 'middle' },
                    border: {
                        top: { style: 'thin', color: 'FF000000' },
                        bottom: { style: 'thin', color: 'FF000000' },
                        left: { style: 'thin', color: 'FF000000' },
                        right: { style: 'thin', color: 'FF000000' },
                    },
                },
                dataStyle: {
                    border: {
                        top: { style: 'thin', color: 'FFD3D3D3' },
                        bottom: { style: 'thin', color: 'FFD3D3D3' },
                        left: { style: 'thin', color: 'FFD3D3D3' },
                        right: { style: 'thin', color: 'FFD3D3D3' },
                    },
                },
            },
          },
        },
      });

      if (data?.getTransactionsAsExcel) {
        // Base64'ten binary'e dönüştür
        const binaryString = atob(data.getTransactionsAsExcel);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Blob oluştur
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // URL oluştur ve yeni sekmede aç
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // URL'i temizle
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('Excel export failed: ' + error.message);
    }
  };

  console.log('transactions', transactions);

  return (
    <React.Fragment>
      <div className="page-content reservations-container">
        <Container fluid>
          <BreadCrumb title="Reservations" pageTitle="Agile" />
          <Row>
            <Col lg={12}>
              <Card className="reservation-card">
                <CardHeader className="d-flex align-items-center d-none">
                  <CardTitle tag="h5" className="mb-0 flex-grow-1">
                    Reservations
                  </CardTitle>
                  <div className="d-flex gap-2">
                    <Button color="primary" onClick={handleAddTransaction}>
                      <i className="ri-add-line align-bottom me-1"></i> New Reservation
                    </Button>
                    <Button color="success" onClick={handleExportToExcel} disabled={loading || exportLoading}>
                      <i className="ri-file-excel-line align-bottom me-1"></i> LIST AS EXCEL
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <Row className="">
                    <Col>
                      <ReservationFilter
                        onApply={handleFilterApply}
                        onExportToExcel={handleExportToExcel}
                        loading={loading || exportLoading}
                        statuses={statuses}
                        travelTypes={types}
                        users={users}
                        accounts={accounts}
                        initialFilters={filterState}
                      />
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      {loading ? (
                        <div className="text-center my-5">
                          <Spinner color="primary" />
                        </div>
                      ) : (
                        <>
                          {/* Mobil tarzında rezervasyon listesi */}
                          <div className="transaction-list">
                            {transactions.length === 0 ? (
                              <div className="text-center py-5">
                                <p>No reservations found</p>
                              </div>
                            ) : (
                              transactions.map((transaction, index) => {
                                // FROM ve TO lokasyonlarını bul
                                const fromLocation =
                                  transaction.locations &&
                                  transaction.locations.length > 0
                                    ? transaction.locations.find(
                                        (loc) => loc.code === 'FROM',
                                      ) || transaction.locations[0]
                                    : null;

                                const toLocation =
                                  transaction.locations &&
                                  transaction.locations.length > 0
                                    ? transaction.locations.find(
                                        (loc) => loc.code === 'TO',
                                      ) ||
                                      (transaction.locations.length > 1
                                        ? transaction.locations[1]
                                        : null)
                                    : null;

                                // Durum değeri ataması
                                let statusText = 'NEW';
                                let statusClass = 'new';

                                if (transaction.status?.code) {
                                  const statusCode =
                                    transaction.status.code.toLowerCase();
                                  if (statusCode == 'completed') {
                                    statusText = 'COMPLETED';
                                    statusClass = 'completed';
                                  } else if (statusCode == 'cancelled') {
                                    statusText = 'CANCELLED';
                                    statusClass = 'cancelled';
                                  }
                                }

                                // Uçuş numarası/ExternalId
                                const externalId =
                                  transaction.externalId || '-';

                                // Tam ad oluştur
                                const fullName =
                                  transaction.name ||
                                  (transaction.firstName || transaction.lastName
                                    ? `${transaction.firstName || ''} ${
                                        transaction.lastName || ''
                                      }`.trim()
                                    : transaction.account?.name || '-');

                                // Planlanan tarih
                                const plannedDate = fromLocation?.plannedDate
                                  ? formatDate(fromLocation.plannedDate)
                                  : transaction.transactionDate
                                  ? formatDate(transaction.transactionDate)
                                  : '-';

                                return (
                                  <div
                                    key={transaction.id}
                                    className={`transaction-card ${statusClass}`}>
                                    <div className="transaction-header">
                                      <div className="header-left">
                                        <span className="transaction-status fw-bold fs-6">
                                          {statusText}
                                        </span>
                                        {transaction.flightNumber ? (
                                          <span className="transaction-date fw-bold fs-5">
                                            <i className="ri-flight-takeoff-line me-1 fw-bold fs-5"></i>
                                            {transaction.flightNumber}
                                          </span>
                                        ) : (
                                          ''
                                        )}
                                        <span className="transaction-date fw-bold fs-5">
                                          <i className="ri-calendar-line me-1 fw-bold fs-5"></i>
                                          {moment(transaction.transactionDate).format('DD.MM.YYYY')}
                                        </span>
                                        <span className="transaction-time fw-bold fs-5">
                                          <i className="ri-time-line me-1 fw-bold fs-5"></i>
                                          {moment(transaction.transactionDate).format('HH:mm')}
                                        </span>
                                      </div>
                                      <div className="header-right">
                                        {localStorage.getItem('role_code') !== 'vendor' ? (
                                            <button
                                                className="btn btn-sm btn-primary action-button fs-6"
                                                onClick={() => handleEditTransaction(transaction.id)}>
                                                <i className="ri-edit-line me-1"></i>
                                                EDIT
                                            </button>
                                        ) : ''}
                                        <button
                                          className="btn btn-sm btn-danger action-button fs-6 d-none"
                                          onClick={() =>
                                            handleDeleteTransaction(
                                              transaction.id,
                                            )
                                          }>
                                          <i className="ri-delete-bin-line me-1"></i>
                                          DELETE
                                        </button>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          href={`/agile/reservations/view/${transaction.id}`}>
                                          <button className="btn btn-sm btn-primary action-button fs-6">
                                            DETAIL <i className="ri-external-link-line"></i>
                                          </button>
                                        </a>
                                      </div>
                                    </div>

                                    <div className="transaction-content">
                                      {/* Sol Sütun - Rezervasyon No ve Diğer Bilgiler */}
                                      <div className="transaction-info">
                                        {/* #2 - Ücret */}
                                        <div className="transaction-amount fw-bold fs-3">
                                          {transaction.amount
                                            ? `${transaction.amount.toFixed(
                                                2,
                                              )} ${
                                                transaction.currency?.code ||
                                                ''
                                              }`
                                            : '-'}
                                        </div>

                                        {/* #1 - İşlem no */}
                                        <div className="transaction-id">
                                          <i className="ri-hashtag me-1 fw-bold"></i>
                                          {transaction.no || '-'}
                                        </div>

                                        {/* #7 - Ürün */}
                                        <div className="transport-type">
                                          <i className="ri-car-line me-1 fw-bold"></i>
                                          {transaction.transactionProducts?.[0]
                                            ?.product?.name ||
                                            '-'}
                                        </div>

                                        {/* #4 - İşlem sahibi */}
                                        {localStorage.getItem('role_code') !== 'vendor' ? (
                                            <div className="travel-company">
                                                <i className="ri-building-line fw-bold me-1"></i>
                                                {transaction.account?.name || '-'}
                                            </div>
                                        ) : ''}
                                      </div>

                                      {/* Orta Sütun - Lokasyonlar */}
                                      <div className="route-info-container">
                                        {/* Başlangıç Konumu */}
                                        <div className="route-info">
                                          <div className="">
                                            <div className="gap-2">
                                              <i className="ri-map-pin-user-fill fw-bold fs-2"></i>
                                            </div>
                                          </div>
                                          <div className="location-details">
                                            {/* #5 - Başlangıç adresi */}
                                            <div className="location-name fs-6">
                                              {fromLocation?.address ||
                                                transaction.address ||
                                                '-'}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Kesikli çizgi */}
                                        <div className="route-divider">
                                          <div
                                            className="border-bottom border border-dashed border-warning"
                                            style={{ height: '25px' }}></div>
                                        </div>

                                        {/* Bitiş Konumu */}
                                        <div className="route-info">
                                          <div className="gap-2">
                                            <i className="ri-map-pin-2-line fs-2"></i>
                                          </div>
                                          <div className="location-details">
                                            {/* #8 - Hedef adresi */}
                                            <div className="location-name fs-6">
                                              {toLocation?.address || '-'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Sağ Sütun - Müşteri Bilgileri */}
                                      <div className="passenger-info">
                                        {/* #10 - Müşteri adı */}
                                        <div className="passenger-name">
                                          <i className="ri-user-line me-1"></i>
                                          {fullName}
                                        </div>

                                        {/* #11 - Yolcu sayısı */}
                                        <div className="passenger-count">
                                          <i className="ri-group-line me-1"></i>
                                          {transaction.transactionProducts?.[0]
                                            ?.quantity ?? '-'}
                                        </div>

                                        {/* #12 - Telefon */}
                                        <div className="passenger-phone">
                                          <i className="ri-phone-line me-1"></i>
                                          {transaction.phone || '-'}
                                        </div>

                                        {/* #17 - Not */}
                                        <div className="passenger-note">
                                          <i className="ri-file-text-line me-1"></i>
                                          {transaction.note ||
                                            transaction.successNote ||
                                            transaction.cancelNote ||
                                            fromLocation?.note ||
                                            toLocation?.note ||
                                            '-'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {pageCount > 0 && (
                            <PaginationComponent
                              currentPage={pageIndex + 1} // UI'da 1-tabanlı gösterim
                              pageCount={pageCount}
                              onPageChange={handlePageChange}
                            />
                          )}

                          {
                            `Rezervasyon sayısı:` + totalCount
                          }
                        </>
                      )}
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Silme onay modalı */}
      <DeleteModal
        show={deleteModal}
        onDeleteClick={handleDeleteConfirm}
        onCloseClick={() => {
          setDeleteModal(false);
          setTransactionToDelete(null);
        }}
      />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </React.Fragment>
  );
};

const Reservations: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <ReservationsContent />
    </ApolloProvider>
  );
};

export default Reservations;
