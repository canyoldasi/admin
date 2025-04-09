import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Spinner
} from "reactstrap";
import Select from "react-select";
import { useLazyQuery, useMutation } from "@apollo/client";
import { toast } from "react-toastify";
import { 
  GET_COUNTRIES, 
  GET_CITIES, 
  GET_DISTRICTS, 
  GET_COUNTIES,
  GET_USERS_LOOKUP,
  GET_SEGMENTS,
  GET_ACCOUNT_TYPES,
  GET_CHANNELS_LOOKUP
} from "../../../graphql/queries/accountQueries";
import { CREATE_ACCOUNT, UPDATE_ACCOUNT } from "../../../graphql/mutations/accountMutations";
import { SelectOption } from "../../../types/graphql";
import { getAuthHeader } from "../../../helpers/jwt-token-access/accessToken";
import { gql } from "@apollo/client";
import axios from "axios";

// Helper function to convert empty strings to null for GraphQL
const nullIfEmpty = (value: string | null | undefined) => {
  // If the value is undefined, null, or an empty string, return null
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

// Define prop types
interface AccountFormModalProps {
  isOpen: boolean;
  toggle: () => void;
  account?: any; // If provided, we're in edit mode
  title: string;
  submitText: string;
  onSubmit: (accountData: any) => void;
  validation: any;
  isSubmitting: boolean;
}

// State for form data
interface FormDataType {
  personType: { value: string; label: string };
  accountTypes: Array<{ value: string; label: string }>;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phone2: string;
  gender: { value: string | null; label: string } | null;
  taxNumber: string;
  taxOffice: string;
  nationalIdNumber: string;
  country: { value: string; label: string } | null;
  city: { value: string; label: string } | null;
  county: { value: string; label: string } | null;
  district: { value: string; label: string } | null;
  address: string;
  postalCode: string;
  accountNumber: string;
  notes: string;
  assignedUser: { value: string; label: string } | null;
  segments: Array<{ value: string; label: string }>;
  channel: { value: string; label: string } | null;
}

const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  toggle,
  account,
  title,
  submitText,
  onSubmit,
  validation,
  isSubmitting
}) => {
  // State for form data
  const [formData, setFormData] = useState<FormDataType>({
    personType: { value: "CORPORATE", label: "Kurumsal" },
    accountTypes: [],
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phone2: "",
    gender: null,
    taxNumber: "",
    taxOffice: "",
    nationalIdNumber: "",
    country: null,
    city: null,
    county: null,
    district: null,
    address: "",
    postalCode: "",
    accountNumber: "",
    notes: "",
    assignedUser: null,
    segments: [],
    channel: null
  });

  // Create a default initial state to use for resets
  const initialFormState: FormDataType = {
    personType: { value: "CORPORATE", label: "Kurumsal" },
    accountTypes: [],
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phone2: "",
    gender: null,
    taxNumber: "",
    taxOffice: "",
    nationalIdNumber: "",
    country: null,
    city: null,
    county: null,
    district: null,
    address: "",
    postalCode: "",
    accountNumber: "",
    notes: "",
    assignedUser: null,
    segments: [],
    channel: null
  };

  // Function to reset the form to initial state
  const resetForm = () => {
    console.log("Resetting form data to initial state");
    setFormData({...initialFormState});
    setValidationErrors({});
  };

  // Custom toggle function that also resets form state
  const handleToggle = () => {
    resetForm();
    toggle();
  };

  // Add a flag to track if we're loading location data programmatically
  const [isLoadingLocationData, setIsLoadingLocationData] = useState(false);

  // State for all the select options
  const [personTypeOptions] = useState([
    { value: "INDIVIDUAL", label: "Bireysel" },
    { value: "CORPORATE", label: "Kurumsal" }
  ]);
  
  const [accountTypeOptions, setAccountTypeOptions] = useState<SelectOption[]>([]);
  
  const [genderOptions] = useState([
    { value: null, label: "" },
    { value: "MALE", label: "Erkek" },
    { value: "FEMALE", label: "Kadın" }
  ]);
  
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [segmentOptions, setSegmentOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);

  // Add state for validation errors
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Queries for loading options
  const [getCountriesQuery, { loading: countriesLoading }] = useLazyQuery(GET_COUNTRIES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getCountries) {
        const options = data.getCountries.map((country: any) => ({
          value: country.id,
          label: country.name
        }));
        setCountryOptions(options);
        
        // Pre-select Turkey if available
        const turkey = options.find((opt: SelectOption) => 
          opt.label.toLowerCase() === "türkiye" || opt.label.toLowerCase() === "turkey"
        );
        
        if (turkey && !formData.country) {
          handleSelect("country", turkey);
        }
      }
    },
    onError: (error) => {
      console.error("Error fetching countries:", error);
      toast.error("Ülkeler yüklenirken bir hata oluştu");
    }
  });

  const [getCitiesQuery, { loading: citiesLoading }] = useLazyQuery(GET_CITIES, {
    fetchPolicy: "network-only",
    variables: { countryId: formData.country?.value || "" },
    onCompleted: (data) => {
      if (data?.getCities) {
        const options = data.getCities.map((city: any) => ({
          value: city.id,
          label: city.name
        }));
        setCityOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching cities:", error);
      toast.error("Şehirler yüklenirken bir hata oluştu");
    }
  });

  const [getCountiesQuery, { loading: countiesLoading }] = useLazyQuery(GET_COUNTIES, {
    fetchPolicy: "network-only",
    variables: { cityId: formData.city?.value || "" },
    onCompleted: (data) => {
      if (data?.getCounties) {
        const options = data.getCounties.map((county: any) => ({
          value: county.id,
          label: county.name
        }));
        setCountyOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching counties:", error);
      toast.error("İlçeler yüklenirken bir hata oluştu");
    }
  });

  const [getDistrictsQuery, { loading: districtsLoading }] = useLazyQuery(GET_DISTRICTS, {
    fetchPolicy: "network-only",
    variables: { countyId: formData.county?.value || "" },
    onCompleted: (data) => {
      if (data?.getDistricts) {
        const options = data.getDistricts.map((district: any) => ({
          value: district.id,
          label: district.name
        }));
        setDistrictOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching districts:", error);
      toast.error("Mahalleler yüklenirken bir hata oluştu");
    }
  });

  const [getUsersQuery, { loading: usersLoading }] = useLazyQuery(GET_USERS_LOOKUP, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getUsersLookup?.items) {
        const options = data.getUsersLookup.items.map((user: any) => ({
          value: user.id,
          label: user.fullName
        }));
        setUserOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching users:", error);
      toast.error("Kullanıcılar yüklenirken bir hata oluştu");
    }
  });

  const [getSegmentsQuery, { loading: segmentsLoading }] = useLazyQuery(GET_SEGMENTS, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getSegmentsLookup) {
        const options = data.getSegmentsLookup.map((segment: any) => ({
          value: segment.id,
          label: segment.name
        }));
        setSegmentOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching segments:", error);
      toast.error("Segmentler yüklenirken bir hata oluştu");
    }
  });

  const [getAccountTypesQuery, { loading: accountTypesLoading }] = useLazyQuery(GET_ACCOUNT_TYPES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getAccountTypesLookup) {
        const options = data.getAccountTypesLookup.map((type: any) => ({
          value: type.id,
          label: type.name
        }));
        setAccountTypeOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching account types:", error);
      toast.error("Hesap tipleri yüklenirken bir hata oluştu");
    }
  });

  const [getChannelsQuery, { loading: channelsLoading }] = useLazyQuery(GET_CHANNELS_LOOKUP, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getChannelsLookup) {
        const options = data.getChannelsLookup.map((channel: any) => ({
          value: channel.id,
          label: channel.name
        }));
        setChannelOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching channels:", error);
      toast.error("Kanallar yüklenirken bir hata oluştu");
    }
  });

  // Create or update account mutation
  const [createAccountMutation, { loading: createLoading }] = useMutation(
    CREATE_ACCOUNT,
    {
      onCompleted: (data) => {
        if (data && data.createAccount) {
          // Only show success and close modal if we have valid data
          toast.success("Hesap başarıyla oluşturuldu");
          toggle();
          
          // Create a deep copy to avoid immutability issues
          const accountCopy = { ...data.createAccount };
          
          // Pass back to parent without waiting for locations
          onSubmit(accountCopy);
        } else {
          // If we get here with no data, something went wrong
          console.error("Create account returned no data");
          toast.error("Hesap oluşturulurken bir hata oluştu");
        }
      },
      onError: (error) => {
        console.error("Error creating account:", error);
        handleMutationError(error, "oluşturulurken");
        // Don't toggle/close the modal on error
      }
    }
  );
  
  const [updateAccountMutation, { loading: updateLoading }] = useMutation(
    UPDATE_ACCOUNT,
    {
      onCompleted: (data) => {
        if (data && data.updateAccount) {
          // Only show success and close modal if we have valid data
          toast.success("Hesap başarıyla güncellendi");
          toggle();
          
          // Create a deep copy to avoid immutability issues
          const accountCopy = { ...data.updateAccount };
          
          // Pass back to parent without waiting for locations
          onSubmit(accountCopy);
        } else {
          // If we get here with no data, something went wrong
          console.error("Update account returned no data");
          toast.error("Hesap güncellenirken bir hata oluştu");
        }
      },
      onError: (error) => {
        console.error("Error updating account:", error);
        handleMutationError(error, "güncellenirken");
        // Don't toggle/close the modal on error
      }
    }
  );
  
  // Helper function to handle mutation errors
  const handleMutationError = (error: any, action: string) => {
    // Get the full error message for debugging
    const errorDetail = error.graphQLErrors && error.graphQLErrors.length > 0 
      ? error.graphQLErrors[0].extensions 
      : error;
    console.error(`Detailed error (${action}):`, JSON.stringify(errorDetail, null, 2));
    
    // Extract any specific error messages from the GraphQL response
    let errorMessage = "";
    if (error.graphQLErrors && error.graphQLErrors.length > 0) {
      const graphQLError = error.graphQLErrors[0];
      errorMessage = graphQLError.message || "";
      
      // Check if there are any detailed error messages in the extensions
      if (graphQLError.extensions && graphQLError.extensions.exception && graphQLError.extensions.exception.response) {
        const response = graphQLError.extensions.exception.response;
        if (response.message && Array.isArray(response.message)) {
          // Join all error messages
          errorMessage = response.message.join(", ");
        }
      }
    }
    
    // Check for unique constraint error
    if (error.message && error.message.includes("duplicate key")) {
      // Extract field name from error message if possible
      let errorField = "field";
      let constraintErrorMessage = "Bu bilgilerle kayıtlı bir hesap zaten mevcut.";
      
      const errorText = error.message.toLowerCase();
      
      if (errorText.includes("email")) {
        errorField = "email";
        constraintErrorMessage = "Bu e-posta adresi ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("nationalid") || errorText.includes("national_id")) {
        errorField = "nationalIdNumber";
        constraintErrorMessage = "Bu TC kimlik numarası ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("taxnumber") || errorText.includes("tax_number")) {
        errorField = "taxNumber";
        constraintErrorMessage = "Bu vergi numarası ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("phone")) {
        errorField = "phone";
        constraintErrorMessage = "Bu telefon numarası ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("no")) {
        errorField = "accountNumber";
        constraintErrorMessage = "Bu hesap numarası ile kayıtlı bir hesap zaten mevcut.";
      } else {
        // Try to get more specific field from the constraint name
        if (errorText.includes("uq_") && errorText.includes("_")) {
          // Extract field from constraint name (UQ_fieldname)
          try {
            const constraintParts = errorText.match(/uq_[a-z0-9_]+/i);
            if (constraintParts && constraintParts[0]) {
              // Log the constraint for debugging
              console.log("Constraint match:", constraintParts[0]);
            }
          } catch (e) {
            console.error("Error parsing constraint name:", e);
          }
        }
      }
      
      setValidationErrors(prev => ({ ...prev, [errorField]: constraintErrorMessage }));
      toast.error(constraintErrorMessage);
    } else {
      // Use the extracted detailed message or fallback to the general error message
      const finalErrorMessage = errorMessage || `Hesap ${action} bir hata oluştu: ${error.message}`;
      toast.error(finalErrorMessage);
    }
  };

  // Load options when modal opens
  useEffect(() => {
    if (isOpen) {
      getCountriesQuery();
      getUsersQuery();
      getSegmentsQuery();
      getAccountTypesQuery();
      getChannelsQuery();
      
      // If we're in edit mode, load the account data
      if (account) {
        console.log("AccountFormModal - Loading account data for edit mode:", account);
        populateFormWithAccount(account);
      } else {
        // If adding a new account, ensure form is reset
        resetForm();
      }
    }
  }, [isOpen, account]);  // Add account to dependencies to refresh when it changes

  // Reset form data when the modal is closed
  useEffect(() => {
    if (!isOpen) {
      console.log("Modal closed, resetting form data");
      // Reset to initial form state
      setFormData({
        personType: { value: "CORPORATE", label: "Kurumsal" },
        accountTypes: [],
        name: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        phone2: "",
        gender: null,
        taxNumber: "",
        taxOffice: "",
        nationalIdNumber: "",
        country: null,
        city: null,
        county: null,
        district: null,
        address: "",
        postalCode: "",
        accountNumber: "",
        notes: "",
        assignedUser: null,
        segments: [],
        channel: null
      });
      
      // Reset validation errors
      setValidationErrors({});
    }
  }, [isOpen]);

  // Function to populate form with account data in edit mode
  const populateFormWithAccount = (accountData: any) => {
    try {
      console.log("Populating form with account data:", accountData);
      
      // Create a deep copy of the account data to avoid immutability issues
      const accountCopy = JSON.parse(JSON.stringify(accountData));
      
      // Set loading flag immediately to prevent field clearing
      setIsLoadingLocationData(true);
      
      // Preload all necessary reference data first
      const preloadReferenceData = async () => {
        try {
          // First load countries
          if (countryOptions.length === 0) {
            console.log("Loading countries list");
            await getCountriesQuery();
          }
          
          // Load cities, counties, and districts if location data is present
          if (accountCopy.country?.id) {
            console.log("Preloading cities for country:", accountCopy.country.id);
            await getCitiesQuery({
              variables: { countryId: accountCopy.country.id },
              fetchPolicy: "network-only"
            });
            
            if (accountCopy.city?.id) {
              console.log("Preloading counties for city:", accountCopy.city.id);
              await getCountiesQuery({
                variables: { cityId: accountCopy.city.id },
                fetchPolicy: "network-only"
              });
              
              if (accountCopy.county?.id) {
                console.log("Preloading districts for county:", accountCopy.county.id);
                await getDistrictsQuery({
                  variables: { countyId: accountCopy.county.id },
                  fetchPolicy: "network-only"
                });
              }
            }
          }
          
          // Preload other reference data if needed
          if (accountCopy.accountTypes?.length > 0 && accountTypeOptions.length === 0) {
            console.log("Loading account types");
            await getAccountTypesQuery();
          }
          
          if (accountCopy.segments?.length > 0 && segmentOptions.length === 0) {
            console.log("Loading segments");
            await getSegmentsQuery();
          }
          
          if (accountCopy.channel && channelOptions.length === 0) {
            console.log("Loading channels");
            await getChannelsQuery();
          }
          
          if (accountCopy.assignedUser && userOptions.length === 0) {
            console.log("Loading users");
            await getUsersQuery();
          }
          
          // Now that all reference data is loaded, populate the form
          populateFormFields(accountCopy);
        } catch (error) {
          console.error("Error preloading reference data:", error);
          toast.error("Referans verileri yüklenirken bir hata oluştu");
        } finally {
          // Delay setting isLoadingLocationData to false to ensure form state is stable
          setTimeout(() => {
            setIsLoadingLocationData(false);
          }, 500);
        }
      };
      
      // Function to populate individual form fields after reference data is loaded
      const populateFormFields = (accountCopy: any) => {
        // Create a new form data object to avoid partial updates
        const newFormData = { ...formData };
        
        // Fill in location fields first to ensure they're set before other dependencies
        if (accountCopy.country) {
          newFormData.country = {
            value: typeof accountCopy.country === 'object' ? accountCopy.country.id : accountCopy.country,
            label: typeof accountCopy.country === 'object' ? accountCopy.country.name : "Unknown"
          };
        }
        
        if (accountCopy.city) {
          newFormData.city = {
            value: typeof accountCopy.city === 'object' ? accountCopy.city.id : accountCopy.city,
            label: typeof accountCopy.city === 'object' ? accountCopy.city.name : "Unknown"
          };
        }
        
        if (accountCopy.county) {
          newFormData.county = {
            value: typeof accountCopy.county === 'object' ? accountCopy.county.id : accountCopy.county,
            label: typeof accountCopy.county === 'object' ? accountCopy.county.name : "Unknown"
          };
        }
        
        if (accountCopy.district) {
          newFormData.district = {
            value: typeof accountCopy.district === 'object' ? accountCopy.district.id : accountCopy.district,
            label: typeof accountCopy.district === 'object' ? accountCopy.district.name : "Unknown"
          };
        }
        
        // Basic fields
        newFormData.name = accountCopy.name || "";
        newFormData.firstName = accountCopy.firstName || "";
        newFormData.lastName = accountCopy.lastName || "";
        newFormData.email = accountCopy.email || "";
        newFormData.phone = accountCopy.phone || "";
        newFormData.phone2 = accountCopy.phone2 || "";
        newFormData.taxNumber = accountCopy.taxNumber || "";
        newFormData.taxOffice = accountCopy.taxOffice || "";
        newFormData.nationalIdNumber = accountCopy.nationalId || "";
        newFormData.address = accountCopy.address || "";
        newFormData.postalCode = accountCopy.postalCode || "";
        newFormData.notes = accountCopy.note || "";
        
        // Select fields
        if (accountCopy.personType) {
          newFormData.personType = personTypeOptions.find(
            opt => opt.value === accountCopy.personType
          ) || personTypeOptions[0];
        }
        
        if (accountCopy.gender) {
          newFormData.gender = genderOptions.find(
            opt => opt.value === accountCopy.gender
          ) || null;
          
          console.log("Setting gender from account data:", accountCopy.gender);
          console.log("Mapped gender option:", newFormData.gender);
        }
        
        if (accountCopy.accountTypes && accountCopy.accountTypes.length > 0) {
          newFormData.accountTypes = accountCopy.accountTypes.map((type: any) => ({
            value: type.id,
            label: type.name
          }));
        }
        
        if (accountCopy.segments && accountCopy.segments.length > 0) {
          newFormData.segments = accountCopy.segments.map((segment: any) => ({
            value: segment.id,
            label: segment.name
          }));
        }
        
        if (accountCopy.assignedUser) {
          newFormData.assignedUser = {
            value: accountCopy.assignedUser.id,
            label: accountCopy.assignedUser.fullName
          };
        }
        
        if (accountCopy.channel) {
          newFormData.channel = {
            value: typeof accountCopy.channel === 'object' ? accountCopy.channel.id : accountCopy.channel,
            label: typeof accountCopy.channel === 'object' ? accountCopy.channel.name : "Unknown"
          };
          console.log("Setting channel value:", newFormData.channel);
        }
        
        console.log("Final form data:", newFormData);
        
        // Set the complete form data at once to avoid partial updates
        setFormData(newFormData);
      };
      
      // Start preloading data and populating form
      preloadReferenceData();
    } catch (error) {
      console.error("Error populating form with account data:", error);
      toast.error("Hesap verileri yüklenirken bir hata oluştu");
      setIsLoadingLocationData(false);
    }
  };

  // Load cities when country changes
  useEffect(() => {
    if (formData.country?.value) {
      console.log("Country changed, loading cities. isLoadingLocationData:", isLoadingLocationData);
      getCitiesQuery({
        variables: { countryId: formData.country.value }
      });
      
      // Only clear dependent fields if this is a user action (not programmatic loading)
      if (!isLoadingLocationData && formData.city) {
        console.log("User changed country, clearing dependent fields");
        setFormData(prev => ({ ...prev, city: null, county: null, district: null }));
      }
    } else if (!isLoadingLocationData) {
      setCityOptions([]);
      setFormData(prev => ({ ...prev, city: null, county: null, district: null }));
    }
  }, [formData.country]);

  // Load counties when city changes
  useEffect(() => {
    if (formData.city?.value) {
      console.log("City changed, loading counties. isLoadingLocationData:", isLoadingLocationData);
      getCountiesQuery({
        variables: { cityId: formData.city.value }
      });
      
      // Only clear dependent fields if this is a user action (not programmatic loading)
      if (!isLoadingLocationData && formData.county) {
        console.log("User changed city, clearing dependent fields");
        setFormData(prev => ({ ...prev, county: null, district: null }));
      }
    } else if (!isLoadingLocationData) {
      setCountyOptions([]);
      setDistrictOptions([]);
      setFormData(prev => ({ ...prev, county: null, district: null }));
    }
  }, [formData.city]);

  // Load districts when county changes
  useEffect(() => {
    if (formData.county?.value) {
      console.log("County changed, loading districts. isLoadingLocationData:", isLoadingLocationData);
      getDistrictsQuery({
        variables: { countyId: formData.county.value }
      });
      
      // Only clear dependent fields if this is a user action (not programmatic loading)
      if (!isLoadingLocationData && formData.district) {
        console.log("User changed county, clearing district");
        setFormData(prev => ({ ...prev, district: null }));
      }
    } else if (!isLoadingLocationData) {
      setDistrictOptions([]);
      setFormData(prev => ({ ...prev, district: null }));
    }
  }, [formData.county]);

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Add TypeScript type annotations for Select onChange handlers
  const handleSelect = (field: string, selected: SelectOption | null) => {
    handleInputChange(field, selected);
  };

  const handleMultiSelect = (field: string, selected: SelectOption[] | null) => {
    handleInputChange(field, selected || []);
  };

  // Handle text input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    handleInputChange(name, value);
  };

  // Validate form fields
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Validate based on person type
    if (formData.personType.value === "INDIVIDUAL") {
      // For individual accounts, require firstName and lastName
      if (!formData.firstName || formData.firstName.trim() === "") {
        errors.firstName = "Ad alanı zorunludur";
      }
      
      if (!formData.lastName || formData.lastName.trim() === "") {
        errors.lastName = "Soyad alanı zorunludur";
      }
    } else {
      // For corporate accounts, require name
      if (!formData.name || formData.name.trim() === "") {
        errors.name = "Tam ad alanı zorunludur";
      }
    }
    
    // Required fields for both types
    if (formData.phone && !formData.phone.trim().match(/^\+?[0-9\s\-()]+$/)) {
      errors.phone = "Geçerli bir telefon numarası giriniz";
    }
    
    if (formData.email && !formData.email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = "Geçerli bir e-posta adresi giriniz";
    }
    
    // Set validation errors
    setValidationErrors(errors);
    
    // Return whether form is valid
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error("Lütfen form alanlarını kontrol ediniz");
      return;
    }
    
    try {
      // Set loading state
      const setIsLoading = (isLoading: boolean) => {
        // No-op as isLoading is calculated from other loading states
      };
      
      console.log("Submitting form with data:", formData);
      
      // Prepare the account data for saving - ensure field names match the API
      const accountData: any = {
        personType: formData.personType.value,
        firstName: nullIfEmpty(formData.firstName),
        lastName: nullIfEmpty(formData.lastName),
        email: nullIfEmpty(formData.email),
        phone: nullIfEmpty(formData.phone),
        phone2: nullIfEmpty(formData.phone2),
        taxNumber: nullIfEmpty(formData.taxNumber),
        taxOffice: nullIfEmpty(formData.taxOffice),
        nationalId: nullIfEmpty(formData.nationalIdNumber),
        address: nullIfEmpty(formData.address),
        postalCode: nullIfEmpty(formData.postalCode),
        note: nullIfEmpty(formData.notes),
        // Add gender field
        gender: formData.gender?.value || null,
      };
      
      // Set the name field based on person type
      if (formData.personType.value === "INDIVIDUAL") {
        // For individual accounts, combine firstName and lastName
        const firstName = formData.firstName || "";
        const lastName = formData.lastName || "";
        accountData.name = (firstName + " " + lastName).trim();
        
        // If combined name is empty, use a default value
        if (!accountData.name) {
          accountData.name = "Unnamed Individual";
        }
      } else {
        // For corporate accounts, use the name field directly
        accountData.name = nullIfEmpty(formData.name) || "Unnamed Organization";
      }
      
      // Add multi-select fields
      if (formData.accountTypes && formData.accountTypes.length > 0) {
        accountData.accountTypeIds = formData.accountTypes.map((type: any) => type.value);
      }
      
      if (formData.segments && formData.segments.length > 0) {
        accountData.segmentIds = formData.segments.map((segment: any) => segment.value);
      }
      
      // Add relation fields
      if (formData.assignedUser) {
        accountData.assignedUserId = nullIfEmpty(formData.assignedUser.value);
      }
      
      if (formData.channel) {
        accountData.channelId = nullIfEmpty(formData.channel.value);
      }
      
      // Add location fields directly to the account (not as locations array)
      if (formData.country) accountData.countryId = nullIfEmpty(formData.country.value);
      if (formData.city) accountData.cityId = nullIfEmpty(formData.city.value);
      if (formData.county) accountData.countyId = nullIfEmpty(formData.county.value);
      if (formData.district) accountData.districtId = nullIfEmpty(formData.district.value);
      
      // Debug logging
      console.log("Gender value being sent:", formData.gender?.value);
      console.log("Channel value being sent:", formData.channel?.value);
      console.log("Full accountData being sent to API:", accountData);
      
      // Use the appropriate mutation based on whether we're creating or updating
      if (account) {
        // Update existing account
        await updateAccountMutation({
          variables: { 
            input: {
              id: account.id,
              ...accountData
            }
          },
          context: {
            headers: {
              Authorization: getAuthHeader()
            }
          }
        });
        
        // Callback is handled in the mutation's onCompleted
      } else {
        // Create new account
        const { data } = await createAccountMutation({
          variables: { 
            input: accountData 
          },
          context: {
            headers: {
              Authorization: getAuthHeader()
            }
          }
        });
        
        // Callback is handled in the mutation's onCompleted
      }
      
      // Modal closing is handled in the mutation callbacks now
    } catch (error: any) {
      console.error("Error saving account:", error);
      // Show error toast for unhandled exceptions
      toast.error(`Hesap kaydedilirken bir hata oluştu: ${error.message}`);
    }
  };

  // Determine if form is in loading state
  const isLoading = countriesLoading || citiesLoading || districtsLoading || 
                   accountTypesLoading || createLoading || updateLoading || 
                   isSubmitting || channelsLoading;

  // Add a function to highlight potential error fields based on the error message
  const highlightErrorFields = (error: any) => {
    const errorMessage = error?.message || "";
    
    // Set up an object to track which fields might be causing the error
    const errorFields = {
      email: false,
      phone: false,
      taxNumber: false,
      nationalId: false
    };
    
    // Check for duplicate key errors
    if (errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
      // Try to identify which field is causing the issue
      if (errorMessage.includes("email")) {
        errorFields.email = true;
      }
      if (errorMessage.includes("phone")) {
        errorFields.phone = true;
      }
      if (errorMessage.includes("tax") || errorMessage.includes("UQ_4c8f96ccf523e9a3faefd5bdd4c")) {
        errorFields.taxNumber = true;
      }
      if (errorMessage.includes("national") || errorMessage.includes("UQ_4c8f96ccf523e9a3faefd5bdd4c")) {
        errorFields.nationalId = true;
      }
      
      // If no specific field was identified, highlight all potential unique fields
      if (!Object.values(errorFields).some(value => value)) {
        errorFields.email = true;
        errorFields.phone = true;
        errorFields.taxNumber = true;
        errorFields.nationalId = true;
      }
    }
    
    return errorFields;
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={handleToggle}
      backdrop="static"
      size="lg"
    >
      <ModalHeader toggle={handleToggle}>
        {title || (account ? "Hesap Düzenle" : "Yeni Hesap")}
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="personType">
                  Kişi Türü
                </Label>
                <Select
                  id="personType"
                  options={personTypeOptions}
                  value={formData.personType}
                  onChange={(selected: SelectOption) => handleSelect("personType", selected)}
                  placeholder="Seçiniz"
                  isSearchable
                  className="mb-3"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="accountTypes">
                  Hesap Tipi
                </Label>
                <Select
                  id="accountTypes"
                  options={accountTypeOptions}
                  value={formData.accountTypes}
                  onChange={(selected: SelectOption[] | null) => handleMultiSelect("accountTypes", selected)}
                  placeholder="Seçiniz"
                  isMulti
                  isSearchable
                  className="mb-3"
                  isLoading={accountTypesLoading}
                />
              </FormGroup>
            </Col>
          </Row>

          {formData.personType.value === "INDIVIDUAL" ? (
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="firstName">
                    Adı
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleTextChange}
                    placeholder="Adı giriniz"
                    className={`mb-3 ${validationErrors.firstName ? 'is-invalid' : ''}`}
                  />
                  {validationErrors.firstName && (
                    <div className="invalid-feedback">{validationErrors.firstName}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="lastName">
                    Soyadı
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleTextChange}
                    placeholder="Soyadı giriniz"
                    className={`mb-3 ${validationErrors.lastName ? 'is-invalid' : ''}`}
                  />
                  {validationErrors.lastName && (
                    <div className="invalid-feedback">{validationErrors.lastName}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>
          ) : (
            <FormGroup>
              <Label for="name">
                Tam Adı
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleTextChange}
                placeholder="Tam adı giriniz"
                className={`mb-3 ${validationErrors.name ? 'is-invalid' : ''}`}
              />
              {validationErrors.name && (
                <div className="invalid-feedback">{validationErrors.name}</div>
              )}
            </FormGroup>
          )}

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="email">
                  E-posta
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleTextChange}
                  placeholder="E-posta adresi giriniz"
                  className={`mb-3 ${validationErrors.email ? 'is-invalid' : ''}`}
                />
                {validationErrors.email && (
                  <div className="invalid-feedback">{validationErrors.email}</div>
                )}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="phone">
                  Telefon
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleTextChange}
                  placeholder="Telefon numarası giriniz"
                  className={`mb-3 ${validationErrors.phone ? 'is-invalid' : ''}`}
                />
                {validationErrors.phone && (
                  <div className="invalid-feedback">{validationErrors.phone}</div>
                )}
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="phone2">
                  Telefon 2
                </Label>
                <Input
                  id="phone2"
                  name="phone2"
                  type="text"
                  value={formData.phone2}
                  onChange={handleTextChange}
                  placeholder="İkinci telefon numarası (opsiyonel)"
                  className="mb-3"
                />
              </FormGroup>
            </Col>
            {/* Gender field - only shown for Individual */}
            {formData.personType.value === "INDIVIDUAL" && (
              <Col md={6}>
                <FormGroup>
                  <Label for="gender">
                    Cinsiyet
                  </Label>
                  <Select
                    id="gender"
                    options={genderOptions}
                    value={formData.gender}
                    onChange={(selected: SelectOption | null) => handleSelect("gender", selected)}
                    placeholder="Seçiniz"
                    isClearable
                    isSearchable
                    className="mb-3"
                  />
                </FormGroup>
              </Col>
            )}
          </Row>

          {/* Tax fields rendered conditionally */}
          <Row>
            {/* Tax Number - only shown for Corporate */}
            {formData.personType.value === "CORPORATE" && (
              <Col md={6}>
                <FormGroup>
                  <Label for="taxNumber">
                    Vergi No
                  </Label>
                  <Input
                    id="taxNumber"
                    name="taxNumber"
                    type="text"
                    value={formData.taxNumber}
                    onChange={handleTextChange}
                    placeholder="Vergi numarası giriniz"
                    className={`mb-3 ${validationErrors.taxNumber ? 'is-invalid' : ''}`}
                  />
                  {validationErrors.taxNumber && (
                    <div className="invalid-feedback">{validationErrors.taxNumber}</div>
                  )}
                </FormGroup>
              </Col>
            )}

            {/* Tax Office - only shown for Corporate */}
            {formData.personType.value === "CORPORATE" && (
              <Col md={6}>
                <FormGroup>
                  <Label for="taxOffice">
                    Vergi Dairesi
                  </Label>
                  <Input
                    id="taxOffice"
                    name="taxOffice"
                    type="text"
                    value={formData.taxOffice}
                    onChange={handleTextChange}
                    placeholder="Vergi dairesi giriniz"
                    className="mb-3"
                  />
                </FormGroup>
              </Col>
            )}
          </Row>

          {/* TC Kimlik No - only shown for Individual */}
          {formData.personType.value === "INDIVIDUAL" && (
            <FormGroup>
              <Label for="nationalIdNumber">
                T.C. Kimlik No
              </Label>
              <Input
                id="nationalIdNumber"
                name="nationalIdNumber"
                type="text"
                value={formData.nationalIdNumber}
                onChange={handleTextChange}
                placeholder="T.C. Kimlik numarası giriniz"
                className={`mb-3 ${validationErrors.nationalIdNumber ? 'is-invalid' : ''}`}
              />
              {validationErrors.nationalIdNumber && (
                <div className="invalid-feedback">{validationErrors.nationalIdNumber}</div>
              )}
            </FormGroup>
          )}

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="country">
                  Ülke
                </Label>
                <Select
                  id="country"
                  options={countryOptions}
                  value={formData.country}
                  onChange={(selected: SelectOption | null) => handleSelect("country", selected)}
                  placeholder="Seçiniz"
                  isClearable
                  isSearchable
                  isLoading={countriesLoading}
                  className="mb-3"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="city">
                  Şehir
                </Label>
                <Select
                  id="city"
                  options={cityOptions}
                  value={formData.city}
                  onChange={(selected: SelectOption | null) => handleSelect("city", selected)}
                  placeholder="Seçiniz"
                  isClearable
                  isSearchable
                  isLoading={citiesLoading}
                  isDisabled={!formData.country}
                  className="mb-3"
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="county">
                  İlçe
                </Label>
                <Select
                  id="county"
                  options={countyOptions}
                  value={formData.county}
                  onChange={(selected: SelectOption | null) => handleSelect("county", selected)}
                  placeholder="Seçiniz"
                  isClearable
                  isSearchable
                  isLoading={countiesLoading}
                  isDisabled={!formData.city}
                  className="mb-3"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="district">
                  Mahalle
                </Label>
                <Select
                  id="district"
                  options={districtOptions}
                  value={formData.district}
                  onChange={(selected: SelectOption | null) => handleSelect("district", selected)}
                  placeholder="Seçiniz"
                  isClearable
                  isSearchable
                  isLoading={districtsLoading}
                  isDisabled={!formData.city}
                  className="mb-3"
                />
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label for="address">
              Adres
            </Label>
            <Input
              id="address"
              name="address"
              type="textarea"
              value={formData.address}
              onChange={handleTextChange}
              placeholder="Type here"
              rows={3}
              className="mb-3"
            />
          </FormGroup>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="postalCode">
                  Posta Kodu
                </Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  value={formData.postalCode}
                  onChange={handleTextChange}
                  placeholder="Posta kodu giriniz"
                  className="mb-3"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="notes">
                  Notlar
                </Label>
                <Input
                  id="notes"
                  name="notes"
                  type="textarea"
                  value={formData.notes}
                  onChange={handleTextChange}
                  placeholder="Type here"
                  rows={3}
                  className="mb-3"
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="assignedUser">
                  Atanan Kullanıcı
                </Label>
                <Select
                  id="assignedUser"
                  options={userOptions}
                  value={formData.assignedUser}
                  onChange={(selected: SelectOption | null) => handleSelect("assignedUser", selected)}
                  placeholder="Seçiniz"
                  isClearable
                  isSearchable
                  isLoading={usersLoading}
                  className="mb-3"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="segments">
                  Segmentler
                </Label>
                <Select
                  id="segments"
                  options={segmentOptions}
                  value={formData.segments}
                  onChange={(selected: SelectOption[] | null) => handleMultiSelect("segments", selected)}
                  placeholder="Seçiniz"
                  isMulti
                  isSearchable
                  isLoading={segmentsLoading}
                  className="mb-3"
                />
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label for="channel">
              Kanal
            </Label>
            <Select
              id="channel"
              options={channelOptions}
              value={formData.channel}
              onChange={(selected: SelectOption | null) => handleSelect("channel", selected)}
              placeholder="Seçiniz"
              isClearable
              isSearchable
              className="mb-3"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={handleToggle}>
          İptal
        </Button>
        <Button
          color="primary"
          className="mt-1"
          disabled={isLoading}
          onClick={handleSubmit}
        >
          {account ? "Güncelle" : "Ekle"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AccountFormModal; 