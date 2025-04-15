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
  fromDate: string | null;
  toDate: string | null;
  assignedUserIds: string[] | null;
  accountIds: string[] | null;
  typeIds: string[] | null;
  minAmount: number | null;
  maxAmount: number | null;
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
    fromDate: null,
    toDate: null,
    assignedUserIds: null,
    accountIds: null,
    typeIds: null,
    minAmount: null,
    maxAmount: null,
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
          typeIds:
            filterState.typeIds && filterState.typeIds.length > 0
              ? filterState.typeIds
              : undefined,
          assignedUserIds:
            filterState.assignedUserIds &&
            filterState.assignedUserIds.length > 0
              ? filterState.assignedUserIds
              : undefined,
          accountIds:
            filterState.accountIds && filterState.accountIds.length > 0
              ? filterState.accountIds
              : undefined,
          createdAtStart: filterState.fromDate || undefined,
          createdAtEnd: filterState.toDate || undefined,
          amountStart: filterState.minAmount || undefined,
          amountEnd: filterState.maxAmount || undefined,
          orderBy: 'transactionDate',
          orderDirection: 'DESC',
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
      fromDate: params.get('fromDate') || null,
      toDate: params.get('toDate') || null,
      assignedUserIds: params.get('assignedUserIds')
        ? params.get('assignedUserIds')?.split(',') || null
        : null,
      accountIds: params.get('accountIds')
        ? params.get('accountIds')?.split(',') || null
        : null,
      typeIds: params.get('typeIds')
        ? params.get('typeIds')?.split(',') || null
        : null,
      minAmount: params.get('minAmount')
        ? parseFloat(params.get('minAmount') || '0')
        : null,
      maxAmount: params.get('maxAmount')
        ? parseFloat(params.get('maxAmount') || '0')
        : null,
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
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.assignedUserIds?.length)
      params.set('assignedUserIds', filters.assignedUserIds.join(','));
    if (filters.accountIds?.length)
      params.set('accountIds', filters.accountIds.join(','));
    if (filters.typeIds?.length)
      params.set('typeIds', filters.typeIds.join(','));
    if (filters.minAmount !== null)
      params.set('minAmount', filters.minAmount.toString());
    if (filters.maxAmount !== null)
      params.set('maxAmount', filters.maxAmount.toString());

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

  console.log('transactions', transactions);

  return (
    <React.Fragment>
      <div className="page-content reservations-container">
        <Container fluid>
          <BreadCrumb title="Reservations" pageTitle="Agile" />
          <Row>
            <Col lg={12}>
              <Card className="reservation-card">
                <CardHeader className="d-flex align-items-center">
                  <CardTitle tag="h5" className="mb-0 flex-grow-1">
                    Reservations
                  </CardTitle>
                  <div className="d-flex gap-2">
                    <Button color="primary" onClick={handleAddTransaction}>
                      <i className="ri-add-line align-bottom me-1"></i> New
                      Reservation
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <Row className="">
                    <Col>
                      <ReservationFilter
                        onApply={handleFilterApply}
                        loading={loading}
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
                                          {plannedDate}
                                        </span>
                                        <span className="transaction-time fw-bold fs-5">
                                          <i className="ri-time-line me-1 fw-bold fs-5"></i>
                                          {fromLocation?.plannedDate
                                            ? moment(
                                                fromLocation.plannedDate,
                                              ).format('HH:mm')
                                            : moment(
                                                transaction.transactionDate ||
                                                  transaction.createdAt,
                                              ).format('HH:mm')}
                                        </span>
                                      </div>
                                      <div className="header-right">
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          href={`/agile/reservations/view/${transaction.id}`}>
                                          <button className="btn btn-sm btn-outline-success action-button">
                                            <i className="ri-eye-line me-1"></i>
                                            DETAIL
                                          </button>
                                        </a>
                                        <button
                                          className="btn btn-sm btn-outline-primary action-button"
                                          onClick={() =>
                                            handleEditTransaction(
                                              transaction.id,
                                            )
                                          }>
                                          <i className="ri-edit-line me-1"></i>
                                          EDIT
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-danger action-button"
                                          onClick={() =>
                                            handleDeleteTransaction(
                                              transaction.id,
                                            )
                                          }>
                                          <i className="ri-delete-bin-line me-1"></i>
                                          DELETE
                                        </button>
                                      </div>
                                    </div>

                                    <div className="transaction-content">
                                      {/* Sol Sütun - Rezervasyon No ve Diğer Bilgiler */}
                                      <div className="transaction-info">
                                        {/* #1 - İşlem no */}
                                        <div className="transaction-id">
                                          <i className="ri-hashtag me-1"></i>
                                          {transaction.no || '-'}
                                        </div>

                                        {/* #2 - Ücret */}
                                        <div className="transaction-amount">
                                          <i className="ri-money-euro-circle-line me-1"></i>
                                          {transaction.amount
                                            ? `${transaction.amount.toFixed(
                                                2,
                                              )} ${
                                                transaction.currency?.symbol ||
                                                ''
                                              }`
                                            : '-'}
                                        </div>

                                        {/* #7 - Ürün */}
                                        <div className="transport-type">
                                          <i className="ri-car-line me-1"></i>
                                          {transaction.transactionProducts?.[0]
                                            ?.product?.name ||
                                            transaction.type?.name ||
                                            '-'}
                                        </div>

                                        {/* #4 - İşlem sahibi */}
                                        <div className="travel-company">
                                          <i className="ri-building-line me-1"></i>
                                          {transaction.account?.name || '-'}
                                        </div>
                                      </div>

                                      {/* Orta Sütun - Lokasyonlar */}
                                      <div className="route-info-container">
                                        {/* Başlangıç Konumu */}
                                        <div className="route-info">
                                          <div className="">
                                            <div className="gap-2">
                                              <i className="ri-map-pin-user-fill fs-2"></i>
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
