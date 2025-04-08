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
  const [formData, setFormData] = useState({
    personType: { value: "INDIVIDUAL", label: "Bireysel" },
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
          handleInputChange("country", turkey);
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
        
        // Add the "SMS Istemiyorum" option if it doesn't exist
        if (!options.some((opt: SelectOption) => opt.label === "SMS İstemiyorum")) {
          setSegmentOptions([...options, { value: "no_sms", label: "SMS İstemiyorum" }]);
        }
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
        toast.success("Hesap başarıyla oluşturuldu");
        toggle();
        
        // Pass the created account back to parent
        if (data) {
          onSubmit(data.createAccount);
        }
      },
      onError: (error) => {
        console.error("Error creating account:", error);
        handleMutationError(error, "oluşturulurken");
      }
    }
  );
  
  const [updateAccountMutation, { loading: updateLoading }] = useMutation(
    UPDATE_ACCOUNT,
    {
      onCompleted: (data) => {
        toast.success("Hesap başarıyla güncellendi");
        toggle();
        
        // Pass the updated account back to parent
        if (data) {
          onSubmit(data.updateAccount);
        }
      },
      onError: (error) => {
        console.error("Error updating account:", error);
        handleMutationError(error, "güncellenirken");
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
    
    // Check for unique constraint error
    if (error.message && error.message.includes("duplicate key")) {
      // Extract field name from error message if possible
      let errorField = "field";
      let errorMessage = "Bu bilgilerle kayıtlı bir hesap zaten mevcut.";
      
      const errorText = error.message.toLowerCase();
      
      if (errorText.includes("email")) {
        errorField = "email";
        errorMessage = "Bu e-posta adresi ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("nationalid") || errorText.includes("national_id")) {
        errorField = "nationalIdNumber";
        errorMessage = "Bu TC kimlik numarası ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("taxnumber") || errorText.includes("tax_number")) {
        errorField = "taxNumber";
        errorMessage = "Bu vergi numarası ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("phone")) {
        errorField = "phone";
        errorMessage = "Bu telefon numarası ile kayıtlı bir hesap zaten mevcut.";
      } else if (errorText.includes("no")) {
        errorField = "accountNumber";
        errorMessage = "Bu hesap numarası ile kayıtlı bir hesap zaten mevcut.";
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
      
      setValidationErrors(prev => ({ ...prev, [errorField]: errorMessage }));
      toast.error(errorMessage);
    } else {
      toast.error(`Hesap ${action} bir hata oluştu: ${error.message}`);
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
        populateFormWithAccount(account);
      }
    }
  }, [isOpen]);

  // Load cities when country changes
  useEffect(() => {
    if (formData.country?.value) {
      getCitiesQuery({
        variables: { countryId: formData.country.value }
      });
    } else {
      setCityOptions([]);
      setFormData(prev => ({ ...prev, city: null, county: null, district: null }));
    }
  }, [formData.country]);

  // Load counties when city changes
  useEffect(() => {
    if (formData.city?.value) {
      getCountiesQuery({
        variables: { cityId: formData.city.value }
      });
    } else {
      setCountyOptions([]);
      setDistrictOptions([]);
      setFormData(prev => ({ ...prev, county: null, district: null }));
    }
  }, [formData.city]);

  // Load districts when county changes
  useEffect(() => {
    if (formData.county?.value) {
      getDistrictsQuery({
        variables: { countyId: formData.county.value }
      });
    } else {
      setDistrictOptions([]);
      setFormData(prev => ({ ...prev, district: null }));
    }
  }, [formData.county]);

  // Function to populate form with account data in edit mode
  const populateFormWithAccount = (accountData: any) => {
    try {
      console.log("Populating form with account data:", accountData);
      const newFormData = { ...formData };
      
      // Basic fields
      newFormData.name = accountData.name || "";
      newFormData.firstName = accountData.firstName || "";
      newFormData.lastName = accountData.lastName || "";
      newFormData.email = accountData.email || "";
      newFormData.phone = accountData.phone || "";
      newFormData.phone2 = accountData.phone2 || "";
      newFormData.taxNumber = accountData.taxNumber || "";
      newFormData.taxOffice = accountData.taxOffice || "";
      newFormData.nationalIdNumber = accountData.nationalId || "";
      newFormData.address = accountData.address || "";
      newFormData.postalCode = accountData.postalCode || "";
      newFormData.notes = accountData.note || "";
      
      // Select fields
      if (accountData.personType) {
        newFormData.personType = personTypeOptions.find(
          opt => opt.value === accountData.personType
        ) || personTypeOptions[0];
      }
      
      if (accountData.gender) {
        newFormData.gender = genderOptions.find(
          opt => opt.value === accountData.gender
        ) || null;
      }
      
      if (accountData.accountTypes && accountData.accountTypes.length > 0) {
        newFormData.accountTypes = accountData.accountTypes.map((type: any) => ({
          value: type.id,
          label: type.name
        }));
      }
      
      if (accountData.segments && accountData.segments.length > 0) {
        newFormData.segments = accountData.segments.map((segment: any) => ({
          value: segment.id,
          label: segment.name
        }));
      }
      
      if (accountData.assignedUser) {
        newFormData.assignedUser = {
          value: accountData.assignedUser.id,
          label: accountData.assignedUser.fullName
        };
      }
      
      if (accountData.channel) {
        newFormData.channel = {
          value: accountData.channel.id || accountData.channel,
          label: accountData.channel.name || "Unknown"
        };
      }
      
      // Location fields require special handling due to dependencies
      if (accountData.country) {
        const country = {
          value: typeof accountData.country === 'object' ? accountData.country.id : accountData.country,
          label: typeof accountData.country === 'object' ? accountData.country.name : "Unknown"
        };
        newFormData.country = country;
        
        // Trigger loading of cities
        getCitiesQuery({
          variables: { countryId: country.value }
        });
      }
      
      // Set the form data
      setFormData(newFormData);
      
      // After country is set, handle city and county
      setTimeout(() => {
        // These need to be set after their parent options are loaded
        if (accountData.city && cityOptions.length > 0) {
          const city = {
            value: typeof accountData.city === 'object' ? accountData.city.id : accountData.city,
            label: typeof accountData.city === 'object' ? accountData.city.name : "Unknown"
          };
          setFormData(prev => ({ ...prev, city }));
          
          getCountiesQuery({
            variables: { cityId: city.value }
          });
        }
      }, 500);
      
      // After county is loaded, set county and district
      setTimeout(() => {
        if (accountData.county && countyOptions.length > 0) {
          const county = {
            value: typeof accountData.county === 'object' ? accountData.county.id : accountData.county,
            label: typeof accountData.county === 'object' ? accountData.county.name : "Unknown"
          };
          setFormData(prev => ({ ...prev, county }));
          
          // Load districts after county is set
          if (county.value) {
            getDistrictsQuery({
              variables: { countyId: county.value }
            });
          }
        }
      }, 1000);
      
      // Finally set district after all parent options are loaded
      setTimeout(() => {
        if (accountData.district && districtOptions.length > 0) {
          const district = {
            value: typeof accountData.district === 'object' ? accountData.district.id : accountData.district,
            label: typeof accountData.district === 'object' ? accountData.district.name : "Unknown"
          };
          setFormData(prev => ({ ...prev, district }));
        }
      }, 1500);
      
    } catch (error) {
      console.error("Error populating form with account data:", error);
      toast.error("Hesap verileri yüklenirken bir hata oluştu");
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle text input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    handleInputChange(name, value);
  };

  // Validate form before submission
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    let isValid = true;

    // Required fields validation based on person type
    if (formData.personType.value === "INDIVIDUAL") {
      if (!formData.firstName.trim()) {
        errors.firstName = "Ad alanı zorunludur";
        isValid = false;
      }
      if (!formData.lastName.trim()) {
        errors.lastName = "Soyad alanı zorunludur";
        isValid = false;
      }
    } else {
      if (!formData.name.trim()) {
        errors.name = "Kurum adı zorunludur";
        isValid = false;
      }
    }
    
    // Email format validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Geçerli bir e-posta adresi giriniz";
      isValid = false;
    }
    
    // Phone validation
    if (formData.phone && !/^\+?[0-9\s-]{10,15}$/.test(formData.phone.replace(/\s+/g, ''))) {
      errors.phone = "Geçerli bir telefon numarası giriniz";
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate the form
      const isValid = validateForm();
      if (!isValid) {
        console.log("Form validation failed", validationErrors);
        return;
      }
      
      console.log("Submitting form with data:", formData);
      
      // Prepare the account data for saving - ensure field names match the API
      const accountData: any = {
        personType: formData.personType.value,
        name: formData.name || "",
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
        email: formData.email || null,
        phone: formData.phone || null,
        phone2: formData.phone2 || null,
        taxNumber: formData.taxNumber || null,
        taxOffice: formData.taxOffice || null,
        nationalId: formData.nationalIdNumber || null,
        address: formData.address || null,
        postalCode: formData.postalCode || null,
        note: formData.notes || null,
      };
      
      // Add fields based on person type
      if (formData.personType.value === "INDIVIDUAL") {
        // For individual, ensure name is set from first and last name if empty
        if (!accountData.name) {
          accountData.name = `${accountData.firstName} ${accountData.lastName}`.trim();
        }
        accountData.gender = formData.gender?.value || null;
      } else {
        // For corporate, clear individual fields
        accountData.firstName = null;
        accountData.lastName = null;
        accountData.gender = null;
      }
      
      // Add location fields if selected
      if (formData.country) accountData.countryId = formData.country.value;
      if (formData.city) accountData.cityId = formData.city.value;
      if (formData.county) accountData.countyId = formData.county.value;
      if (formData.district) accountData.districtId = formData.district.value;
      
      // Add relation fields
      if (formData.assignedUser) accountData.assignedUserId = formData.assignedUser.value;
      if (formData.channel) accountData.channelId = formData.channel.value;
      
      // Add multi-select fields
      if (formData.accountTypes.length > 0) {
        accountData.accountTypeIds = formData.accountTypes.map((type: any) => type.value);
      }
      
      if (formData.segments.length > 0) {
        accountData.segmentIds = formData.segments.map((segment: any) => segment.value);
      }
      
      // Convert empty strings to null to avoid constraint violations
      Object.keys(accountData).forEach(key => {
        if (accountData[key] === "") {
          accountData[key] = null;
        }
      });
      
      console.log("Saving account with data:", JSON.stringify(accountData, null, 2));
      
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
      } else {
        // Create new account
        await createAccountMutation({
          variables: { 
            input: accountData 
          },
          context: {
            headers: {
              Authorization: getAuthHeader()
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Error in form submission:", error);
      // The error is already handled in the mutation error handlers
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
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>{title}</ModalHeader>
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
                  onChange={(selected) => {
                    handleInputChange("personType", selected);
                    // Clear validation errors for related fields
                    const newErrors = {...validationErrors};
                    delete newErrors.name;
                    delete newErrors.firstName;
                    delete newErrors.lastName;
                    setValidationErrors(newErrors);
                  }}
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
                  onChange={(selected) => handleInputChange("accountTypes", selected || [])}
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
            <Col md={6}>
              <FormGroup>
                <Label for="gender">
                  Cinsiyet
                </Label>
                <Select
                  id="gender"
                  options={genderOptions}
                  value={formData.gender}
                  onChange={(selected) => handleInputChange("gender", selected)}
                  placeholder="Seçiniz"
                  isClearable
                  isSearchable
                  className="mb-3"
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
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
          </Row>

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
                  onChange={(selected) => handleInputChange("country", selected)}
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
                  onChange={(selected) => handleInputChange("city", selected)}
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
                  onChange={(selected) => handleInputChange("county", selected)}
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
                  onChange={(selected) => handleInputChange("district", selected)}
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
                  onChange={(selected) => handleInputChange("assignedUser", selected)}
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
                  onChange={(selected) => handleInputChange("segments", selected || [])}
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
              onChange={(selected) => handleInputChange("channel", selected)}
              placeholder="Seçiniz"
              isClearable
              isSearchable
              className="mb-3"
            />
          </FormGroup>

          {/* Add error display for form-level errors */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="alert alert-danger mb-3">
              <ul className="mb-0">
                {Object.entries(validationErrors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          İptal
        </Button>
        <Button 
          color="primary" 
          onClick={handleSubmit} 
          disabled={isLoading || Object.keys(validationErrors).length > 0}
        >
          {isLoading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Kaydediliyor...
            </>
          ) : (
            submitText
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AccountFormModal; 