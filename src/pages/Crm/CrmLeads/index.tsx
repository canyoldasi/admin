import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Col,
  Container,
  Row,
  Card,
  CardHeader,
  CardBody,
  Input,
  ModalHeader,
  ModalBody,
  Label,
  ModalFooter,
  Modal,
  Form,
  FormFeedback,
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import moment from "moment";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import { isEmpty } from "lodash";

// Tablo bileşeni
import TableContainer from "../../../Components/Common/TableContainer";

// Formik ve Yup
import * as Yup from "yup";
import { useFormik } from "formik";

import Loader from "../../../Components/Common/Loader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { accessToken } from "../../../helpers/jwt-token-access/accessToken";
import DeleteModal from '../../../Components/Common/DeleteModal' 

// Filtre Offcanvas bileşeni
import CrmFilter, { FilterState } from "./CrmFilter";

const apiUrl: string = process.env.REACT_APP_API_URL ?? "";
if (!apiUrl) {
  throw new Error("API URL is not defined in the environment variables.");
}

const GET_USER_QUERY = `
  query {
    getUsers(dto: {
        text: ""
    }) {
      id
      fullName
      username
      role {
        id
        name
        rolePermissions {
          permission
        }
      }
      isActive     
    }
  }
`;

async function fetchUserData() {
  try {
    const response = await axios.post(
      apiUrl,
      { query: GET_USER_QUERY },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
        },
      }
    );
    console.log("Response:", response.data);
    const userData = response.data.getUsers;
    console.log("User Data:", userData);
    return userData;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return [];
  }
}

const CrmLeads = () => {
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [lead, setLead] = useState<any>(null);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [modal, setModal] = useState<boolean>(false);
  const [isInfoDetails, setIsInfoDetails] = useState<boolean>(false);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
const [selectedRecordForDelete, setSelectedRecordForDelete] = useState<any>(null);

  // Rol listesini getRoles sorgusu ile çekiyoruz
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await axios.post(
          apiUrl,
          { query: `query { getRoles(dto: {text:""}) { id name } }` },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: accessToken,
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
  }, []);

  useEffect(() => {
    async function loadData() {
      const data = await fetchUserData();
      if (data && data.length > 0) {
        const formattedData = data.map((item: any) => ({
          ...item,
          date: item.date ? item.date : moment().format("DD.MM.YYYY"),
        }));
        setAllLeads(formattedData);
        setFilteredLeads(formattedData);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    console.log("Gelen Leads:", filteredLeads);
  }, [filteredLeads]);

  // Sıralama fonksiyonu
  const handleSort = (columnKey: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === columnKey && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: columnKey, direction });
  };

  const sortedLeads = useMemo(() => {
    let sortableLeads = [...filteredLeads];
    if (sortConfig !== null) {
      sortableLeads.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sortConfig.key) {
          case "fullName":
            aValue = a.fullName?.toLowerCase() || "";
            bValue = b.fullName?.toLowerCase() || "";
            break;
          case "username":
            aValue = a.username?.toLowerCase() || "";
            bValue = b.username?.toLowerCase() || "";
            break;
          case "role":
            aValue = a.role?.name?.toLowerCase() || "";
            bValue = b.role?.name?.toLowerCase() || "";
            break;
          case "status":
            aValue = a.isActive ? "aktif" : "pasif";
            bValue = b.isActive ? "aktif" : "pasif";
            break;
          case "date":
            const [dayA, monthA, yearA] = a.date.split(".");
            const [dayB, monthB, yearB] = b.date.split(".");
            aValue = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
            bValue = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableLeads;
  }, [filteredLeads, sortConfig]);

  // Formik kullanılarak oluşturulan form; ekleme ve düzenleme modlarında kullanılıyor.
  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: lead?.id || "",
      name: lead?.fullName || "",
      user: lead?.username || "",
      role: lead?.role?.id || "",
      status: lead?.isActive ? "active" : "active",
      date: lead ? lead.date : "",
      password: lead?.password || "", // Burada detaylı parola bilgisi atanıyor
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Lütfen adınızı giriniz"),
      user: Yup.string().required("Lütfen kullanıcı adı giriniz"),
      role: Yup.string().required("Lütfen rol seçiniz"),
      status: Yup.string().required("Lütfen durum seçiniz"),
      date: Yup.string().required("Lütfen tarih seçiniz"),
      password: isEdit ? Yup.string() : Yup.string().required("Lütfen parolanızı giriniz"),
    }),
    onSubmit: async (values) => {
      if (!isEdit) {
        // createUser mutasyonu
        const roleId = values.role;
        const isActive = values.status === "active";
        const mutation = `
          mutation {
            createUser(
              dto: {
                username: "${values.user}",
                fullName: "${values.name}",
                password: "${values.password}",
                isActive: ${isActive},
                roleId: "${roleId}"
              }
            )
          }
        `;
        try {
          const response = await axios.post(
            apiUrl,
            { query: mutation },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: accessToken,
              },
            }
          );
          console.log("Create User Response:", response.data);
          const selectedRole = roleOptions.find((r) => r.value === values.role);
          const newUser = {
            id: Math.floor(Math.random() * 100000).toString(),
            fullName: values.name,
            username: values.user,
            role: selectedRole
              ? { id: selectedRole.value, name: selectedRole.label }
              : { id: values.role, name: "" },
            isActive: isActive,
            date: values.date, // Kullanıcının seçtiği tarih
            password: values.password,
          };
          setAllLeads((prev) => [...prev, newUser]);
          setFilteredLeads((prev) => [...prev, newUser]);
          toast.success("Kullanıcı başarıyla oluşturuldu.");
        } catch (error) {
          console.error("Error creating user:", error);
          toast.error("Kullanıcı oluşturulurken hata oluştu.");
        }
      } else {
        // updateUser mutasyonu
        const roleId = values.role;
        const isActive = values.status === "active";
        const password = values.password.trim() !== "" ? values.password : lead.password;
        const mutation = `
          mutation {
            updateUser(
              dto: {
                id: "${lead.id}",
                username: "${values.user}",
                fullName: "${values.name}",
                password: "${password}",
                isActive: ${isActive},
                roleId: "${roleId}"
              }
            )
          }
        `;
        try {
          const response = await axios.post(
            apiUrl,
            { query: mutation },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `${accessToken}`,
              },
            }
          );
          console.log("Update User Response:", response.data);
          const updatedUser = {
            ...lead,
            fullName: values.name,
            username: values.user,
            role: { id: values.role, name: roleOptions.find((r) => r.value === values.role)?.label || "" },
            isActive: isActive,
            password: password,
            date: values.date,
          };
          const updatedAll = allLeads.map((item) => (item.id === lead.id ? updatedUser : item));
          setAllLeads(updatedAll);
          const updatedFiltered = filteredLeads.map((item) => (item.id === lead.id ? updatedUser : item));
          setFilteredLeads(updatedFiltered);
          toast.success("Kullanıcı başarıyla güncellendi.");
        } catch (error) {
          console.error("Error updating user:", error);
          toast.error("Kullanıcı güncellenirken hata oluştu.");
        }
      }
      validation.resetForm();
      setModal(false);
    },
  });

  // Modal'ı açma: Düzenleme modunda mevcut lead bilgilerini yüklüyoruz.
  const toggle = useCallback(() => {
    setModal((prevModal) => {
      if (!prevModal && lead) {
        validation.setFieldValue("name", lead.fullName);
        validation.setFieldValue("user", lead.username);
        validation.setFieldValue("password", lead.password || ""); // Detaylarda parola varsa set et
        validation.setFieldValue("role", lead.role?.id);
        validation.setFieldValue("status", lead.isActive ? "active" : "pasif");
        validation.setFieldValue("date", lead.date);
      }
      return !prevModal;
    });
  }, [lead, validation]);

  const handleLeadClick = useCallback(
    (selectedLead: any) => {
      setLead(selectedLead);
      setIsDetail(false)
      setIsEdit(true);
      toggle();
    },
    [toggle]
  );

  // Silme işlemi: Parametre olarak ilgili lead bilgisini alıp, "Emin misiniz?" onayı ile silme işlemini gerçekleştiriyoruz.
  const handleDeleteConfirm = async () => {
    if (selectedRecordForDelete) {
      const mutation = `
        mutation {
          deleteUser(id: "${selectedRecordForDelete.id}")
        }
      `;
      try {
        const response = await axios.post(
          apiUrl,
          { query: mutation },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: accessToken,
            },
          }
        );
        console.log("Delete Response:", response.data);
        const updated = allLeads.filter((item) => item.id !== selectedRecordForDelete.id);
        setAllLeads(updated);
        setFilteredLeads(updated);
        toast.success("Kullanıcı başarıyla silindi.");
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Kullanıcı silinirken hata oluştu.");
      }
    }
    setDeleteModal(false)
    setSelectedRecordForDelete(null)
  };

  // Filtreleme: Sonuç boşsa form kapanmıyor.
  const handleFilterApply = (filters: {
    title: string;
    dateRange: Date[] | null;
    roles: { label: string; value: string }[];
    status: { label: string; value: string } | null;
  }): any[] => {
    let result = [...allLeads];
    if (filters.title && filters.title.trim() !== "") {
      const text = filters.title.trim().toLowerCase();
      result = result.filter(
        (item) =>
          (item.fullName && item.fullName.toLowerCase().includes(text)) ||
          (item.username && item.username.toLowerCase().includes(text))
      );
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange;
      result = result.filter((item) => {
        if (!item.date) return false;
        const parts = item.date.split(".");
        if (parts.length !== 3) return false;
        const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return itemDate >= start && itemDate <= end;
      });
    }
    if (filters.roles && filters.roles.length > 0) {
      const roleValues = filters.roles.map((r) => r.value.toLowerCase());
      result = result.filter((item) => item.role && roleValues.includes(item.role.id.toLowerCase()));
    }
    if (filters.status) {
      const statusValue = filters.status.value.toLowerCase();
      result = result.filter((item) => {
        const itemStatus = item.isActive ? "aktif" : "pasif";
        return itemStatus === statusValue;
      });
    }
    setFilteredLeads(result);
    if (result.length === 0) {
      toast.warn("Uygun Veri Bulunamadı");
    } else {
      toast.success("Filtre uygulandı");
    }
    return result;
  };

  const handleClose = () => {
    validation.resetForm();
    setModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validation.handleSubmit();
    return false;
  };
  
  const [isDetail, setIsDetail] = useState<boolean>(false);
  const handleDetailClick = useCallback(
    async (selectedLead: any) => {
      try {
        const userDetail = await fetchUserDetail(selectedLead.id);
        if (userDetail) {
          setLead(userDetail);
          setIsDetail(true);
          setIsEdit(false);
          toggle();
        }
      } catch (error) {
        console.error("Error fetching user detail:", error);
      }
    },
    [toggle]
  );

  async function fetchUserDetail(userId: string) {
    const query = `
      query {
        getUser(id: "${userId}") {
          id
          username
          fullName
          password
          role {
            id
            name    
          }
        }
      }
    `;
    try {
      const response = await axios.post(
        apiUrl,
        { query },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken,
          },
        }
      );
      console.log("User Detail Response:", response.data);
      return response.data.getUser;
    } catch (error) {
      console.error("Error fetching user detail:", error);
      toast.error("Kullanıcı detayları getirilirken hata oluştu.");
      return null;
    }
  }

  // Sütunlar: Her başlık sıralama tetikleyicisi
  const columns = useMemo(
    () => [
      {
        header: (
          <input type="checkbox" className="form-check-input" id="checkBoxAll" onClick={() => {}} />
        ),
        cell: (cell: any) => (
          <input type="checkbox" className="leadsCheckBox form-check-input" value={cell.getValue()} onChange={() => {}} />
        ),
        id: "#",
        enableSorting: false,
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("fullName")}>
            Adı {sortConfig?.key === "fullName" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "fullName",
        enableColumnFilter: false,
        cell: (cell: any) => <div className="d-flex align-items-center">{cell.getValue()}</div>,
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("username")}>
            Kullanıcı {sortConfig?.key === "username" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "username",
        enableColumnFilter: false,
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("role")}>
            Rol {sortConfig?.key === "role" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "role.name",
        enableColumnFilter: false,
        cell: (cell: any) => (cell.getValue() ? cell.getValue() : ""),
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>
            Durum {sortConfig?.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "isActive",
        enableColumnFilter: false,
        cell: (cell: any) => (cell.getValue() ? "Aktif" : "Pasif"),
      },
      {
        header: (
          <span style={{ cursor: "pointer" }} onClick={() => handleSort("date")}>
            Eklenme {sortConfig?.key === "date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
          </span>
        ),
        accessorKey: "date",
        enableColumnFilter: false,
      },
      {
        header: " ",
        cell: (cellProps: any) => (
          <ul className="list-inline hstack gap-2 mb-0">
            <li className="list-inline-item" title="View">
              <Link to="#" onClick={() => handleDetailClick(cellProps.row.original)}>Detaylar</Link>
            </li>
            <li className="list-inline-item" title="Edit">
              <Link className="edit-item-btn" to="#" onClick={() => handleLeadClick(cellProps.row.original)}>
                Düzenle
              </Link>
            </li>
            <li className="list-inline-item" title="Delete">
              <Link
                className="remove-item-btn"
                onClick={() => {
                  setSelectedRecordForDelete(cellProps.row.original);
                  setDeleteModal(true);
                }}
                to="#"
              >
                Sil
              </Link>
            </li>
          </ul>
        ),
      },
    ],
    [handleLeadClick, handleSort, sortConfig]
  );

  return (
    <React.Fragment>
      <DeleteModal
  show={deleteModal}
  onDeleteClick={handleDeleteConfirm}
  onCloseClick={() => {
    setDeleteModal(false);
    setSelectedRecordForDelete(null);
  }}
  recordId={selectedRecordForDelete?.id}
/>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Kullanıcılar" pageTitle="CRM" />
          <Row>
            <Col lg={12}>
              <Card id="leadsList">
                <CardHeader className="border-0">
                  <Row className="g-4 align-items-center">
                    <Col sm={3}>
                      <div className="search-box">
                        <span className="form-label text-muted fw-semibold mb-3 text-3xl">
                          KULLANICILAR
                        </span>
                      </div>
                    </Col>
                    <div className="col-sm-auto ms-auto">
                      <div className="hstack gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsInfoDetails(true)}>
                          <i className="ri-filter-3-line align-bottom me-1"></i> Filtrele
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary add-btn"
                          id="create-btn"
                          onClick={() => {
                            setIsEdit(false);
                            setIsDetail(false)
                            setLead(null);
                            toggle();
                          }}
                        >
                          <i className="ri-add-line align-bottom me-1"></i> Ekle
                        </button>
                      </div>
                    </div>
                  </Row>
                </CardHeader>
                <CardBody className="pt-3">
                  <div>
                    {sortedLeads && sortedLeads.length ? (
                      <TableContainer
                        columns={columns}
                        data={sortedLeads}
                        isGlobalFilter={false}
                        customPageSize={10}
                        divClass="table-responsive table-card"
                        tableClass="align-middle"
                        theadClass="table-light"
                        isLeadsFilter={false}
                      />
                    ) : (
                      <Loader error={null} />
                    )}
                  </div>
                  <Modal id="showModal" isOpen={modal} toggle={toggle} centered>
  <ModalHeader className="bg-light p-3" toggle={toggle}>
    {isDetail ? "Detaylar" : isEdit ? "Düzenle" : "Ekle"}
  </ModalHeader>
  <Form className="tablelist-form" onSubmit={handleSubmit}>
    <ModalBody>
      <Input type="hidden" id="id-field" />
      <Row className="g-3">
        <Col lg={12} className="d-flex justify-content-center">
          <div>
            <div className="form-check d-flex align-items-center gap-2">
              <Input
                type="checkbox"
                id="status-field"
                name="status"
                className="form-check-input"
                checked={validation.values.status === "active"}
                onChange={(e) =>
                  !isDetail &&
                  validation.setFieldValue("status", e.target.checked ? "active" : "passive")
                }
                disabled={isDetail}
              />
              <Label className="form-check-label mb-0" htmlFor="status-field">
                Aktif
              </Label>
            </div>
            {validation.touched.status && validation.errors.status && (
              <FormFeedback className="text-center">{validation.errors.status as string}</FormFeedback>
            )}
          </div>
        </Col>

        <Col lg={12}>
          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
            <Label htmlFor="name-field" className="form-label mb-0 w-25">
              Adı
            </Label>
            {!isDetail ? (
              <Input
                name="name"
                id="customername-field"
                className="form-control w-100"
                type="text"
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values.name}
                invalid={validation.touched.name && validation.errors.name ? true : false}
              />
            ) : (
              <div>{validation.values.name}</div> 
            )}
          </div>
          {validation.touched.name && validation.errors.name && (
            <FormFeedback>{validation.errors.name as string}</FormFeedback>
          )}
        </Col>

        <Col lg={12}>
          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
            <Label htmlFor="user-field" className="form-label mb-0 w-25">
              Kullanıcı
            </Label>
            {!isDetail ? (
              <Input
                name="user"
                id="user-field"
                className="form-control w-100"
                type="text"
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values.user}
                invalid={validation.touched.user && validation.errors.user ? true : false}
              />
            ) : (
              <div>{validation.values.user}</div> 
            )}
          </div>
          {validation.touched.user && validation.errors.user && (
            <FormFeedback>{validation.errors.user as string}</FormFeedback>
          )}
        </Col>

        <Col lg={12}>
  <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
    <Label htmlFor="password-field" className="form-label mb-0 w-25">
      Parola
    </Label>
    {!isDetail ? (
      <Input
        name="password"
        id="password-field"
        className="form-control w-100"
        type="password"
        onChange={validation.handleChange}
        onBlur={validation.handleBlur}
        value={validation.values.password}
        invalid={validation.touched.password && validation.errors.password ? true : false}
      />
    ) : (
      <div>{validation.values.password ? validation.values.password : "Parola yok"}</div>
    )}
  </div>
  {validation.touched.password && validation.errors.password && (
    <FormFeedback>{validation.errors.password as string}</FormFeedback>
  )}
</Col>


        <Col lg={12}>
          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
            <Label htmlFor="role-field" className="form-label mb-0 w-25">
              Rol
            </Label>
            {!isDetail ? (
              <Select
                options={roleOptions}
                name="role"
                onChange={(selected: any) =>
                  validation.setFieldValue("role", selected?.value)
                }
                value={
                  validation.values.role
                    ? {
                        value: validation.values.role,
                        label:
                          roleOptions.find((r) => r.value === validation.values.role)?.label || "",
                      }
                    : null
                }
                placeholder="Seçiniz"
                className="w-100"
                isDisabled={isDetail} 
              />
            ) : (
              <div>{roleOptions.find((r) => r.value === validation.values.role)?.label}</div>
            )}
          </div>
          {validation.touched.role && validation.errors.role && (
            <FormFeedback>{validation.errors.role as string}</FormFeedback>
          )}
        </Col>

        <Col lg={12}>
          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
            <Label htmlFor="date-field" className="form-label mb-0 w-25">
              Eklenme
            </Label>
            {!isDetail ? (
              <Flatpickr
                options={{ dateFormat: "d.m.Y", enableTime: false }}
                value={
                  validation.values.date
                    ? moment(validation.values.date, "DD.MM.YYYY").toDate()
                    : undefined
                }
                onChange={(selectedDates: Date[]) => {
                  if (selectedDates.length > 0) {
                    const day = selectedDates[0].getDate().toString().padStart(2, "0");
                    const month = (selectedDates[0].getMonth() + 1).toString().padStart(2, "0");
                    const year = selectedDates[0].getFullYear();
                    const formattedDate = `${day}.${month}.${year}`;
                    validation.setFieldValue("date", formattedDate);
                  }
                }}
                className="form-control w-100"
                placeholder="Tarih seçiniz"
                disabled={isDetail} 
              />
            ) : (
              <div>{validation.values.date}</div> 
            )}
          </div>
          {validation.touched.date && validation.errors.date && (
            <FormFeedback>{validation.errors.date as string}</FormFeedback>
          )}
        </Col>
      </Row>
    </ModalBody>
    <ModalFooter>
      <div className="hstack gap-2 justify-content-end">
        <button type="button" className="btn btn-light" onClick={handleClose}>
          Kapat
        </button>
        {!isDetail && (
          <button type="submit" className="btn btn-success" id="add-btn">
            {isEdit ? "Güncelle" : "Ekle"}
          </button>
        )}
      </div>
    </ModalFooter>
  </Form>
</Modal>


                 
                  <ToastContainer closeButton={false} limit={1} />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <CrmFilter
        show={isInfoDetails}
        onCloseClick={() => setIsInfoDetails(false)}
        onFilterApply={(filters) => {
          const result = handleFilterApply(filters);
          if (result.length > 0) {
            setIsInfoDetails(false);
          }
        }}
      />
      
    </React.Fragment>
  );
};

export default CrmLeads;
