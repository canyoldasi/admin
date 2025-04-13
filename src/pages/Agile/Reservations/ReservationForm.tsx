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

// Define props for the ReservationForm component
export interface FormProps {
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

const ReservationForm: React.FC<FormProps> = ({
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
            Account
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
            Status
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
          <Label htmlFor="no-field" className="form-label">
            Reservation No
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
          <Label htmlFor="name-field" className="form-label">
            Passenger Name
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Input
              name="name"
              id="name-field"
              className="form-control"
              type="text"
              onChange={validation.handleChange}
              onBlur={validation.handleBlur}
              value={validation.values.name}
              invalid={validation.touched.name && validation.errors.name ? true : false}
            />
          ) : (
            <div>{validation.values.name}</div>
          )}
          {validation.touched.name && validation.errors.name && (
            <FormFeedback>{validation.errors.name as string}</FormFeedback>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="phone-field" className="form-label">
            Passenger Phone
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Input
              name="phone"
              id="phone-field"
              className="form-control"
              type="text"
              onChange={validation.handleChange}
              onBlur={validation.handleBlur}
              value={validation.values.phone}
              invalid={validation.touched.phone && validation.errors.phone ? true : false}
            />
          ) : (
            <div>{validation.values.phone}</div>
          )}
          {validation.touched.phone && validation.errors.phone && (
            <FormFeedback>{validation.errors.phone as string}</FormFeedback>
          )}
        </Col>
      </Row>

      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="quantity-field" className="form-label">
            Passenger Count
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Input
              name="quantity"
              id="quantity-field"
              className="form-control"
              type="number"
              onChange={validation.handleChange}
              onBlur={validation.handleBlur}
              value={validation.values.quantity}
              invalid={validation.touched.quantity && validation.errors.quantity ? true : false}
            />
          ) : (
            <div>{validation.values.quantity}</div>
          )}
          {validation.touched.quantity && validation.errors.quantity && (
            <FormFeedback>{validation.errors.quantity as string}</FormFeedback>
          )}
        </Col>
      </Row>

      {/* Products Field */}
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="products-field" className="form-label">
            Service
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <Select
              options={productOptions}
              isMulti={true}
              name="products"
              onChange={(selected: any) =>
                safelyUpdateFormField("products", selected || [])
              }
              value={validation.values.products}
              placeholder=""
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
            Note
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
          <Label htmlFor="from-field" className="form-label">
            From
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <DebouncedInput
              name="from"
              id="from-field"
              className="form-control"
              type="textarea"
              rows={3}
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.from || ""}
              validation={validation}
            />
          ) : (
            <div>{validation.values.from}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="to-field" className="form-label">
            To
          </Label>
        </Col>
        <Col md={8}>
          {!isDetail ? (
            <DebouncedInput
              name="to"
              id="to-field"
              className="form-control"
              type="textarea"
              rows={3}
              onChange={debouncedHandleChange}
              onBlur={validation.handleBlur}
              value={validation.values.to || ""}
              validation={validation}
            />
          ) : (
            <div>{validation.values.to}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="transactionDate-field" className="form-label">
            Scheduled Date
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
              placeholder="Select Date"
            />
          ) : (
            <div>{validation.values.transactionDate}</div>
          )}
        </Col>
      </Row>
      
      <Row className="mb-3" style={{display: 'none'}}>
        <Col md={4}>
          <Label htmlFor="transaction-note-field" className="form-label">
            Note
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
      
      <Row className="mb-3">
        <Col md={4}>
          <Label htmlFor="amount-field" className="form-label">
            Amount
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

export default ReservationForm; 