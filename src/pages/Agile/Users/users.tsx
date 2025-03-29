import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Row, Col, Label, Input, Button } from "reactstrap";
import Flatpickr from "react-flatpickr";
import Select from "react-select";
import { useLocation, useNavigate } from "react-router-dom";
import { useLazyQuery } from "@apollo/client";
import { toast } from "react-toastify";
import { GET_ROLES } from "../../../graphql/queries/userQueries";
import { SelectOption, UserFilterState } from "../../../types/graphql";
import DebouncedInput from "../../../Components/Common/DebouncedInput";

interface FilterProps {
  show: boolean;
  onCloseClick: () => void;
  onFilterApply: (filters: UserFilterState) => Promise<any[]>;
}

const UserFilter: React.FC<FilterProps> = ({ show, onCloseClick, onFilterApply }) => {
  const [filters, setFilters] = useState<UserFilterState>({
    title: "",
    dateRange: null,
    roles: [],
    status: null,
  });
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Add loading state for buttons
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Roller listesini dinamik çekmek için state
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  
  // Use Apollo Client to fetch roles
  const [getRoles, { loading: rolesLoading }] = useLazyQuery(GET_ROLES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.getRoles) {
        // Tüm rolleri seçmek için boş bir seçenek ekleyerek roleOptions'ı ayarlayın
        const allRoles: SelectOption[] = [
          { value: "", label: "Tümü" },
          ...data.getRoles.map((role: { id: string; name: string }) => ({
            value: role.id,
            label: role.name,
          })),
        ];
        setRoleOptions(allRoles);
      }
    },
    onError: (error) => {
      console.error("Error fetching roles:", error);
      toast.error("Roller yüklenirken bir hata oluştu");
    }
  });

  useEffect(() => {
    if (show) {
      // Fetch roles when the filter panel is shown
      getRoles({
        variables: {
          input: {
            permissions: ["UserRead"],
            pageSize: 10,
            pageIndex: 0
          },
        },
      });
    }
  }, [getRoles, show]);

  useEffect(() => {
    // Panel açıldığında URL parametrelerinden filtre değerlerini yükle
    if (show) {
      console.log("Filtre paneli açıldı, filtre değerleri yükleniyor...");
      
      // URL parametrelerinden filtre değerlerini yükle
      const queryParams = new URLSearchParams(location.search);
      
      // Başlık parametresi
      const title = queryParams.get('title') || "";
      
      // Tarih aralığı parametreleri
      const createdAtStart = queryParams.get('createdAtStart');
      const createdAtEnd = queryParams.get('createdAtEnd');
      let dateRange = null;
      if (createdAtStart || createdAtEnd) {
        const newDateRange = [];
        if (createdAtStart) {
          const startDate = new Date(createdAtStart);
          newDateRange.push(startDate);
          setStartDate(startDate);
        } else {
          setStartDate(null);
        }
        
        if (createdAtEnd) {
          const endDate = new Date(createdAtEnd);
          newDateRange.push(endDate);
          setEndDate(endDate);
        } else {
          setEndDate(null);
        }
        
        if (newDateRange.length > 0) {
          dateRange = newDateRange;
        }
      } else {
        setStartDate(null);
        setEndDate(null);
      }
      
      // Roller parametresi - roleOptions değiştiğinde yeniden değerlendirme yapılacak
      const rolesParam = queryParams.get('roles');
      let roles: SelectOption[] = [];
      if (rolesParam && roleOptions.length > 0) {
        const roleIds = rolesParam.split(',');
        roles = roleIds
          .map(roleId => {
            const matched = roleOptions.find(r => r.value === roleId);
            return matched ? matched : null;
          })
          .filter(Boolean) as SelectOption[];
        
        console.log("URL'den alınan roller:", roles);
      }
      
      // Durum parametresi - sıralama ve sayfa değişiminde korunması için güçlendirildi
      const statusParam = queryParams.get('status');
      let status: SelectOption | null = null;
      
      if (statusParam) {
        console.log("URL'den durum parametresi okundu:", statusParam);
        
        // Status değerini doğrudan Aktif/Pasif formatına dönüştür
        if (statusParam.toLowerCase() === "aktif" || statusParam.toLowerCase() === "true") {
          status = {
            label: "Aktif",
            value: "Aktif"
          };
        } else {
          status = {
            label: "Pasif",
            value: "Pasif"
          };
        }
        console.log("Durum değeri ayarlandı:", status);
      } else {
        console.log("URL'de durum parametresi bulunamadı, status null olarak ayarlandı");
      }
      
      // Form değerlerini güncelle
      const newFilters: UserFilterState = { 
        title: title || "", 
        dateRange: dateRange || null, 
        roles: roles.length > 0 ? roles : [], 
        status: status || null
      };
      console.log("Filtre değerleri güncelleniyor:", newFilters);
      setFilters(newFilters);
      
      // Debug için mevcut form değerlerini konsola yazdır
      console.log("Güncellenmiş filtre değerleri:", { 
        title: newFilters.title, 
        dateRange: newFilters.dateRange, 
        roles: newFilters.roles, 
        status: newFilters.status, 
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null
      });
    }
  }, [location.search, roleOptions, show]);

  const handleFilterChange = (key: keyof UserFilterState, value: any) => {
    if (key === "roles" && Array.isArray(value)) {
      // Eğer "Tümü" seçeneği varsa, o zaman tüm rolleri getir
      const hasAllRolesOption = value.some(option => option.value === "");
      
      if (hasAllRolesOption) {
        // "Tümü" seçildiyse, diğer rol seçimlerini kaldırıp boş bir dizi olarak ayarla
        // Bu, API tarafından tüm rollerin getirilmesini sağlayacak
        setFilters(prev => ({ ...prev, [key]: [] }));
        return;
      }
    }
    
    // Filtreyi güncelle
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
  };

  const handleFilterSubmit = async () => {
    // Set loading state
    setIsSubmitting(true);
    
    try {
      // Tarih kontrolü: Başlangıç tarihi bitiş tarihinden sonra olamaz
      if (startDate && endDate && startDate > endDate) {
        toast.error("Başlangıç tarihi, bitiş tarihinden sonra olamaz");
        setIsSubmitting(false);
        return;
      }

      console.log("Filtre uygulanmadan önce startDate:", startDate);
      console.log("Filtre uygulanmadan önce endDate:", endDate);

      // Tarih aralığını düzgün oluşturalım
      let dateRange = null;
      if (startDate || endDate) {
        // Tek bir tarih seçilmişse, onu hem başlangıç hem bitiş tarihi olarak kullanabiliriz
        if (startDate && !endDate) {
          // Tek tarih seçildiğinde, başlangıç tarihi kullanılır ancak bitiş tarihi olarak tam bir gün sonrası kullanılır
          const nextDay = new Date(startDate);
          nextDay.setDate(nextDay.getDate() + 1);
          dateRange = [startDate, nextDay]; 
          console.log("Sadece başlangıç tarihi seçildi, bitiş tarihi bir gün sonrası olarak ayarlandı:", dateRange);
        } else if (!startDate && endDate) {
          // Tek tarih seçildiğinde, bitiş tarihi kullanılır ancak başlangıç tarihi olarak tam bir gün öncesi kullanılır
          const prevDay = new Date(endDate);
          prevDay.setDate(prevDay.getDate() - 1);
          dateRange = [prevDay, endDate];
          console.log("Sadece bitiş tarihi seçildi, başlangıç tarihi bir gün öncesi olarak ayarlandı:", dateRange);
        } else {
          dateRange = [startDate, endDate].filter(Boolean) as Date[];
          console.log("Başlangıç ve bitiş tarihi seçildi, dateRange:", dateRange);
        }
      } else {
        console.log("Tarih seçilmedi, dateRange: null");
      }
      
      const updatedFilters: UserFilterState = {
        ...filters,
        dateRange,
      };

      // Mevcut URL parametrelerini alalım
      const currentParams = new URLSearchParams(location.search);
      const params = new URLSearchParams();
      
      // Mevcut sıralama parametrelerini koru
      const orderBy = currentParams.get("orderBy");
      const orderDirection = currentParams.get("orderDirection");
      const pageSize = currentParams.get("pageSize");
      const pageIndex = currentParams.get("pageIndex");
      
      if (orderBy) params.set("orderBy", orderBy);
      if (orderDirection) params.set("orderDirection", orderDirection);
      if (pageSize) params.set("pageSize", pageSize);
      if (pageIndex) params.set("pageIndex", pageIndex);
      
      // Başlık parametresi
      if (updatedFilters.title) params.set("title", updatedFilters.title);
      
      // Tarih aralığı parametreleri - ISO formatına dönüştürme
      if (startDate) {
        // Doğru tarih formatını oluşturalım
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0'); // Ay 0-11 arası, +1 ekleyin
        const day = String(startDate.getDate()).padStart(2, '0');
        const startDateStr = `${year}-${month}-${day}`;
        
        params.set("createdAtStart", startDateStr);
        console.log("URL'ye eklenen createdAtStart:", startDateStr);
      }
      
      if (endDate) {
        // Doğru tarih formatını oluşturalım
        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0'); // Ay 0-11 arası, +1 ekleyin
        const day = String(endDate.getDate()).padStart(2, '0');
        const endDateStr = `${year}-${month}-${day}`;
        
        params.set("createdAtEnd", endDateStr);
        console.log("URL'ye eklenen createdAtEnd:", endDateStr);
      }
      
      // Roller parametresi
      if (updatedFilters.roles && updatedFilters.roles.length > 0) {
        params.set("roles", updatedFilters.roles.map(role => role.value).join(","));
      }
      
      // Durum parametresi
      if (updatedFilters.status) params.set("status", updatedFilters.status.value);

      console.log("Filtre uygulanıyor:", updatedFilters);
      
      // Direkt fonksiyonu çağıralım
      const results = await onFilterApply(updatedFilters);
      console.log("Filtre sonuçları:", results);
      
      // Eğer sonuç başarılıysa ve veri döndüyse, URL güncelleyelim
      if (Array.isArray(results)) {
        navigate({
          pathname: location.pathname,
          search: params.toString(),
        }, { replace: true });
      } else {
        console.log("Sonuçlar boş, URL güncellenmedi");
      }
      
      // Filtre uygulandıktan sonra modalı kapatalım ki kullanıcı filtre sonuçlarını görsün
      onCloseClick();
    } catch (error) {
      console.error("Filtre uygulama hatası:", error);
      toast.error("Filtre uygulanırken bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartDateChange = (date: Date[]) => {
    if (date[0]) {
      const selectedDate = new Date(date[0]);
      // Gün başlangıcını ayarla, ancak yerel saat dilimine göre
      selectedDate.setHours(0, 0, 0, 0);
      
      // Tarihin gün, ay, yıl değerlerini doğrudan alalım
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      
      // Yeni bir tarih nesnesi oluşturalım - bu şekilde GMT sapması olmayacak
      const correctedDate = new Date(year, month, day, 0, 0, 0, 0);
      
      setStartDate(correctedDate);
      console.log("Başlangıç tarihi değişti:", correctedDate, "ISO:", correctedDate.toISOString());
    } else {
      setStartDate(null);
      console.log("Başlangıç tarihi temizlendi");
    }
  };

  const handleEndDateChange = (date: Date[]) => {
    if (date[0]) {
      const selectedDate = new Date(date[0]);
      // Gün sonunu ayarla, ancak yerel saat dilimine göre
      selectedDate.setHours(23, 59, 59, 999);
      
      // Tarihin gün, ay, yıl değerlerini doğrudan alalım
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      
      // Yeni bir tarih nesnesi oluşturalım - bu şekilde GMT sapması olmayacak
      const correctedDate = new Date(year, month, day, 23, 59, 59, 999);
      
      setEndDate(correctedDate);
      console.log("Bitiş tarihi değişti:", correctedDate, "ISO:", correctedDate.toISOString());
    } else {
      setEndDate(null);
      console.log("Bitiş tarihi temizlendi");
    }
  };

  const handleClearFilters = async () => {
    // Set loading state
    setIsClearing(true);
    
    try {
      // Filtreleri sıfırla
      const emptyFilters: UserFilterState = { title: "", dateRange: null, roles: [], status: null };
      setFilters(emptyFilters);
      setStartDate(null);
      setEndDate(null);
      
      // Mevcut URL parametrelerini alalım
      const currentParams = new URLSearchParams(location.search);
      const params = new URLSearchParams();
      
      // Mevcut sıralama ve sayfalama parametrelerini koru
      const orderBy = currentParams.get("orderBy");
      const orderDirection = currentParams.get("orderDirection");
      const pageSize = currentParams.get("pageSize");
      const pageIndex = currentParams.get("pageIndex");
      
      if (orderBy) params.set("orderBy", orderBy);
      if (orderDirection) params.set("orderDirection", orderDirection);
      if (pageSize) params.set("pageSize", pageSize);
      if (pageIndex) params.set("pageIndex", pageIndex);
      
      // Temizlik işlemini uygula ve sonuçları göster
      await onFilterApply(emptyFilters);
      
      // URL'yi güncelle
      navigate({
        pathname: location.pathname,
        search: params.toString()
      }, { replace: true });
      
      // Modalı kapat
      onCloseClick();
    } catch (error) {
      console.error("Filtre temizleme hatası:", error);
      toast.error("Filtreler temizlenirken bir hata oluştu");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="mb-3">
      <CardBody>
        <Row className="align-items-end">
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted fw-semibold">
                İÇİNDE GEÇEN
              </Label>
              <DebouncedInput
                type="text"
                placeholder="Arayın"
                value={filters.title}
                onChange={(e) => handleFilterChange("title", e.target.value)}
              />
            </div>
          </Col>
          <Col md={4}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted fw-semibold d-block">
                EKLENME TARİHİ (BAŞLANGIÇ)
              </Label>
              <Flatpickr
                className="form-control"
                placeholder="Başlangıç Tarihi"
                value={startDate || ""}
                options={{ mode: "single", dateFormat: "d/m/Y" }}
                onChange={handleStartDateChange}
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted fw-semibold d-block">
                EKLENME TARİHİ (BİTİŞ)
              </Label>
              <Flatpickr
                className="form-control"
                placeholder="Bitiş Tarihi"
                value={endDate || ""}
                options={{ mode: "single", dateFormat: "d/m/Y" }}
                onChange={handleEndDateChange}
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
                  // Access window object safely
                  const event = new CustomEvent('UsersAddClick');
                  window.dispatchEvent(event);
                }
              }}
            >
              <i className="ri-add-line align-bottom me-1"></i> Ekle
            </Button>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md={3}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                DURUM
              </Label>
              <Select
                options={[
                  { value: "", label: "Tümü" },
                  { value: "Aktif", label: "Aktif" },
                  { value: "Pasif", label: "Pasif" },
                ]}
                value={filters.status}
                onChange={(selected: SelectOption | null) => {
                  // Eğer "Tümü" seçeneği seçildiyse (boş string), null olarak ayarla
                  if (selected && selected.value === "") {
                    handleFilterChange("status", null);
                  } else {
                    handleFilterChange("status", selected);
                  }
                }}
                placeholder="Seçiniz"
                className="w-100"
              />
            </div>
          </Col>
          <Col md={4}>
            <div className="mb-3 mb-md-0">
              <Label className="form-label text-muted text-uppercase fw-semibold">
                ROLLER
              </Label>
              <Select
                options={roleOptions}
                isMulti
                isClearable
                value={filters.roles}
                onChange={(selected: SelectOption[] | null) => handleFilterChange("roles", selected || [])}
                placeholder="Seçiniz"
                noOptionsMessage={() => "Rol bulunamadı"}
                formatGroupLabel={(data: { label: string; options: any[] }) => (
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{data.label}</span>
                    <span className="badge bg-primary">{data.options.length}</span>
                  </div>
                )}
                isLoading={rolesLoading}
              />
            </div>
          </Col>
          <Col className="text-end align-self-end ms-auto">
            <Button 
              className="px-4"
              style={{ backgroundColor: "#5EA3CB", color: "white", border: "none" }}
              onClick={handleFilterSubmit}
              disabled={isSubmitting}
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

export default UserFilter;
export type { UserFilterState };
