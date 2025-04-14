import { useState, useEffect } from 'react';
import { 
  fetchUsers, 
  fetchTransactionTypes, 
  fetchTransactionStatuses,
  fetchChannels,
  fetchProducts,
  fetchAccounts,
  fetchCountries,
  fetchCities,
  fetchCounties,
  fetchDistricts,
  SelectOption,
  client
} from '../services/apiService';

export const useApiData = () => {
  // Options state'leri
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  
  // Loading state'leri
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(false);
  const [loadingStatuses, setLoadingStatuses] = useState<boolean>(false);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [loadingCountries, setLoadingCountries] = useState<boolean>(false);
  
  // Lokasyon state'leri
  const [fromCityOptions, setFromCityOptions] = useState<SelectOption[]>([]);
  const [fromCountyOptions, setFromCountyOptions] = useState<SelectOption[]>([]);
  const [fromDistrictOptions, setFromDistrictOptions] = useState<SelectOption[]>([]);
  const [toCityOptions, setToCityOptions] = useState<SelectOption[]>([]);
  const [toCountyOptions, setToCountyOptions] = useState<SelectOption[]>([]);
  const [toDistrictOptions, setToDistrictOptions] = useState<SelectOption[]>([]);
  
  const [loadingFromCities, setLoadingFromCities] = useState<boolean>(false);
  const [loadingFromCounties, setLoadingFromCounties] = useState<boolean>(false);
  const [loadingFromDistricts, setLoadingFromDistricts] = useState<boolean>(false);
  const [loadingToCities, setLoadingToCities] = useState<boolean>(false);
  const [loadingToCounties, setLoadingToCounties] = useState<boolean>(false);
  const [loadingToDistricts, setLoadingToDistricts] = useState<boolean>(false);

  // Kullanıcıları yükleme
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const options = await fetchUsers();
      setUserOptions(options);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata oluştu:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // İşlem türlerini yükleme
  const loadTransactionTypes = async () => {
    try {
      setLoadingTypes(true);
      const options = await fetchTransactionTypes();
      setTypeOptions(options);
    } catch (error) {
      console.error('İşlem türleri yüklenirken hata oluştu:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  // İşlem durumlarını yükleme
  const loadTransactionStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const options = await fetchTransactionStatuses();
      setStatusOptions(options);
    } catch (error) {
      console.error('İşlem durumları yüklenirken hata oluştu:', error);
    } finally {
      setLoadingStatuses(false);
    }
  };

  // Kanalları yükleme
  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const options = await fetchChannels();
      setChannelOptions(options);
    } catch (error) {
      console.error('Kanallar yüklenirken hata oluştu:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Ürünleri yükleme
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const options = await fetchProducts();
      setProductOptions(options);
    } catch (error) {
      console.error('Ürünler yüklenirken hata oluştu:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Hesapları yükleme
  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const options = await fetchAccounts();
      setAccountOptions(options);
    } catch (error) {
      console.error('Hesaplar yüklenirken hata oluştu:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Ülkeleri yükleme
  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const options = await fetchCountries();
      setCountryOptions(options);
    } catch (error) {
      console.error('Ülkeler yüklenirken hata oluştu:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // From şehirleri yükleme
  const loadFromCities = async (countryId: string) => {
    try {
      setLoadingFromCities(true);
      const options = await fetchCities(countryId);
      setFromCityOptions(options);
    } catch (error) {
      console.error('From şehirleri yüklenirken hata oluştu:', error);
    } finally {
      setLoadingFromCities(false);
    }
  };

  // From ilçeleri yükleme
  const loadFromCounties = async (cityId: string) => {
    try {
      setLoadingFromCounties(true);
      const options = await fetchCounties(cityId);
      setFromCountyOptions(options);
    } catch (error) {
      console.error('From ilçeleri yüklenirken hata oluştu:', error);
    } finally {
      setLoadingFromCounties(false);
    }
  };

  // From mahalleleri yükleme
  const loadFromDistricts = async (countyId: string) => {
    try {
      setLoadingFromDistricts(true);
      const options = await fetchDistricts(countyId);
      setFromDistrictOptions(options);
    } catch (error) {
      console.error('From mahalleleri yüklenirken hata oluştu:', error);
    } finally {
      setLoadingFromDistricts(false);
    }
  };

  // To şehirleri yükleme
  const loadToCities = async (countryId: string) => {
    try {
      setLoadingToCities(true);
      const options = await fetchCities(countryId);
      setToCityOptions(options);
    } catch (error) {
      console.error('To şehirleri yüklenirken hata oluştu:', error);
    } finally {
      setLoadingToCities(false);
    }
  };

  // To ilçeleri yükleme
  const loadToCounties = async (cityId: string) => {
    try {
      setLoadingToCounties(true);
      const options = await fetchCounties(cityId);
      setToCountyOptions(options);
    } catch (error) {
      console.error('To ilçeleri yüklenirken hata oluştu:', error);
    } finally {
      setLoadingToCounties(false);
    }
  };

  // To mahalleleri yükleme
  const loadToDistricts = async (countyId: string) => {
    try {
      setLoadingToDistricts(true);
      const options = await fetchDistricts(countyId);
      setToDistrictOptions(options);
    } catch (error) {
      console.error('To mahalleleri yüklenirken hata oluştu:', error);
    } finally {
      setLoadingToDistricts(false);
    }
  };

  // Temel verileri sayfa yüklendiğinde çek
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadUsers(),
          loadTransactionTypes(),
          loadTransactionStatuses(),
          loadChannels(),
          loadProducts(),
          loadAccounts(),
          loadCountries(),
        ]);
      } catch (error) {
        console.error('Veriler yüklenirken hata oluştu:', error);
      }
    };

    loadInitialData();
  }, []);

  return {
    // Options
    userOptions,
    typeOptions,
    statusOptions,
    channelOptions,
    productOptions,
    accountOptions,
    countryOptions,
    fromCityOptions,
    fromCountyOptions,
    fromDistrictOptions,
    toCityOptions,
    toCountyOptions,
    toDistrictOptions,
    
    // Loading states
    loadingUsers,
    loadingTypes,
    loadingStatuses,
    loadingChannels,
    loadingProducts,
    loadingAccounts,
    loadingCountries,
    loadingFromCities,
    loadingFromCounties,
    loadingFromDistricts,
    loadingToCities,
    loadingToCounties,
    loadingToDistricts,
    
    // Loader functions
    loadFromCities,
    loadFromCounties,
    loadFromDistricts,
    loadToCities,
    loadToCounties,
    loadToDistricts,
    
    // Common utility
    client
  };
}; 