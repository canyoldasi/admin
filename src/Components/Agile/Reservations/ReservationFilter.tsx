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
  initialFilters?: ReservationFilterState;
}

const ReservationFilter: React.FC<ReservationFilterProps> = ({
  onApply,
  loading,
  statuses,
  travelTypes,
  users,
  initialFilters = {
    text: "",
    statusIds: null,
    fromDate: null,
    toDate: null,
    assignedUserIds: null,
    typeIds: null, // travelTypeIds yerine typeIds olarak değiştirildi
    minAmount: null,
    maxAmount: null,
  },
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true); // Filtre paneli varsayılan olarak açık
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

  // Filter değerlerini yönet
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, text: e.target.value }));
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

  return (
    <div className="filter-container">
      <div className="filter-header">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="simple-search flex-grow-1 me-3">
            <Input
              type="text"
              placeholder="Arama yap..."
              value={filters.text}
              onChange={handleTextChange}
            />
          </div>
          <Button color="light" onClick={toggleFilterPanel}>
            <i className="ri-filter-line me-1"></i> Filtreler
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="advanced-filter-panel">
          <Form onSubmit={handleApplyFilters}>
            <Row>
              <Col md={3}>
                <FormGroup>
                  <Label>Durum</Label>
                  <Select
                    isMulti
                    placeholder="Durum seçin"
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
                  <Label>Seyahat Tipi</Label>
                  <Select
                    isMulti
                    placeholder="Seyahat tipi seçin"
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
                  <Label>Sorumlu</Label>
                  <Select
                    isMulti
                    placeholder="Sorumlu seçin"
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
                  <Label>Başlangıç Tarihi</Label>
                  <Flatpickr
                    className="form-control"
                    placeholder="Başlangıç tarihi"
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
            </Row>
            <Row className="mt-2">
              <Col md={3}>
                <FormGroup>
                  <Label>Bitiş Tarihi</Label>
                  <Flatpickr
                    className="form-control"
                    placeholder="Bitiş tarihi"
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
                  <Label>Min. Tutar</Label>
                  <Input
                    type="number"
                    placeholder="Min. tutar"
                    value={filters.minAmount || ""}
                    onChange={handleMinAmountChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Max. Tutar</Label>
                  <Input
                    type="number"
                    placeholder="Max. tutar"
                    value={filters.maxAmount || ""}
                    onChange={handleMaxAmountChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3} className="d-flex w-full  align-items-center pt-2.5">
                <div className="filter-buttons">
                  <Button 
                    type="submit" 
                    color="primary" 
                    className="me-2 flex-grow-1"
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : "Uygula"}
                  </Button>
                  <Button 
                    type="button" 
                    color="light" 
                    onClick={handleResetFilters}
                    disabled={loading}
                    className="flex-grow-1"
                  >
                    Sıfırla
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </div>
      )}
    </div>
  );
};

export default ReservationFilter;
