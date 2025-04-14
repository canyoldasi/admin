import { useLazyQuery, useQuery, useMutation } from "@apollo/client";
import {
  GET_ACCOUNTS_LOOKUP,
  GET_CHANNELS_LOOKUP,
  GET_PRODUCTS_LOOKUP,
  GET_TRANSACTION,
  GET_TRANSACTION_STATUSES,
  GET_TRANSACTION_TYPES,
  GET_USERS_LOOKUP,
} from "../../../graphql/queries/transactionQueries";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Spinner,
  Table,
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import { UPDATE_RESERVATION } from "../../../graphql/mutations/reservationMutations";
import "../Reservations/reservations.scss";
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloProvider,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// API URL'ini çek
const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

// Auth link oluştur
const authLink = setContext((_, { headers }) => {
  const token = getAuthHeader();
  return {
    headers: {
      ...headers,
      authorization: token ? token : "",
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
      fetchPolicy: "network-only",
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
    watchQuery: {
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
      errorPolicy: "all",
    },
  },
});

// Select Option tipi
interface SelectOption {
  value: string;
  label: string;
}

const ReservationEditContent: React.FC = () => {
  const navigate = useNavigate();
  const [accountOptions, setAccountOptions] = useState<SelectOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const { id } = useParams<{ id: string }>();

  // Form state değişkenleri
  const [selectedUser, setSelectedUser] = useState<SelectOption | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<SelectOption | null>(
    null
  );
  const [selectedStatus, setSelectedStatus] = useState<SelectOption | null>(
    null
  );
  const [selectedType, setSelectedType] = useState<SelectOption | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<SelectOption | null>(
    null
  );
  const [selectedProduct, setSelectedProduct] = useState<SelectOption | null>(
    null
  );
  const [reservationNo, setReservationNo] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [note, setNote] = useState<string>("");

  // Ürün bilgileri
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // Yolcu Bilgileri
  const [passengerName, setPassengerName] = useState<string>("");
  const [passengerPhone, setPassengerPhone] = useState<string>("");
  const [passengerCount, setPassengerCount] = useState<number>(1);

  // TransactionProduct ID'sini saklayacak bir state değişkeni ekliyoruz
  const [transactionProductId, setTransactionProductId] = useState<string>("");

  // Veri çekme sorgusu
  const [getTransaction, { loading: transactionLoading }] = useLazyQuery(
    GET_TRANSACTION,
    {
      client,
      onCompleted: (data) => {
        if (data && data.getTransaction) {
          const transaction = data.getTransaction;
          setTransaction(transaction);

          // Form alanlarını doldur
          setReservationNo(transaction.no || "");
          setNote(transaction.note || "");

          if (transaction.transactionDate) {
            setTransactionDate(new Date(transaction.transactionDate));
          }

          // Select alanları için options
          if (transaction.account) {
            setSelectedAccount({
              value: transaction.account.id,
              label: transaction.account.name,
            });
          }

          if (transaction.status) {
            setSelectedStatus({
              value: transaction.status.id,
              label: transaction.status.name,
            });
          }

          if (transaction.type) {
            setSelectedType({
              value: transaction.type.id,
              label: transaction.type.name,
            });
          }

          if (transaction.channel) {
            setSelectedChannel({
              value: transaction.channel.id,
              label: transaction.channel.name,
            });
          }

          if (transaction.assignedUser) {
            setSelectedUser({
              value: transaction.assignedUser.id,
              label: transaction.assignedUser.fullName,
            });
          }

          // Yolcu bilgileri
          setPassengerName(transaction.name || "");
          setPassengerPhone(transaction.phone || "");

          // Ürün bilgileri
          if (
            transaction.transactionProducts &&
            transaction.transactionProducts.length > 0
          ) {
            const product = transaction.transactionProducts[0];
            if (product.product) {
              setSelectedProduct({
                value: product.product.id,
                label: product.product.name,
              });
            }
            // TransactionProduct ID'sini saklayacak bir state değişkeni ekliyoruz
            setTransactionProductId(product.id);
            setQuantity(product.quantity || 1);
            setUnitPrice(product.unitPrice || 0);
            setTotalPrice(product.totalPrice || 0);
            setPassengerCount(product.quantity || 1);
          }

          setLoading(false);
        }
      },
      onError: (error) => {
        toast.error(`Veri yüklenirken bir hata oluştu: ${error.message}`);
        setLoading(false);
      },
    }
  );

  // Tarih formatla
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    return moment(dateString).format("DD.MM.YYYY HH:mm");
  };

  // İlk yüklemede veriyi çek
  useEffect(() => {
    if (id) {
      getTransaction({
        variables: {
          id: id,
        },
      });
    }
  }, [getTransaction, id]);

  // Kullanıcıları yükleme
  const { loading: usersLoading } = useQuery(GET_USERS_LOOKUP, {
    client,
    onCompleted: (data) => {
      if (data && data.getUsersLookup && data.getUsersLookup.items) {
        const options = data.getUsersLookup.items.map((user: any) => ({
          value: user.id,
          label: user.fullName,
        }));
        setUserOptions(options);
        console.log(
          `Kullanıcılar başarıyla yüklendi: ${options.length} kullanıcı bulundu`
        );
      }
    },
    onError: (error) => {
      console.error("Kullanıcı yüklenirken hata oluştu:", error);
      toast.error("Kullanıcı yüklenirken hata oluştu.");
    },
    fetchPolicy: "network-only",
  });

  // Ürünleri yükleme
  const { loading: productsLoading } = useQuery(GET_PRODUCTS_LOOKUP, {
    client,
    onCompleted: (data) => {
      if (data && data.getProductsLookup && data.getProductsLookup.items) {
        const options = data.getProductsLookup.items.map((product: any) => ({
          value: product.id,
          label: product.name,
        }));
        setProductOptions(options);
        console.log(
          `Ürünler başarıyla yüklendi: ${options.length} ürün bulundu`
        );
      }
    },
    onError: (error) => {
      console.error("Ürünler yüklenirken hata oluştu:", error);
      toast.error("Ürünler yüklenirken hata oluştu.");
    },
    fetchPolicy: "network-only",
  });

  // İşlem türlerini yükleme
  const { loading: typesLoading } = useQuery(GET_TRANSACTION_TYPES, {
    client,
    onCompleted: (data) => {
      if (data && data.getTransactionTypesLookup) {
        const options = data.getTransactionTypesLookup.map((type: any) => ({
          value: type.id,
          label: type.name,
        }));
        setTypeOptions(options);
        console.log(
          `İşlem türleri başarıyla yüklendi: ${options.length} tür bulundu`
        );
      }
    },
    onError: (error) => {
      console.error("İşlem türleri yüklenirken hata oluştu:", error);
      toast.error("İşlem türleri yüklenirken hata oluştu.");
    },
    fetchPolicy: "network-only",
  });

  // İşlem durumlarını yükleme
  const { loading: statusesLoading } = useQuery(GET_TRANSACTION_STATUSES, {
    client,
    onCompleted: (data) => {
      if (data && data.getTransactionStatusesLookup) {
        const options = data.getTransactionStatusesLookup.map(
          (status: any) => ({
            value: status.id,
            label: status.name,
          })
        );
        setStatusOptions(options);
        console.log(
          `İşlem durumları başarıyla yüklendi: ${options.length} durum bulundu`
        );
      }
    },
    onError: (error) => {
      console.error("İşlem durumları yüklenirken hata oluştu:", error);
      toast.error("İşlem durumları yüklenirken hata oluştu.");
    },
    fetchPolicy: "network-only",
  });

  // Kanalları yükleme
  const { loading: channelsLoading } = useQuery(GET_CHANNELS_LOOKUP, {
    client,
    onCompleted: (data) => {
      if (data && data.getChannelsLookup) {
        const options = data.getChannelsLookup.map((channel: any) => ({
          value: channel.id,
          label: channel.name,
        }));
        setChannelOptions(options);
        console.log(
          `Kanallar başarıyla yüklendi: ${options.length} kanal bulundu`
        );
      }
    },
    onError: (error) => {
      console.error("Kanallar yüklenirken hata oluştu:", error);
      toast.error("Kanallar yüklenirken hata oluştu.");
    },
    fetchPolicy: "network-only",
  });

  // Hesapları yükleme
  const [getAccounts, { loading: accountsLoading }] = useLazyQuery(
    GET_ACCOUNTS_LOOKUP,
    {
      client,
      fetchPolicy: "network-only",
    }
  );

  // Hesapları yükleme fonksiyonu
  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);

      const { data } = await client.query({
        query: GET_ACCOUNTS_LOOKUP,
        variables: {
          input: {
            pageSize: 100,
            pageIndex: 0,
          },
        },
        context: {
          headers: {
            authorization: getAuthHeader(),
          },
        },
        fetchPolicy: "network-only",
      });

      if (data && data.getAccounts && data.getAccounts.items) {
        const accounts = data.getAccounts.items;
        if (accounts.length > 0) {
          const options = accounts.map((account: any) => ({
            value: account.id,
            label: account.name,
          }));
          setAccountOptions(options);
          console.log(
            `Hesaplar başarıyla yüklendi: ${options.length} hesap bulundu`
          );
        } else {
          console.warn("API boş hesap listesi döndürdü");
          toast.warning("Hesap listesi boş. API'den veri alınamadı.");
          setAccountOptions([]);
        }
      }
    } catch (error) {
      console.error("Hesaplar yüklenirken hata oluştu:", error);
      toast.error("Hesaplar yüklenirken hata oluştu.");
    } finally {
      setLoadingAccounts(false);
    }
  };

  // İlk yüklemede hesapları getir
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Toplam fiyat hesaplama
  useEffect(() => {
    const calculatedTotal = unitPrice * quantity;
    setTotalPrice(calculatedTotal);
  }, [unitPrice, quantity]);

  // Form submit işlemi
  const [updateReservation] = useMutation(UPDATE_RESERVATION, {
    client,
    onCompleted: (data) => {
      if (data && data.updateTransaction) {
        toast.success("Rezervasyon başarıyla güncellendi");
        setTimeout(() => {
          navigate("/agile/reservations");
        }, 2000); // Toast görünmesi için 2 saniye bekle
      }
    },
    onError: (error) => {
      toast.error(`Güncelleme sırasında hata oluştu: ${error.message}`);
      setSaving(false);
    },
  });

  const handleSubmit = async () => {
    try {
      setSaving(true);

      // Zorunlu alanları kontrol et
      if (!selectedStatus || !selectedType) {
        toast.error("İşlem türü ve durumu seçilmelidir.");
        setSaving(false);
        return;
      }

      if (!selectedProduct) {
        toast.error("Ürün seçilmelidir.");
        setSaving(false);
        return;
      }

      // Input verilerini hazırlama
      const updateData = {
        id: id,
        accountId: selectedAccount?.value,
        no: reservationNo,
        assignedUserId: selectedUser?.value,
        channelId: selectedChannel?.value,
        name: passengerName,
        phone: passengerPhone,
        note: note,
        statusId: selectedStatus?.value,
        typeId: selectedType?.value,
        transactionDate: moment(transactionDate).toISOString(),
        amount: quantity, // böyle istendiği için
        products: [
          {
            id: transactionProductId,
            productId: selectedProduct?.value,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: unitPrice * quantity,
          },
        ],
      };

      // Mutasyonu çalıştır
      await updateReservation({
        variables: {
          input: updateData,
        },
      });
    } catch (error: any) {
      console.error("Güncelleme sırasında hata:", error);
      toast.error(`Güncelleme sırasında hata: ${error.message}`);
      setSaving(false);
    }
  };

  // Listeye dön
  const handleCancel = () => {
    navigate("/agile/reservations");
  };

  // Select değişiklik handler'ları
  const handleUserChange = (selectedOption: any) => {
    setSelectedUser(selectedOption);
  };

  const handleAccountChange = (selectedOption: any) => {
    setSelectedAccount(selectedOption);
  };

  const handleStatusChange = (selectedOption: any) => {
    setSelectedStatus(selectedOption);
  };

  const handleTypeChange = (selectedOption: any) => {
    setSelectedType(selectedOption);
  };

  const handleChannelChange = (selectedOption: any) => {
    setSelectedChannel(selectedOption);
  };

  const handleProductChange = (selectedOption: any) => {
    setSelectedProduct(selectedOption);
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setUnitPrice(isNaN(value) ? 0 : value);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setQuantity(isNaN(value) ? 1 : value);
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Rezervasyon Düzenle" pageTitle="Agile" />

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center">
                  <CardTitle tag="h5" className="mb-0 flex-grow-1">
                    Rezervasyon Düzenle
                  </CardTitle>
                  <div className="d-flex gap-2">
                    <Button color="danger" onClick={handleCancel}>
                      <i className="ri-close-line align-bottom me-1"></i> İptal
                    </Button>
                    <Button
                      color="success"
                      onClick={handleSubmit}
                      disabled={loading || saving}
                    >
                      {saving ? (
                        <span className="d-flex align-items-center">
                          <Spinner size="sm" className="me-2" />
                          Kaydediliyor...
                        </span>
                      ) : (
                        <>
                          <i className="ri-save-line align-bottom me-1"></i>{" "}
                          Kaydet
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {loading ? (
                <div className="text-center my-5">
                  <Spinner color="primary" />
                </div>
              ) : (
                <>
                  {/* Genel Bilgiler */}
                  <Card className="mb-3">
                    <CardHeader className="d-flex align-items-center bg-light">
                      <CardTitle
                        tag="h4"
                        className="mb-0 flex-grow-1"
                        style={{ fontSize: "1.5rem" }}
                      >
                        Genel Bilgiler
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <Form className="reservation-form">
                        <Row>
                          <Col md={6}>
                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="hesap-field"
                                  className="form-label"
                                >
                                  Hesap
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="hesap-field"
                                  options={accountOptions}
                                  value={selectedAccount}
                                  onChange={handleAccountChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Seçiniz"
                                  isLoading={loadingAccounts}
                                  isDisabled={loadingAccounts}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="islem-durumu-field"
                                  className="form-label"
                                >
                                  İşlem Durumu
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="islem-durumu-field"
                                  options={statusOptions}
                                  value={selectedStatus}
                                  onChange={handleStatusChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Seçiniz"
                                  isLoading={statusesLoading}
                                  isDisabled={statusesLoading}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="user-field"
                                  className="form-label"
                                >
                                  Kullanıcı
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="user-field"
                                  options={userOptions}
                                  value={selectedUser}
                                  onChange={handleUserChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Seçiniz"
                                  isLoading={usersLoading}
                                  isDisabled={usersLoading}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="reservation-no-field"
                                  className="form-label"
                                >
                                  Rezervasyon No
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="text"
                                  id="reservation-no-field"
                                  placeholder="Rezervasyon numarası giriniz"
                                  value={reservationNo}
                                  onChange={(e) =>
                                    setReservationNo(e.target.value)
                                  }
                                />
                              </Col>
                            </Row>
                          </Col>

                          <Col md={6}>
                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="islem-turu-field"
                                  className="form-label"
                                >
                                  İşlem Türü
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="islem-turu-field"
                                  options={typeOptions}
                                  value={selectedType}
                                  onChange={handleTypeChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Seçiniz"
                                  isLoading={typesLoading}
                                  isDisabled={typesLoading}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="kanal-field"
                                  className="form-label"
                                >
                                  Kanal
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="kanal-field"
                                  options={channelOptions}
                                  value={selectedChannel}
                                  onChange={handleChannelChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Seçiniz"
                                  isLoading={channelsLoading}
                                  isDisabled={channelsLoading}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="planlanma-zamani-field"
                                  className="form-label"
                                >
                                  Planlanma Zamanı
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Flatpickr
                                  id="planlanma-zamani-field"
                                  className="form-control"
                                  placeholder="Tarih ve saat seçiniz"
                                  options={{
                                    enableTime: true,
                                    dateFormat: "d.m.Y H:i",
                                    time_24hr: true,
                                  }}
                                  value={transactionDate}
                                  onChange={(selectedDates) => {
                                    if (selectedDates.length > 0) {
                                      setTransactionDate(selectedDates[0]);
                                    }
                                  }}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="notes-field"
                                  className="form-label"
                                >
                                  Notlar
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="textarea"
                                  id="notes-field"
                                  placeholder="Notlarınızı buraya giriniz"
                                  value={note}
                                  onChange={(e) => setNote(e.target.value)}
                                  rows={3}
                                />
                              </Col>
                            </Row>
                          </Col>
                        </Row>
                      </Form>
                    </CardBody>
                  </Card>

                  {/* Yolcu Bilgileri */}
                  <Card className="mb-3">
                    <CardHeader className="d-flex align-items-center bg-light">
                      <CardTitle
                        tag="h4"
                        className="mb-0 flex-grow-1"
                        style={{ fontSize: "1.5rem" }}
                      >
                        Yolcu Bilgileri
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <Form>
                        <Row className="mb-3">
                          <Col md={3}>
                            <Label
                              htmlFor="passenger-name-field"
                              className="form-label"
                            >
                              Yolcu Adı
                            </Label>
                          </Col>
                          <Col md={9}>
                            <Input
                              type="text"
                              id="passenger-name-field"
                              placeholder="Yolcu adını giriniz"
                              value={passengerName}
                              onChange={(e) => setPassengerName(e.target.value)}
                            />
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={3}>
                            <Label
                              htmlFor="passenger-phone-field"
                              className="form-label"
                            >
                              Yolcu Telefonu
                            </Label>
                          </Col>
                          <Col md={3}>
                            <Input
                              type="text"
                              id="passenger-phone-field"
                              placeholder="Telefon numarası"
                              value={passengerPhone}
                              onChange={(e) =>
                                setPassengerPhone(e.target.value)
                              }
                            />
                          </Col>

                          <Col md={3}>
                            <Label
                              htmlFor="passenger-count-field"
                              className="form-label"
                            >
                              Yolcu Sayısı
                            </Label>
                          </Col>
                          <Col md={3}>
                            <Input
                              type="number"
                              id="passenger-count-field"
                              placeholder="1"
                              value={passengerCount}
                              onChange={(e) =>
                                setPassengerCount(parseInt(e.target.value) || 1)
                              }
                              min={1}
                            />
                          </Col>
                        </Row>
                      </Form>
                    </CardBody>
                  </Card>

                  {/* Ürün Bilgileri */}
                  <Card className="mb-3">
                    <CardHeader className="d-flex align-items-center bg-light">
                      <CardTitle
                        tag="h4"
                        className="mb-0 flex-grow-1"
                        style={{ fontSize: "1.5rem" }}
                      >
                        Ürün Bilgileri
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <Form>
                        <Row className="mb-3">
                          <Col md={3}>
                            <Label
                              htmlFor="product-field"
                              className="form-label"
                            >
                              Ürün
                            </Label>
                          </Col>
                          <Col md={9}>
                            <Select
                              id="product-field"
                              options={productOptions}
                              value={selectedProduct}
                              onChange={handleProductChange}
                              className="react-select"
                              classNamePrefix="select"
                              placeholder="Ürün seçiniz"
                              isLoading={productsLoading}
                              isDisabled={productsLoading}
                              isClearable={true}
                            />
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={3}>
                            <Label
                              htmlFor="unit-price-field"
                              className="form-label"
                            >
                              Birim Fiyat
                            </Label>
                          </Col>
                          <Col md={3}>
                            <Input
                              type="number"
                              id="unit-price-field"
                              placeholder="0.00"
                              value={unitPrice}
                              onChange={handleUnitPriceChange}
                              min={0}
                              step="0.01"
                            />
                          </Col>

                          <Col md={3}>
                            <Label
                              htmlFor="quantity-field"
                              className="form-label"
                            >
                              Miktar
                            </Label>
                          </Col>
                          <Col md={3}>
                            <Input
                              type="number"
                              id="quantity-field"
                              placeholder="1"
                              value={quantity}
                              onChange={handleQuantityChange}
                              min={1}
                            />
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={3}>
                            <Label
                              htmlFor="total-price-field"
                              className="form-label"
                            >
                              Toplam Fiyat
                            </Label>
                          </Col>
                          <Col md={9}>
                            <Input
                              type="text"
                              id="total-price-field"
                              value={totalPrice.toFixed(2)}
                              disabled
                              className="bg-light"
                            />
                          </Col>
                        </Row>
                      </Form>
                    </CardBody>
                  </Card>
                </>
              )}
            </Col>
          </Row>
        </Container>
      </div>
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

const ReservationEdit: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <ReservationEditContent />
    </ApolloProvider>
  );
};

export default ReservationEdit;
