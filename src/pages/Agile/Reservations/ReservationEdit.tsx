import { useLazyQuery, useQuery, useMutation } from "@apollo/client";
import {
  GET_ACCOUNTS_LOOKUP,
  GET_CHANNELS_LOOKUP,
  GET_CITIES,
  GET_COUNTIES,
  GET_COUNTRIES,
  GET_DISTRICTS,
  GET_PRODUCTS_LOOKUP,
  GET_TRANSACTION,
  GET_TRANSACTION_STATUSES,
  GET_TRANSACTION_TYPES,
  GET_USERS_LOOKUP,
} from "../../../graphql/queries/transactionQueries";
import {
  getAuthHeader,
  getAuthorizationLink,
} from "../../../helpers/jwt-token-access/accessToken";
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

  // Lokasyon bilgileri - Nereden
  const [fromCountry, setFromCountry] = useState<SelectOption | null>(null);
  const [fromCity, setFromCity] = useState<SelectOption | null>(null);
  const [fromCounty, setFromCounty] = useState<SelectOption | null>(null);
  const [fromDistrict, setFromDistrict] = useState<SelectOption | null>(null);
  const [fromAddress, setFromAddress] = useState<string>("");
  const [fromPostalCode, setFromPostalCode] = useState<string>("");

  // Lokasyon bilgileri - Nereye
  const [toCountry, setToCountry] = useState<SelectOption | null>(null);
  const [toCity, setToCity] = useState<SelectOption | null>(null);
  const [toCounty, setToCounty] = useState<SelectOption | null>(null);
  const [toDistrict, setToDistrict] = useState<SelectOption | null>(null);
  const [toAddress, setToAddress] = useState<string>("");
  const [toPostalCode, setToPostalCode] = useState<string>("");

  // Planlama bilgileri
  const [plannedArrivalDate, setPlannedArrivalDate] = useState<Date>(
    new Date()
  );

  // Lokasyon options
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [fromCityOptions, setFromCityOptions] = useState<SelectOption[]>([]);
  const [fromCountyOptions, setFromCountyOptions] = useState<SelectOption[]>(
    []
  );
  const [fromDistrictOptions, setFromDistrictOptions] = useState<
    SelectOption[]
  >([]);
  const [toCityOptions, setToCityOptions] = useState<SelectOption[]>([]);
  const [toCountyOptions, setToCountyOptions] = useState<SelectOption[]>([]);
  const [toDistrictOptions, setToDistrictOptions] = useState<SelectOption[]>(
    []
  );

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState<boolean>(false);
  const [loadingFromCities, setLoadingFromCities] = useState<boolean>(false);
  const [loadingFromCounties, setLoadingFromCounties] =
    useState<boolean>(false);
  const [loadingFromDistricts, setLoadingFromDistricts] =
    useState<boolean>(false);
  const [loadingToCities, setLoadingToCities] = useState<boolean>(false);
  const [loadingToCounties, setLoadingToCounties] = useState<boolean>(false);
  const [loadingToDistricts, setLoadingToDistricts] = useState<boolean>(false);

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

          // Ürün bilgilerini doldur
          if (transaction.transactionProducts && transaction.transactionProducts.length > 0) {
            const product = transaction.transactionProducts[0];
            setTransactionProductId(product.id);
            setUnitPrice(product.unitPrice || 0);
            setQuantity(product.quantity || 1);
            setTotalPrice(product.totalPrice || 0);

            if (product.product) {
              setSelectedProduct({
                value: product.product.id,
                label: product.product.name,
              });
            }
          }

          // Yolcu bilgilerini doldur
          setPassengerName(transaction.name || "");
          setPassengerPhone(transaction.phone || "");
          setPassengerCount(transaction.transactionProducts?.[0]?.quantity || 1);

          // Lokasyon bilgilerini doldur
          if (transaction.locations && transaction.locations.length > 0) {
            // FROM lokasyonu
            const fromLocation = transaction.locations.find(loc => loc.code === "FROM") || transaction.locations[0];
            if (fromLocation) {
              setFromAddress(fromLocation.address || "");
              setFromPostalCode(fromLocation.postalCode || "");

              // FROM lokasyonu için ülke, şehir, ilçe ve mahalle bilgilerini ayarla
              if (fromLocation.country) {
                const fromCountryOption = {
                  value: fromLocation.country.id,
                  label: fromLocation.country.name,
                };
                setFromCountry(fromCountryOption);
                // Şehirleri yükle
                fetchFromCities(fromLocation.country.id);
              }

              if (fromLocation.city) {
                const fromCityOption = {
                  value: fromLocation.city.id,
                  label: fromLocation.city.name,
                };
                setFromCity(fromCityOption);
                // İlçeleri yükle
                fetchFromCounties(fromLocation.city.id);
              }

              if (fromLocation.county) {
                const fromCountyOption = {
                  value: fromLocation.county.id,
                  label: fromLocation.county.name,
                };
                setFromCounty(fromCountyOption);
                // Mahalleleri yükle
                fetchFromDistricts(fromLocation.county.id);
              }

              if (fromLocation.district) {
                const fromDistrictOption = {
                  value: fromLocation.district.id,
                  label: fromLocation.district.name,
                };
                setFromDistrict(fromDistrictOption);
              }
            }

            // TO lokasyonu
            const toLocation = transaction.locations.find(loc => loc.code === "TO") || 
                             (transaction.locations.length > 1 ? transaction.locations[1] : null);
            if (toLocation) {
              setToAddress(toLocation.address || "");
              setToPostalCode(toLocation.postalCode || "");

              if (toLocation.plannedDate) {
                setPlannedArrivalDate(new Date(toLocation.plannedDate));
              }

              // TO lokasyonu için ülke, şehir, ilçe ve mahalle bilgilerini ayarla
              if (toLocation.country) {
                const toCountryOption = {
                  value: toLocation.country.id,
                  label: toLocation.country.name,
                };
                setToCountry(toCountryOption);
                // Şehirleri yükle
                fetchToCities(toLocation.country.id);
              }

              if (toLocation.city) {
                const toCityOption = {
                  value: toLocation.city.id,
                  label: toLocation.city.name,
                };
                setToCity(toCityOption);
                // İlçeleri yükle
                fetchToCounties(toLocation.city.id);
              }

              if (toLocation.county) {
                const toCountyOption = {
                  value: toLocation.county.id,
                  label: toLocation.county.name,
                };
                setToCounty(toCountyOption);
                // Mahalleleri yükle
                fetchToDistricts(toLocation.county.id);
              }

              if (toLocation.district) {
                const toDistrictOption = {
                  value: toLocation.district.id,
                  label: toLocation.district.name,
                };
                setToDistrict(toDistrictOption);
              }
            }
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

  // Ülkeleri yükleme
  const { loading: countriesLoading } = useQuery(GET_COUNTRIES, {
    client,
    onCompleted: (data) => {
      if (data && data.getCountries) {
        const options = data.getCountries.map((country: any) => ({
          value: country.id,
          label: country.name,
        }));
        setCountryOptions(options);
        console.log(
          `Ülkeler başarıyla yüklendi: ${options.length} ülke bulundu`
        );
      }
    },
    onError: (error) => {
      console.error("Ülkeler yüklenirken hata oluştu:", error);
      toast.error("Ülkeler yüklenirken hata oluştu.");
    },
    fetchPolicy: "network-only",
  });

  // Şehirleri yükleme (From)
  const fetchFromCities = async (countryId: string) => {
    try {
      setLoadingFromCities(true);
      const { data } = await client.query({
        query: GET_CITIES,
        variables: {
          countryId,
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only",
      });

      if (data && data.getCities) {
        const options = data.getCities.map((city: any) => ({
          value: city.id,
          label: city.name,
        }));
        setFromCityOptions(options);
        console.log(`From şehirleri yüklendi: ${options.length} şehir bulundu`);
      }
    } catch (error) {
      console.error("Şehirler yüklenirken hata oluştu:", error);
      toast.error("Şehirler yüklenirken hata oluştu.");
    } finally {
      setLoadingFromCities(false);
    }
  };

  // Şehirleri yükleme (To)
  const fetchToCities = async (countryId: string) => {
    try {
      setLoadingToCities(true);
      const { data } = await client.query({
        query: GET_CITIES,
        variables: {
          countryId,
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only",
      });

      if (data && data.getCities) {
        const options = data.getCities.map((city: any) => ({
          value: city.id,
          label: city.name,
        }));
        setToCityOptions(options);
        console.log(`To şehirleri yüklendi: ${options.length} şehir bulundu`);
      }
    } catch (error) {
      console.error("Şehirler yüklenirken hata oluştu:", error);
      toast.error("Şehirler yüklenirken hata oluştu.");
    } finally {
      setLoadingToCities(false);
    }
  };

  // İlçeleri yükleme (From)
  const fetchFromCounties = async (cityId: string) => {
    try {
      setLoadingFromCounties(true);
      const { data } = await client.query({
        query: GET_COUNTIES,
        variables: {
          cityId,
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only",
      });

      if (data && data.getCounties) {
        const options = data.getCounties.map((county: any) => ({
          value: county.id,
          label: county.name,
        }));
        setFromCountyOptions(options);
        console.log(`From ilçeleri yüklendi: ${options.length} ilçe bulundu`);
      }
    } catch (error) {
      console.error("İlçeler yüklenirken hata oluştu:", error);
      toast.error("İlçeler yüklenirken hata oluştu.");
    } finally {
      setLoadingFromCounties(false);
    }
  };

  // İlçeleri yükleme (To)
  const fetchToCounties = async (cityId: string) => {
    try {
      setLoadingToCounties(true);
      const { data } = await client.query({
        query: GET_COUNTIES,
        variables: {
          cityId,
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only",
      });

      if (data && data.getCounties) {
        const options = data.getCounties.map((county: any) => ({
          value: county.id,
          label: county.name,
        }));
        setToCountyOptions(options);
        console.log(`To ilçeleri yüklendi: ${options.length} ilçe bulundu`);
      }
    } catch (error) {
      console.error("İlçeler yüklenirken hata oluştu:", error);
      toast.error("İlçeler yüklenirken hata oluştu.");
    } finally {
      setLoadingToCounties(false);
    }
  };

  // Mahalleleri yükleme (From)
  const fetchFromDistricts = async (countyId: string) => {
    try {
      setLoadingFromDistricts(true);
      const { data } = await client.query({
        query: GET_DISTRICTS,
        variables: {
          countyId,
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only",
      });

      if (data && data.getDistricts) {
        const options = data.getDistricts.map((district: any) => ({
          value: district.id,
          label: district.name,
        }));
        setFromDistrictOptions(options);
        console.log(
          `From mahalleler yüklendi: ${options.length} mahalle bulundu`
        );
      }
    } catch (error) {
      console.error("Mahalleler yüklenirken hata oluştu:", error);
      toast.error("Mahalleler yüklenirken hata oluştu.");
    } finally {
      setLoadingFromDistricts(false);
    }
  };

  // Mahalleleri yükleme (To)
  const fetchToDistricts = async (countyId: string) => {
    try {
      setLoadingToDistricts(true);
      const { data } = await client.query({
        query: GET_DISTRICTS,
        variables: {
          countyId,
        },
        context: getAuthorizationLink(),
        fetchPolicy: "network-only",
      });

      if (data && data.getDistricts) {
        const options = data.getDistricts.map((district: any) => ({
          value: district.id,
          label: district.name,
        }));
        setToDistrictOptions(options);
        console.log(
          `To mahalleler yüklendi: ${options.length} mahalle bulundu`
        );
      }
    } catch (error) {
      console.error("Mahalleler yüklenirken hata oluştu:", error);
      toast.error("Mahalleler yüklenirken hata oluştu.");
    } finally {
      setLoadingToDistricts(false);
    }
  };

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
        toast.success("Reservation updated successfully");
        setTimeout(() => {
          navigate("/agile/reservations", {
            state: { refreshData: true },
          });
        }, 2000);
      }
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
      setSaving(false);
    },
  });

  const handleSubmit = async () => {
    try {
      setSaving(true);

      // Zorunlu alanları kontrol et
      if (!selectedStatus || !selectedType) {
        toast.error("Reservation type and status must be selected.");
        setSaving(false);
        return;
      }

      if (!selectedProduct) {
        toast.error("Service must be selected.");
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
        amount: unitPrice, 
        products: [
          {
            id: transactionProductId,
            productId: selectedProduct?.value,
            quantity: passengerCount,
            unitPrice: 0,
            totalPrice: unitPrice,
          },
        ],
        locations: [
          {
            code: "FROM",
            countryId: fromCountry?.value,
            cityId: fromCity?.value,
            countyId: fromCounty?.value,
            districtId: fromDistrict?.value,
            address: fromAddress,
            postalCode: fromPostalCode,
          },
          {
            code: "TO",
            countryId: toCountry?.value,
            cityId: toCity?.value,
            countyId: toCounty?.value,
            districtId: toDistrict?.value,
            address: toAddress,
            postalCode: toPostalCode,
            plannedDate: moment(plannedArrivalDate).toISOString(),
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
      console.error("Update failed:", error);
      toast.error(`Update failed: ${error.message}`);
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

  // Lokasyon seçim handler'ları
  const handleFromCountryChange = (selectedOption: any) => {
    setFromCountry(selectedOption);
  };

  const handleFromCityChange = (selectedOption: any) => {
    setFromCity(selectedOption);
  };

  const handleFromCountyChange = (selectedOption: any) => {
    setFromCounty(selectedOption);
  };

  const handleFromDistrictChange = (selectedOption: any) => {
    setFromDistrict(selectedOption);
  };

  const handleToCountryChange = (selectedOption: any) => {
    setToCountry(selectedOption);
  };

  const handleToCityChange = (selectedOption: any) => {
    setToCity(selectedOption);
  };

  const handleToCountyChange = (selectedOption: any) => {
    setToCounty(selectedOption);
  };

  const handleToDistrictChange = (selectedOption: any) => {
    setToDistrict(selectedOption);
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Reservation Edit" pageTitle="Agile" />

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center">
                  <CardTitle tag="h5" className="mb-0 flex-grow-1">
                    Reservation Edit
                  </CardTitle>
                  <div className="d-flex gap-2">
                    <Button
                      color="success"
                      onClick={handleSubmit}
                      disabled={loading || saving}
                    >
                      {saving ? (
                        <span className="d-flex align-items-center">
                          <Spinner size="sm" className="me-2" />
                          Saving...
                        </span>
                      ) : (
                        <>
                          <i className="ri-save-line align-bottom me-1"></i>{" "}
                          Save
                        </>
                      )}
                    </Button>
                    <Button color="info" onClick={handleCancel}>
                      <i className="ri-close-line align-bottom me-1"></i> Cancel
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
                                  Assigned Vendor Account
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
                                  placeholder=""
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
                                  Status
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
                                  placeholder=""
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
                                  Assigned User
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
                                  placeholder=""
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
                                  Reservation No
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="text"
                                  id="reservation-no-field"
                                  placeholder=""
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
                                  Reservation Type
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
                                  placeholder=""
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
                                  Channel
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
                                  placeholder=""
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
                                  Planned Date
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Flatpickr
                                  id="planlanma-zamani-field"
                                  className="form-control"
                                  placeholder="seçiniz"
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
                                  Notes
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="textarea"
                                  id="notes-field"
                                  placeholder=""
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

                  {/* Lokasyon Bilgileri */}
                  <Card className="mb-3">
                    <CardHeader className="d-flex align-items-center">
                      <CardTitle tag="h5" className="mb-0 flex-grow-1">
                        Location Information
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <Form>
                        <Row>
                          {/* Nereden */}
                          <Col md={6}>
                            <h6 className="text-muted mb-3">From</h6>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="from-country-field"
                                  className="form-label"
                                >
                                  Country
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="from-country-field"
                                  options={countryOptions}
                                  value={fromCountry}
                                  onChange={handleFromCountryChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Ülke seçiniz"
                                  isLoading={countriesLoading}
                                  isDisabled={countriesLoading}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="from-city-field"
                                  className="form-label"
                                >
                                  City
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="from-city-field"
                                  options={fromCityOptions}
                                  value={fromCity}
                                  onChange={handleFromCityChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Select city"
                                  isLoading={loadingFromCities}
                                  isDisabled={loadingFromCities || !fromCountry}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="from-county-field"
                                  className="form-label"
                                >
                                  County
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="from-county-field"
                                  options={fromCountyOptions}
                                  value={fromCounty}
                                  onChange={handleFromCountyChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Select county"
                                  isLoading={loadingFromCounties}
                                  isDisabled={loadingFromCounties || !fromCity}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="from-district-field"
                                  className="form-label"
                                >
                                  District
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="from-district-field"
                                  options={fromDistrictOptions}
                                  value={fromDistrict}
                                  onChange={handleFromDistrictChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Select district"
                                  isLoading={loadingFromDistricts}
                                  isDisabled={
                                    loadingFromDistricts || !fromCounty
                                  }
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="from-address-field"
                                  className="form-label"
                                >
                                  Address
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="textarea"
                                  id="from-address-field"
                                  placeholder="Enter address"
                                  value={fromAddress}
                                  onChange={(e) =>
                                    setFromAddress(e.target.value)
                                  }
                                  rows={3}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="from-postal-code-field"
                                  className="form-label"
                                >
                                  Postal Code
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="text"
                                  id="from-postal-code-field"
                                  placeholder="Enter postal code"
                                  value={fromPostalCode}
                                  onChange={(e) =>
                                    setFromPostalCode(e.target.value)
                                  }
                                />
                              </Col>
                            </Row>
                          </Col>

                          {/* Nereye */}
                          <Col md={6}>
                            <h6 className="text-muted mb-3">To</h6>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="to-country-field"
                                  className="form-label"
                                >
                                  Country
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="to-country-field"
                                  options={countryOptions}
                                  value={toCountry}
                                  onChange={handleToCountryChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Select country"
                                  isLoading={countriesLoading}
                                  isDisabled={countriesLoading}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="to-city-field"
                                  className="form-label"
                                >
                                  City
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="to-city-field"
                                  options={toCityOptions}
                                  value={toCity}
                                  onChange={handleToCityChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Select city"
                                  isLoading={loadingToCities}
                                  isDisabled={loadingToCities || !toCountry}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="to-county-field"
                                  className="form-label"
                                >
                                  County
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="to-county-field"
                                  options={toCountyOptions}
                                  value={toCounty}
                                  onChange={handleToCountyChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Select county"
                                  isLoading={loadingToCounties}
                                  isDisabled={loadingToCounties || !toCity}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="to-district-field"
                                  className="form-label"
                                >
                                  District
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Select
                                  id="to-district-field"
                                  options={toDistrictOptions}
                                  value={toDistrict}
                                  onChange={handleToDistrictChange}
                                  className="react-select"
                                  classNamePrefix="select"
                                  placeholder="Select district"
                                  isLoading={loadingToDistricts}
                                  isDisabled={loadingToDistricts || !toCounty}
                                  isClearable={true}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="to-address-field"
                                  className="form-label"
                                >
                                  Address
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="textarea"
                                  id="to-address-field"
                                  placeholder="Enter address"
                                  value={toAddress}
                                  onChange={(e) => setToAddress(e.target.value)}
                                  rows={3}
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="to-postal-code-field"
                                  className="form-label"
                                >
                                  Postal Code
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Input
                                  type="text"
                                  id="to-postal-code-field"
                                  placeholder="Enter postal code"
                                  value={toPostalCode}
                                  onChange={(e) =>
                                    setToPostalCode(e.target.value)
                                  }
                                />
                              </Col>
                            </Row>

                            <Row className="mb-3">
                              <Col md={4}>
                                <Label
                                  htmlFor="planned-arrival-date-field"
                                  className="form-label"
                                >
                                  Planned Dropoff Date
                                </Label>
                              </Col>
                              <Col md={8}>
                                <Flatpickr
                                  id="planned-arrival-date-field"
                                  className="form-control"
                                  placeholder="Select date and time"
                                  options={{
                                    enableTime: true,
                                    dateFormat: "d.m.Y H:i",
                                    time_24hr: true,
                                  }}
                                  value={plannedArrivalDate}
                                  onChange={(selectedDates) => {
                                    if (selectedDates.length > 0) {
                                      setPlannedArrivalDate(selectedDates[0]);
                                    }
                                  }}
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
                        Passenger Information
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
                              Passenger Name
                            </Label>
                          </Col>
                          <Col md={3}>
                            <Input
                              type="text"
                              id="passenger-name-field"
                              placeholder=""
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
                              Passenger Phone
                            </Label>
                          </Col>
                          <Col md={3}>
                            <Input
                              type="text"
                              id="passenger-phone-field"
                              placeholder=""
                              value={passengerPhone}
                              onChange={(e) =>
                                setPassengerPhone(e.target.value)
                              }
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
                        Product Information
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
                              Service
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
                              placeholder=""
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
                              Price
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

                          <Col md={2}>
                            <Label
                              htmlFor="passenger-count-field"
                              className="form-label"
                            >
                              Passenger Count
                            </Label>
                          </Col>
                          <Col md={4}>
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
                          {/* <Col md={3}>
                            <Label
                              htmlFor="quantity-field"
                              className="form-label"
                            >
                              Quantity
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
                          </Col> */}
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
