import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Input,
  Button,
  Spinner,
  Badge
} from "reactstrap";
import classnames from "classnames";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import { useMutation, useQuery, useLazyQuery, ApolloClient, InMemoryCache, createHttpLink, ApolloProvider } from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import Select from "react-select";
import * as Yup from "yup";
import { useFormik } from "formik";
import moment from "moment";

// Import DB
import {
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT
} from "../../../graphql/mutations/accountMutations";
import { 
  GET_ACCOUNT,
  GET_USERS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS
} from "../../../graphql/queries/accountQueries";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { Account, SelectOption } from "../../../types/graphql";
import { ApolloError } from "@apollo/client";
import DeleteModal from "../../../Components/Common/DeleteModal";
import Loader from "../../../Components/Common/Loader";

import AccountForm from "./AccountForm";
import AccountFormModal from "./AccountFormModal";

// API URL
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

// Create a function to generate debounced formik handlers
const createDebouncedFormikHandlers = (originalHandleChange: Function, delay = 300) => {
  const debouncedHandleChange = debounce((e: React.ChangeEvent<any>) => {
    originalHandleChange(e);
  }, delay);
  
  return {
    handleDebouncedChange: (e: React.ChangeEvent<any>) => {
      // Always set the event value immediately for a responsive UI
      e.persist();
      debouncedHandleChange(e);
    },
  };
};

// Helper function to convert empty strings to null for GraphQL
const nullIfEmpty = (value: string | null | undefined) => {
  // If the value is undefined, null, or an empty string, return null
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

// Interface for account in the UI
interface AccountWithCreatedAt extends Account {
  createdAt?: string;
  date?: string; // UI formatting field
  // Additional fields needed for UI
  address?: string;
  postalCode?: string;
  country?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
}

// Main account detail component
const AccountDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accountIdRef = useRef<string | undefined>(id);
  
  // State for account data
  const [account, setAccount] = useState<AccountWithCreatedAt | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("1");
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  
  // Reference data state
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  
  // Toggle tabs
  const toggleTab = (tab: string) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };
  
  // Error handling function
  const handleError = (message: string) => {
    toast.error(message);
    console.error(message);
  };
  
  // Fetch cities for a country
  const fetchCitiesForCountry = (countryId: string) => {
    try {
      client.query({
        query: GET_CITIES,
        variables: { countryId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getCities) {
          const options = data.getCities.map((city: any) => ({
            value: city.id,
            label: city.name
          }));
          setCityOptions(options);
        }
      });
    } catch (error) {
      handleError("Şehir verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Fetch counties for a city
  const fetchCountiesForCity = (cityId: string) => {
    try {
      client.query({
        query: GET_COUNTIES,
        variables: { cityId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getCounties) {
          const options = data.getCounties.map((county: any) => ({
            value: county.id,
            label: county.name
          }));
          setCountyOptions(options);
        }
      });
    } catch (error) {
      handleError("İlçe verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Fetch districts for a county
  const fetchDistrictsForCounty = (countyId: string) => {
    try {
      client.query({
        query: GET_DISTRICTS,
        variables: { countyId },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getDistricts) {
          const options = data.getDistricts.map((district: any) => ({
            value: district.id,
            label: district.name
          }));
          setDistrictOptions(options);
        }
      });
    } catch (error) {
      handleError("Mahalle verileri yüklenirken bir hata oluştu");
    }
  };
  
  // Load user options
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
  
  // Load country options
  const loadCountryOptions = async () => {
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
  
  // Fetch account data
  const fetchAccountData = async () => {
    try {
      setLoading(true);
      
      if (!accountIdRef.current) {
        handleError("Hesap ID'si bulunamadı");
        navigate("/accounts");
        return;
      }
      
      // Load reference data
      await Promise.all([
        loadUserOptions(),
        loadCountryOptions()
      ]);
      
      // Fetch account details
      const { data } = await client.query({
        query: GET_ACCOUNT,
        variables: { id: accountIdRef.current },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getAccount) {
        const fetchedAccount = data.getAccount as AccountWithCreatedAt;
        
        // Format dates for UI
        if (fetchedAccount.createdAt) {
          fetchedAccount.date = moment(fetchedAccount.createdAt).format("DD.MM.YYYY");
        }
        
        // Load location data based on account
        if (fetchedAccount.country?.id) {
          fetchCitiesForCountry(fetchedAccount.country.id);
          
          if (fetchedAccount.city?.id) {
            fetchCountiesForCity(fetchedAccount.city.id);
            
            if (fetchedAccount.county?.id) {
              fetchDistrictsForCounty(fetchedAccount.county.id);
            }
          }
        }
        
        setAccount(fetchedAccount);
      } else {
        handleError("Hesap verileri bulunamadı");
        navigate("/accounts");
      }
    } catch (error) {
      if (error instanceof ApolloError) {
        console.error("Apollo error while fetching account:", error.message);
        
        if (error.networkError) {
          console.error("Network error details:", error.networkError);
          handleError("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.");
        } else if (error.graphQLErrors && error.graphQLErrors.length > 0) {
          console.error("GraphQL errors:", error.graphQLErrors);
          const errorMessage = error.graphQLErrors[0].message;
          handleError(`Veri alınırken hata oluştu: ${errorMessage}`);
        } else {
          handleError("Hesap detayı yüklenirken bir hata oluştu");
        }
      } else {
        handleError("Beklenmeyen bir hata oluştu");
      }
      
      navigate("/accounts");
    } finally {
      setLoading(false);
    }
  };
  
  // Update account mutation
  const [updateAccountMutation] = useMutation(UPDATE_ACCOUNT, {
    onCompleted: (data) => {
      toast.success("Hesap başarıyla güncellendi");
      setShowEditModal(false);
      fetchAccountData();
    },
    onError: (error) => {
      handleError(`Hesap güncellenirken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Delete account mutation
  const [deleteAccountMutation] = useMutation(DELETE_ACCOUNT, {
    onCompleted: (data) => {
      toast.success("Hesap başarıyla silindi");
      navigate("/accounts");
    },
    onError: (error) => {
      handleError(`Hesap silinirken bir hata oluştu: ${error.message}`);
    }
  });
  
  // Handle account update
  const handleUpdateAccount = async (values: any) => {
    try {
      setFormSubmitting(true);
      
      // Prepare account input
      const accountInput = {
        name: values.name,
        firstName: nullIfEmpty(values.firstName),
        lastName: nullIfEmpty(values.lastName),
        email: nullIfEmpty(values.email),
        phone: nullIfEmpty(values.phone),
        phone2: nullIfEmpty(values.phone2),
        taxNumber: nullIfEmpty(values.taxNumber),
        taxOffice: nullIfEmpty(values.taxOffice),
        nationalId: nullIfEmpty(values.nationalId),
        address: nullIfEmpty(values.address),
        postalCode: nullIfEmpty(values.postalCode),
        note: nullIfEmpty(values.note),
        assignedUserId: nullIfEmpty(values.assignedUserId),
        countryId: nullIfEmpty(values.countryId),
        cityId: nullIfEmpty(values.cityId),
        countyId: nullIfEmpty(values.countyId),
        districtId: nullIfEmpty(values.districtId)
      };
      
      // Update account
      await updateAccountMutation({
        variables: {
          id: accountIdRef.current,
          input: accountInput
        },
        context: getAuthorizationLink()
      });
    } catch (error) {
      handleError(`Hesap güncellenirken bir hata oluştu: ${(error as Error).message}`);
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Toggle edit modal
  const toggleEditModal = () => {
    setShowEditModal(!showEditModal);
  };
  
  // Handle delete click
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    try {
      if (!accountIdRef.current) {
        handleError("Hesap ID'si bulunamadı");
        return;
      }
      
      await deleteAccountMutation({
        variables: { id: accountIdRef.current },
        context: getAuthorizationLink()
      });
    } catch (error) {
      handleError(`Hesap silinirken bir hata oluştu: ${(error as Error).message}`);
    }
  };
  
  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };
  
  // Formik validation schema
  const validationSchema = Yup.object({
    name: Yup.string().required("Ad alanı zorunludur"),
    email: Yup.string().email("Geçerli bir e-posta adresi giriniz")
  });
  
  // Formik instance
  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: account?.id || "",
      name: account?.name || "",
      firstName: account?.firstName || "",
      lastName: account?.lastName || "",
      email: account?.email || "",
      phone: account?.phone || "",
      phone2: account?.phone2 || "",
      taxNumber: account?.taxNumber || "",
      taxOffice: account?.taxOffice || "",
      nationalId: account?.nationalId || "",
      address: account?.address || "",
      postalCode: account?.postalCode || "",
      note: account?.note || "",
      assignedUserId: account?.assignedUser?.id || "",
      countryId: account?.country?.id || "",
      cityId: account?.city?.id || "",
      countyId: account?.county?.id || "",
      districtId: account?.district?.id || ""
    },
    validationSchema,
    onSubmit: (values) => {
      handleUpdateAccount(values);
    }
  });
  
  // Fetch data on component mount
  useEffect(() => {
    fetchAccountData();
  }, []);
  
  // Create formatted address for display
  const formattedAddress = (): string => {
    const parts = [];
    
    if (account?.address) parts.push(account.address);
    
    // Add district and county if available
    const locationParts = [];
    if (account?.district?.name) locationParts.push(account.district.name);
    if (account?.county?.name) locationParts.push(account.county.name);
    
    if (locationParts.length > 0) {
      parts.push(locationParts.join(', '));
    }
    
    // Add city and country if available
    const regionParts = [];
    if (account?.city?.name) regionParts.push(account.city.name);
    if (account?.country?.name) regionParts.push(account.country.name);
    
    if (regionParts.length > 0) {
      parts.push(regionParts.join(', '));
    }
    
    if (account?.postalCode) {
      parts.push(`Posta Kodu: ${account.postalCode}`);
    }
    
    return parts.join('<br/>');
  };
  
  // Render
  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Hesap Detayı" pageTitle="Hesaplar" />
          
          {loading ? (
            <Loader />
          ) : account ? (
            <Row>
              {/* Left Column - Account Info */}
              <Col xl={4}>
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <div className="profile-user position-relative d-inline-block mx-auto mb-4">
                        <div className="avatar-lg">
                          <div className="avatar-title bg-light rounded-circle text-primary">
                            <i className="ri-user-line fs-1"></i>
                          </div>
                        </div>
                      </div>
                      <h5 className="fs-16 mb-1">{account.name}</h5>
                      {account.firstName && account.lastName && (
                        <p className="text-muted mb-0">{account.firstName} {account.lastName}</p>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <div className="table-responsive">
                        <table className="table table-borderless mb-0">
                          <tbody>
                            {account.email && (
                              <tr>
                                <th scope="row"><i className="ri-mail-line me-2"></i> E-posta</th>
                                <td>{account.email}</td>
                              </tr>
                            )}
                            {account.phone && (
                              <tr>
                                <th scope="row"><i className="ri-phone-line me-2"></i> Telefon</th>
                                <td>{account.phone}</td>
                              </tr>
                            )}
                            {account.phone2 && (
                              <tr>
                                <th scope="row"><i className="ri-phone-line me-2"></i> Alternatif Telefon</th>
                                <td>{account.phone2}</td>
                              </tr>
                            )}
                            {(account.taxNumber || account.taxOffice) && (
                              <tr>
                                <th scope="row"><i className="ri-government-line me-2"></i> Vergi Bilgileri</th>
                                <td>
                                  {account.taxNumber && <div>Vergi No: {account.taxNumber}</div>}
                                  {account.taxOffice && <div>Vergi Dairesi: {account.taxOffice}</div>}
                                </td>
                              </tr>
                            )}
                            {account.nationalId && (
                              <tr>
                                <th scope="row"><i className="ri-profile-line me-2"></i> TC Kimlik No</th>
                                <td>{account.nationalId}</td>
                              </tr>
                            )}
                            {account.address && (
                              <tr>
                                <th scope="row"><i className="ri-map-pin-line me-2"></i> Adres</th>
                                <td dangerouslySetInnerHTML={{ __html: formattedAddress() }}></td>
                              </tr>
                            )}
                            {account.createdAt && (
                              <tr>
                                <th scope="row"><i className="ri-calendar-line me-2"></i> Oluşturulma Tarihi</th>
                                <td>{moment(account.createdAt).format("DD.MM.YYYY, HH:mm")}</td>
                              </tr>
                            )}
                            {account.updatedAt && (
                              <tr>
                                <th scope="row"><i className="ri-calendar-line me-2"></i> Güncellenme Tarihi</th>
                                <td>{moment(account.updatedAt).format("DD.MM.YYYY, HH:mm")}</td>
                              </tr>
                            )}
                            {account.assignedUser && (
                              <tr>
                                <th scope="row"><i className="ri-user-star-line me-2"></i> İlgili Temsilci</th>
                                <td>{account.assignedUser.fullName}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="hstack gap-2 pt-4">
                        <Button 
                          color="primary" 
                          className="w-100" 
                          onClick={toggleEditModal}
                        >
                          <i className="ri-pencil-line align-bottom me-1"></i> Düzenle
                        </Button>
                        <Button 
                          color="danger" 
                          className="w-100" 
                          onClick={handleDeleteClick}
                        >
                          <i className="ri-delete-bin-line align-bottom me-1"></i> Sil
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
                
                {/* Additional information or related entities can be shown here */}
              </Col>
              
              {/* Right Column - Tabs */}
              <Col xl={8}>
                <Card>
                  <CardBody>
                    <Nav tabs className="nav-tabs mb-3">
                      <NavItem>
                        <NavLink
                          style={{ cursor: "pointer" }}
                          className={classnames({ active: activeTab === "1" })}
                          onClick={() => toggleTab("1")}
                        >
                          <i className="ri-information-line me-1 align-bottom"></i> Detaylar
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          style={{ cursor: "pointer" }}
                          className={classnames({ active: activeTab === "2" })}
                          onClick={() => toggleTab("2")}
                        >
                          <i className="ri-attachment-line me-1 align-bottom"></i> Notlar
                        </NavLink>
                      </NavItem>
                      {/* Add more tabs as needed */}
                    </Nav>
                    
                    <TabContent activeTab={activeTab}>
                      <TabPane tabId="1">
                        <div className="table-responsive">
                          <table className="table table-borderless mb-0">
                            <tbody>
                              <tr>
                                <th scope="row" className="ps-0" style={{ width: "30%" }}>Tam Ad</th>
                                <td className="text-muted">{account.firstName} {account.lastName}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">E-posta</th>
                                <td className="text-muted">{account.email || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Telefon</th>
                                <td className="text-muted">{account.phone || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Alternatif Telefon</th>
                                <td className="text-muted">{account.phone2 || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Vergi No</th>
                                <td className="text-muted">{account.taxNumber || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Vergi Dairesi</th>
                                <td className="text-muted">{account.taxOffice || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">TC Kimlik No</th>
                                <td className="text-muted">{account.nationalId || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Adres</th>
                                <td className="text-muted">{account.address || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Posta Kodu</th>
                                <td className="text-muted">{account.postalCode || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Ülke</th>
                                <td className="text-muted">{account.country?.name || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Şehir</th>
                                <td className="text-muted">{account.city?.name || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">İlçe</th>
                                <td className="text-muted">{account.county?.name || "-"}</td>
                              </tr>
                              <tr>
                                <th scope="row" className="ps-0">Mahalle</th>
                                <td className="text-muted">{account.district?.name || "-"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </TabPane>
                      
                      <TabPane tabId="2">
                        <div>
                          <h5 className="mb-3">Notlar</h5>
                          {account.note ? (
                            <div className="border rounded p-3 bg-light">
                              {account.note}
                            </div>
                          ) : (
                            <div className="text-muted">Hesap için not bulunmamaktadır.</div>
                          )}
                        </div>
                      </TabPane>
                      
                      {/* Add more tab panes as needed */}
                    </TabContent>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          ) : (
            <div className="text-center">
              <p className="text-muted">Hesap bulunamadı.</p>
              <Link to="/accounts" className="btn btn-primary">Hesap Listesine Dön</Link>
            </div>
          )}
        </Container>
      </div>
      
      {/* Edit Modal */}
      {account && (
        <AccountFormModal
          isOpen={showEditModal}
          toggle={toggleEditModal}
          title="Hesabı Düzenle"
          submitText="Güncelle"
          onSubmit={validation.handleSubmit}
          validation={validation}
          isSubmitting={formSubmitting}
        />
      )}
      
      {/* Delete Modal */}
      <DeleteModal
        show={showDeleteModal}
        onDeleteClick={handleDeleteConfirm}
        onCloseClick={closeDeleteModal}
      />
      
      <ToastContainer closeButton={false} position="top-right" />
    </React.Fragment>
  );
};

// Main component
const AccountDetail: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <AccountDetailContent />
    </ApolloProvider>
  );
};

export default AccountDetail; 