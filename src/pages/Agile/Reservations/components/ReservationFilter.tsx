import React, { useState } from "react";
import { Row, Col, Form, Input, Button, Spinner, Label, FormGroup } from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import moment from "moment";

// TransactionFilterState tanımlama
export interface ReservationFilterState {
  text: string;
  statusIds: string[] | null;
  fromDate: string | null;
  toDate: string | null;
  assignedUserIds: string[] | null;
  accountIds: string[] | null;
  typeIds: string[] | null; // travelTypeIds yerine typeIds olarak değiştirildi
  minAmount: number | null;
  maxAmount: number | null;
}

interface ReservationFilterProps {
  onApply: (filters: ReservationFilterState) => void;
  loading: boolean;
  statuses: Array<{ id: string; name: string; code?: string }>;
  travelTypes: Array<{ id: string; name: string }>;
  users: Array<{ id: string; fullName: string }>;
  accounts: Array<{ id: string; name: string }>;
  initialFilters?: ReservationFilterState;
}

const ReservationFilter: React.FC<ReservationFilterProps> = ({
  onApply,
  loading,
  statuses,
  travelTypes,
  users,
  accounts,
  initialFilters = {
    text: "",
    statusIds: null,
    fromDate: null,
    toDate: null,
    assignedUserIds: null,
    accountIds: null,
    typeIds: null, 
    minAmount: null,
    maxAmount: null,
  },
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [filters, setFilters] = useState<ReservationFilterState>(initialFilters);

  // Select için optionsları hazırla
  const statusOptions = statuses.map((status) => ({
    value: status.id,
    label: status.name,
  }));

  const typeOptions = travelTypes.map((type) => ({
    value: type.id,
    label: type.name,
  }));

  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  // Text search için case sensitive regex oluştur
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ 
      ...prev, 
      text: value
    }));
  };

  // Enter tuşu ile arama yapma
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyFilters(e as any);
    }
  };

  const handleStatusChange = (options: any) => {
    setFilters((prev) => ({
      ...prev,
      statusIds: options ? options.map((option: any) => option.value) : null,
    }));
  };

  const handleTypeChange = (options: any) => {
    setFilters((prev) => ({
      ...prev,
      typeIds: options ? options.map((option: any) => option.value) : null, // travelTypeIds yerine typeIds olarak değiştirildi
    }));
  };

  const handleUserChange = (options: any) => {
    setFilters((prev) => ({
      ...prev,
      assignedUserIds: options ? options.map((option: any) => option.value) : null,
    }));
  };

  const handleAccountChange = (options: any) => {
    setFilters((prev) => ({
      ...prev,
      accountIds: options ? options.map((option: any) => option.value) : null,
    }));
  };

  const handleFromDateChange = (dates: Date[]) => {
    if (dates.length > 0) {
      const formattedDate = moment(dates[0]).format("YYYY-MM-DD");
      setFilters((prev) => ({
        ...prev,
        fromDate: formattedDate,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        fromDate: null,
      }));
    }
  };

  const handleToDateChange = (dates: Date[]) => {
    if (dates.length > 0) {
      const formattedDate = moment(dates[0]).format("YYYY-MM-DD");
      setFilters((prev) => ({
        ...prev,
        toDate: formattedDate,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        toDate: null,
      }));
    }
  };

  const handleMinAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null;
    setFilters((prev) => ({ ...prev, minAmount: value }));
  };

  const handleMaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null;
    setFilters((prev) => ({ ...prev, maxAmount: value }));
  };

  // Filtre uygula
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };

  // Filtreleri sıfırla
  const handleResetFilters = () => {
    const resetFilters: ReservationFilterState = {
      text: "",
      statusIds: null,
      fromDate: null,
      toDate: null,
      assignedUserIds: null,
      accountIds: null,
      typeIds: null, // travelTypeIds yerine typeIds olarak değiştirildi
      minAmount: null,
      maxAmount: null,
    };
    setFilters(resetFilters);
    onApply(resetFilters);
  };

  // Filtre panelini aç/kapat
  const toggleFilterPanel = () => {
    setIsOpen(!isOpen);
  };

  // Seçilmiş durum değerleri
  const selectedStatusOptions = statusOptions.filter(
    (option) => filters.statusIds && filters.statusIds.includes(option.value)
  );

  // Seçilmiş seyahat tipi değerleri
  const selectedTypeOptions = typeOptions.filter(
    (option) => filters.typeIds && filters.typeIds.includes(option.value) // travelTypeIds yerine typeIds olarak değiştirildi
  );

  // Seçilmiş kullanıcı değerleri
  const selectedUserOptions = userOptions.filter(
    (option) => filters.assignedUserIds && filters.assignedUserIds.includes(option.value)
  );

  // Seçilmiş hesap değerleri
  const selectedAccountOptions = accountOptions.filter(
    (option) => filters.accountIds && filters.accountIds.includes(option.value)
  );

  return (
    <div className="filter-container">
      <div className="filter-header">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className={`d-flex ${!isOpen ? 'w-100' : 'w-75'}`}>
            <div className={`simple-search ${!isOpen ? 'flex-grow-1 me-3' : 'flex-grow-1 me-3'}`}>
              <Input
                type="text"
                placeholder="Enter Reservation Number"
                value={filters.text}
                onChange={handleTextChange}
                onKeyPress={handleKeyPress}
              />
            </div>
            {!isOpen && (
              <div className="d-flex gap-2 ">
                <Button 
                  type="button" 
                  color="primary"
                  onClick={handleApplyFilters}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : "LIST"}
                </Button>
                <Button 
                  type="button" 
                  color="light"
                  onClick={handleResetFilters}
                  disabled={loading}
                  className="mr-2"
                >
                  CLEAR
                </Button>
              </div>
            )}
          </div>
          <Button color="light" onClick={toggleFilterPanel}>
            <i className={`ri-${isOpen ? 'filter-line' : 'filter-line'} me-1 ${!isOpen ? '' : 'ml-2'}`}></i>
            {isOpen ? 'CLOSE FILTERS' : 'FILTERS'}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="advanced-filter-panel">
          <Form onSubmit={handleApplyFilters}>
            <Row>
              <Col md={3}>
                <FormGroup>
                  <Label>Status</Label>
                  <Select
                    isMulti
                    placeholder=""
                    options={statusOptions}
                    value={selectedStatusOptions}
                    onChange={handleStatusChange}
                    className="react-select"
                    classNamePrefix="select"
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Reservation Type</Label>
                  <Select
                    isMulti
                    placeholder=""
                    options={typeOptions}
                    value={selectedTypeOptions}
                    onChange={handleTypeChange}
                    className="react-select"
                    classNamePrefix="select"
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Assigned User</Label>
                  <Select
                    isMulti
                    placeholder=""
                    options={userOptions}
                    value={selectedUserOptions}
                    onChange={handleUserChange}
                    className="react-select"
                    classNamePrefix="select"
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Account</Label>
                  <Select
                    isMulti
                    placeholder=""
                    options={accountOptions}
                    value={selectedAccountOptions}
                    onChange={handleAccountChange}
                    className="react-select"
                    classNamePrefix="select"
                  />
                </FormGroup>
              </Col>
            </Row>
            <Row className="mt-2">
              <Col md={3}>
                <FormGroup>
                  <Label>Pickup Date (Start)</Label>
                  <Flatpickr
                    className="form-control"
                    placeholder=""
                    options={{
                      dateFormat: "d/m/Y",
                      altInput: true,
                      altFormat: "d/m/Y",
                      locale: {
                        firstDayOfWeek: 1
                      }
                    }}
                    value={filters.fromDate || undefined}
                    onChange={handleFromDateChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Dropoff Date (End)</Label>
                  <Flatpickr
                    className="form-control"
                    placeholder=""
                    options={{
                      dateFormat: "d/m/Y",
                      altInput: true,
                      altFormat: "d/m/Y",
                      locale: {
                        firstDayOfWeek: 1
                      }
                    }}
                    value={filters.toDate || undefined}
                    onChange={handleToDateChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Amount (Start)</Label>
                  <Input
                    type="number"
                    placeholder=""
                    value={filters.minAmount || ""}
                    onChange={handleMinAmountChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Amount (End)</Label>
                  <Input
                    type="number"
                    placeholder=""
                    value={filters.maxAmount || ""}
                    onChange={handleMaxAmountChange}
                  />
                </FormGroup>
              </Col>
              <Col md={12} className="d-flex justify-content-end gap-2 mt-3">
                <Button 
                  type="submit" 
                  color="primary"
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : "LIST"}
                </Button>
                <Button 
                  type="button" 
                  color="light"
                  onClick={handleResetFilters}
                  disabled={loading}
                >
                  CLEAR
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      )}
    </div>
  );
};

export default ReservationFilter;
