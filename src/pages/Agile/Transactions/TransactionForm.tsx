import React from "react";
import {
  Row,
  Col,
  Label,
  Input,
  FormFeedback
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import moment from "moment";
import { SelectOption } from "../../../types/graphql";

// Define DebouncedInput component 
const DebouncedInput = ({ 
  name, 
  id, 
  className, 
  type, 
  rows, 
  onChange, 
  onBlur, 
  value, 
  invalid,
  validation // Add validation prop to directly access Formik
}: any) => {
  // Create a direct handler that updates the Formik value immediately
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    console.log(`Input changing for ${name}: ${e.target.value}`);
    
    // Directly update Formik value if validation is provided
    if (validation && name) {
      validation.setFieldValue(name, e.target.value, true);
    }
    
    // Also call the provided onChange handler if it exists
    if (onChange) {
      onChange(e);
    }
  };

  // Ensure value is properly handled
  const displayValue = value === undefined || value === null ? "" : value;

  console.log(`Rendering DebouncedInput for ${name} with value:`, displayValue);

  return (
    <Input
      name={name}
      id={id}
      className={className}
      type={type}
      rows={rows}
      onChange={handleChange}
      onBlur={onBlur}
      value={displayValue}
      invalid={invalid}
    />
  );
};

// Define props for the TransactionForm component
export interface TransactionFormProps {
  // Form state
  validation: any; // Formik instance
  isDetail?: boolean;
  isSubmitting?: boolean;
  
  // Form options
  accountOptions: SelectOption[];
  statusOptions: SelectOption[];
  userOptions: SelectOption[];
  typeOptions: SelectOption[];
  productOptions: SelectOption[];
  countryOptions: SelectOption[];
  cityOptions: SelectOption[];
  countyOptions: SelectOption[];
  districtOptions: SelectOption[];
  channelOptions: SelectOption[];
  
  // Loading states
  isLoadingChannels?: boolean;
  citiesLoading?: boolean;
  countiesLoading?: boolean;
  districtsLoading?: boolean;
  productsLoading?: boolean;
  
  // Handlers
  safelyUpdateFormField: (fieldName: string, value: any) => void;
  debouncedHandleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // API handlers
  getCities?: (variables: any) => void;
  getCounties?: (variables: any) => void;
  getDistricts?: (variables: any) => void;
  
  // Additional data
  transaction?: any;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  validation,
  isDetail = false,
  isSubmitting = false,
  accountOptions = [],
  statusOptions = [],
  userOptions = [],
  typeOptions = [],
  productOptions = [],
  countryOptions = [],
  cityOptions = [],
  countyOptions = [],
  districtOptions = [],
  channelOptions = [],
  isLoadingChannels = false,
  citiesLoading = false,
  countiesLoading = false,
  districtsLoading = false,
  productsLoading = false,
  safelyUpdateFormField,
  debouncedHandleChange,
  getCities,
  getCounties,
  getDistricts,
  transaction
}) => {
  return (
    <>
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="accountId-field" className="form-label">
            Hesap
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Select
              options={accountOptions}
              name="accountId"
              id="accountId-field"
              onChange={(selected: any) => {
                console.log("Account selected:", selected);
                validation.setFieldValue("accountId", selected ? selected.value : "");
              }}
              value={
                validation.values.accountId && accountOptions.length > 0
                  ? accountOptions.find(option => option.value === validation.values.accountId) || null
                  : null
              }
              placeholder="Seçiniz"
              isDisabled={isDetail}
              isClearable={true}
              className="react-select"
              classNamePrefix="select"
            />
          ) : (
            <div>
              {validation.values.accountId 
                ? (accountOptions.find(option => option.value === validation.values.accountId)?.label || 
                    transaction?.account?.name || "-") 
                : "-"}
            </div>
          )}
          {validation.touched.accountId && validation.errors.accountId && (
            <FormFeedback>{validation.errors.accountId as string}</FormFeedback>
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
          {!isDetail ? (
            <Select
              options={statusOptions}
              name="statusId"
              onChange={(selected: any) =>
                safelyUpdateFormField("statusId", selected?.value)
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
              isDisabled={isDetail}
            />
          ) : (
            <div>
              {statusOptions.find((s) => s.value === validation.values.statusId)?.label}
            </div>
          )}
          {validation.touched.statusId && validation.errors.statusId && (
            <FormFeedback>{validation.errors.statusId as string}</FormFeedback>
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
          {!isDetail ? (
            <Select
              options={userOptions}
              name="assignedUserId"
              onChange={(selected: any) =>
                safelyUpdateFormField("assignedUserId", selected?.value)
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
              isDisabled={isDetail}
            />
          ) : (
            <div>
              {userOptions.find((u) => u.value === validation.values.assignedUserId)?.label}
            </div>
          )}
          {validation.touched.assignedUserId && validation.errors.assignedUserId && (
            <FormFeedback>{validation.errors.assignedUserId as string}</FormFeedback>
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
          {!isDetail ? (
            <Select
              options={typeOptions}
              name="typeId"
              onChange={(selected: any) =>
                safelyUpdateFormField("typeId", selected?.value)
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
              isDisabled={isDetail}
            />
          ) : (
            <div>
              {typeOptions.find((t) => t.value === validation.values.typeId)?.label}
            </div>
          )}
          {validation.touched.typeId && validation.errors.typeId && (
            <FormFeedback>{validation.errors.typeId as string}</FormFeedback>
          )}
        </Col>
      </Row>

      {/* Channel Field */}
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="channelId-field" className="form-label">
            Kanal
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Select
              options={channelOptions}
              name="channelId"
              id="channelId-field"
              onChange={(selected: any) => {
                console.log("Channel selected:", selected);
                safelyUpdateFormField("channelId", selected?.value);
              }}
              value={
                validation.values.channelId
                  ? {
                      value: validation.values.channelId,
                      label:
                        channelOptions.find((c) => c.value === validation.values.channelId)?.label || "",
                    }
                  : null
              }
              placeholder="Seçiniz"
              isDisabled={isDetail}
              isLoading={isLoadingChannels}
            />
          ) : (
            <div>
              {channelOptions.find((c) => c.value === validation.values.channelId)?.label || "-"}
            </div>
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
          {!isDetail ? (
            <Select
              options={productOptions}
              isMulti
              name="products"
              onChange={(selected: any) =>
                safelyUpdateFormField("products", selected || [])
              }
              value={validation.values.products}
              placeholder="Ürün Seçiniz"
              isDisabled={isDetail}
              isLoading={productsLoading}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          ) : (
            <div>
              {validation.values.products?.map((product: any, index: number) => (
                <span key={index}>
                  {product.label}{index < validation.values.products.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
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
          {!isDetail ? (
            <DebouncedInput
              name="note"
              id="note-field"
              className="form-control"
              type="textarea"
              rows={3}
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.note}
              invalid={validation.touched.note && validation.errors.note ? true : false}
              validation={validation}
            />
          ) : (
            <div>{validation.values.note}</div>
          )}
          {validation.touched.note && validation.errors.note && (
            <FormFeedback>{validation.errors.note as string}</FormFeedback>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="country-field" className="form-label">
            Ülke
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Select
              options={countryOptions}
              name="country"
              onChange={(selected: any) => {
                // Use the safe update function
                safelyUpdateFormField("country", selected?.value);
                
                // When country changes, load cities for that country
                if (selected?.value && getCities) {
                  getCities({
                    variables: {
                      countryId: selected.value
                    }
                  });
                  
                  // Reset city, district and neighborhood when country changes
                  safelyUpdateFormField("city", "");
                  safelyUpdateFormField("district", "");
                  safelyUpdateFormField("neighborhood", "");
                }
              }}
              value={
                validation.values.country
                  ? {
                    value: validation.values.country,
                    label: countryOptions.find(c => c.value === validation.values.country)?.label || "Türkiye"
                  }
                  : null
              }
              placeholder="Seçiniz"
              isDisabled={isDetail}
              isLoading={false}
            />
          ) : (
            <div>
              {countryOptions.find(c => c.value === validation.values.country)?.label || validation.values.country}
            </div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="city-field" className="form-label">
            Şehir
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Select
              options={cityOptions}
              name="city"
              onChange={(selected: any) => {
                safelyUpdateFormField("city", selected?.value);
                // When city changes, load counties for that city
                if (selected?.value && getCounties) {
                  getCounties({
                    variables: {
                      cityId: selected.value
                    }
                  });
                }
              }}
              value={
                validation.values.city
                  ? {
                    value: validation.values.city,
                    label: cityOptions.find(c => c.value === validation.values.city)?.label || ""
                  }
                  : null
              }
              placeholder="Seçiniz"
              isDisabled={isDetail || !validation.values.country}
              isLoading={citiesLoading}
            />
          ) : (
            <div>
              {cityOptions.find(c => c.value === validation.values.city)?.label || validation.values.city}
            </div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="district-field" className="form-label">
            İlçe
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Select
              options={countyOptions}
              name="district"
              onChange={(selected: any) => {
                safelyUpdateFormField("district", selected?.value);
                // Save the district as the county value too for API communication
                safelyUpdateFormField("county", selected?.value);
                // When district changes, load neighborhoods for that district
                if (selected?.value && getDistricts) {
                  getDistricts({
                    variables: {
                      countyId: selected.value
                    }
                  });
                }
              }}
              value={
                validation.values.district
                  ? {
                    value: validation.values.district,
                    label: countyOptions.find(c => c.value === validation.values.district)?.label || ""
                  }
                  : null
              }
              placeholder="Seçiniz"
              isDisabled={isDetail || !validation.values.city}
              isLoading={countiesLoading}
            />
          ) : (
            <div>{countyOptions.find(c => c.value === validation.values.district)?.label || validation.values.district}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="neighborhood-field" className="form-label">
            Mahalle
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Select
              options={districtOptions}
              name="neighborhood"
              onChange={(selected: any) =>
                safelyUpdateFormField("neighborhood", selected?.value)
              }
              value={
                validation.values.neighborhood
                  ? {
                    value: validation.values.neighborhood,
                    label: districtOptions.find(d => d.value === validation.values.neighborhood)?.label || ""
                  }
                  : null
              }
              placeholder="Seçiniz"
              isDisabled={isDetail || !validation.values.district}
              isLoading={districtsLoading}
            />
          ) : (
            <div>{districtOptions.find(d => d.value === validation.values.neighborhood)?.label || validation.values.neighborhood}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="address-field" className="form-label">
            Adres
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <DebouncedInput
              name="address"
              id="address-field"
              className="form-control"
              type="textarea"
              rows={3}
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.address || ""}
              validation={validation}
            />
          ) : (
            <div>{validation.values.address}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="postal-code-field" className="form-label">
            Posta Kodu
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <DebouncedInput
              name="postalCode"
              id="postal-code-field"
              className="form-control"
              type="text"
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.postalCode || ""}
              validation={validation}
            />
          ) : (
            <div>{validation.values.postalCode}</div>
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
          {!isDetail ? (
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
          ) : (
            <div>{validation.values.no}</div>
          )}
          {validation.touched.no && validation.errors.no && (
            <FormFeedback>{validation.errors.no as string}</FormFeedback>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="success-date-field" className="form-label">
            Başarı Tarihi
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Flatpickr
              className="form-control"
              value={validation.values.successDate ? new Date(validation.values.successDate) : ""}
              onChange={(dates) => {
                if (dates.length > 0) {
                  validation.setFieldValue("successDate", moment(dates[0]).format("YYYY-MM-DD HH:mm"), true);
                } else {
                  validation.setFieldValue("successDate", "", true);
                }
              }}
              options={{
                enableTime: true,
                time_24hr: true,
                dateFormat: "d/m/Y H:i",
                allowInput: true,
                disableMobile: true
              }}
              placeholder="Tarih Seçiniz"
            />
          ) : (
            <div>{validation.values.successDate}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="success-note-field" className="form-label">
            Başarı Notu
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <DebouncedInput
              name="successNote"
              id="success-note-field"
              className="form-control"
              type="textarea"
              rows={3}
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.successNote || ""}
              validation={validation}
            />
          ) : (
            <div>{validation.values.successNote}</div>
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
          {!isDetail ? (
            <Flatpickr
              className="form-control"
              value={validation.values.transactionDate ? new Date(validation.values.transactionDate) : ""}
              onChange={(dates) => {
                if (dates.length > 0) {
                  validation.setFieldValue("transactionDate", moment(dates[0]).format("YYYY-MM-DD HH:mm"), true);
                } else {
                  validation.setFieldValue("transactionDate", moment().format("YYYY-MM-DD HH:mm"), true);
                }
              }}
              options={{
                enableTime: true,
                time_24hr: true,
                dateFormat: "d/m/Y H:i",
                allowInput: true,
                disableMobile: true
              }}
              placeholder="Tarih Seçiniz"
            />
          ) : (
            <div>{validation.values.transactionDate}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3" style={{display: 'none'}}>
        <Col md={4}>
          <Label htmlFor="transaction-note-field" className="form-label">
            İşlem Notu
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <DebouncedInput
              name="transactionNote"
              id="transaction-note-field"
              className="form-control"
              type="textarea"
              rows={3}
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.transactionNote || ""}
              validation={validation}
            />
          ) : (
            <div>{validation.values.transactionNote}</div>
          )}
        </Col>
      </Row>
      
      {/* İptal Tarihi (Cancel Date) */}
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="cancel-date-field" className="form-label">
            İptal Tarihi
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Flatpickr
              className="form-control"
              value={validation.values.cancelDate ? new Date(validation.values.cancelDate) : ""}
              onChange={(dates) => {
                if (dates.length > 0) {
                  validation.setFieldValue("cancelDate", moment(dates[0]).format("YYYY-MM-DD HH:mm"), true);
                } else {
                  validation.setFieldValue("cancelDate", "", true);
                }
              }}
              options={{
                enableTime: true,
                time_24hr: true,
                dateFormat: "d/m/Y H:i",
                allowInput: true,
                disableMobile: true
              }}
              placeholder="Tarih Seçiniz"
            />
          ) : (
            <div>{validation.values.cancelDate}</div>
          )}
        </Col>
      </Row>
      
      {/* İptal Notu (Cancel Note) */}
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="cancel-note-field" className="form-label">
            İptal Notu
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <DebouncedInput
              name="cancelNote"
              id="cancel-note-field"
              className="form-control"
              type="textarea"
              rows={3}
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.cancelNote || ""}
              validation={validation}
            />
          ) : (
            <div>{validation.values.cancelNote}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="amount-field" className="form-label">
            Tutar
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
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
          ) : (
            <div>{validation.values.amount}</div>
          )}
          {validation.touched.amount && validation.errors.amount && (
            <FormFeedback>{validation.errors.amount as string}</FormFeedback>
          )}
        </Col>
      </Row>
    </>
  );
};

export default TransactionForm; 