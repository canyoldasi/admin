import React, { useState, useEffect, useRef } from "react";
import { Card, CardBody, Row, Col, Label, Input, Button } from "reactstrap";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import Select from "react-select";
import { useLocation, useNavigate } from "react-router-dom";
import { useLazyQuery } from "@apollo/client";
import { toast } from "react-toastify";
import { 
  GET_USERS_LOOKUP, 
  GET_COUNTRIES,
  GET_CITIES,
  GET_SEGMENTS,
  GET_ACCOUNT_TYPES,
  GET_CHANNELS_LOOKUP
} from "../../../graphql/queries/accountQueries";
import { SelectOption } from "../../../types/graphql";
import moment from "moment";

// Define AccountFilterState interface
export interface AccountFilterState {
  searchText: string;
  startDate: Date | null;
  endDate: Date | null;
  assignedUsers: SelectOption[];
  country: SelectOption | null;
  cities: SelectOption[];
  segments: SelectOption[];
  accountTypes: SelectOption[];
  channels: SelectOption[];
}

interface FilterProps {
  show: boolean;
  onCloseClick: () => void;
  onFilterApply: (filters: AccountFilterState) => Promise<any[]>;
}

const AccountFilter: React.FC<FilterProps> = ({ show, onCloseClick, onFilterApply }) => {
  const [filters, setFilters] = useState<AccountFilterState>({
    searchText: "",
    startDate: null,
    endDate: null,
    assignedUsers: [],
    country: null,
    cities: [],
    segments: [],
    accountTypes: [],
    channels: []
  });
  
  // Add loading state for buttons
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  
  // Initialize filtersLoadedFromUrl with false at component mount
  const filtersLoadedFromUrl = useRef<boolean>(false);

  // Add a ref to track if we've already loaded the options
  const optionsLoadedRef = useRef<boolean>(false);

  // Options for select inputs
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [segmentOptions, setSegmentOptions] = useState<SelectOption[]>([]);
  const [accountTypeOptions, setAccountTypeOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  
  // Track if all options have been loaded
  const [optionsLoaded, setOptionsLoaded] = useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();
  
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

  // Use Apollo Client to fetch segments
  const [getSegmentsLookup, { loading: segmentsLoading }] = useLazyQuery(GET_SEGMENTS, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getSegmentsLookup) {
        const segments: SelectOption[] = data.getSegmentsLookup.map((segment: { id: string; name: string }) => ({
          value: segment.id,
          label: segment.name,
        }));
        setSegmentOptions(segments);
      }
    },
    onError: (error) => {
      console.error("Error fetching segments:", error);
      toast.error("Segmentler yüklenirken bir hata oluştu");
    }
  });

  // Update query name
  const [getAccountTypes, { loading: accountTypesLoading }] = useLazyQuery(GET_ACCOUNT_TYPES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getAccountTypesLookup) {
        const types: SelectOption[] = data.getAccountTypesLookup.map((type: { id: string; name: string }) => ({
          value: type.id,
          label: type.name,
        }));
        setAccountTypeOptions(types);
      }
    },
    onError: (error) => {
      console.error("Error fetching account types:", error);
      toast.error("Hesap tipleri yüklenirken bir hata oluştu");
    }
  });

  // Add query for channels
  const [getChannels, { loading: channelsLoading }] = useLazyQuery(GET_CHANNELS_LOOKUP, {
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

  // Update function name in loadFilterOptions
  const loadFilterOptions = async () => {
    if (optionsLoadedRef.current) return;
    
    try {
      // Start loading options
      await Promise.all([
        getUsersLookup(),
        getCountriesLookup(),
        getSegmentsLookup(),
        getAccountTypes(),
        getChannels()
      ]);
      
      // Mark options as loaded
      optionsLoadedRef.current = true;
      setOptionsLoaded(true);
    } catch (error) {
      console.error("Error loading filter options:", error);
      toast.error("Filtre seçenekleri yüklenirken bir hata oluştu");
    }
  };

  // Load cities when country changes
  useEffect(() => {
    if (filters.country?.value) {
      getCitiesLookup({
        variables: {
          countryId: filters.country.value
        }
      });
    } else {
      setCityOptions([]);
    }
  }, [filters.country]);
  
  // Load filter values from URL when component mounts
  useEffect(() => {
    if (!filtersLoadedFromUrl.current) {
      const params = new URLSearchParams(location.search);
      
      // Get filters from URL
      const searchText = params.get("search") || "";
      const startDate = params.get("startDate") ? new Date(params.get("startDate") as string) : null;
      const endDate = params.get("endDate") ? new Date(params.get("endDate") as string) : null;
      const assignedUserIdsParam = params.get("assignedUsers");
      const assignedUserIds = assignedUserIdsParam ? assignedUserIdsParam.split(",") : [];
      const countryId = params.get("country") || null;
      const cityIdsParam = params.get("cities");
      const cityIds = cityIdsParam ? cityIdsParam.split(",") : [];
      const segmentIdsParam = params.get("segments");
      const segmentIds = segmentIdsParam ? segmentIdsParam.split(",") : [];
      const accountTypeIdsParam = params.get("accountTypes");
      const accountTypeIds = accountTypeIdsParam ? accountTypeIdsParam.split(",") : [];
      const channelIdsParam = params.get("channels");
      const channelIds = channelIdsParam ? channelIdsParam.split(",") : [];
      
      // Immediately update search text without waiting for options
      if (searchText) {
        setFilters(prev => ({
          ...prev,
          searchText
        }));
      }
      
      // Immediately update dates if they exist
      if (startDate || endDate) {
        setFilters(prev => ({
          ...prev,
          startDate,
          endDate
        }));
      }
      
      // Log found URL parameters
      const hasFilters = searchText || startDate || endDate || assignedUserIds.length || countryId ||
                        cityIds.length || segmentIds.length || accountTypeIds.length || channelIds.length;
      
      if (hasFilters) {
        console.log("Loading filters from URL:", { 
          searchText, startDate, endDate, assignedUserIds, countryId,
          cityIds, segmentIds, accountTypeIds, channelIds 
        });
      }
      
      // Mark as loaded from URL
      filtersLoadedFromUrl.current = true;
      
      // Load the options and then set the selected values
      loadFilterOptions().then(() => {
        // Set selected users if userOptions are loaded
        if (assignedUserIds.length > 0 && userOptions.length > 0) {
          const selectedUsers = userOptions.filter(user => 
            assignedUserIds.includes(user.value as string)
          );
          
          setFilters(prev => ({
            ...prev,
            assignedUsers: selectedUsers
          }));
        }
        
        // Set selected country if countryOptions are loaded
        if (countryId && countryOptions.length > 0) {
          const selectedCountry = countryOptions.find(country => 
            country.value === countryId
          );
          
          setFilters(prev => ({
            ...prev,
            country: selectedCountry || null
          }));
          
          // Load cities for this country if we have a country
          if (selectedCountry) {
            getCitiesLookup({
              variables: {
                countryId: selectedCountry.value
              }
            }).then(() => {
              // Set selected cities if cityOptions are loaded
              if (cityIds.length > 0 && cityOptions.length > 0) {
                const selectedCities = cityOptions.filter(city => 
                  cityIds.includes(city.value as string)
                );
                
                setFilters(prev => ({
                  ...prev,
                  cities: selectedCities
                }));
              }
            });
          }
        }
        
        // Set selected segments if segmentOptions are loaded
        if (segmentIds.length > 0 && segmentOptions.length > 0) {
          const selectedSegments = segmentOptions.filter(segment => 
            segmentIds.includes(segment.value)
          );
          
          setFilters(prev => ({
            ...prev,
            segments: selectedSegments
          }));
        }
        
        // Set selected account types if accountTypeOptions are loaded
        if (accountTypeIds.length > 0 && accountTypeOptions.length > 0) {
          const selectedAccountTypes = accountTypeOptions.filter(type => 
            accountTypeIds.includes(type.value)
          );
          
          setFilters(prev => ({
            ...prev,
            accountTypes: selectedAccountTypes
          }));
        }
        
        // Set selected channels if channelOptions are loaded
        if (channelIds.length > 0 && channelOptions.length > 0) {
          const selectedChannels = channelOptions.filter(channel => 
            channelIds.includes(channel.value)
          );
          
          setFilters(prev => ({
            ...prev,
            channels: selectedChannels
          }));
        }
        
        // After loading all filters from URL, if there are any, automatically apply them
        // This ensures the filtered results are shown immediately on page load/refresh
        if (hasFilters) {
          const currentFilters = {
            ...filters,
            searchText,
            startDate,
            endDate,
            assignedUsers: userOptions.filter(user => assignedUserIds.includes(user.value as string)),
            country: countryId ? countryOptions.find(country => country.value === countryId) || null : null,
            cities: cityOptions.filter(city => cityIds.includes(city.value as string)),
            segments: segmentOptions.filter(segment => segmentIds.includes(segment.value)),
            accountTypes: accountTypeOptions.filter(type => accountTypeIds.includes(type.value)),
            channels: channelOptions.filter(channel => channelIds.includes(channel.value))
          };
          
          console.log("Auto-applying filters from URL:", currentFilters);
          
          // Update the filter state with all values at once
          setFilters(currentFilters);
          
          // No need to call onFilterApply here as the main component will load from URL params
        }
      });
    }
  }, [location.search, userOptions, countryOptions, cityOptions, segmentOptions, accountTypeOptions, channelOptions]);
  
  // Update filter values when a field changes
  const handleFilterChange = (key: keyof AccountFilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Helper to format date for URL
  const formatDateForUrl = (date: Date | null) => {
    if (!date) return null;
    return moment(date).format("YYYY-MM-DD");
  };
  
  // Apply filters
  const handleFilterSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Prepare filter values
      const filterValues = {
        ...filters,
        accountTypeIds: filters.accountTypes.map(type => type.value),
        channelIds: filters.channels.map(channel => channel.value),
        assignedUserIds: filters.assignedUsers.map(user => user.value),
        segmentIds: filters.segments.map(segment => segment.value),
        cityIds: filters.cities.map(city => city.value),
        countryId: filters.country?.value || null,
        startDate: filters.startDate ? moment(filters.startDate).format("YYYY-MM-DD") : null,
        endDate: filters.endDate ? moment(filters.endDate).format("YYYY-MM-DD") : null
      };
      
      // Log the filter values for debugging
      console.log("Applying filters:", filterValues);
      
      // First, update URL with filter values
      const params = new URLSearchParams();
      if (filters.searchText) params.set("search", filters.searchText);
      if (filters.startDate) params.set("startDate", moment(filters.startDate).format("YYYY-MM-DD"));
      if (filters.endDate) params.set("endDate", moment(filters.endDate).format("YYYY-MM-DD"));
      if (filters.accountTypes.length > 0) params.set("accountTypes", filters.accountTypes.map(t => t.value).join(","));
      if (filters.channels.length > 0) params.set("channels", filters.channels.map(c => c.value).join(","));
      if (filters.segments.length > 0) params.set("segments", filters.segments.map(s => s.value).join(","));
      if (filters.assignedUsers.length > 0) params.set("assignedUsers", filters.assignedUsers.map(u => u.value).join(","));
      if (filters.country) params.set("country", filters.country.value);
      if (filters.cities.length > 0) params.set("cities", filters.cities.map(c => c.value).join(","));
      
      // Set a flag that we're about to manually update the URL
      // This flag will be used in the parent component to prevent duplicate data fetching
      if (typeof window !== 'undefined') {
        window.manuallyUpdatingFilters = true;
      }
      
      // Update the URL
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({}, "", newUrl);
      
      // Now apply the filter - this will fetch the data only once
      await onFilterApply(filterValues);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.manuallyUpdatingFilters = false;
        }
      }, 100);
      
      // Close the filter panel
      onCloseClick();
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Filtreler uygulanırken bir hata oluştu");
      
      // Make sure to reset the flag even in case of error
      if (typeof window !== 'undefined') {
        window.manuallyUpdatingFilters = false;
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Clear all filters
  const handleClearFilters = async () => {
    try {
      setIsClearing(true);
      
      // Reset all filters
      const clearedFilters: AccountFilterState = {
        searchText: "",
        startDate: null,
        endDate: null,
        assignedUsers: [],
        country: null,
        cities: [],
        segments: [],
        accountTypes: [],
        channels: []
      };
      
      // Update state
      setFilters(clearedFilters);
      
      // Apply the cleared filters
      await onFilterApply(clearedFilters);
      
      // Close the filter panel
      onCloseClick();
    } catch (error) {
      console.error("Error clearing filters:", error);
      toast.error("Filtreler temizlenirken bir hata oluştu");
    } finally {
      setIsClearing(false);
    }
  };
  
  // Helper for loading state
  const isLoading = usersLoading || countriesLoading || citiesLoading || segmentsLoading || accountTypesLoading || channelsLoading;
  
  // Load filter options when component mounts or becomes visible
  useEffect(() => {
    if (show && !optionsLoadedRef.current) {
      loadFilterOptions();
    }
  }, [show]);

  // Let's add a new function to check if filters are applied from URL
  const hasAppliedFiltersFromUrl = () => {
    const params = new URLSearchParams(location.search);
    return params.has('search') || params.has('startDate') || params.has('endDate') 
           || params.has('assignedUsers') || params.has('country') || params.has('cities')
           || params.has('segments') || params.has('accountTypes') || params.has('channels');
  };

  // Let the parent component know this component is ready
  useEffect(() => {
    // When options are loaded and URL has filters, update UI to show correct selection state
    if (optionsLoaded && hasAppliedFiltersFromUrl()) {
      console.log("Filter options loaded, UI should now reflect URL filter state");
    }
  }, [optionsLoaded]);

  // Render the filter component
  return (
    <div className={`account-filter ${show ? "" : "d-none"}`}>
      <Row className="g-3">
        {/* Search Input */}
        <Col md={3}>
          <div>
            <Label className="form-label fw-semibold text-uppercase small">İÇİNDE GEÇEN</Label>
            <Input
              type="text"
              className="form-control"
              placeholder="Arayın"
              value={filters.searchText}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
            />
          </div>
        </Col>
        
        {/* Date Range */}
        <Col md={3}>
          <div>
            <Label className="form-label fw-semibold text-uppercase small">EKLENME TARİHİ (BAŞLANGIÇ)</Label>
            <Flatpickr
              className="form-control"
              placeholder="Başlangıç Tarihi"
              options={{
                dateFormat: "d.m.Y",
                maxDate: filters.endDate || undefined
              }}
              value={filters.startDate || ""}
              onChange={([date]) => handleFilterChange("startDate", date)}
            />
          </div>
        </Col>
        
        <Col md={3}>
          <div>
            <Label className="form-label fw-semibold text-uppercase small">EKLENME TARİHİ (BİTİŞ)</Label>
            <Flatpickr
              className="form-control"
              placeholder="Bitiş Tarihi"
              options={{
                dateFormat: "d.m.Y",
                minDate: filters.startDate || undefined
              }}
              value={filters.endDate || ""}
              onChange={([date]) => handleFilterChange("endDate", date)}
            />
          </div>
        </Col>
        
        {/* Assigned User */}
        <Col md={3}>
          <div>
            <Label className="form-label fw-semibold text-uppercase small">ATANAN KULLANICI</Label>
            <Select
              isMulti
              name="assignedUsers"
              options={userOptions}
              classNamePrefix="select2-selection"
              value={filters.assignedUsers}
              onChange={(value) => handleFilterChange("assignedUsers", value)}
              isLoading={usersLoading}
              placeholder="Seçiniz"
            />
          </div>
        </Col>
        
        {/* Account Types - Positioned in the second row */}
        <Col md={3}>
          <div>
            <Label className="form-label fw-semibold text-uppercase small">HESAP TİPİ</Label>
            <Select
              isMulti
              name="accountTypes"
              options={accountTypeOptions}
              classNamePrefix="select2-selection"
              value={filters.accountTypes}
              onChange={(value) => handleFilterChange("accountTypes", value)}
              isLoading={accountTypesLoading}
              placeholder="Seçiniz"
            />
          </div>
        </Col>
        
        {/* Segments and Channel in the same row */}
        <Col md={3}>
          <div>
            <Label className="form-label fw-semibold text-uppercase small">SEGMENT</Label>
            <Select
              isMulti
              name="segments"
              options={segmentOptions}
              classNamePrefix="select2-selection"
              value={filters.segments}
              onChange={(value) => handleFilterChange("segments", value)}
              isLoading={segmentsLoading}
              placeholder="Seçiniz"
            />
          </div>
        </Col>
        
        <Col md={3}>
          <div>
            <Label className="form-label fw-semibold text-uppercase small">KANAL</Label>
            <Select
              isMulti
              name="channels"
              options={channelOptions}
              classNamePrefix="select2-selection"
              value={filters.channels}
              onChange={(value) => handleFilterChange("channels", value)}
              isLoading={channelsLoading}
              placeholder="Seçiniz"
            />
          </div>
        </Col>
        
        {/* Filter Actions */}
        <Col md={3} className="d-flex align-items-end">
          <div className="w-100 d-flex gap-2">
            <Button
              color="primary"
              className="w-100"
              onClick={handleFilterSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Filtreleniyor..." : "FİLTRELE"}
            </Button>
            
            <Button
              className="w-100"
              style={{ backgroundColor: "#6ADA7D", color: "white", border: "none" }}
              id="create-btn"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const event = new CustomEvent('AccountsAddClick');
                  window.dispatchEvent(event);
                }
              }}
            >
              <i className="ri-add-line align-bottom me-1"></i> Ekle
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AccountFilter; 