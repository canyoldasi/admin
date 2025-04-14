export interface Reservation {
  id: string;
  reservationNo: string;
  reservationDate: string;
  status: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  from: string;
  to: string;
  travelType: string;
  amount: number;
  note?: string;
  assignedUser?: {
    id: string;
    fullName: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ReservationStatus {
  id: string;
  name: string;
  code: string;
}

export interface TravelType {
  id: string;
  name: string;
}

export interface GetReservationsDTO {
  pageSize?: number;
  pageIndex?: number;
  text?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  statusIds?: string[] | null;
  fromDate?: string | null;
  toDate?: string | null;
  assignedUserIds?: string[] | null;
  travelTypeIds?: string[] | null;
  minAmount?: number | null;
  maxAmount?: number | null;
}

export interface CreateUpdateReservationDTO {
  id?: string;
  reservationNo?: string;
  reservationDate: string;
  status: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  from: string;
  to: string;
  travelType: string;
  amount: number;
  note?: string;
  assignedUserId?: string;
}

export interface PaginatedReservationResponse {
  items: Reservation[];
  itemCount: number;
  pageCount: number;
} 