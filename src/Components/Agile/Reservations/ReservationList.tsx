import React from "react";
import { Table, Badge, Button } from "reactstrap";
import moment from "moment";
import { Reservation } from "../../../types/reservation";

interface ReservationListProps {
  reservations: Reservation[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  loading: boolean;
}

const ReservationList: React.FC<ReservationListProps> = ({
  reservations,
  onEdit,
  onDelete,
  onView,
  loading,
}) => {
  // Durum badgeleri için renkler
  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "onaylandı":
      case "completed":
      case "confirmed":
        return "success";
      case "beklemede":
      case "pending":
        return "warning";
      case "iptal edildi":
      case "cancelled":
        return "danger";
      default:
        return "info";
    }
  };

  // Para birimi formatla
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  // Tarih formatla
  const formatDate = (dateString: string): string => {
    return moment(dateString).format("DD.MM.YYYY");
  };

  return (
    <div className="table-responsive">
      <Table className="table-hover align-middle table-nowrap mb-0 reservation-list-table">
        <thead className="table-light">
          <tr>
            <th scope="col">Rezervasyon No</th>
            <th scope="col">Tarih</th>
            <th scope="col">Yolcu</th>
            <th scope="col">Güzergah</th>
            <th scope="col">Seyahat Tipi</th>
            <th scope="col">Tutar</th>
            <th scope="col">Durum</th>
            <th scope="col">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Yükleniyor...</span>
                </div>
              </td>
            </tr>
          ) : reservations.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-5">
                Kayıt bulunamadı
              </td>
            </tr>
          ) : (
            reservations.map((reservation) => (
              <tr key={reservation.id}>
                <td>{reservation.reservationNo}</td>
                <td>{formatDate(reservation.reservationDate)}</td>
                <td className="passenger-info">
                  <div className="passenger-name">{reservation.passengerName}</div>
                  <small className="passenger-contact">{reservation.passengerPhone}</small>
                </td>
                <td>
                  <div className="reservation-route">
                    <div className="route-point">{reservation.from}</div>
                    <div className="route-point">{reservation.to}</div>
                  </div>
                </td>
                <td>
                  <span className={`travel-type-icon ${reservation.travelType.toLowerCase() === 'uçak' ? 'plane' : reservation.travelType.toLowerCase() === 'otobüs' ? 'bus' : 'train'}`}></span>
                  {reservation.travelType}
                </td>
                <td>{formatCurrency(reservation.amount)}</td>
                <td>
                  <Badge color={getStatusBadgeColor(reservation.status)} pill className="reservation-status-badge">
                    {reservation.status}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <Button
                      color="primary"
                      size="sm"
                      outline
                      onClick={() => onView(reservation.id)}
                    >
                      <i className="ri-eye-line"></i>
                    </Button>
                    <Button
                      color="success"
                      size="sm"
                      outline
                      onClick={() => onEdit(reservation.id)}
                    >
                      <i className="ri-pencil-line"></i>
                    </Button>
                    <Button
                      color="danger"
                      size="sm"
                      outline
                      onClick={() => onDelete(reservation.id)}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default ReservationList; 