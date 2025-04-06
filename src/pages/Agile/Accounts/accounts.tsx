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
  GET_SEGMENTS
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
  accountType: SelectOption | null;
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
    accountType: null
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
  const [accountTypeOptions] = useState<SelectOption[]>([
    { value: "individual", label: "Bireysel" },
    { value: "corporate", label: "Kurumsal" }
  ]);
  
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

  // Function to load all necessary options for the filter
  const loadFilterOptions = async () => {
    if (optionsLoadedRef.current) return;
    
    try {
      // Start loading options
      await Promise.all([
        getUsersLookup(),
        getCountriesLookup(),
        getSegmentsLookup()
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
  
  // Load filter options when component mounts or becomes visible
  useEffect(() => {
    if (show && !optionsLoadedRef.current) {
      loadFilterOptions();
    }
  }, [show]);
  
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
      const accountType = params.get("accountType") || null;
      
      // Update filters with URL values
      setFilters(prev => ({
        ...prev,
        searchText
      }));
      
      // Mark as loaded from URL
      filtersLoadedFromUrl.current = true;
      
      // Load the options and then set the selected values
      loadFilterOptions().then(() => {
        // Set dates if they exist
        if (startDate || endDate) {
          setFilters(prev => ({
            ...prev,
            startDate,
            endDate
          }));
        }
        
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
        
        // Set account type if selected
        if (accountType && accountTypeOptions.length > 0) {
          const selectedAccountType = accountTypeOptions.find(type => 
            type.value === accountType
          );
          
          setFilters(prev => ({
            ...prev,
            accountType: selectedAccountType || null
          }));
        }
      });
    }
  }, [location.search, userOptions, countryOptions, cityOptions, segmentOptions]);
  
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
      
      // Log filter values before applying
      console.log("Applying filters:", filters);
      
      // Apply the filters
      await onFilterApply(filters);
      
      // Close the filter panel
      onCloseClick();
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Filtreler uygulanırken bir hata oluştu");
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
        accountType: null
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
  const isLoading = usersLoading || countriesLoading || citiesLoading || segmentsLoading;
  
  // Render the filter component
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
          <Col md={5}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted fw-semibold d-block">
                EKLENME TARİHİ
              </Label>
              <div className="d-flex gap-2">
                <Flatpickr
                  className="form-control"
                  placeholder="Başlangıç Tarihi"
                  value={filters.startDate ? [filters.startDate] : []}
                  onChange={(dates) => {
                    handleFilterChange("startDate", dates.length > 0 ? dates[0] : null);
                  }}
                  options={{
                    dateFormat: "d/m/Y",
                    allowInput: true,
                    disableMobile: true
                  }}
                />
                <Flatpickr
                  className="form-control"
                  placeholder="Bitiş Tarihi"
                  value={filters.endDate ? [filters.endDate] : []}
                  onChange={(dates) => {
                    handleFilterChange("endDate", dates.length > 0 ? dates[0] : null);
                  }}
                  options={{
                    dateFormat: "d/m/Y",
                    allowInput: true,
                    disableMobile: true
                  }}
                />
              </div>
            </div>
          </Col>
          <Col md={2}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                HESAP TİPİ
              </Label>
              <Select
                options={accountTypeOptions}
                isClearable
                value={filters.accountType}
                onChange={(selected: SelectOption | null) => handleFilterChange("accountType", selected)}
                placeholder="Seçiniz"
                className="w-100"
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
                  const event = new CustomEvent('AccountsAddClick');
                  window.dispatchEvent(event);
                }
              }}
              aria-label="Hesap Ekle"
            >
              <i className="ri-add-line align-bottom me-1"></i> Ekle
            </Button>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                SEGMENT
              </Label>
              <Select
                options={segmentOptions}
                isMulti
                value={filters.segments}
                onChange={(selected: readonly SelectOption[] | null) => handleFilterChange("segments", selected || [])}
                placeholder="Seçiniz"
                isClearable
                className="w-100"
                isLoading={segmentsLoading}
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
          <Col md={4}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                ÜLKE
              </Label>
              <div className="d-flex gap-2">
                <div className="flex-grow-1">
                  <Select
                    options={countryOptions}
                    isClearable
                    value={filters.country}
                    onChange={(selected: SelectOption | null) => handleFilterChange("country", selected)}
                    placeholder="Ülke Seçiniz"
                    isLoading={countriesLoading}
                    className="w-100"
                  />
                </div>
                <div className="flex-grow-1">
                  <Select
                    options={cityOptions}
                    isMulti
                    isClearable
                    value={filters.cities}
                    onChange={(selected: readonly SelectOption[] | null) => handleFilterChange("cities", selected || [])}
                    placeholder="Şehir Seçiniz"
                    isLoading={citiesLoading}
                    className="w-100"
                    isDisabled={!filters.country}
                  />
                </div>
              </div>
            </div>
          </Col>
          <Col md={2} className="text-end align-self-end">
            <Button 
              className="px-4"
              style={{ backgroundColor: "#5EA3CB", color: "white", border: "none" }}
              onClick={handleFilterSubmit}
              disabled={isSubmitting}
              aria-label="Filtreleri Uygula"
            >
              {isSubmitting ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              ) : null}
              FİLTRELE
            </Button>
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default AccountFilter; 