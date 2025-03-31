import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Col,
  Container,
  Row,
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Input,
  FormFeedback,
  Label
} from "reactstrap";
import { 
  useQuery, 
  useMutation,
  ApolloClient, 
  InMemoryCache, 
  ApolloProvider,
  createHttpLink
} from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { onError } from "@apollo/client/link/error";
import { from } from "@apollo/client";
import moment from "moment";
import Select from "react-select";
import * as Yup from "yup";
import { useFormik } from "formik";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import Loader from "../../../Components/Common/Loader";
import { 
  GET_TRANSACTION,
  GET_TRANSACTION_TYPES,
  GET_TRANSACTION_STATUSES,
  GET_USERS_LOOKUP,
  GET_CHANNELS_LOOKUP,
  GET_ACCOUNTS_LOOKUP,
  GET_PRODUCTS_LOOKUP
} from "../../../graphql/queries/transactionQueries";
import { UPDATE_TRANSACTION } from "../../../graphql/mutations/transactionMutations";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { SelectOption, TransactionProductInput } from "../../../types/graphql";

// Get API URL from environment variable
const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

console.log("API URL:", apiUrl);

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    console.log("Network error details:", JSON.stringify(networkError, null, 2));
  }
});

// Create auth link
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage
  const token = getAuthHeader();
  console.log("Using authentication token:", token ? "Yes (token exists)" : "No (token is null)");
  
  // Return the headers to the context
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
  link: from([errorLink, authLink, httpLink]),
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

// Helper function to get authorization context
const getAuthorizationLink = () => {
  const authHeader = getAuthHeader();
  console.log("Authorization header used in context:", authHeader ? "Yes (set)" : "No (not set)");
  return {
    headers: {
      Authorization: authHeader ?? '',
    }
  };
};

const TransactionDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  // Add new state variables for the edit modal
  const [editModal, setEditModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Add state for transaction products editing
  const [transactionProducts, setTransactionProducts] = useState<any[]>([]);
  const [productTotal, setProductTotal] = useState<number>(0);
  
  // Add state for select options
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);

  console.log("Transaction ID from URL:", id);

  // Debug token availability
  useEffect(() => {
    console.log("Auth token for queries:", getAuthHeader() ? "Available" : "Not available");
    const authUser = localStorage.getItem("authUser");
    console.log("authUser in localStorage:", authUser ? "Present" : "Not present");
  }, []);

  // Add new useEffect to fetch dropdown options when the modal is opened
  useEffect(() => {
    if (editModal) {
      // Fetch transaction types
      client.query({
        query: GET_TRANSACTION_TYPES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getTransactionTypesLookup) {
          setTypeOptions(data.getTransactionTypesLookup.map((type: any) => ({ value: type.id, label: type.name })));
        }
      }).catch(err => {
        console.error("Error fetching transaction types:", err);
      });

      // Fetch transaction statuses
      client.query({
        query: GET_TRANSACTION_STATUSES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getTransactionStatusesLookup) {
          setStatusOptions(data.getTransactionStatusesLookup.map((status: any) => ({ value: status.id, label: status.name })));
        }
      }).catch(err => {
        console.error("Error fetching transaction statuses:", err);
      });

      // Fetch users
      client.query({
        query: GET_USERS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getUsersLookup && data.getUsersLookup.items) {
          setUserOptions(data.getUsersLookup.items.map((user: any) => ({ value: user.id, label: user.fullName })));
        }
      }).catch(err => {
        console.error("Error fetching users:", err);
      });

      // Fetch accounts
      client.query({
        query: GET_ACCOUNTS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getAccountsLookup && data.getAccountsLookup.items) {
          setAccountOptions(data.getAccountsLookup.items.map((account: any) => ({ value: account.id, label: account.name })));
        }
      }).catch(err => {
        console.error("Error fetching accounts:", err);
      });

      // Fetch channels
      client.query({
        query: GET_CHANNELS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getChannelsLookup) {
          setChannelOptions(data.getChannelsLookup.map((channel: any) => ({ value: channel.id, label: channel.name })));
        }
      }).catch(err => {
        console.error("Error fetching channels:", err);
      });

      // Fetch products
      client.query({
        query: GET_PRODUCTS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getProductsLookup && data.getProductsLookup.items) {
          setProductOptions(data.getProductsLookup.items.map((product: any) => ({ value: product.id, label: product.name })));
        }
      }).catch(err => {
        console.error("Error fetching products:", err);
      });
    }
  }, [editModal]);

  // Fetch transaction details
  const { loading, error, refetch } = useQuery(GET_TRANSACTION, {
    variables: { id },
    context: getAuthorizationLink(),
    fetchPolicy: "network-only",
    skip: !id,
    onCompleted: async (data) => {
      if (data && data.getTransaction) {
        setTransaction(data.getTransaction);
        
        // Ürün listesini yükle, eğer henüz yüklenmemişse
        let products = productOptions;
        if (products.length === 0) {
          products = await loadProductOptions();
        }
        
        // Initialize transaction products state
        if (data.getTransaction.transactionProducts) {
          // Ürün bilgilerini zenginleştirelim
          const enrichedProducts = data.getTransaction.transactionProducts.map((product: any) => {
            // Ürün adını products'dan al eğer varsa
            const productInfo = products.find(p => p.value === product.product.id);
            if (productInfo) {
              return {
                ...product,
                product: {
                  ...product.product,
                  name: productInfo.label
                }
              };
            }
            return product;
          });
          
          setTransactionProducts(enrichedProducts);
          
          // Calculate total
          const total = enrichedProducts.reduce(
            (sum: number, product: any) => sum + (product.totalPrice || 0), 
            0
          );
          setProductTotal(total);
        }
        console.log("Transaction fetched:", data.getTransaction);
      } else {
        console.log("No transaction data returned from API");
        toast.error("İşlem bulunamadı");
        navigate("/işlemler");
      }
    },
    onError: (err) => {
      console.error("Error fetching transaction:", err);
      console.error("GraphQL Errors:", err.graphQLErrors);
      console.error("Network Error:", err.networkError);
      
      if (err.graphQLErrors) {
        err.graphQLErrors.forEach((graphQLError) => {
          console.error("GraphQL Error:", graphQLError.message);
        });
      }
      
      if (err.networkError) {
        console.error("Network Error Details:", JSON.stringify(err.networkError, null, 2));
      }
      
      toast.error("İşlem detayları yüklenirken hata oluştu");
    }
  });

  useEffect(() => {
    document.title = "İşlem Detayı | Agile";
  }, []);

  // Define validation schema
  const validationSchema = Yup.object({
    amount: Yup.number().required("Tutar alanı zorunludur"),
    typeId: Yup.string().required("İşlem tipi seçimi zorunludur"),
    statusId: Yup.string().required("Durum seçimi zorunludur"),
    accountId: Yup.string().required("Hesap seçimi zorunludur"),
    assignedUserId: Yup.string().required("Atanan kullanıcı seçimi zorunludur"),
    channelId: Yup.string().required("Kanal seçimi zorunludur"),
    products: Yup.array(),
    no: Yup.string(),
    note: Yup.string(),
    address: Yup.string(),
    postalCode: Yup.string(),
    transactionDate: Yup.string().required("İşlem tarihi zorunludur")
  });

  // Initialize formik validation
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
      products: transaction?.transactionProducts?.map((p: any) => ({
        value: p.product.id,
        label: p.product.name
      })) || [],
      date: transaction && transaction.createdAt ? moment(transaction.createdAt).format("DD.MM.YYYY") : moment().format("DD.MM.YYYY"),
      transactionDate: transaction && transaction.transactionDate ? moment(transaction.transactionDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      transactionProducts: (transaction && transaction.transactionProducts) || [] as TransactionProductInput[],
      address: (transaction && transaction.address) || "",
      postalCode: (transaction && transaction.postalCode) || ""
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      handleUpdateTransaction(values);
    }
  });

  // Define update mutation
  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    onCompleted: (data) => {
      console.log("Transaction updated successfully:", data);
      toast.success("İşlem başarıyla güncellendi");
      setEditModal(false);
      setIsSubmitting(false);
      
      // Refresh the transaction data
      refetch();
    },
    onError: (error) => {
      console.error("Error in updateTransaction mutation:", error);
      setIsSubmitting(false);
      
      // Enhanced error logging
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error("GraphQL Error Details:", JSON.stringify(error.graphQLErrors, null, 2));
        
        // Show a more specific error message
        const errorMessage = error.graphQLErrors[0].message;
        toast.error(`Güncelleme hatası: ${errorMessage}`);
      } else if (error.networkError) {
        toast.error("Ağ hatası. Lütfen bağlantınızı kontrol edin.");
      } else {
        toast.error("İşlem güncellenirken bir hata oluştu");
      }
    }
  });
  
  // Function to handle form submission
  const handleUpdateTransaction = (values: any) => {
    setIsSubmitting(true);
    
    // Create the input object for update
    const input: any = {
      id: values.id,
      amount: Number(values.amount),
      no: values.no || "",
      note: values.note || "",
      typeId: values.typeId,
      statusId: values.statusId,
      accountId: values.accountId,
      assignedUserId: values.assignedUserId,
      channelId: values.channelId,
      transactionDate: values.transactionDate,
      address: values.address || "",
      postalCode: values.postalCode || ""
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
      context: getAuthorizationLink()
    });
  };
  
  // Add handler for saving products
  const handleSaveProducts = async () => {
    try {
      setIsSubmitting(true);
      
      // Partial update - only send id and products array
      const input = {
        id: transaction.id,
        transactionProducts: transactionProducts.map(product => ({
          productId: product.product.id,
          quantity: product.quantity || 1,
          unitPrice: product.unitPrice || 0,
          totalPrice: product.totalPrice || 0
        }))
      };
      
      console.log("Partial update - only updating transaction products:", input);
      
      // Call update mutation with minimal data for partial update
      await updateTransaction({
        variables: { input },
        context: getAuthorizationLink()
      });
      
      // Success notification will be shown by the mutation's onCompleted callback
      // Refetch transaction data to refresh the view with updated products
      refetch();
    } catch (error) {
      console.error("Error saving products:", error);
      toast.error("Ürünler kaydedilirken bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle edit modal
  const toggleEditModal = () => {
    setEditModal(!editModal);
  };

  // Add handler for product changes
  const handleProductChange = (index: number, field: string, value: any) => {
    const updatedProducts = [...transactionProducts];
    const product = { ...updatedProducts[index] };
    
    if (field === 'product') {
      // Ürün seçimi yapıldığında, o ürüne ait verileri ürünlerden al
      const selectedProduct = productOptions.find(p => p.value === value.id);
      if (selectedProduct) {
        product.product = {
          id: selectedProduct.value,
          name: selectedProduct.label
        };
        // Burada API'dan ürün bilgilerini alıp doldurabiliriz
        // Şimdilik sadece ürün seçimi yapıyoruz
      }
    } else if (field === 'quantity') {
      product.quantity = Number(value);
      product.totalPrice = product.quantity * product.unitPrice;
    } else if (field === 'unitPrice') {
      product.unitPrice = Number(value);
      product.totalPrice = product.quantity * product.unitPrice;
    }
    
    updatedProducts[index] = product;
    setTransactionProducts(updatedProducts);
    
    // Update total
    const total = updatedProducts.reduce(
      (sum, product) => sum + (product.totalPrice || 0), 
      0
    );
    setProductTotal(total);
  };
  
  // Add handler for adding new product
  const handleAddProduct = () => {
    // Only add if product options are available
    if (productOptions.length > 0) {
      // Varsayılan olarak ilk ürünü değil, boş bir seçim oluştur
      const newProduct = {
        id: null,
        product: {
          id: "",  // Boş ID ile başla
          name: "" // Boş isim ile başla
        },
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      };
      
      setTransactionProducts([...transactionProducts, newProduct]);
      
      // Tablonun en altına scroll yaparak kullanıcının yeni eklenen ürünü görmesini sağla
      setTimeout(() => {
        const tables = document.querySelectorAll('table.table-bordered');
        if (tables.length > 0) {
          tables[0].scrollTop = tables[0].scrollHeight;
        }
      }, 100);
    } else {
      toast.warning("Ürün seçenekleri yüklenemedi");
    }
  };
  
  // Add handler for removing a product
  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...transactionProducts];
    updatedProducts.splice(index, 1);
    setTransactionProducts(updatedProducts);
    
    // Update total
    const total = updatedProducts.reduce(
      (sum, product) => sum + (product.totalPrice || 0), 
      0
    );
    setProductTotal(total);
  };

  // Bu fonksiyonu handleUpdateTransaction yardımcı fonksiyonları arasına ekle
  const loadProductOptions = async () => {
    try {
      const { data } = await client.query({
        query: GET_PRODUCTS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getProductsLookup && data.getProductsLookup.items) {
        const options = data.getProductsLookup.items.map((product: any) => ({
          value: product.id,
          label: product.name
        }));
        setProductOptions(options);
        console.log("Ürün seçenekleri yüklendi:", options.length);
        return options;
      }
      return [];
    } catch (err) {
      console.error("Ürün seçenekleri yüklenirken hata oluştu:", err);
      toast.error("Ürün listesi yüklenemedi");
      return [];
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <Loader />
        </Container>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="alert alert-danger">
            İşlem detayları yüklenirken bir hata oluştu.
            {error && (
              <div className="mt-2">
                <strong>Hata detayları:</strong> 
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
            )}
            <Link to="/işlemler" className="btn btn-sm btn-primary ms-2">
              İşlemler Listesine Dön
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="İşlem Detayı" pageTitle="İşlemler" />
          
          <Card>
            <CardHeader className="d-flex align-items-center justify-content-between bg-white">
              <h5 className="card-title mb-0">İŞLEM DETAYI</h5>
              <div>
                <Link to="/işlemler" className="btn btn-soft-primary btn-sm me-2">
                  <i className="ri-arrow-left-line align-middle"></i> Geri
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <Row>
                {/* Left Column - Products Table */}
                <Col md={7}>
                  <Card className="border h-100">
                    <CardHeader className="bg-white border-bottom d-flex align-items-center justify-content-between">
                      <h6 className="mb-0">Ürünler</h6>
                      <Button 
                        color="primary" 
                        size="sm"
                        onClick={handleSaveProducts}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="d-flex align-items-center">
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            <span>Kaydediliyor...</span>
                          </span>
                        ) : (
                          <>
                            <i className="ri-save-line align-middle me-1"></i> Kaydet
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardBody>
                      <Table responsive className="table-bordered">
                        <thead className="bg-light">
                          <tr>
                            <th>Ürün/Hizmet</th>
                            <th>Birim Fiyatı</th>
                            <th>Adet</th>
                            <th>Tutar</th>
                            <th width="50">
                              <div className="d-flex justify-content-center">
                                <Button 
                                  color="light" 
                                  className="btn-icon btn-sm rounded-circle"
                                  onClick={handleAddProduct}
                                >
                                  <i className="ri-add-line"></i>
                                </Button>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactionProducts && transactionProducts.length > 0 ? (
                            <>
                              {transactionProducts.map((product: any, index: number) => (
                                <tr key={index}>
                                  <td>
                                    <Select 
                                      options={productOptions}
                                      value={productOptions.find(p => p.value === product.product?.id) || null}
                                      onChange={(selected) => {
                                        if (selected) {
                                          handleProductChange(index, 'product', {
                                            id: selected.value,
                                            name: selected.label
                                          });
                                        }
                                      }}
                                      placeholder="Ürün seçin"
                                      className="border-0 product-select"
                                      styles={{
                                        control: (base) => ({
                                          ...base,
                                          border: 'none',
                                          boxShadow: 'none',
                                          minHeight: '34px'
                                        }),
                                        indicatorSeparator: () => ({
                                          display: 'none'
                                        }),
                                        dropdownIndicator: (base) => ({
                                          ...base,
                                          padding: '0 8px'
                                        }),
                                        placeholder: (base) => ({
                                          ...base,
                                          fontSize: '0.8125rem'
                                        })
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      type="number"
                                      className="form-control border-0 text-end"
                                      value={product.unitPrice || 0}
                                      onChange={(e) => handleProductChange(index, 'unitPrice', e.target.value)}
                                      min={0}
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      type="number"
                                      className="form-control border-0 text-center"
                                      value={product.quantity || 1}
                                      onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                                      min={1}
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      type="text"
                                      className="form-control border-0 text-end"
                                      value={`${product.totalPrice || 0} TL`}
                                      readOnly
                                    />
                                  </td>
                                  <td className="text-center">
                                    <Button 
                                      color="transparent" 
                                      className="btn-icon btn-sm text-danger p-0"
                                      onClick={() => handleRemoveProduct(index)}
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-top">
                                <td colSpan={3} className="text-end fw-bold border-0">Toplam:</td>
                                <td className="fw-bold border-0 text-end">
                                  <span className="me-2">{productTotal} TL</span>
                                </td>
                                <td className="border-0"></td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center">Ürün bulunamadı</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </CardBody>
                  </Card>
                </Col>
                
                {/* Right Column - Stacked Cards */}
                <Col md={5}>
                  {/* Transaction Details */}
                  <Card className="border mb-3">
                    <CardHeader className="bg-white border-bottom d-flex align-items-center justify-content-between">
                      <h6 className="mb-0">İşlem Bilgileri</h6>
                      <Button color="primary" size="sm" onClick={toggleEditModal}>
                        <i className="ri-pencil-line align-middle me-1"></i> Düzenle
                      </Button>
                    </CardHeader>
                    <CardBody className="p-0">
                      <Table className="mb-0" borderless>
                        <tbody>
                          <tr>
                            <th style={{ width: "40%" }} className="ps-3">İşlem Türü</th>
                            <td>{transaction.type?.name || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Durum</th>
                            <td>{transaction.status?.name || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Atanan Kullanıcı</th>
                            <td>{transaction.assignedUser?.fullName || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">İşlem No</th>
                            <td>{transaction.no || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">E-posta</th>
                            <td>{transaction.account?.email || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Telefon</th>
                            <td>{transaction.account?.phone || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Kanal</th>
                            <td>{transaction.channel?.name || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Eklenme</th>
                            <td>{transaction.createdAt ? moment(transaction.createdAt).format("DD.MM.YYYY HH:mm") : "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Ekleyen</th>
                            <td>{transaction.assignedUser?.fullName || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Güncelleme</th>
                            <td>{transaction.updatedAt ? moment(transaction.updatedAt).format("DD.MM.YYYY HH:mm") : "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Güncelleyen</th>
                            <td>{transaction.assignedUser?.fullName || "-"}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </CardBody>
                  </Card>
                  
                  {/* Account Details */}
                  <Card className="border">
                    <CardHeader className="bg-white border-bottom d-flex align-items-center justify-content-between">
                      <h6 className="mb-0">Hesap Bilgileri</h6>
                      <Button color="primary" size="sm" onClick={() => navigate(`/hesaplar/edit/${transaction.account?.id}`)}>
                        <i className="ri-pencil-line align-middle me-1"></i> Düzenle
                      </Button>
                    </CardHeader>
                    <CardBody className="p-0">
                      <Table className="mb-0" borderless>
                        <tbody>
                          <tr>
                            <th style={{ width: "40%" }} className="ps-3">Hesap Türü</th>
                            <td>{transaction.account?.type?.name || "Bağışçı, Tedarikçi"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Tam Adı</th>
                            <td>{transaction.account?.name || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Adı</th>
                            <td>{transaction.account?.firstName || transaction.account?.name?.split(' ')[0] || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Soyadı</th>
                            <td>{transaction.account?.lastName || transaction.account?.name?.split(' ').slice(1).join(' ') || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">Telefon</th>
                            <td>{transaction.account?.phone || "-"}</td>
                          </tr>
                          <tr>
                            <th className="ps-3">E-posta</th>
                            <td>{transaction.account?.email || "-"}</td>
                          </tr>
                        </tbody>
                      </Table>
                      <div className="text-center p-3">
                        <Link to={`/hesaplar/detay/${transaction.account?.id}`} className="text-primary">
                          Hesap Detayı
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Container>
        <ToastContainer closeButton={false} limit={1} />
        
        {/* Edit Modal */}
        <Modal isOpen={editModal} toggle={toggleEditModal} centered size="lg">
          <ModalHeader className="bg-light p-3" toggle={toggleEditModal}>
            İşlem Düzenle
          </ModalHeader>
          <Form className="tablelist-form" onSubmit={validation.handleSubmit}>
            <ModalBody>
              <Input type="hidden" id="id-field" />
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="accountId-field" className="form-label">
                    Hesap
                  </Label>
                </Col>
                <Col md={8}>
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
                    isDisabled={false}
                    isLoading={false}
                  />
                  {validation.touched.accountId && validation.errors.accountId && (
                    <div className="text-danger">{validation.errors.accountId as string}</div>
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
                    isDisabled={false}
                  />
                  {validation.touched.statusId && validation.errors.statusId && (
                    <div className="text-danger">{validation.errors.statusId as string}</div>
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
                    isDisabled={false}
                  />
                  {validation.touched.assignedUserId && validation.errors.assignedUserId && (
                    <div className="text-danger">{validation.errors.assignedUserId as string}</div>
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
                    isDisabled={false}
                  />
                  {validation.touched.typeId && validation.errors.typeId && (
                    <div className="text-danger">{validation.errors.typeId as string}</div>
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
                  <Select
                    options={productOptions}
                    isMulti
                    name="products"
                    onChange={(selected: any) =>
                      validation.setFieldValue("products", selected || [])
                    }
                    value={validation.values.products}
                    placeholder="Ürün Seçiniz"
                    isDisabled={false}
                    isLoading={false}
                    className="basic-multi-select"
                    classNamePrefix="select"
                  />
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="amount-field" className="form-label">
                    Tutar
                  </Label>
                </Col>
                <Col md={8}>
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
                  {validation.touched.amount && validation.errors.amount && (
                    <FormFeedback>{validation.errors.amount as string}</FormFeedback>
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
                  <Input
                    name="note"
                    id="note-field"
                    className="form-control"
                    type="textarea"
                    rows={3}
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.note}
                    invalid={validation.touched.note && validation.errors.note ? true : false}
                  />
                  {validation.touched.note && validation.errors.note && (
                    <FormFeedback>{validation.errors.note as string}</FormFeedback>
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
                  <Input
                    name="transactionDate"
                    id="transactionDate-field"
                    className="form-control"
                    type="date"
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.transactionDate}
                    invalid={validation.touched.transactionDate && validation.errors.transactionDate ? true : false}
                  />
                  {validation.touched.transactionDate && validation.errors.transactionDate && (
                    <FormFeedback>{validation.errors.transactionDate as string}</FormFeedback>
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
                    isDisabled={false}
                  />
                  {validation.touched.channelId && validation.errors.channelId && (
                    <div className="text-danger">{validation.errors.channelId as string}</div>
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
                  <Input
                    name="address"
                    id="address-field"
                    className="form-control"
                    type="textarea"
                    rows={2}
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.address}
                    invalid={validation.touched.address && validation.errors.address ? true : false}
                  />
                  {validation.touched.address && validation.errors.address && (
                    <FormFeedback>{validation.errors.address as string}</FormFeedback>
                  )}
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="postalCode-field" className="form-label">
                    Posta Kodu
                  </Label>
                </Col>
                <Col md={8}>
                  <Input
                    name="postalCode"
                    id="postalCode-field"
                    className="form-control"
                    type="text"
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.postalCode}
                    invalid={validation.touched.postalCode && validation.errors.postalCode ? true : false}
                  />
                  {validation.touched.postalCode && validation.errors.postalCode && (
                    <FormFeedback>{validation.errors.postalCode as string}</FormFeedback>
                  )}
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <div className="hstack gap-2 justify-content-end">
                <Button color="light" onClick={toggleEditModal}>
                  İptal
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="d-flex align-items-center">
                      <span className="spinner-border flex-shrink-0" role="status"></span>
                      <span className="flex-grow-1 ms-2">Kaydediliyor...</span>
                    </span>
                  ) : (
                    "Güncelle"
                  )}
                </Button>
              </div>
            </ModalFooter>
          </Form>
        </Modal>
      </div>
    </React.Fragment>
  );
};

// Wrap the component with ApolloProvider
const TransactionDetail: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <TransactionDetailContent />
    </ApolloProvider>
  );
};

export default TransactionDetail; 