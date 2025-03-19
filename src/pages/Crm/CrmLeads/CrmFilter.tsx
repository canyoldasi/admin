import React, { useState, useEffect } from "react";
import { Offcanvas, OffcanvasHeader, OffcanvasBody, Label, Input } from "reactstrap";
import Flatpickr from "react-flatpickr";
import Select from "react-select";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { accessToken } from "../../../helpers/jwt-token-access/accessToken";

export interface FilterState {
  title: string;
  dateRange: Date[] | null;
  roles: { label: string; value: string }[];
  status: { label: string; value: string } | null;
}

interface FilterProps {
  show: boolean;
  onCloseClick: () => void;
  onFilterApply: (filters: FilterState) => void;
}

const CrmFilter: React.FC<FilterProps> = ({ show, onCloseClick, onFilterApply }) => {
  const [filters, setFilters] = useState<FilterState>({
    title: "",
    dateRange: null,
    roles: [],
    status: null,
  });
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Rol listesini dinamik çekmek için state
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await axios.post(
          apiUrl,
          { query: `query { getRoles(dto: {text:""}) { id name } }` },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `${accessToken}`,
            },
          }
        );
        const rolesData = response.data.getRoles;
        if (rolesData) {
          setRoleOptions(rolesData.map((role: any) => ({ value: role.id, label: role.name })));
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    }
    fetchRoles();
  }, [location]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const title = queryParams.get('title') || "";
    const dateRangeParam = queryParams.get('dateRange');
    const dateRange = dateRangeParam
      ? dateRangeParam.split(',').map(date => new Date(date))
      : null;
    const roles = queryParams.get('roles')
      ? queryParams.get('roles')!.split(',').map(roleId => {
          const matched = roleOptions.find((r) => r.value === roleId);
          return matched ? { label: matched.label, value: matched.value } : { label: roleId, value: roleId };
        })
      : [];
    const status = queryParams.get('status')
      ? { label: queryParams.get('status')!, value: queryParams.get('status')! }
      : null;
    setFilters({ title, dateRange, roles, status });
    if (dateRange && dateRange.length === 2) {
      setStartDate(dateRange[0]);
      setEndDate(dateRange[1]);
    }
  }, [location.search, roleOptions]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilterSubmit = () => {
    const updatedFilters: FilterState = {
      ...filters,
      dateRange: (startDate || endDate) ? [startDate, endDate].filter(Boolean) as Date[] : null,
    };
  
    const params = new URLSearchParams();
    if (updatedFilters.title) params.set("title", updatedFilters.title);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    if (updatedFilters.roles.length > 0)
      params.set("roles", updatedFilters.roles.map(role => role.value).join(","));
    if (updatedFilters.status) params.set("status", updatedFilters.status.value);
  
    navigate({
      pathname: location.pathname,
      search: params.toString(),
    });
  
   
    onFilterApply(updatedFilters);
  };
  
  const handleStartDateChange = (date: Date[]) => {
    if (date[0]) setStartDate(date[0]);
  };

  const handleEndDateChange = (date: Date[]) => {
    if (date[0]) setEndDate(date[0]);
  };

  const handleClearFilters = () => {
    setFilters({ title: "", dateRange: null, roles: [], status: null });
    setStartDate(null);
    setEndDate(null);
    navigate({ pathname: location.pathname, search: '' });
  };

  return (
    <Offcanvas direction="end" isOpen={show} toggle={onCloseClick}>
      <OffcanvasHeader className="bg-light" toggle={onCloseClick}>
        Filtreler
      </OffcanvasHeader>
      <form className="d-flex flex-column justify-content-end h-100">
        <OffcanvasBody>
          <div className="mb-4">
            <Label className="form-label text-muted fw-semibold mb-3">
              İÇİNDE GEÇEN
            </Label>
            <Input
              type="text"
              placeholder="Arayın"
              value={filters.title}
              onChange={(e) => handleFilterChange("title", e.target.value)}
            />
          </div>
          <div className="mb-4">
            <Label className="form-label text-muted fw-semibold mb-3">
              TARİH ARALIĞI
            </Label>
            <Flatpickr
              className="form-control mb-3"
              placeholder="Başlangıç Tarihi"
              value={startDate || ""}
              options={{ mode: "single", dateFormat: "d.m.y" }}
              onChange={handleStartDateChange}
            />
            <Flatpickr
              className="form-control"
              placeholder="Bitiş Tarihi"
              value={endDate || ""}
              options={{ mode: "single", dateFormat: "d.m.y" }}
              onChange={handleEndDateChange}
            />
          </div>
          <div className="mb-4">
            <Label className="form-label text-muted text-uppercase fw-semibold mb-3">
              Roller
            </Label>
            <Select
              options={roleOptions}
              isMulti
              value={filters.roles}
              onChange={(selected: any) => handleFilterChange("roles", selected)}
              placeholder="Seçiniz"
            />
          </div>
          <div className="mb-4">
            <Label className="form-label text-muted text-uppercase fw-semibold mb-3">
              Durum
            </Label>
            <Select
              options={[
                { value: "Aktif", label: "Aktif" },
                { value: "Pasif", label: "Pasif" },
              ]}
              value={filters.status}
              onChange={(selected: any) => handleFilterChange("status", selected)}
              placeholder="Seçiniz"
            />
          </div>
        </OffcanvasBody>
        <div className="offcanvas-footer border-top p-3 text-center hstack gap-2">
          <button
            type="button"
            className="btn btn-light w-100"
            onClick={handleClearFilters}
          >
            Temizle
          </button>
          <button
            type="button"
            className="btn btn-success w-100"
            onClick={handleFilterSubmit}
          >
            Filtrele
          </button>
        </div>
      </form>
    </Offcanvas>
  );
};

export default CrmFilter;
