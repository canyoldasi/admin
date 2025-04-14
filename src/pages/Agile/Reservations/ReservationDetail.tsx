import React, { useState, useEffect } from "react";
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
  Table,
} from "reactstrap";
import { useParams, useNavigate } from "react-router-dom";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import {
  useLazyQuery,
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloProvider,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loader from "../../../Components/Common/Loader";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { GET_TRANSACTION } from "../../../graphql/queries/transactionQueries";
import moment from "moment";
import "./reservations.scss";

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

const ReservationDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [transaction, setTransaction] = useState<any>(null);

  // Veri çekme sorgusu
  const [getTransaction, { loading: transactionLoading }] = useLazyQuery(
    GET_TRANSACTION,
    {
      onCompleted: (data) => {
        if (data && data.getTransaction) {
          setTransaction(data.getTransaction);
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

  // Düzenleme sayfasına git
  const handleEditReservation = () => {
    navigate(`/agile/reservations/edit/${id}`);
  };

  // Listeye geri dön
  const handleBackToList = () => {
    navigate("/agile/reservations");
  };

  const getFromLocation = () => {
    if (!transaction?.locations || transaction.locations.length === 0)
      return null;
    return (
      transaction.locations.find((loc: any) => loc.code === "FROM") ||
      transaction.locations[0]
    );
  };

  const getToLocation = () => {
    if (!transaction?.locations || transaction.locations.length === 0)
      return null;
    return (
      transaction.locations.find((loc: any) => loc.code === "TO") ||
      (transaction.locations.length > 1 ? transaction.locations[1] : null)
    );
  };

  const fromLocation = getFromLocation();
  const toLocation = getToLocation();

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Rezervasyon Detayı" pageTitle="Agile" />

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center">
                  <CardTitle tag="h5" className="mb-0 flex-grow-1">
                    Rezervasyon Detayları
                  </CardTitle>
                  <div className="d-flex gap-2">
                    <Button color="primary" onClick={handleEditReservation}>
                      <i className="ri-edit-line align-bottom me-1"></i> Düzenle
                    </Button>
                    <Button color="light" onClick={handleBackToList}>
                      <i className="ri-arrow-left-line align-bottom me-1"></i>{" "}
                      Listeye Dön
                    </Button>
                  </div>
                </CardHeader>
                {loading ? (
                  <CardBody>
                    <div className="text-center my-5">
                      <Spinner color="primary" />
                    </div>
                  </CardBody>
                ) : transaction ? (
                  <>
                    {/* Genel Bilgiler */}
                    <Card className="mb-3 border-0">
                      <CardHeader className="d-flex align-items-center bg-light">
                        <CardTitle tag="h4" className="mb-0 flex-grow-1" style={{ fontSize: "1.5rem" }}>
                          Genel Bilgiler
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                            <Table borderless className="align-middle mb-0">
                              <tbody>
                                <tr>
                                  <th scope="row" style={{ width: "25%" }}>
                                    Rezervasyon No
                                  </th>
                                  <td>{transaction.no || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Status</th>
                                  <td>
                                    <span
                                      className={`badge bg-${
                                        transaction.status?.name
                                          ?.toLowerCase()
                                          .includes("tamamla")
                                          ? "success"
                                          : transaction.status?.name
                                              ?.toLowerCase()
                                              .includes("iptal")
                                          ? "danger"
                                          : "info"
                                      }`}
                                    >
                                      {transaction.status?.name || "-"}
                                    </span>
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">İşlem Türü</th>
                                  <td>{transaction.type?.name || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Hesap</th>
                                  <td>{transaction.account?.name || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">İşlem Sahibi</th>
                                  <td>{transaction.channel?.name || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Referans</th>
                                  <td>{transaction.externalId || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Atanan Kullanıcı</th>
                                  <td>
                                    {transaction.assignedUser?.fullName || "-"}
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Not</th>
                                  <td style={{ whiteSpace: "pre-wrap" }}>
                                    {transaction.note || "-"}
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Oluşturulma Tarihi</th>
                                  <td>{formatDate(transaction.createdAt)}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Planlanan Tarih</th>
                                  <td>
                                    {formatDate(
                                      transaction.transactionDate
                                    )}
                                  </td>
                                </tr>
                                {transaction.status?.name
                                  ?.toLowerCase()
                                  .includes("tamamla") && (
                                  <>
                                    <tr>
                                      <th scope="row">Tamamlanma Tarihi</th>
                                      <td>
                                        {formatDate(transaction.successDate)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Tamamlanma Notu</th>
                                      <td style={{ whiteSpace: "pre-wrap" }}>
                                        {transaction.successNote || "-"}
                                      </td>
                                    </tr>
                                  </>
                                )}
                                {transaction.status?.name
                                  ?.toLowerCase()
                                  .includes("iptal") && (
                                  <>
                                    <tr>
                                      <th scope="row">İptal Tarihi</th>
                                      <td>
                                        {formatDate(transaction.cancelDate)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">İptal Notu</th>
                                      <td style={{ whiteSpace: "pre-wrap" }}>
                                        {transaction.cancelNote || "-"}
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </Table>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Yolcu Bilgileri */}
                    <Card className="mb-3 border-0">
                      <CardHeader className="d-flex align-items-center bg-light">
                        <CardTitle tag="h4" className="mb-0 flex-grow-1" style={{ fontSize: "1.5rem" }}>
                          Yolcu Bilgileri
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                            <Table borderless className="align-middle mb-0">
                              <tbody>
                                <tr>
                                  <th scope="row" style={{ width: "25%" }}>
                                    Yolcu Adı
                                  </th>
                                  <td>
                                    {transaction.name ||
                                      (transaction.firstName ||
                                      transaction.lastName
                                        ? `${transaction.firstName || ""} ${
                                            transaction.lastName || ""
                                          }`.trim()
                                        : "-")}
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Yolcu Telefon</th>
                                  <td>{transaction.phone || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Yolcu Sayısı</th>
                                  <td>
                                    {transaction.transactionProducts?.[0]
                                      ?.quantity || "-"}
                                  </td>
                                </tr>
                              </tbody>
                            </Table>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Lokasyon Bilgileri */}
                    <Card className="mb-3 border-0">
                      <CardHeader className="d-flex align-items-center bg-light">
                        <CardTitle tag="h4" className="mb-0 flex-grow-1" style={{ fontSize: "1.5rem" }}>
                          Lokasyon Bilgileri
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                            <Row>
                              <Col md={6}>
                                <h6 className="text-muted mb-3">Nereden</h6>
                                <Table borderless className="align-middle mb-0">
                                  <tbody>
                                    <tr>
                                      <th scope="row" style={{ width: "25%" }}>
                                        Adres
                                      </th>
                                      <td>
                                        {fromLocation?.address ||
                                          transaction.address ||
                                          "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Şehir</th>
                                      <td>
                                        {fromLocation?.city?.name ||
                                          transaction.city?.name ||
                                          "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">İlçe</th>
                                      <td>
                                        {fromLocation?.county?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Mahalle</th>
                                      <td>
                                        {fromLocation?.district?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Ülke</th>
                                      <td>
                                        {fromLocation?.country?.name ||
                                          transaction.country?.name ||
                                          "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Posta Kodu</th>
                                      <td>
                                        {fromLocation?.postalCode || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Planlanan Tarih</th>
                                      <td>
                                        {formatDate(
                                          fromLocation?.plannedDate ||
                                            transaction.transactionDate
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </Table>
                              </Col>
                              <Col md={6}>
                                <h6 className="text-muted mb-3">Nereye</h6>
                                <Table borderless className="align-middle mb-0">
                                  <tbody>
                                    <tr>
                                      <th scope="row" style={{ width: "25%" }}>
                                        Adres
                                      </th>
                                      <td>{toLocation?.address || "-"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Şehir</th>
                                      <td>{toLocation?.city?.name || "-"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">İlçe</th>
                                      <td>{toLocation?.county?.name || "-"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Mahalle</th>
                                      <td>
                                        {toLocation?.district?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Ülke</th>
                                      <td>
                                        {toLocation?.country?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Posta Kodu</th>
                                      <td>{toLocation?.postalCode || "-"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Planlanan Tarih</th>
                                      <td>
                                        {formatDate(toLocation?.plannedDate)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </Table>
                              </Col>
                            </Row>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Ürün Bilgileri */}
                    <Card className="mb-3 border-0">
                      <CardHeader className="d-flex align-items-center bg-light">
                          <CardTitle tag="h4" className="mb-0 flex-grow-1" style={{ fontSize: "1.5rem" }}>
                          Ürün Bilgileri
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                            <Table borderless className="align-middle mb-0">
                              <thead>
                                <tr>
                                  <th>Ürün</th>
                                  <th>Miktar</th>
                                  <th>Birim Fiyat</th>
                                  <th>Toplam Tutar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transaction.transactionProducts?.map(
                                  (product: any, index: number) => (
                                    <tr key={index}>
                                      <td>
                                        {product.product?.name || "-"}
                                      </td>
                                      <td>{product.quantity || 1}</td>
                                      <td>
                                        {product.unitPrice?.toFixed(2) || "0.00"}
                                      </td>
                                      <td>
                                          {product.totalPrice?.toFixed(2) || "0.00"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <th colSpan={3} className="text-end">
                                    Toplam:
                                  </th>
                                  <th>
                                    {transaction.amount
                                      ? `${transaction.amount.toFixed(2)} ${
                                          transaction.currency?.symbol || "EUR"
                                        }`
                                      : "-"}
                                  </th>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </>
                ) : (
                  <CardBody>
                    <div className="text-center py-5">
                      <p>Rezervasyon bulunamadı</p>
                    </div>
                  </CardBody>
                )}
              </Card>
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

const ReservationDetail: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <ReservationDetailContent />
    </ApolloProvider>
  );
};

export default ReservationDetail;
