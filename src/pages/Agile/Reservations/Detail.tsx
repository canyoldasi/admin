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
          <BreadCrumb title="Reservation Details" pageTitle="Agile" />

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center">
                  <CardTitle tag="h5" className="mb-0 flex-grow-1">
                    <Button color="light" onClick={handleBackToList}>
                        <i className="ri-arrow-left-line align-bottom me-1"></i>{" "}
                        Back to List
                        </Button>
                  </CardTitle>
                  <div className="d-flex gap-2">

                    {localStorage.getItem('role_code') !== 'vendor' ? (
                      <Button color="primary" onClick={handleEditReservation}>
                        <i className="ri-edit-line align-bottom me-1"></i> Edit
                      </Button>
                    ) : ''}

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
                          General Information
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                            <Table borderless className="align-middle mb-0">
                              <tbody>
                                <tr>
                                  <th scope="row" style={{ width: "25%" }}>
                                    Reservation No
                                  </th>
                                  <td>{transaction.no || "-"}</td>
                                </tr>
                                 <tr>
                                  <th scope="row">Reservation Date</th>
                                  <td>
                                    {formatDate(
                                      transaction.transactionDate
                                    )}
                                  </td>
                                </tr>
                               <tr>
                                  <th scope="row">Status</th>
                                  <td>
                                    <span
                                      className={`badge bg-${
                                        transaction.status?.code?.toLowerCase() === "completed"
                                          ? "success"
                                          :
                                            transaction.status?.code?.toLowerCase() === "cancelled"
                                            ? "danger"
                                            : "info"
                                      }`}
                                    >
                                      {transaction.status?.name || "-"}
                                    </span>
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Transaction Type</th>
                                  <td>{transaction.type?.name || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Assigned Vendor Account</th>
                                  <td>{transaction.account?.name || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Assigned User</th>
                                  <td>
                                    {transaction.assignedUser?.fullName || "-"}
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Channel</th>
                                  <td>{transaction.channel?.name || "-"}</td>
                                </tr>
                                <tr>
                                  <th scope="row">Note</th>
                                  <td style={{ whiteSpace: "pre-wrap" }}>
                                    {transaction.note || "-"}
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Created Date</th>
                                  <td>{formatDate(transaction.createdAt)}</td>
                                </tr>
                                {transaction.status?.name
                                  ?.toLowerCase()
                                  .includes("tamamla") && (
                                  <>
                                    <tr>
                                      <th scope="row">Completed Date</th>
                                      <td>
                                        {formatDate(transaction.successDate)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Completed Note</th>
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
                                      <th scope="row">Cancelled Date</th>
                                      <td>
                                        {formatDate(transaction.cancelDate)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Cancelled Note</th>
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
                          About Passenger
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                            <Table borderless className="align-middle mb-0">
                              <tbody>
                                <tr>
                                  <th scope="row" style={{ width: "25%" }}>
                                    Passenger Name
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
                                  <th scope="row">Passenger Phone</th>
                                  <td>{transaction.phone || "-"}</td>
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
                          Location Details
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                                <h6 className="text-muted mb-3">FROM</h6>
                                <Table borderless className="align-middle mb-0">
                                  <tbody>
                                    <tr>
                                      <th scope="row" style={{ width: "25%" }}>
                                        Address
                                      </th>
                                      <td>
                                        {fromLocation?.address ||
                                          transaction.address ||
                                          "-"}
                                      </td>
                                    </tr>
                                    {/*
                                    <tr>
                                      <th scope="row">City</th>
                                      <td>
                                        {fromLocation?.city?.name ||
                                          transaction.city?.name ||
                                          "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">County</th>
                                      <td>
                                        {fromLocation?.county?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">District</th>
                                      <td>
                                        {fromLocation?.district?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Country</th>
                                      <td>
                                        {fromLocation?.country?.name ||
                                          transaction.country?.name ||
                                          "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Postal Code</th>
                                      <td>
                                        {fromLocation?.postalCode || "-"}
                                      </td>
                                    </tr>
                                    */}
                                    <tr>
                                      <th scope="row">Planned Date</th>
                                      <td>
                                        {formatDate(fromLocation?.plannedDate)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Actual Date</th>
                                      <td>
                                        {formatDate(fromLocation?.actualDate)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </Table>
                                <h6 className="text-muted mb-3">TO</h6>
                                <Table borderless className="align-middle mb-0">
                                  <tbody>
                                    <tr>
                                      <th scope="row" style={{ width: "25%" }}>
                                        Address
                                      </th>
                                      <td>{toLocation?.address || "-"}</td>
                                    </tr>
                                     {/*
                                    <tr>
                                      <th scope="row">City</th>
                                      <td>{toLocation?.city?.name || "-"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">County</th>
                                      <td>{toLocation?.county?.name || "-"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">District</th>
                                      <td>
                                        {toLocation?.district?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Country</th>
                                      <td>
                                        {toLocation?.country?.name || "-"}
                                      </td>
                                    </tr>
                                    <tr>
                                    <th scope="row">Postal Code</th>
                                      <td>{toLocation?.postalCode || "-"}</td>
                                    </tr>
                                    */}
                                    <tr>
                                      <th scope="row">Planned Date</th>
                                      <td>
                                        {formatDate(toLocation?.plannedDate)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Actual Date</th>
                                      <td>
                                        {formatDate(toLocation?.actualDate)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </Table>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Ürün Bilgileri */}
                    <Card className="mb-3 border-0">
                      <CardHeader className="d-flex align-items-center bg-light">
                          <CardTitle tag="h4" className="mb-0 flex-grow-1" style={{ fontSize: "1.5rem" }}>
                          Service Details
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <div className="reservation-detail-container">
                          <div className="reservation-detail-card">
                            {transaction.transactionProducts?.map((product: any, index: number) => (
                              <div key={index} className="mb-4">
                                <Table borderless className="align-middle mb-0">
                                  <tbody>
                                    <tr>
                                      <th scope="row" style={{ width: "25%" }}>Service</th>
                                      <td>{product.product?.name || "-"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Price</th>
                                      <td>{product.totalPrice?.toFixed(2) || "0.00"}</td>
                                    </tr>
                                    <tr>
                                      <th scope="row">Passenger Count</th>
                                      <td>{product.quantity || 1}</td>
                                    </tr>
                                  </tbody>
                                </Table>
                                {index < transaction.transactionProducts.length - 1 && <hr className="my-4" />}
                              </div>
                            ))}
                            
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </>
                ) : (
                  <CardBody>
                    <div className="text-center py-5">
                      <p>Reservation not found</p>
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
