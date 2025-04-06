import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Col,
  Row,
  Label,
  Input,
  FormFeedback,
  Form,
  Spinner
} from "reactstrap";
import Select from "react-select";
import { useFormik } from "formik";
import { useLazyQuery } from "@apollo/client";
import { toast } from "react-toastify";
import { 
  GET_USERS_LOOKUP, 
  GET_COUNTRIES,
  GET_CITIES,
  GET_COUNTIES,
  GET_DISTRICTS
} from "../../../graphql/queries/accountQueries";
import { SelectOption } from "../../../types/graphql";

export interface AccountFormProps {
  validation?: any;
  isDetail?: boolean;
  isSubmitting?: boolean;
}

const AccountForm: React.FC<AccountFormProps> = ({
  validation,
  isDetail = false,
  isSubmitting = false
}) => {
  // Reference data state
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<SelectOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  
  // Loading states
  const [initLoading, setInitLoading] = useState<boolean>(true);
  
  // Lazy queries
  const [getUsers, { loading: usersLoading }] = useLazyQuery(GET_USERS_LOOKUP, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getUsersLookup && data.getUsersLookup.items) {
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
  
  const [getCountries, { loading: countriesLoading }] = useLazyQuery(GET_COUNTRIES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getCountries) {
        const options = data.getCountries.map((country: any) => ({
          value: country.id,
          label: country.name
        }));
        setCountryOptions(options);
      }
    },
    onError: (error) => {
      console.error("Error fetching countries:", error);
      toast.error("Ülkeler yüklenirken bir hata oluştu");
    }
  });
  
  const [getCities, { loading: citiesLoading }] = useLazyQuery(GET_CITIES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getCities) {
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
  
  const [getCounties, { loading: countiesLoading }] = useLazyQuery(GET_COUNTIES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getCounties) {
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
  
  const [getDistricts, { loading: districtsLoading }] = useLazyQuery(GET_DISTRICTS, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getDistricts) {
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
  
  // Load reference data
  const loadReferenceData = async () => {
    try {
      setInitLoading(true);
      
      // Load users and countries initially
      await Promise.all([
        getUsers(),
        getCountries()
      ]);
      
      // If we have a country ID in the form values, load cities
      if (validation.values.countryId) {
        await getCities({
          variables: { countryId: validation.values.countryId }
        });
        
        // If we have a city ID, load counties
        if (validation.values.cityId) {
          await getCounties({
            variables: { cityId: validation.values.cityId }
          });
          
          // If we have a county ID, load districts
          if (validation.values.countyId) {
            await getDistricts({
              variables: { countyId: validation.values.countyId }
            });
          }
        }
      }
    } catch (error) {
      console.error("Error loading reference data:", error);
      toast.error("Referans veriler yüklenirken bir hata oluştu");
    } finally {
      setInitLoading(false);
    }
  };
  
  // Load reference data on mount
  useEffect(() => {
    loadReferenceData();
  }, []);
  
  // When country changes, load cities
  useEffect(() => {
    if (validation.values.countryId) {
      getCities({
        variables: { countryId: validation.values.countryId }
      });
      // Reset city, county, and district selections
      if (validation.values.cityId) {
        validation.setFieldValue("cityId", "");
      }
      if (validation.values.countyId) {
        validation.setFieldValue("countyId", "");
      }
      if (validation.values.districtId) {
        validation.setFieldValue("districtId", "");
      }
    }
  }, [validation.values.countryId]);
  
  // When city changes, load counties
  useEffect(() => {
    if (validation.values.cityId) {
      getCounties({
        variables: { cityId: validation.values.cityId }
      });
      // Reset county and district selections
      if (validation.values.countyId) {
        validation.setFieldValue("countyId", "");
      }
      if (validation.values.districtId) {
        validation.setFieldValue("districtId", "");
      }
    }
  }, [validation.values.cityId]);
  
  // When county changes, load districts
  useEffect(() => {
    if (validation.values.countyId) {
      getDistricts({
        variables: { countyId: validation.values.countyId }
      });
      // Reset district selection
      if (validation.values.districtId) {
        validation.setFieldValue("districtId", "");
      }
    }
  }, [validation.values.countyId]);
  
  // Loading state
  const isLoading = 
    initLoading || 
    usersLoading || 
    countriesLoading || 
    citiesLoading || 
    countiesLoading || 
    districtsLoading;
  
  // Find selected options for Select components
  const selectedUser = userOptions.find(option => option.value === validation.values.assignedUserId);
  const selectedCountry = countryOptions.find(option => option.value === validation.values.countryId);
  const selectedCity = cityOptions.find(option => option.value === validation.values.cityId);
  const selectedCounty = countyOptions.find(option => option.value === validation.values.countyId);
  const selectedDistrict = districtOptions.find(option => option.value === validation.values.districtId);
  
  return (
    <Form>
      <Row>
        {/* Account Basic Info */}
        <Col lg={12}>
          <Card>
            <CardBody>
              <Row className="g-3">
                <Col lg={12}>
                  <h5 className="fw-semibold mb-3">Temel Bilgiler</h5>
                </Col>
                
                {/* Account Name */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="name" className="form-label">Hesap Adı</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="name"
                      placeholder="Hesap adı girin"
                      name="name"
                      value={validation.values.name}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.name && validation.errors.name ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.name && validation.errors.name && (
                      <FormFeedback type="invalid">{validation.errors.name}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* First Name */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="firstName" className="form-label">Ad</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="firstName"
                      placeholder="Ad girin"
                      name="firstName"
                      value={validation.values.firstName}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.firstName && validation.errors.firstName ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.firstName && validation.errors.firstName && (
                      <FormFeedback type="invalid">{validation.errors.firstName}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* Last Name */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="lastName" className="form-label">Soyad</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="lastName"
                      placeholder="Soyad girin"
                      name="lastName"
                      value={validation.values.lastName}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.lastName && validation.errors.lastName ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.lastName && validation.errors.lastName && (
                      <FormFeedback type="invalid">{validation.errors.lastName}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* Email */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="email" className="form-label">E-posta</Label>
                    <Input
                      type="email"
                      className="form-control"
                      id="email"
                      placeholder="E-posta girin"
                      name="email"
                      value={validation.values.email}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.email && validation.errors.email ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.email && validation.errors.email && (
                      <FormFeedback type="invalid">{validation.errors.email}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* Phone */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="phone" className="form-label">Telefon</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="phone"
                      placeholder="Telefon girin"
                      name="phone"
                      value={validation.values.phone}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.phone && validation.errors.phone ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.phone && validation.errors.phone && (
                      <FormFeedback type="invalid">{validation.errors.phone}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* Phone 2 */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="phone2" className="form-label">Alternatif Telefon</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="phone2"
                      placeholder="Alternatif telefon girin"
                      name="phone2"
                      value={validation.values.phone2}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.phone2 && validation.errors.phone2 ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.phone2 && validation.errors.phone2 && (
                      <FormFeedback type="invalid">{validation.errors.phone2}</FormFeedback>
                    )}
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
        
        {/* Tax Information */}
        <Col lg={12}>
          <Card>
            <CardBody>
              <Row className="g-3">
                <Col lg={12}>
                  <h5 className="fw-semibold mb-3">Vergi Bilgileri</h5>
                </Col>
                
                {/* Tax Number */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="taxNumber" className="form-label">Vergi Numarası</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="taxNumber"
                      placeholder="Vergi numarası girin"
                      name="taxNumber"
                      value={validation.values.taxNumber}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.taxNumber && validation.errors.taxNumber ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.taxNumber && validation.errors.taxNumber && (
                      <FormFeedback type="invalid">{validation.errors.taxNumber}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* Tax Office */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="taxOffice" className="form-label">Vergi Dairesi</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="taxOffice"
                      placeholder="Vergi dairesi girin"
                      name="taxOffice"
                      value={validation.values.taxOffice}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.taxOffice && validation.errors.taxOffice ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.taxOffice && validation.errors.taxOffice && (
                      <FormFeedback type="invalid">{validation.errors.taxOffice}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* National ID */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="nationalId" className="form-label">TC Kimlik No</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="nationalId"
                      placeholder="TC Kimlik No girin"
                      name="nationalId"
                      value={validation.values.nationalId}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.nationalId && validation.errors.nationalId ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.nationalId && validation.errors.nationalId && (
                      <FormFeedback type="invalid">{validation.errors.nationalId}</FormFeedback>
                    )}
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
        
        {/* Address Information */}
        <Col lg={12}>
          <Card>
            <CardBody>
              <Row className="g-3">
                <Col lg={12}>
                  <h5 className="fw-semibold mb-3">Adres Bilgileri</h5>
                </Col>
                
                {/* Country */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="countryId" className="form-label">Ülke</Label>
                    <Select
                      id="countryId"
                      name="countryId"
                      options={countryOptions}
                      value={selectedCountry}
                      onChange={(option) => validation.setFieldValue("countryId", option?.value || "")}
                      onBlur={() => validation.setFieldTouched("countryId", true)}
                      isSearchable
                      isClearable
                      isLoading={countriesLoading}
                      placeholder="Ülke seçin..."
                      classNamePrefix="select2-selection"
                      isDisabled={isDetail || isSubmitting}
                    />
                    {validation.touched.countryId && validation.errors.countryId && (
                      <div className="text-danger small mt-1">{validation.errors.countryId}</div>
                    )}
                  </div>
                </Col>
                
                {/* City */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="cityId" className="form-label">Şehir</Label>
                    <Select
                      id="cityId"
                      name="cityId"
                      options={cityOptions}
                      value={selectedCity}
                      onChange={(option) => validation.setFieldValue("cityId", option?.value || "")}
                      onBlur={() => validation.setFieldTouched("cityId", true)}
                      isSearchable
                      isClearable
                      isLoading={citiesLoading}
                      placeholder="Şehir seçin..."
                      classNamePrefix="select2-selection"
                      isDisabled={!validation.values.countryId || isDetail || isSubmitting}
                    />
                    {validation.touched.cityId && validation.errors.cityId && (
                      <div className="text-danger small mt-1">{validation.errors.cityId}</div>
                    )}
                  </div>
                </Col>
                
                {/* County */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="countyId" className="form-label">İlçe</Label>
                    <Select
                      id="countyId"
                      name="countyId"
                      options={countyOptions}
                      value={selectedCounty}
                      onChange={(option) => validation.setFieldValue("countyId", option?.value || "")}
                      onBlur={() => validation.setFieldTouched("countyId", true)}
                      isSearchable
                      isClearable
                      isLoading={countiesLoading}
                      placeholder="İlçe seçin..."
                      classNamePrefix="select2-selection"
                      isDisabled={!validation.values.cityId || isDetail || isSubmitting}
                    />
                    {validation.touched.countyId && validation.errors.countyId && (
                      <div className="text-danger small mt-1">{validation.errors.countyId}</div>
                    )}
                  </div>
                </Col>
                
                {/* District */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="districtId" className="form-label">Mahalle</Label>
                    <Select
                      id="districtId"
                      name="districtId"
                      options={districtOptions}
                      value={selectedDistrict}
                      onChange={(option) => validation.setFieldValue("districtId", option?.value || "")}
                      onBlur={() => validation.setFieldTouched("districtId", true)}
                      isSearchable
                      isClearable
                      isLoading={districtsLoading}
                      placeholder="Mahalle seçin..."
                      classNamePrefix="select2-selection"
                      isDisabled={!validation.values.countyId || isDetail || isSubmitting}
                    />
                    {validation.touched.districtId && validation.errors.districtId && (
                      <div className="text-danger small mt-1">{validation.errors.districtId}</div>
                    )}
                  </div>
                </Col>
                
                {/* Address */}
                <Col md={12}>
                  <div>
                    <Label htmlFor="address" className="form-label">Adres</Label>
                    <Input
                      type="textarea"
                      className="form-control"
                      id="address"
                      placeholder="Adres girin"
                      name="address"
                      rows={3}
                      value={validation.values.address}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.address && validation.errors.address ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.address && validation.errors.address && (
                      <FormFeedback type="invalid">{validation.errors.address}</FormFeedback>
                    )}
                  </div>
                </Col>
                
                {/* Postal Code */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="postalCode" className="form-label">Posta Kodu</Label>
                    <Input
                      type="text"
                      className="form-control"
                      id="postalCode"
                      placeholder="Posta kodu girin"
                      name="postalCode"
                      value={validation.values.postalCode}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.postalCode && validation.errors.postalCode ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.postalCode && validation.errors.postalCode && (
                      <FormFeedback type="invalid">{validation.errors.postalCode}</FormFeedback>
                    )}
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
        
        {/* Additional Information */}
        <Col lg={12}>
          <Card>
            <CardBody>
              <Row className="g-3">
                <Col lg={12}>
                  <h5 className="fw-semibold mb-3">Ek Bilgiler</h5>
                </Col>
                
                {/* Assigned User */}
                <Col md={6}>
                  <div>
                    <Label htmlFor="assignedUserId" className="form-label">Atanan Kullanıcı</Label>
                    <Select
                      id="assignedUserId"
                      name="assignedUserId"
                      options={userOptions}
                      value={selectedUser}
                      onChange={(option) => validation.setFieldValue("assignedUserId", option?.value || "")}
                      onBlur={() => validation.setFieldTouched("assignedUserId", true)}
                      isSearchable
                      isClearable
                      isLoading={usersLoading}
                      placeholder="Kullanıcı seçin..."
                      classNamePrefix="select2-selection"
                      isDisabled={isDetail || isSubmitting}
                    />
                    {validation.touched.assignedUserId && validation.errors.assignedUserId && (
                      <div className="text-danger small mt-1">{validation.errors.assignedUserId}</div>
                    )}
                  </div>
                </Col>
                
                {/* Note */}
                <Col md={12}>
                  <div>
                    <Label htmlFor="note" className="form-label">Not</Label>
                    <Input
                      type="textarea"
                      className="form-control"
                      id="note"
                      placeholder="Not girin"
                      name="note"
                      rows={4}
                      value={validation.values.note}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      invalid={validation.touched.note && validation.errors.note ? true : false}
                      disabled={isDetail || isSubmitting}
                    />
                    {validation.touched.note && validation.errors.note && (
                      <FormFeedback type="invalid">{validation.errors.note}</FormFeedback>
                    )}
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      {/* Loading overlay */}
      {(isLoading || isSubmitting) && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "rgba(255, 255, 255, 0.7)", zIndex: 1000 }}>
          <Spinner color="primary" />
        </div>
      )}
    </Form>
  );
};

export default AccountForm; 