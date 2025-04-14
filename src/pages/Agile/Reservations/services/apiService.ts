import { 
  ApolloClient, 
  InMemoryCache, 
  createHttpLink, 
  gql,
  NormalizedCacheObject,
  ApolloQueryResult
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getAuthHeader } from "../../../../helpers/jwt-token-access/accessToken";
import { 
  GET_USERS_LOOKUP, 
  GET_TRANSACTION_TYPES, 
  GET_TRANSACTION_STATUSES,
  GET_ACCOUNTS_LOOKUP,
  GET_CHANNELS_LOOKUP,
  GET_PRODUCTS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS
} from "../../../../graphql/queries/transactionQueries";

// Select Option tipi
export interface SelectOption {
  value: string;
  label: string;
}

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
export const client = new ApolloClient({
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

// Authorization link yardımcı fonksiyonu
export const getAuthorizationLink = () => {
  const token = getAuthHeader();
  return {
    headers: {
      authorization: token ? token : "",
    },
  };
};

// Kullanıcıları getir
export const fetchUsers = async (): Promise<SelectOption[]> => {
  try {
    const { data } = await client.query({
      query: GET_USERS_LOOKUP,
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    if (data && data.getUsersLookup && data.getUsersLookup.items) {
      const options = data.getUsersLookup.items.map((user: any) => ({
        value: user.id,
        label: user.fullName,
      }));
      console.log(`Kullanıcılar başarıyla yüklendi: ${options.length} kullanıcı bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("Kullanıcı yüklenirken hata oluştu:", error);
    throw error;
  }
};

// İşlem türlerini getir
export const fetchTransactionTypes = async (): Promise<SelectOption[]> => {
  try {
    const { data } = await client.query({
      query: GET_TRANSACTION_TYPES,
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    if (data && data.getTransactionTypesLookup) {
      const options = data.getTransactionTypesLookup.map((type: any) => ({
        value: type.id,
        label: type.name,
      }));
      console.log(`İşlem türleri başarıyla yüklendi: ${options.length} tür bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("İşlem türleri yüklenirken hata oluştu:", error);
    throw error;
  }
};

// İşlem durumlarını getir
export const fetchTransactionStatuses = async (): Promise<SelectOption[]> => {
  try {
    const { data } = await client.query({
      query: GET_TRANSACTION_STATUSES,
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    if (data && data.getTransactionStatusesLookup) {
      const options = data.getTransactionStatusesLookup.map((status: any) => ({
        value: status.id,
        label: status.name,
      }));
      console.log(`İşlem durumları başarıyla yüklendi: ${options.length} durum bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("İşlem durumları yüklenirken hata oluştu:", error);
    throw error;
  }
};

// Kanalları getir
export const fetchChannels = async (): Promise<SelectOption[]> => {
  try {
    const { data } = await client.query({
      query: GET_CHANNELS_LOOKUP,
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    if (data && data.getChannelsLookup) {
      const options = data.getChannelsLookup.map((channel: any) => ({
        value: channel.id,
        label: channel.name,
      }));
      console.log(`Kanallar başarıyla yüklendi: ${options.length} kanal bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("Kanallar yüklenirken hata oluştu:", error);
    throw error;
  }
};

// Ürünleri getir
export const fetchProducts = async (): Promise<SelectOption[]> => {
  try {
    const { data } = await client.query({
      query: GET_PRODUCTS_LOOKUP,
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    if (data && data.getProductsLookup && data.getProductsLookup.items) {
      const options = data.getProductsLookup.items.map((product: any) => ({
        value: product.id,
        label: product.name,
      }));
      console.log(`Ürünler başarıyla yüklendi: ${options.length} ürün bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("Ürünler yüklenirken hata oluştu:", error);
    throw error;
  }
};

// Hesapları getir
export const fetchAccounts = async (): Promise<SelectOption[]> => {
  try {
    const { data } = await client.query({
      query: GET_ACCOUNTS_LOOKUP,
      variables: {
        input: {
          pageSize: 100,
          pageIndex: 0,
        },
      },
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    if (data && data.getAccounts && data.getAccounts.items) {
      const accounts = data.getAccounts.items;
      if (accounts.length > 0) {
        const options = accounts.map((account: any) => ({
          value: account.id,
          label: account.name,
        }));
        console.log(`Hesaplar başarıyla yüklendi: ${options.length} hesap bulundu`);
        return options;
      }
    }
    
    console.warn("API boş hesap listesi döndürdü");
    return [];
  } catch (error) {
    console.error("Hesaplar yüklenirken hata oluştu:", error);
    throw error;
  }
};

// Ülkeleri getir
export const fetchCountries = async (): Promise<SelectOption[]> => {
  try {
    const { data } = await client.query({
      query: GET_COUNTRIES,
      context: getAuthorizationLink(),
      fetchPolicy: "network-only",
    });

    if (data && data.getCountries) {
      const options = data.getCountries.map((country: any) => ({
        value: country.id,
        label: country.name,
      }));
      console.log(`Ülkeler başarıyla yüklendi: ${options.length} ülke bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("Ülkeler yüklenirken hata oluştu:", error);
    throw error;
  }
};

// Şehirleri getir
export const fetchCities = async (countryId: string): Promise<SelectOption[]> => {
  try {
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
      console.log(`Şehirler yüklendi: ${options.length} şehir bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("Şehirler yüklenirken hata oluştu:", error);
    throw error;
  }
};

// İlçeleri getir
export const fetchCounties = async (cityId: string): Promise<SelectOption[]> => {
  try {
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
      console.log(`İlçeler yüklendi: ${options.length} ilçe bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("İlçeler yüklenirken hata oluştu:", error);
    throw error;
  }
};

// Mahalleleri getir
export const fetchDistricts = async (countyId: string): Promise<SelectOption[]> => {
  try {
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
      console.log(`Mahalleler yüklendi: ${options.length} mahalle bulundu`);
      return options;
    }
    
    return [];
  } catch (error) {
    console.error("Mahalleler yüklenirken hata oluştu:", error);
    throw error;
  }
}; 