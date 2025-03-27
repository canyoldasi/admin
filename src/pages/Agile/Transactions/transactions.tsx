import React, { useState, useEffect } from "react";
import { Card, CardBody, Row, Col, Label, Input, Button } from "reactstrap";
import Flatpickr from "react-flatpickr";
import Select from "react-select";
import { useLocation, useNavigate } from "react-router-dom";
import { useLazyQuery } from "@apollo/client";
import { toast } from "react-toastify";
import { 
  GET_TRANSACTION_TYPES, 
  GET_TRANSACTION_STATUSES, 
  GET_USERS_LOOKUP, 
  GET_PRODUCTS_LOOKUP,
  GET_COUNTRIES,
  GET_CITIES,
  GET_CHANNELS_LOOKUP
} from "../../../graphql/queries/transactionQueries";
import { SelectOption } from "../../../types/graphql";

// Define TransactionFilterState interface
export interface TransactionFilterState {
  searchText: string;
  startDate: Date | null;
  endDate: Date | null;
  status: SelectOption | null;
  transactionTypes: SelectOption[];
  assignedUsers: SelectOption[];
  products: SelectOption[];
  country: SelectOption | null;
  cities: SelectOption[];
  channels: SelectOption[];
}

interface FilterProps {
  show: boolean;
  onCloseClick: () => void;
  onFilterApply: (filters: TransactionFilterState) => Promise<any[]>;
}

const TransactionFilter: React.FC<FilterProps> = ({ show, onCloseClick, onFilterApply }) => {
  const [filters, setFilters] = useState<TransactionFilterState>({
    searchText: "",
    startDate: null,
    endDate: null,
    status: null,
    transactionTypes: [],
    assignedUsers: [],
    products: [],
    country: null,
    cities: [],
    channels: []
  });
  
  // Add loading state for buttons
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Options for select inputs
  const [transactionTypeOptions, setTransactionTypeOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  
  // Use Apollo Client to fetch transaction types
  const [getTransactionTypes, { loading: typesLoading }] = useLazyQuery(GET_TRANSACTION_TYPES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getTransactionTypesLookup) {
        const types: SelectOption[] = data.getTransactionTypesLookup.map((type: { id: string; name: string }) => ({
          value: type.id,
          label: type.name,
        }));
        setTransactionTypeOptions(types);
      }
    },
    onError: (error) => {
      console.error("Error fetching transaction types:", error);
      toast.error("İşlem tipleri yüklenirken bir hata oluştu");
    }
  });

  // Use Apollo Client to fetch transaction statuses
  const [getTransactionStatuses, { loading: statusesLoading }] = useLazyQuery(GET_TRANSACTION_STATUSES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getTransactionStatusesLookup) {
        const statuses: SelectOption[] = data.getTransactionStatusesLookup.map((status: { id: string; name: string }) => ({
          value: status.id,
          label: status.name,
        }));
        setStatusOptions(statuses);
      }
    },
    onError: (error) => {
      console.error("Error fetching transaction statuses:", error);
      toast.error("İşlem durumları yüklenirken bir hata oluştu");
    }
  });

  // Use Apollo Client to fetch users for assignment options
  const [getUsersLookup, { loading: usersLoading }] = useLazyQuery(GET_USERS_LOOKUP, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getUsersLookup && data.getUsersLookup.items) {
        const users: SelectOption[] = data.getUsersLookup.items.map((user: { id: string; fullName: string }) => ({
          value: user.id,
          label: user.fullName,
        }));
        setUserOptions(users);
      }
    },
    onError: (error) => {
      console.error("Error fetching users:", error);
      toast.error("Kullanıcılar yüklenirken bir hata oluştu");
    }
  });

  // Use Apollo Client to fetch products
  const [getProductsLookup, { loading: productsLoading }] = useLazyQuery(GET_PRODUCTS_LOOKUP, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getProductsLookup && data.getProductsLookup.items) {
        const products: SelectOption[] = data.getProductsLookup.items.map((product: { id: string; name: string }) => ({
          value: product.id,
          label: product.name,
        }));
        setProductOptions(products);
      }
    },
    onError: (error) => {
      console.error("Error fetching products:", error);
      toast.error("Ürünler yüklenirken bir hata oluştu");
    }
  });

  // Use Apollo Client to fetch countries
  const [getCountriesLookup, { loading: countriesLoading }] = useLazyQuery(GET_COUNTRIES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getCountries) {
        const countries: SelectOption[] = data.getCountries.map((country: { id: string; name: string }) => ({
          value: country.id,
          label: country.name,
        }));
        setCountryOptions(countries);
      }
    },
    onError: (error) => {
      console.error("Error fetching countries:", error);
      toast.error("Ülkeler yüklenirken bir hata oluştu");
    }
  });

  // Use Apollo Client to fetch cities
  const [getCitiesLookup, { loading: citiesLoading }] = useLazyQuery(GET_CITIES, {
    fetchPolicy: "network-only",
    variables: {
      countryId: filters.country?.value || ""
    },
    onCompleted: (data) => {
      if (data && data.getCities) {
        const cities: SelectOption[] = data.getCities.map((city: { id: string; name: string }) => ({
          value: city.id,
          label: city.name,
        }));
        setCityOptions(cities);
      }
    },
    onError: (error) => {
      console.error("Error fetching cities:", error);
      toast.error("Şehirler yüklenirken bir hata oluştu");
    }
  });

  // Use Apollo Client to fetch channels
  const [getChannelsLookup, { loading: channelsLoading }] = useLazyQuery(GET_CHANNELS_LOOKUP, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getChannelsLookup) {
        const channels: SelectOption[] = data.getChannelsLookup.map((channel: { id: string; name: string }) => ({
          value: channel.id,
          label: channel.name,
        }));
        setChannelOptions(channels);
      }
    },
    onError: (error) => {
      console.error("Error fetching channels:", error);
      toast.error("Kanallar yüklenirken bir hata oluştu");
    }
  });

  useEffect(() => {
    if (show) {
      // Fetch all lookup data when the filter panel is shown
      try {
        // Fetch transaction types
        getTransactionTypes().catch(error => {
          console.error("Error fetching transaction types:", error);
        });
        
        // Fetch transaction statuses
        getTransactionStatuses().catch(error => {
          console.error("Error fetching transaction statuses:", error);
        });
        
        // Fetch users
        getUsersLookup().catch(error => {
          console.error("Error fetching users:", error);
        });
        
        // The other queries are already updated to include variables
        getProductsLookup().catch(error => {
          console.error("Error fetching products:", error);
        });
        
        getCountriesLookup().catch(error => {
          console.error("Error fetching countries:", error);
        });
        
        getChannelsLookup().catch(error => {
          console.error("Error fetching channels:", error);
        });
      } catch (error) {
        console.error("Error initializing filter data:", error);
      }
    }
  }, [
    show, 
    getTransactionTypes, 
    getTransactionStatuses, 
    getUsersLookup, 
    getProductsLookup, 
    getCountriesLookup, 
    getChannelsLookup
  ]);

  // When country selection changes, fetch cities for that country
  useEffect(() => {
    if (filters.country && filters.country.value) {
      getCitiesLookup({
        variables: {
          countryId: filters.country.value
        }
      });
    } else {
      // Clear city options when no country is selected
      setCityOptions([]);
    }
  }, [filters.country, getCitiesLookup]);

  useEffect(() => {
    // When panel opens, load filter values from URL
    if (show) {
      try {
        console.log("Loading filter values from URL parameters...");
        
        const queryParams = new URLSearchParams(location.search);
        
        // Create a new filters object with default values
        const newFilters: TransactionFilterState = {
          searchText: queryParams.get('searchText') || "",
          startDate: null,
          endDate: null,
          status: null,
          transactionTypes: [],
          assignedUsers: [],
          products: [],
          country: null,
          cities: [],
          channels: []
        };
        
        // Date range parameters
        const createdAtStart = queryParams.get('createdAtStart');
        const createdAtEnd = queryParams.get('createdAtEnd');
        
        if (createdAtStart) {
          newFilters.startDate = new Date(createdAtStart);
        }
        
        if (createdAtEnd) {
          newFilters.endDate = new Date(createdAtEnd);
        }
        
        // Status parameter
        if (statusOptions.length > 0) {
          const statusParam = queryParams.get('status');
          if (statusParam) {
            const matchedStatus = statusOptions.find(s => s.value === statusParam);
            if (matchedStatus) {
              newFilters.status = matchedStatus;
            }
          }
        }
        
        // Transaction types parameter
        if (transactionTypeOptions.length > 0) {
          const typesParam = queryParams.get('typeIds');
          if (typesParam) {
            const typeIds = typesParam.split(',');
            const matchedTypes = typeIds
              .map(typeId => transactionTypeOptions.find(t => t.value === typeId))
              .filter(Boolean) as SelectOption[];
            
            if (matchedTypes.length > 0) {
              newFilters.transactionTypes = matchedTypes;
            }
          }
        }
        
        // Assigned users parameter
        if (userOptions.length > 0) {
          const usersParam = queryParams.get('assignedUserIds');
          if (usersParam) {
            const userIds = usersParam.split(',');
            const matchedUsers = userIds
              .map(userId => userOptions.find(u => u.value === userId))
              .filter(Boolean) as SelectOption[];
            
            if (matchedUsers.length > 0) {
              newFilters.assignedUsers = matchedUsers;
            }
          }
        }
        
        // Products parameter
        if (productOptions.length > 0) {
          const productsParam = queryParams.get('productIds');
          if (productsParam) {
            const productIds = productsParam.split(',');
            const matchedProducts = productIds
              .map(productId => productOptions.find(p => p.value === productId))
              .filter(Boolean) as SelectOption[];
            
            if (matchedProducts.length > 0) {
              newFilters.products = matchedProducts;
            }
          }
        }
        
        // Country parameter
        if (countryOptions.length > 0) {
          const countryParam = queryParams.get('countryId');
          if (countryParam) {
            const matchedCountry = countryOptions.find(c => c.value === countryParam);
            if (matchedCountry) {
              newFilters.country = matchedCountry;
            }
          }
        }
        
        // Cities parameter (only process if a country is selected)
        if (cityOptions.length > 0 && newFilters.country) {
          const citiesParam = queryParams.get('cityIds');
          if (citiesParam) {
            const cityIds = citiesParam.split(',');
            const matchedCities = cityIds
              .map(cityId => cityOptions.find(c => c.value === cityId))
              .filter(Boolean) as SelectOption[];
            
            if (matchedCities.length > 0) {
              newFilters.cities = matchedCities;
            }
          }
        }
        
        // Channels parameter
        if (channelOptions.length > 0) {
          const channelsParam = queryParams.get('channelIds');
          if (channelsParam) {
            const channelIds = channelsParam.split(',');
            const matchedChannels = channelIds
              .map(channelId => channelOptions.find(c => c.value === channelId))
              .filter(Boolean) as SelectOption[];
            
            if (matchedChannels.length > 0) {
              newFilters.channels = matchedChannels;
            }
          }
        }
        
        // Update filters state
        setFilters(newFilters);
      } catch (error) {
        console.error("Error loading filter values from URL:", error);
      }
    }
  }, [
    show, 
    location.search, 
    statusOptions, 
    transactionTypeOptions, 
    userOptions, 
    productOptions, 
    countryOptions, 
    cityOptions, 
    channelOptions
  ]);

  const handleFilterChange = (key: keyof TransactionFilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatDateForUrl = (date: Date | null) => {
    if (!date) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const handleFilterSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate date range
      if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
        toast.error("Başlangıç tarihi, bitiş tarihinden sonra olamaz");
        setIsSubmitting(false);
        return;
      }

      // Get current URL parameters for pagination/sorting
      const currentParams = new URLSearchParams(location.search);
      const params = new URLSearchParams();
      
      // Preserve sorting and pagination parameters
      const orderBy = currentParams.get("orderBy");
      const orderDirection = currentParams.get("orderDirection");
      const pageSize = currentParams.get("pageSize");
      const pageIndex = currentParams.get("pageIndex");
      
      if (orderBy) params.set("orderBy", orderBy);
      if (orderDirection) params.set("orderDirection", orderDirection);
      if (pageSize) params.set("pageSize", pageSize);
      if (pageIndex) params.set("pageIndex", pageIndex);
      
      // Add filter parameters
      if (filters.searchText) params.set("searchText", filters.searchText);
      
      // Date formatting
      const startDateFormatted = formatDateForUrl(filters.startDate);
      const endDateFormatted = formatDateForUrl(filters.endDate);
      
      if (startDateFormatted) params.set("createdAtStart", startDateFormatted);
      if (endDateFormatted) params.set("createdAtEnd", endDateFormatted);
      
      // Status
      if (filters.status) params.set("status", filters.status.value);
      
      // Transaction types
      if (filters.transactionTypes.length > 0) {
        params.set("typeIds", filters.transactionTypes.map(t => t.value).join(","));
      }
      
      // Assigned users
      if (filters.assignedUsers.length > 0) {
        params.set("assignedUserIds", filters.assignedUsers.map(u => u.value).join(","));
      }
      
      // Products
      if (filters.products.length > 0) {
        params.set("productIds", filters.products.map(p => p.value).join(","));
      }
      
      // Country
      if (filters.country) params.set("countryId", filters.country.value);
      
      // Cities
      if (filters.cities.length > 0) {
        params.set("cityIds", filters.cities.map(c => c.value).join(","));
      }
      
      // Channels
      if (filters.channels.length > 0) {
        params.set("channelIds", filters.channels.map(c => c.value).join(","));
      }
      
      // Apply filters
      const results = await onFilterApply(filters);
      
      // Update URL if successful
      if (Array.isArray(results)) {
        navigate({
          pathname: location.pathname,
          search: params.toString(),
        }, { replace: true });
      }
      
      // Close filter panel
      onCloseClick();
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Filtre uygulanırken bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearFilters = async () => {
    setIsClearing(true);
    
    try {
      // Reset filters
      const emptyFilters: TransactionFilterState = {
        searchText: "",
        startDate: null,
        endDate: null,
        status: null,
        transactionTypes: [],
        assignedUsers: [],
        products: [],
        country: null,
        cities: [],
        channels: []
      };
      
      setFilters(emptyFilters);
      
      // Preserve sorting and pagination
      const currentParams = new URLSearchParams(location.search);
      const params = new URLSearchParams();
      
      const orderBy = currentParams.get("orderBy");
      const orderDirection = currentParams.get("orderDirection");
      const pageSize = currentParams.get("pageSize");
      const pageIndex = currentParams.get("pageIndex");
      
      if (orderBy) params.set("orderBy", orderBy);
      if (orderDirection) params.set("orderDirection", orderDirection);
      if (pageSize) params.set("pageSize", pageSize);
      if (pageIndex) params.set("pageIndex", pageIndex);
      
      // Apply empty filters
      await onFilterApply(emptyFilters);
      
      // Update URL
      navigate({
        pathname: location.pathname,
        search: params.toString()
      }, { replace: true });
      
      // Close filter panel
      onCloseClick();
    } catch (error) {
      console.error("Error clearing filters:", error);
      toast.error("Filtreler temizlenirken bir hata oluştu");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="mb-3">
      <CardBody>
        <Row className="align-items-end">
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted fw-semibold">
                İÇİNDE GEÇEN
              </Label>
              <Input
                type="text"
                placeholder="Arayın"
                value={filters.searchText}
                onChange={(e) => handleFilterChange("searchText", e.target.value)}
              />
            </div>
          </Col>
          <Col md={4}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted fw-semibold d-block">
                EKLENME TARİHİ (BAŞLANGIÇ)
              </Label>
              <Flatpickr
                className="form-control"
                placeholder="Başlangıç Tarihi"
                value={filters.startDate || ""}
                options={{ mode: "single", dateFormat: "d/m/Y" }}
                onChange={(date) => handleFilterChange("startDate", date[0] || null)}
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted fw-semibold d-block">
                EKLENME TARİHİ (BİTİŞ)
              </Label>
              <Flatpickr
                className="form-control"
                placeholder="Bitiş Tarihi"
                value={filters.endDate || ""}
                options={{ mode: "single", dateFormat: "d/m/Y" }}
                onChange={(date) => handleFilterChange("endDate", date[0] || null)}
              />
            </div>
          </Col>
          <Col md={2} className="text-end align-self-end">
            <Button
              className="btn add-btn px-4"
              style={{ backgroundColor: "#6ADA7D", color: "white", border: "none" }}
              id="create-btn"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const event = new CustomEvent('TransactionsAddClick');
                  window.dispatchEvent(event);
                }
              }}
            >
              <i className="ri-add-line align-bottom me-1"></i> Ekle
            </Button>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                DURUM
              </Label>
              <Select
                options={statusOptions}
                value={filters.status}
                onChange={(selected: SelectOption | null) => handleFilterChange("status", selected)}
                placeholder="Seçiniz"
                isLoading={statusesLoading}
                isClearable
                className="w-100"
              />
            </div>
          </Col>
          <Col md={4}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                İŞLEM TİPİ
              </Label>
              <Select
                options={transactionTypeOptions}
                isMulti
                isClearable
                value={filters.transactionTypes}
                onChange={(selected: readonly SelectOption[] | null) => handleFilterChange("transactionTypes", selected || [])}
                placeholder="Seçiniz"
                isLoading={typesLoading}
                className="w-100"
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                ATANAN KULLANICI
              </Label>
              <Select
                options={userOptions}
                isMulti
                isClearable
                value={filters.assignedUsers}
                onChange={(selected: readonly SelectOption[] | null) => handleFilterChange("assignedUsers", selected || [])}
                placeholder="Seçiniz"
                isLoading={usersLoading}
                className="w-100"
              />
            </div>
          </Col>
          <Col md={2} className="text-end align-self-end">
            <Button 
              className="px-4"
              style={{ backgroundColor: "#5EA3CB", color: "white", border: "none" }}
              onClick={handleFilterSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              ) : null}
              FİLTRELE
            </Button>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                ÜLKE
              </Label>
              <Select
                options={countryOptions}
                isClearable
                value={filters.country}
                onChange={(selected: SelectOption | null) => handleFilterChange("country", selected)}
                placeholder="Seçiniz"
                isLoading={countriesLoading}
                className="w-100"
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                ŞEHİRLER
              </Label>
              <Select
                options={cityOptions}
                isMulti
                isClearable
                value={filters.cities}
                onChange={(selected: readonly SelectOption[] | null) => handleFilterChange("cities", selected || [])}
                placeholder="Seçiniz"
                isLoading={citiesLoading}
                className="w-100"
                isDisabled={!filters.country}
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                KANAL
              </Label>
              <Select
                options={channelOptions}
                isMulti
                isClearable
                value={filters.channels}
                onChange={(selected: readonly SelectOption[] | null) => handleFilterChange("channels", selected || [])}
                placeholder="Seçiniz"
                isLoading={channelsLoading}
                className="w-100"
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                ÜRÜNLER
              </Label>
              <Select
                options={productOptions}
                isMulti
                isClearable
                value={filters.products}
                onChange={(selected: readonly SelectOption[] | null) => handleFilterChange("products", selected || [])}
                placeholder="Seçiniz"
                isLoading={productsLoading}
                className="w-100"
              />
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default TransactionFilter;
