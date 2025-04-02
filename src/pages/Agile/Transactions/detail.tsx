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
  GET_PRODUCTS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS
} from "../../../graphql/queries/transactionQueries";
import { UPDATE_TRANSACTION } from "../../../graphql/mutations/transactionMutations";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { SelectOption, TransactionProductInput } from "../../../types/graphql";
import Flatpickr from "react-flatpickr";

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
  const [formValues, setFormValues] = useState<any>({
    accountId: "",
    channelId: ""
  });
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);

  console.log("Transaction ID from URL:", id);

  // Debug token availability
  useEffect(() => {
    console.log("Auth token for queries:", getAuthHeader() ? "Available" : "Not available");
    const authUser = localStorage.getItem("authUser");
    console.log("authUser in localStorage:", authUser ? "Present" : "Not present");
  }, []);

  // Define validation schema
  const validationSchema = Yup.object({
    amount: Yup.number(),
    typeId: Yup.string(),
    statusId: Yup.string(),
    accountId: Yup.string(),
    assignedUserId: Yup.string(),
    channelId: Yup.string(),
    products: Yup.array(),
    no: Yup.string(),
    note: Yup.string(),
    address: Yup.string(),
    postalCode: Yup.string(),
    transactionDate: Yup.string(),
    // Yeni eklenen alanlar için validasyon
    country: Yup.string(),
    city: Yup.string(),
    district: Yup.string(),
    neighborhood: Yup.string(),
    successDate: Yup.string(),
    successNote: Yup.string(),
    transactionNote: Yup.string(),
    cancelDate: Yup.string(),
    cancelNote: Yup.string()
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
      postalCode: (transaction && transaction.postalCode) || "",
      country: (transaction && transaction.country?.id) || "",
      city: (transaction && transaction.city?.id) || "",
      district: (transaction && transaction.county?.id) || "", // county corresponds to district in our API
      neighborhood: (transaction && transaction.district?.id) || "", // district corresponds to neighborhood in our API
      successDate: (transaction && transaction.successDate) ? moment(transaction.successDate).format("YYYY-MM-DDTHH:mm") : "",
      successNote: (transaction && transaction.successNote) || "",
      cancelDate: (transaction && transaction.cancelDate) ? moment(transaction.cancelDate).format("YYYY-MM-DD HH:mm") : "",
      cancelNote: (transaction && transaction.cancelNote) || ""
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      handleUpdateTransaction(values);
    }
  });

  // Update formValues when validation values change
  useEffect(() => {
    setFormValues({
      accountId: validation.values.accountId,
      channelId: validation.values.channelId
    });
  }, [validation.values.accountId, validation.values.channelId]);

  // Add debugging for transaction data when it's loaded
  useEffect(() => {
    if (transaction) {
      console.log("Loaded transaction data:", transaction);
      console.log("Account ID:", transaction?.account?.id);
      console.log("Channel ID:", transaction?.channel?.id);
    }
  }, [transaction]);

  // Add new useEffect to fetch dropdown options when the modal is opened
  useEffect(() => {
    if (editModal) {
      // Fetch countries
      client.query({
        query: GET_COUNTRIES,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getCountries) {
          const countryOpts = data.getCountries.map((country: any) => ({ 
            value: country.id, 
            label: country.name 
          }));
          setCountryOptions(countryOpts);
          console.log("Loaded country options:", countryOpts);
          
          // If we have a country selected, fetch cities for that country
          if (validation.values.country) {
            fetchCitiesForCountry(validation.values.country);
          }
        }
      }).catch(err => {
        console.error("Error fetching countries:", err);
        toast.error("Ülke listesi yüklenirken hata oluştu");
      });
      
      // Fetch channels first to ensure we have the data
      client.query({
        query: GET_CHANNELS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getChannelsLookup) {
          const channelOpts = data.getChannelsLookup.map((channel: any) => ({ 
            value: channel.id, 
            label: channel.name 
          }));
          setChannelOptions(channelOpts);
          
          // Log channels for debugging
          console.log("Loaded channel options:", channelOpts);
          console.log("Current channelId value:", formValues.channelId);
          
          // If we have a channel ID but no name, try to find it in the options
          if (transaction?.channel?.id && !transaction?.channel?.name) {
            const channelInfo = channelOpts.find(c => c.value === transaction.channel.id);
            if (channelInfo) {
              setTransaction(prev => ({
                ...prev,
                channel: {
                  ...prev.channel,
                  name: channelInfo.label
                }
              }));
            }
          }
        }
      }).catch(err => {
        console.error("Error fetching channels:", err);
        toast.error("Kanal listesi yüklenirken hata oluştu");
      });

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
        variables: {
          input: {
            pageSize: 1000,
            pageIndex: 0,
            text: ""
          }
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      }).then(({ data }) => {
        if (data && data.getAccounts && data.getAccounts.items) {
          const accountOpts = data.getAccounts.items.map((account: any) => ({ 
            value: account.id, 
            label: account.name 
          }));
          setAccountOptions(accountOpts);
          
          // Log accounts for debugging
          console.log("Loaded account options:", accountOpts);
          console.log("Current accountId value:", formValues.accountId);
        }
      }).catch(err => {
        console.error("Error fetching accounts:", err);
        toast.error("Hesap listesi yüklenirken hata oluştu");
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
  }, [editModal, formValues.accountId, formValues.channelId, transaction]);

  // Function to fetch cities for a specific country
  const fetchCitiesForCountry = (countryId: string) => {
    if (!countryId) return;
    
    console.log("Fetching cities for country ID:", countryId);
    
    client.query({
      query: GET_CITIES,
      variables: { countryId },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only"
    }).then(({ data }) => {
      if (data && data.getCities) {
        const cityOpts = data.getCities.map((city: any) => ({ 
          value: city.id, 
          label: city.name 
        }));
        setCityOptions(cityOpts);
        console.log("Loaded city options for country:", countryId, cityOpts);
      }
    }).catch(err => {
      console.error("Error fetching cities:", err);
      toast.error("Şehir listesi yüklenirken hata oluştu");
    });
  };

  // Function to fetch counties for a specific city
  const fetchCountiesForCity = (cityId: string) => {
    if (!cityId) return;
    
    console.log("Fetching counties for city ID:", cityId);
    
    client.query({
      query: GET_COUNTIES,
      variables: { cityId },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only"
    }).then(({ data }) => {
      if (data && data.getCounties) {
        const countyOpts = data.getCounties.map((county: any) => ({ 
          value: county.id, 
          label: county.name 
        }));
        setCountyOptions(countyOpts);
        console.log("Loaded county options for city:", cityId, countyOpts);
      }
    }).catch(err => {
      console.error("Error fetching counties:", err);
      toast.error("İlçe listesi yüklenirken hata oluştu");
    });
  };

  // Function to fetch districts for a specific county
  const fetchDistrictsForCounty = (countyId: string) => {
    if (!countyId) return;
    
    console.log("Fetching districts for county ID:", countyId);
    
    client.query({
      query: GET_DISTRICTS,
      variables: { countyId },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only"
    }).then(({ data }) => {
      if (data && data.getDistricts) {
        const districtOpts = data.getDistricts.map((district: any) => ({ 
          value: district.id, 
          label: district.name 
        }));
        setDistrictOptions(districtOpts);
        console.log("Loaded district options for county:", countyId, districtOpts);
      }
    }).catch(err => {
      console.error("Error fetching districts:", err);
      toast.error("Mahalle listesi yüklenirken hata oluştu");
    });
  };

  // Function to load channels
  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data } = await client.query({
        query: GET_CHANNELS_LOOKUP,
        context: getAuthorizationLink(),
        fetchPolicy: "network-only"
      });
      
      if (data && data.getChannelsLookup) {
        const channelOpts = data.getChannelsLookup.map((channel: any) => ({ 
          value: channel.id, 
          label: channel.name 
        }));
        setChannelOptions(channelOpts);
        console.log("Loaded channel options:", channelOpts);
        
        // Update transaction channel data if needed
        if (transaction?.channel?.id) {
          const channelInfo = channelOpts.find(c => c.value === transaction.channel.id);
          if (channelInfo) {
            setTransaction(prev => ({
              ...prev,
              channel: {
                id: channelInfo.value,
                name: channelInfo.label
              }
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
      toast.error("Kanal listesi yüklenirken hata oluştu");
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Load channels on component mount and when transaction data changes
  useEffect(() => {
    loadChannels();
  }, [transaction?.id]);

  // Fetch transaction details
  const fetchTransactionData = async () => {
    try {
      setLoading(true);
      
      // Önce localStorage'da işlem bilgilerini ara
      const cachedTransaction = localStorage.getItem(`transaction_${id}`);
      
      if (cachedTransaction) {
        console.log("İşlem bilgileri localStorage'dan alındı");
        const transactionData = JSON.parse(cachedTransaction);
        
        // Cache'den alınan verileri kullan
        setTransaction(transactionData);
        
        // Ürün listesini yükle, eğer henüz yüklenmemişse
        let products = productOptions;
        if (products.length === 0) {
          products = await loadProductOptions();
        }
        
        // Cache'den alınan bilgileri kullanarak ürünleri ayarla
        if (transactionData.transactionProducts && transactionData.transactionProducts.length > 0) {
          // Ürün bilgilerini zenginleştirelim
          const enrichedProducts = transactionData.transactionProducts.map((product: any) => {
            // Ürün adını products'dan al eğer varsa
            const productInfo = products.find((p: any) => p.value === product.product.id);
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
        
        // İşlem tamamlandıktan sonra localStorage'dan temizle
        localStorage.removeItem(`transaction_${id}`);
      } else {
        // Cache'de yoksa API'dan al
        console.log("İşlem bilgileri API'dan alınıyor");
        const { data } = await client.query({
          query: GET_TRANSACTION,
          variables: { id },
          context: getAuthorizationLink(),
          fetchPolicy: "no-cache"
        });
        
        if (data && data.getTransaction) {
          setTransaction(data.getTransaction);
          
          // Ürün listesini yükle, eğer henüz yüklenmemişse
          let products = productOptions;
          if (products.length === 0) {
            products = await loadProductOptions();
          }
          
          if (data.getTransaction.transactionProducts && data.getTransaction.transactionProducts.length > 0) {
            // Ürün bilgilerini zenginleştirelim
            const enrichedProducts = data.getTransaction.transactionProducts.map((product: any) => {
              // Ürün adını products'dan al eğer varsa
              const productInfo = products.find((p: any) => p.value === product.product.id);
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
        } else {
          toast.error("İşlem bulunamadı");
        }
      }
    } catch (error: unknown) {
      console.error("İşlem detayları alınırken hata oluştu:", error);
      toast.error("İşlem detayları alınırken bir hata oluştu");
      
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      } else {
        console.error("Unknown error type:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde işlem verilerini getir
  useEffect(() => {
    if (id) {
      fetchTransactionData();
    }
  }, [id]);

  useEffect(() => {
    document.title = "İşlem Detayı | Agile";
  }, []);

  // İşlem detayı yüklendiğinde çalışacak
  useEffect(() => {
    if (transaction && transaction.id) {
      // Kayıtlı ürünleri localStorage'dan yükle
      const savedProducts = loadTransactionProducts(transaction.id);
      
      if (savedProducts && savedProducts.length > 0) {
        // Kaydedilmiş ürünleri doğru formata dönüştür
        const formattedProducts = savedProducts.map((item: any) => ({
          id: null,
          product: {
            id: item.productId,
            name: item.productName
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }));
        
        setTransactionProducts(formattedProducts);
        
        // Toplam tutarı hesapla
        const total = formattedProducts.reduce(
          (sum, product) => sum + (product.totalPrice || 0), 
          0
        );
        setProductTotal(total);
        
        console.log("Kayıtlı ürünler yüklendi:", formattedProducts);
      }
    }
  }, [transaction]);

  // Define update mutation
  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    onCompleted: (data) => {
      console.log("Transaction updated successfully:", data);
      toast.success("İşlem başarıyla güncellendi");
      setEditModal(false);
      setIsSubmitting(false);
      
      // Refresh the transaction data
      fetchTransactionData();
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
  const handleUpdateTransaction = async (values: any) => {
    try {
      setIsSubmitting(true);
      
      console.log("Form values for update:", values);
      console.log("Current transaction products:", transactionProducts);
      
      // Calculate total amount - use form amount if no products
      const amount = values.amount ? Number(values.amount) : (
        transactionProducts.reduce((sum, product) => {
          const quantity = Number(product.quantity) || 1;
          const unitPrice = Number(product.unitPrice) || 0;
          return sum + (quantity * unitPrice);
        }, 0)
      );

      console.log("Using amount for update:", amount);

      // Create the input object for update
      const input = {
        id: values.id,
        amount: amount, // Use the calculated or form amount
        no: values.no || "",
        note: values.note || "",
        typeId: values.typeId,
        statusId: values.statusId,
        accountId: values.accountId,
        assignedUserId: values.assignedUserId,
        channelId: values.channelId || "",
        transactionDate: values.transactionDate,
        address: values.address || "",
        postalCode: values.postalCode || "",
        // Added cancelDate and cancelNote
        cancelDate: values.cancelDate || null,
        cancelNote: values.cancelNote || "",
        // Added successDate and successNote
        successDate: values.successDate || null,
        successNote: values.successNote || "",
        // Format products according to the API requirements
        products: transactionProducts.map(product => {
          const quantity = Number(product.quantity) || 1;
          const unitPrice = Number(product.unitPrice) || 0;
          return {
            id: product.id || null,
            productId: product.product.id,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: quantity * unitPrice
          };
        })
      };
      
      console.log("Update transaction input:", input);
      
      // Call the update mutation
      const { data } = await updateTransaction({
        variables: { input },
        context: getAuthorizationLink()
      });
      
      if (data?.updateTransaction) {
        // Update local state with the returned data
        setTransaction({
          ...data.updateTransaction,
          amount: amount // Ensure we use our calculated amount
        });
        
        // Update products state with the new data
        if (data.updateTransaction.transactionProducts) {
          const updatedProducts = data.updateTransaction.transactionProducts.map((product: any) => ({
            ...product,
            product: {
              id: product.product.id,
              name: product.product.name
            },
            quantity: Number(product.quantity),
            unitPrice: Number(product.unitPrice),
            totalPrice: Number(product.quantity) * Number(product.unitPrice)
          }));
          
          setTransactionProducts(updatedProducts);
          
          // Recalculate total
          const total = updatedProducts.reduce(
            (sum: number, product: any) => sum + (Number(product.quantity) * Number(product.unitPrice)),
            0
          );
          setProductTotal(total);
        }
        
        // Close the modal
        setEditModal(false);
        
        // Show success message
        toast.success("İşlem başarıyla güncellendi");
        
        // Refresh the data
        fetchTransactionData();
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      
      // Show detailed error message
      if (error.graphQLErrors?.length > 0) {
        const errorMessage = error.graphQLErrors[0].message;
        toast.error(`Güncelleme hatası: ${errorMessage}`);
      } else if (error.networkError) {
        toast.error("Ağ hatası. Lütfen bağlantınızı kontrol edin.");
      } else {
        toast.error("İşlem güncellenirken bir hata oluştu");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Ürünleri kaydetmek için yardımcı fonksiyon (frontend-only)
  const saveTransactionProducts = (transactionId: string, products: any[]) => {
    try {
      // Bu fonksiyon normalde bir API endpoint'ine istek yapmalı
      // Burada sadece localStorage'a kaydediyoruz
      const key = `transaction_${transactionId}_products`;
      const productsData = products.map(product => ({
        productId: product.product.id,
        productName: product.product.name,
        quantity: product.quantity || 1,
        unitPrice: product.unitPrice || 0,
        totalPrice: product.totalPrice || 0
      }));
      
      localStorage.setItem(key, JSON.stringify(productsData));
      console.log("Ürünler localStorage'a kaydedildi:", productsData);
      
      return true;
    } catch (error) {
      console.error("Ürünleri kaydetme hatası:", error);
      return false;
    }
  };
  
  // Ürünleri yüklemek için yardımcı fonksiyon (frontend-only)
  const loadTransactionProducts = (transactionId: string) => {
    try {
      const key = `transaction_${transactionId}_products`;
      const savedProducts = localStorage.getItem(key);
      
      if (savedProducts) {
        const products = JSON.parse(savedProducts);
        console.log("Ürünler localStorage'dan yüklendi:", products);
        return products;
      }
      
      return null;
    } catch (error) {
      console.error("Ürünleri yükleme hatası:", error);
      return null;
    }
  };

  // Add handler for saving products
  const handleSaveProducts = async () => {
    try {
      setIsSubmitting(true);
      
      // Kanal ID'sini kontrol et
      const channelId = transaction.channel?.id || "";
      console.log("Current channel ID:", channelId);
      
      // Validasyon: Tüm ürünlerin geçerli product.id değeri olduğundan emin ol
      const invalidProducts = transactionProducts.filter(product => !product.product?.id);
      if (invalidProducts.length > 0) {
        toast.error("Bazı ürünler için ürün seçimi yapılmamış. Lütfen tüm ürünler için ürün seçiniz.");
        setIsSubmitting(false);
        return;
      }
      
      // Ürünlerin toplam tutarını hesapla - bu işlemin amount değeri olacak
      const totalAmount = transactionProducts.reduce((sum, product) => {
        return sum + (product.totalPrice || 0);
      }, 0);
      
      // Ürün listesini API'nin beklediği formata dönüştür
      const formattedProducts = transactionProducts.map(product => ({
        productId: product.product.id,
        quantity: product.quantity || 1,
        unitPrice: product.unitPrice || 0,
        totalPrice: product.totalPrice || 0
      }));
      
      // İşlemi ve tutarı güncellemek için tüm zorunlu alanları içeren input hazırla
      const input = {
        id: transaction.id,
        amount: totalAmount, // Ürünlerin toplam tutarını amount olarak kullan
        typeId: transaction.type?.id || "", 
        statusId: transaction.status?.id || "", 
        accountId: transaction.account?.id || "", 
        assignedUserId: transaction.assignedUser?.id || "", 
        channelId: channelId, // Kanal ID'sini mutlaka gönder (boş string bile olsa)
        no: transaction.no,
        note: transaction.note,
        transactionDate: transaction.transactionDate,
        address: transaction.address || "",
        postalCode: transaction.postalCode || "",
        // Added cancelDate and cancelNote
        cancelDate: transaction.cancelDate || null,
        cancelNote: transaction.cancelNote || "",
        // Added successDate and successNote
        successDate: transaction.successDate || null,
        successNote: transaction.successNote || "",
        // GraphQL hatası gösteriyor ki "transactionProducts" değil, "products" olmalı
        products: formattedProducts
      };
      
      console.log("İşlem güncelleme gönderilen veri:", input);
      console.log("Ürün listesi öğeleri:", formattedProducts);
      
      // API'ye ürün bilgilerini içeren tam veriyi gönder
      const result = await updateTransaction({
        variables: { input },
        context: getAuthorizationLink()
      });
      
      console.log("API yanıtı:", result);
      
      // Backend'e göndermeye çalıştık, yine de localStorage'a da kaydedelim
      saveTransactionProducts(transaction.id, transactionProducts);
      
      toast.success("İşlem ve ürünler başarıyla güncellendi");
      
      // Veriyi yenile
      fetchTransactionData();
    } catch (error) {
      console.error("İşlem güncelleme hatası:", error);
      console.error("Hata detayları:", JSON.stringify(error, null, 2));
      
      // Daha detaylı hata mesajı
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const errorMessage = error.graphQLErrors[0]?.message || "Bilinmeyen hata";
        toast.error(`İşlem güncellenirken hata oluştu: ${errorMessage}`);
      } else {
        toast.error("İşlem güncellenirken bir hata oluştu. API yanıtını kontrol ediniz.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle edit modal
  const toggleEditModal = () => {
    // If opening the modal, fetch fresh transaction data
    if (!editModal) {
      setLoading(true);
      
      // Fetch fresh transaction data from the server
      console.log("Fetching fresh transaction data for edit modal...");
      client.query({
        query: GET_TRANSACTION,
        variables: { id },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only" // Force fetch from server
      })
      .then(({ data }) => {
        console.log("Received fresh transaction data:", data);
        if (data && data.getTransaction) {
          // Debug geographic fields
          console.log("Geographic data in transaction:", {
            country: data.getTransaction.country ? {id: data.getTransaction.country.id, name: data.getTransaction.country.name} : null,
            city: data.getTransaction.city ? {id: data.getTransaction.city.id, name: data.getTransaction.city.name} : null,
            district: data.getTransaction.district ? {id: data.getTransaction.district.id, name: data.getTransaction.district.name} : null,
            county: data.getTransaction.county ? {id: data.getTransaction.county.id, name: data.getTransaction.county.name} : null
          });
          
          // Debug dates - raw format
          console.log("Date fields in transaction (raw):", {
            cancelDate: data.getTransaction.cancelDate,
            successDate: data.getTransaction.successDate,
            transactionDate: data.getTransaction.transactionDate
          });
          
          // Debug notes
          console.log("Note fields in transaction:", {
            note: data.getTransaction.note,
            cancelNote: data.getTransaction.cancelNote,
            successNote: data.getTransaction.successNote
          });
          
          // Store a copy of the original transaction data for reference
          const originalTransaction = { ...data.getTransaction };
          
          // Format cancelDate in the correct format before updating state
          if (data.getTransaction.cancelDate) {
            try {
              console.log("Original cancelDate format:", data.getTransaction.cancelDate);
              
              // Parse the date with moment, which will handle various formats
              const parsedDate = moment(data.getTransaction.cancelDate);
              
              if (parsedDate.isValid()) {
                // Format as YYYY-MM-DD HH:mm for consistency with transactions.tsx
                const formattedCancelDate = parsedDate.format("YYYY-MM-DD HH:mm");
                console.log("Formatted cancelDate:", formattedCancelDate);
                
                // Update the transaction object
                data.getTransaction.cancelDate = formattedCancelDate;
              } else {
                console.error("Invalid cancelDate format:", data.getTransaction.cancelDate);
                // Keep the original value if parsing fails
              }
            } catch (error) {
              console.error("Error formatting cancelDate:", error);
              // Keep the original value if an error occurs
            }
          }
          
          // Ensure cancelNote is properly extracted
          if (data.getTransaction.cancelNote) {
            console.log("Using cancelNote from API:", data.getTransaction.cancelNote);
          } else {
            console.log("No cancelNote found in API response");
          }
          
          // Update transaction state with fresh data
          setTransaction(data.getTransaction);
          
          // Check if validation values are correctly set
          setTimeout(() => {
            console.log("Validation values after setting transaction:", {
              cancelDate: validation.values.cancelDate,
              cancelNote: validation.values.cancelNote
            });
            
            // Explicitly set validation values for critical fields if needed
            if (data.getTransaction.cancelDate && !validation.values.cancelDate) {
              validation.setFieldValue("cancelDate", data.getTransaction.cancelDate);
            }
            
            if (data.getTransaction.cancelNote && !validation.values.cancelNote) {
              validation.setFieldValue("cancelNote", data.getTransaction.cancelNote);
            }
          }, 300);
          
          // Load geographic data based on the transaction
          // First load countries
          client.query({
            query: GET_COUNTRIES,
            context: getAuthorizationLink()
          }).then(({ data: countriesData }) => {
            if (countriesData && countriesData.getCountries) {
              const countryOpts = countriesData.getCountries.map((country: any) => ({ 
                value: country.id, 
                label: country.name 
              }));
              setCountryOptions(countryOpts);
              
              // If the transaction has a country, load its cities
              if (data.getTransaction.country?.id) {
                fetchCitiesForCountry(data.getTransaction.country.id);
                
                // If the transaction has a city, load its counties
                if (data.getTransaction.city?.id) {
                  fetchCountiesForCity(data.getTransaction.city.id);
                  
                  // If the transaction has a county, load its districts
                  if (data.getTransaction.county?.id) {
                    fetchDistrictsForCounty(data.getTransaction.county.id);
                  }
                }
              }
            }
          }).catch(err => {
            console.error("Error loading countries:", err);
          });
          
          // If transaction has products, update products state
          if (data.getTransaction.transactionProducts && data.getTransaction.transactionProducts.length > 0) {
            setTransactionProducts(data.getTransaction.transactionProducts);
            
            // Calculate total price
            const total = data.getTransaction.transactionProducts.reduce(
              (sum: number, product: any) => sum + (product.totalPrice || 0), 
              0
            );
            setProductTotal(total);
          }
          
          console.log("Transaction data updated from server for edit modal");
        } else {
          toast.error("İşlem bilgileri getirilemedi");
        }
      })
      .catch((error) => {
        console.error("Error fetching transaction data for edit modal:", error);
        toast.error("İşlem bilgileri güncellenirken hata oluştu");
      })
      .finally(() => {
        setLoading(false);
        
        // Log validation form values before opening modal
        setTimeout(() => {
          console.log("Form values after data load:", {
            country: validation.values.country,
            city: validation.values.city,
            district: validation.values.district,
            neighborhood: validation.values.neighborhood,
            cancelDate: validation.values.cancelDate,
            cancelNote: validation.values.cancelNote
          });
        }, 500);
        
        // Now toggle the modal
        setEditModal(true);
      });
    } else {
      // Just close the modal
      setEditModal(false);
    }
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
      // Miktar değiştiğinde toplam fiyatı güncelle
      product.totalPrice = product.quantity * (product.unitPrice || 0);
    } else if (field === 'unitPrice') {
      product.unitPrice = Number(value);
      // Birim fiyat değiştiğinde toplam fiyatı güncelle
      product.totalPrice = (product.quantity || 1) * product.unitPrice;
    }
    
    updatedProducts[index] = product;
    setTransactionProducts(updatedProducts);
    
    // Toplam tutarı hesapla ve güncelle
    const total = updatedProducts.reduce(
      (sum: number, product: any) => sum + (product.totalPrice || 0), 
      0
    );
    setProductTotal(total);
    
    console.log(`Ürün değiştirildi - Yeni toplam tutar: ${total}`);
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
      
      const updatedProducts = [...transactionProducts, newProduct];
      setTransactionProducts(updatedProducts);
      
      // Toplam tutarı yeniden hesapla (eklenen ürün 0 TL olduğu için değişmeyecek)
      const total = updatedProducts.reduce(
        (sum: number, product: any) => sum + (product.totalPrice || 0), 
        0
      );
      setProductTotal(total);
      
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
    
    // Toplam tutarı yeniden hesapla
    const total = updatedProducts.reduce(
      (sum: number, product: any) => sum + (product.totalPrice || 0), 
      0
    );
    setProductTotal(total);
    
    console.log(`Ürün silindi - Yeni toplam tutar: ${total}`);
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
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Yükleniyor...</span>
            </div>
            <p className="mt-2">İşlem detayları yükleniyor...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="alert alert-danger">
            İşlem detayları yüklenirken bir hata oluştu.
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
                            <td>
                              {transaction?.channel?.name || 
                               (transaction?.channel?.id && channelOptions.find(c => c.value === transaction.channel.id)?.label) || 
                               (channelOptions.length > 0 ? "Kanal seçilmemiş" : "-")}
                            </td>
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
                    onChange={(selected: any) => {
                      console.log("Account selected:", selected);
                      validation.setFieldValue("accountId", selected?.value);
                    }}
                    value={
                      validation.values.accountId && accountOptions.length > 0
                        ? accountOptions.find((option) => option.value === validation.values.accountId) || {
                            value: validation.values.accountId,
                            label: "Loading..."
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
                    onChange={(selected: any) => {
                      console.log("Channel selected:", selected);
                      validation.setFieldValue("channelId", selected?.value);
                      // Update transaction channel data
                      if (selected) {
                        setTransaction(prev => ({
                          ...prev,
                          channel: {
                            id: selected.value,
                            name: selected.label
                          }
                        }));
                      } else {
                        // Clear channel data if nothing is selected
                        setTransaction(prev => ({
                          ...prev,
                          channel: null
                        }));
                        validation.setFieldValue("channelId", "");
                      }
                    }}
                    value={
                      validation.values.channelId && channelOptions.length > 0
                        ? channelOptions.find(option => option.value === validation.values.channelId)
                        : transaction?.channel?.id && channelOptions.length > 0
                          ? channelOptions.find(option => option.value === transaction.channel.id)
                          : null
                    }
                    placeholder="Seçiniz"
                    isDisabled={false}
                    isLoading={isLoadingChannels}
                    isClearable={true}
                    className="react-select"
                    classNamePrefix="select"
                  />
                  {validation.touched.channelId && validation.errors.channelId && (
                    <div className="text-danger">{validation.errors.channelId as string}</div>
                  )}
                </Col>
              </Row>
              
              {/* Country Field - Yeni Eklendi */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="country-field" className="form-label">
                    Ülke
                  </Label>
                </Col>
                <Col md={8}>
                  <Select
                    options={countryOptions.length > 0 ? countryOptions : [
                      { value: "1", label: "Türkiye" },
                      { value: "2", label: "Almanya" },
                      { value: "3", label: "İngiltere" }
                    ]}
                    name="country"
                    onChange={(selected: any) => {
                      const countryId = selected?.value || "";
                      validation.setFieldValue("country", countryId);
                      
                      // Reset dependent fields
                      validation.setFieldValue("city", "");
                      validation.setFieldValue("district", "");
                      validation.setFieldValue("neighborhood", "");
                      
                      // Load cities for the selected country
                      if (countryId) {
                        fetchCitiesForCountry(countryId);
                        setCityOptions([]); // Clear current options while loading
                      } else {
                        setCityOptions([]); // Clear city options if no country selected
                      }
                      
                      // Log the selected country for debugging
                      console.log("Selected country:", selected);
                    }}
                    value={
                      validation.values.country
                        ? (countryOptions.find(option => option.value === validation.values.country) || {
                            value: validation.values.country,
                            label: validation.values.country === "1" ? "Türkiye" : 
                                   validation.values.country === "2" ? "Almanya" : 
                                   validation.values.country === "3" ? "İngiltere" : ""
                          })
                        : null
                    }
                    placeholder="Ülke Seçiniz"
                    isDisabled={false}
                  />
                </Col>
              </Row>
              
              {/* City Field - Update it to trigger county fetch */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="city-field" className="form-label">
                    Şehir
                  </Label>
                </Col>
                <Col md={8}>
                  <Select
                    options={cityOptions.length > 0 ? cityOptions : [
                      { value: "1", label: "İstanbul" },
                      { value: "2", label: "Ankara" },
                      { value: "3", label: "İzmir" }
                    ]}
                    name="city"
                    onChange={(selected: any) => {
                      const cityId = selected?.value || "";
                      validation.setFieldValue("city", cityId);
                      
                      // Reset dependent fields
                      validation.setFieldValue("district", "");
                      validation.setFieldValue("neighborhood", "");
                      
                      // Clear existing options
                      setCountyOptions([]);
                      setDistrictOptions([]);
                      
                      // Load counties for the selected city
                      if (cityId) {
                        fetchCountiesForCity(cityId);
                      }
                      
                      // Log the selected city for debugging
                      console.log("Selected city:", selected);
                    }}
                    value={
                      validation.values.city
                        ? (cityOptions.find(option => option.value === validation.values.city) || {
                            value: validation.values.city,
                            label: validation.values.city === "1" ? "İstanbul" : 
                                   validation.values.city === "2" ? "Ankara" : 
                                   validation.values.city === "3" ? "İzmir" : ""
                          })
                        : null
                    }
                    placeholder="Şehir Seçiniz"
                    isDisabled={!validation.values.country}
                  />
                </Col>
              </Row>
              
              {/* District Field (County) - Update it to trigger neighborhood fetch */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="district-field" className="form-label">
                    İlçe
                  </Label>
                </Col>
                <Col md={8}>
                  <Select
                    options={countyOptions.length > 0 ? countyOptions : [
                      { value: "1", label: "Kadıköy" },
                      { value: "2", label: "Beşiktaş" },
                      { value: "3", label: "Üsküdar" }
                    ]}
                    name="district"
                    onChange={(selected: any) => {
                      const countyId = selected?.value || "";
                      validation.setFieldValue("district", countyId);
                      
                      // Reset dependent fields
                      validation.setFieldValue("neighborhood", "");
                      
                      // Clear existing options
                      setDistrictOptions([]);
                      
                      // Load districts for the selected county
                      if (countyId) {
                        fetchDistrictsForCounty(countyId);
                      }
                      
                      // Log the selected district for debugging
                      console.log("Selected county:", selected);
                    }}
                    value={
                      validation.values.district
                        ? (countyOptions.find(option => option.value === validation.values.district) || {
                            value: validation.values.district,
                            label: validation.values.district === "1" ? "Kadıköy" : 
                                   validation.values.district === "2" ? "Beşiktaş" : 
                                   validation.values.district === "3" ? "Üsküdar" : ""
                          })
                        : null
                    }
                    placeholder="İlçe Seçiniz"
                    isDisabled={!validation.values.city}
                  />
                </Col>
              </Row>
              
              {/* Neighborhood Field (District) */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="neighborhood-field" className="form-label">
                    Mahalle
                  </Label>
                </Col>
                <Col md={8}>
                  <Select
                    options={districtOptions.length > 0 ? districtOptions : [
                      { value: "1", label: "Göztepe" },
                      { value: "2", label: "Fenerbahçe" },
                      { value: "3", label: "Caferağa" }
                    ]}
                    name="neighborhood"
                    onChange={(selected: any) => {
                      validation.setFieldValue("neighborhood", selected?.value || "");
                      
                      // Log the selected neighborhood for debugging
                      console.log("Selected district:", selected);
                    }}
                    value={
                      validation.values.neighborhood
                        ? (districtOptions.find(option => option.value === validation.values.neighborhood) || {
                            value: validation.values.neighborhood,
                            label: validation.values.neighborhood === "1" ? "Göztepe" : 
                                   validation.values.neighborhood === "2" ? "Fenerbahçe" : 
                                   validation.values.neighborhood === "3" ? "Caferağa" : ""
                          })
                        : null
                    }
                    placeholder="Mahalle Seçiniz"
                    isDisabled={!validation.values.district}
                  />
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
                  <Label htmlFor="no-field" className="form-label">
                    İşlem No
                  </Label>
                </Col>
                <Col md={8}>
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
                  {validation.touched.no && validation.errors.no && (
                    <FormFeedback>{validation.errors.no as string}</FormFeedback>
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
              
              {/* Transaction Success Date - Yeni Eklendi */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="successDate-field" className="form-label">
                    Başarı Tarihi
                  </Label>
                </Col>
                <Col md={8}>
                  <Input
                    name="successDate"
                    id="successDate-field"
                    className="form-control"
                    type="datetime-local"
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.successDate}
                    invalid={validation.touched.successDate && validation.errors.successDate ? true : false}
                  />
                  {validation.touched.successDate && validation.errors.successDate && (
                    <FormFeedback>{validation.errors.successDate as string}</FormFeedback>
                  )}
                </Col>
              </Row>
              
              {/* Transaction Success Note - Yeni Eklendi */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="successNote-field" className="form-label">
                    Başarı Notu
                  </Label>
                </Col>
                <Col md={8}>
                  <Input
                    name="successNote"
                    id="successNote-field"
                    className="form-control"
                    type="textarea"
                    rows={2}
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.successNote}
                    invalid={validation.touched.successNote && validation.errors.successNote ? true : false}
                  />
                  {validation.touched.successNote && validation.errors.successNote && (
                    <FormFeedback>{validation.errors.successNote as string}</FormFeedback>
                  )}
                </Col>
              </Row>
              
              {/* Transaction Note - Gizli */}
              <Row className="mb-3" style={{display: 'none'}}>
                <Col md={4}>
                  <Label htmlFor="note-field" className="form-label">
                    İşlem Notu
                  </Label>
                </Col>
                <Col md={8}>
                  <Input
                    name="note"
                    id="note-field-hidden"
                    className="form-control"
                    type="textarea"
                    rows={2}
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.note || ""}
                    invalid={validation.touched.note && validation.errors.note ? true : false}
                  />
                  {validation.touched.note && validation.errors.note && (
                    <FormFeedback>{validation.errors.note as string}</FormFeedback>
                  )}
                </Col>
              </Row>
              
              {/* Transaction Cancel Date */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="cancelDate-field" className="form-label">
                    İptal Tarihi
                  </Label>
                </Col>
                <Col md={8}>
                  <Flatpickr
                    className="form-control"
                    name="cancelDate"
                    id="cancelDate-field"
                    placeholder="Tarih Seçiniz"
                    options={{
                      dateFormat: "d/m/Y H:i",
                      altInput: true,
                      altFormat: "d/m/Y H:i",
                      enableTime: true,
                    }}
                    value={validation.values.cancelDate || ""}
                    onChange={(date) => {
                      if (date[0]) {
                        const formattedDate = moment(date[0]).format("YYYY-MM-DD HH:mm");
                        console.log("Flatpickr selected date:", date[0]);
                        console.log("Formatted date for cancelDate:", formattedDate);
                        validation.setFieldValue("cancelDate", formattedDate);
                      }
                    }}
                  />
                  {validation.touched.cancelDate && validation.errors.cancelDate && (
                    <FormFeedback>{validation.errors.cancelDate as string}</FormFeedback>
                  )}
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <small className="text-muted d-block mt-1">
                      Raw value: {validation.values.cancelDate}
                    </small>
                  )}
                </Col>
              </Row>
              
              {/* Transaction Cancel Note - Yeni Eklendi */}
              <Row className="mb-3">
                <Col md={4}>
                  <Label htmlFor="cancelNote-field" className="form-label">
                    İptal Notu
                  </Label>
                </Col>
                <Col md={8}>
                  <Input
                    name="cancelNote"
                    id="cancelNote-field"
                    className="form-control"
                    type="textarea"
                    rows={2}
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.cancelNote || ""}
                    invalid={validation.touched.cancelNote && validation.errors.cancelNote ? true : false}
                  />
                  {validation.touched.cancelNote && validation.errors.cancelNote && (
                    <FormFeedback>{validation.errors.cancelNote as string}</FormFeedback>
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