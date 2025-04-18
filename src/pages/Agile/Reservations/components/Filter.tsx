import React, { useState } from "react";
import { Row, Col, Form, Input, Button, Spinner, Label, FormGroup } from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import moment from "moment";
import { useLazyQuery } from '@apollo/client';
import { GET_TRANSACTIONS, GET_TRANSACTIONS_AS_EXCEL } from '../../../../graphql/queries/transactionQueries';
import { toast } from 'react-toastify';

// TransactionFilterState tanımlama
export interface ReservationFilterState {
  text: string;
  statusIds: string[] | null;
  transactionDateStart: string | null;
  transactionDateEnd: string | null;
  accountIds: string[] | null;
  typeIds: string[] | null; // travelTypeIds yerine typeIds olarak değiştirildi
}

interface ReservationFilterProps {
  onApply: (filters: ReservationFilterState) => void;
  onExportToExcel: () => void;
  loading: boolean;
  statuses: Array<{ id: string; name: string; code?: string }>;
  travelTypes: Array<{ id: string; name: string }>;
  users: Array<{ id: string; fullName: string }>;
  accounts: Array<{ id: string; name: string }>;
  initialFilters?: ReservationFilterState;
}

const ReservationFilter: React.FC<ReservationFilterProps> = ({
  onApply,
  onExportToExcel,
  loading,
  statuses,
  travelTypes,
  users,
  accounts,
  initialFilters = {
    text: "",
    statusIds: null,
    transactionDateStart: null,
    transactionDateEnd: null,
    accountIds: null,
    typeIds: null, 
  },
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
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
      const formattedDate = moment(dates[0]).format("YYYY-MM-DD HH:mm");
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
      const formattedDate = moment(dates[0]).format("YYYY-MM-DD HH:mm");
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
      transactionDateStart: null,
      transactionDateEnd: null,
      accountIds: null,
      typeIds: null, // travelTypeIds yerine typeIds olarak değiştirildi
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

  // Seçilmiş hesap değerleri
  const selectedAccountOptions = accountOptions.filter(
    (option) => filters.accountIds && filters.accountIds.includes(option.value)
  );

  return (
    <div className="filter-container">
      <div className="filter-header">
        <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
          <div className={`d-flex ${!isOpen ? 'w-100' : 'w-100'}`}>
            <div className={`simple-search ${!isOpen ? 'flex-grow-1 me-3' : 'flex-grow-1 me-3'}`}>
              <Input
                type="text"
                placeholder="Search by reservation number, flight number or passenger name"
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
              </div>
            )}
          </div>
          <Button color="light" className="no-wrap" onClick={toggleFilterPanel}>
            <i className={`ri-${isOpen ? 'filter-line' : 'filter-line'} me-1 ${!isOpen ? '' : 'ml-2'}`}></i>
            {
                isOpen 
                ? 
                <>FILTERS<i className="ri-arrow-up-s-line fw-bold" /></>
                : <>FILTERS<i className="ri-arrow-down-s-line fw-bold" /></>
            }
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="advanced-filter-panel">
          <Form onSubmit={handleApplyFilters}>
            <Row>
              <Col md={3}>
                <FormGroup>
                  <Select
                    isMulti
                    placeholder="Status"
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
                  <Select
                    isMulti
                    placeholder="Reservation Type"
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
                    {localStorage.getItem('role_code') !== 'vendor' ? (
                        <Select
                            isMulti
                            placeholder="Assigned Vendor Account"
                            options={accountOptions}
                            value={selectedAccountOptions}
                            onChange={handleAccountChange}
                            className="react-select"
                            classNamePrefix="select"
                        />
                    ) : ''}
                </FormGroup>
              </Col>
              <Col md={3} className="justify-content-end gap-2">
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
                <Button
                  color="success"
                  onClick={onExportToExcel}
                  disabled={loading}
                >
                  LIST AS EXCEL
                </Button>
              </Col>
            </Row>
            <Row className="mt-2">
              <Col md={3}>
                <FormGroup>
                  <Flatpickr
                    className="form-control"
                    placeholder="Pickup Date (Start)"
                    options={{
                      dateFormat: "d/m/Y H:i",
                      altInput: true,
                      altFormat: "d/m/Y H:i",
                      enableTime: true,
                      time_24hr: true,
                      locale: {
                        firstDayOfWeek: 1
                      }
                    }}
                    value={filters.transactionDateStart ? moment(filters.transactionDateStart, "YYYY-MM-DD HH:mm").format("DD/MM/YYYY HH:mm") : undefined}
                    onChange={handleFromDateChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Flatpickr
                    className="form-control"
                    placeholder="Pickup Date (End)"
                    options={{
                      dateFormat: "d/m/Y H:i",
                      altInput: true,
                      altFormat: "d/m/Y H:i",
                      enableTime: true,
                      time_24hr: true,
                      locale: {
                        firstDayOfWeek: 1
                      }
                    }}
                    value={filters.transactionDateEnd ? moment(filters.transactionDateEnd, "YYYY-MM-DD HH:mm").format("DD/MM/YYYY HH:mm") : undefined}
                    onChange={handleToDateChange}
                  />
                </FormGroup>
              </Col>
            </Row>
          </Form>
        </div>
      )}
    </div>
  );
};

export default ReservationFilter;
