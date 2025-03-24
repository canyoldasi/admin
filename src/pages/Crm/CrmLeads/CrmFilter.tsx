import React, { useState, useEffect } from "react";
import { Offcanvas, OffcanvasHeader, OffcanvasBody, Label, Input } from "reactstrap";
import Flatpickr from "react-flatpickr";
import Select from "react-select";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { accessToken } from "../../../helpers/jwt-token-access/accessToken";
import { toast } from "react-toastify";

// LocalStorage anahtar tanımı
const FILTER_STORAGE_KEY = "crm_leads_filters";

export interface FilterState {
  title: string;
  dateRange: Date[] | null;
  roles: { label: string; value: string }[];
  status: { label: string; value: string } | null;
}

interface FilterProps {
  show: boolean;
  onCloseClick: () => void;
  onFilterApply: (filters: FilterState) => Promise<any[]>;
}

// LocalStorage'dan filtreleri al
const getStoredFilters = (): FilterState | null => {
  try {
    const storedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
    if (storedFilters) {
      const parsedFilters = JSON.parse(storedFilters);
      
      // Tarihleri yeniden Date objelerine çevir
      if (parsedFilters.dateRange && Array.isArray(parsedFilters.dateRange)) {
        parsedFilters.dateRange = parsedFilters.dateRange.map((dateStr: string | null) => dateStr ? new Date(dateStr) : null);
      }
      
      return parsedFilters;
    }
  } catch (error) {
    console.error("Kaydedilmiş filtreler okunurken hata:", error);
  }
  return null;
};

// Filtreleri localStorage'a kaydet
const saveFiltersToStorage = (filters: FilterState) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error("Filtreler kaydedilirken hata:", error);
  }
};

const CrmFilter: React.FC<FilterProps> = ({ show, onCloseClick, onFilterApply }) => {
  const [filters, setFilters] = useState<FilterState>({
    title: "",
    dateRange: null,
    roles: [],
    status: null,
  });
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Roller listesini dinamik çekmek için state
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
  
  // Component mount olduğunda localStorage'dan filtreleri yükle
  useEffect(() => {
    const storedFilters = getStoredFilters();
    if (storedFilters) {
      console.log("LocalStorage'dan filtreler yüklendi:", storedFilters);
      setFilters(storedFilters);
      
      // Tarihleri ayarla
      if (storedFilters.dateRange && storedFilters.dateRange.length > 0) {
        if (storedFilters.dateRange[0]) setStartDate(storedFilters.dateRange[0]);
        if (storedFilters.dateRange.length > 1 && storedFilters.dateRange[1]) setEndDate(storedFilters.dateRange[1]);
      }
    }
  }, []);
  
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await axios.post(
          apiUrl,
          { query: `query {
  getRoles(input: {
    permissions: ["UserRead"],
    pageSize: 10,
    pageIndex: 0
  }) {
    id
    name
  }
}` },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `${accessToken}`,
            },
          }
        );
        const rolesData = response.data.getRoles;
        if (rolesData) {
          // Tüm rolleri seçmek için boş bir seçenek ekleyerek roleOptions'ı ayarlayın
          const allRoles = [{ value: "", label: "" }, ...rolesData.map((role: any) => ({ value: role.id, label: role.name }))];
          setRoleOptions(allRoles);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    }
    fetchRoles();
  }, [location]);

  useEffect(() => {
    // Panel açıldığında localStorage ve URL parametrelerinden filtre değerlerini yükle
    if (show) {
      console.log("Filtre paneli açıldı, filtre değerleri yükleniyor...");
      
      // Önce localStorage'dan yükle, sonra URL'den gelen değerlerle güncelle
      const storedFilters = getStoredFilters();
      if (storedFilters) {
        setFilters(storedFilters);
        
        // Tarihleri ayarla
        if (storedFilters.dateRange && storedFilters.dateRange.length > 0) {
          if (storedFilters.dateRange[0]) setStartDate(storedFilters.dateRange[0]);
          if (storedFilters.dateRange.length > 1 && storedFilters.dateRange[1]) setEndDate(storedFilters.dateRange[1]);
        }
      }
      
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
      let roles: { label: string; value: string }[] = [];
      if (rolesParam && roleOptions.length > 0) {
        const roleIds = rolesParam.split(',');
        roles = roleIds
          .map(roleId => {
            const matched = roleOptions.find(r => r.value === roleId);
            return matched ? matched : null;
          })
          .filter(Boolean) as { label: string; value: string }[];
        
        console.log("URL'den alınan roller:", roles);
      }
      
      // Durum parametresi - sıralama ve sayfa değişiminde korunması için güçlendirildi
      const statusParam = queryParams.get('status');
      let status = null;
      
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
      const newFilters = { 
        title: title || filters.title, 
        dateRange: dateRange || filters.dateRange, 
        roles: roles.length > 0 ? roles : filters.roles, 
        status: status || filters.status 
      };
      console.log("Filtre değerleri güncelleniyor:", newFilters);
      setFilters(newFilters);
      
      // Filtreleri localStorage'a kaydet
      saveFiltersToStorage(newFilters);
      
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

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    if (key === "roles" && Array.isArray(value)) {
      // Eğer "Tüm Roller" seçeneği varsa, o zaman tüm rolleri getir
      const hasAllRolesOption = value.some(option => option.value === "");
      
      if (hasAllRolesOption) {
        // "Tüm Roller" seçildiyse, diğer rol seçimlerini kaldırıp boş bir dizi olarak ayarla
        // Bu, API tarafından tüm rollerin getirilmesini sağlayacak
        setFilters(prev => ({ ...prev, [key]: [] }));
        return;
      }
    }
    
    // Filtreyi güncelle ve localStorage'a kaydet
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  };

  const handleFilterSubmit = () => {
    // Tarih kontrolü: Başlangıç tarihi bitiş tarihinden sonra olamaz
    if (startDate && endDate && startDate > endDate) {
      toast.error("Başlangıç tarihi, bitiş tarihinden sonra olamaz");
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
    
    const updatedFilters: FilterState = {
      ...filters,
      dateRange,
    };
    
    // Filtreleri localStorage'a kaydet
    saveFiltersToStorage(updatedFilters);

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
    
    // Filtre uygulandıktan sonra modalı kapatalım ki kullanıcı filtre sonuçlarını görsün
    onCloseClick();
    
    // Direkt fonksiyonu çağıralım
    onFilterApply(updatedFilters)
      .then(results => {
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
      })
      .catch(error => {
        console.error("Filtre uygulama hatası:", error);
        toast.error("Filtre uygulanırken bir hata oluştu");
      });
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

  const handleClearFilters = () => {
    // Filtreleri sıfırla
    const emptyFilters = { title: "", dateRange: null, roles: [], status: null };
    setFilters(emptyFilters);
    setStartDate(null);
    setEndDate(null);
    
    // LocalStorage'dan da temizle
    saveFiltersToStorage(emptyFilters);
    
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
    
    // Filtre parametrelerini temizle
    // title, createdAtStart, createdAtEnd, roles, status parametreleri eklenmeyecek
    
    // Temizlik işlemini uygula ve sonuçları göster
    onFilterApply(emptyFilters)
      .then(() => {
        // URL'yi güncelle
        navigate({
          pathname: location.pathname,
          search: params.toString()
        }, { replace: true });
        
        // Modalı kapat
        onCloseClick();
      })
      .catch(error => {
        console.error("Filtre temizleme hatası:", error);
        toast.error("Filtreler temizlenirken bir hata oluştu");
      });
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
              isClearable
              value={filters.roles}
              onChange={(selected: any) => handleFilterChange("roles", selected || [])}
              placeholder="Seçiniz"
              noOptionsMessage={() => "Rol bulunamadı"}
              formatGroupLabel={(data: { label: string; options: any[] }) => (
                <div className="d-flex justify-content-between align-items-center">
                  <span>{data.label}</span>
                  <span className="badge bg-primary">{data.options.length}</span>
                </div>
              )}
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
              className="w-100"
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
