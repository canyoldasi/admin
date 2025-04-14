import { gql } from '@apollo/client';

export const GET_RESERVATIONS = gql`
  query GetReservations($input: GetReservationsDTO!) {
    getReservations(input: $input) {
      items {
        id
        reservationNo
        reservationDate
        status
        passengerName
        passengerPhone
        passengerEmail
        from
        to
        travelType
        amount
        assignedUser {
          id
          fullName
        }
        createdAt
      }
      itemCount
      pageCount
    }
  }
`;

export const GET_RESERVATION = gql`
  query GetReservation($id: String!) {
    getReservation(id: $id) {
      id
      reservationNo
      reservationDate
      status
      passengerName
      passengerPhone
      passengerEmail
      from
      to
      travelType
      amount
      note
      assignedUser {
        id
        fullName
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESERVATION_STATUSES = gql`
  query GetReservationStatuses {
    getReservationStatusesLookup {
      id
      name
      code
    }
  }
`;

export const GET_TRAVEL_TYPES = gql`
  query GetTravelTypes {
    getTravelTypesLookup {
      id
      name
    }
  }
`;

export const GET_USERS_LOOKUP = gql`
  query GetUsersLookup {
    getUsersLookup(input: {
      id: "",
      isActive: true,
      text: ""
    }) {
      items {
        id
        fullName
      }
    }
  }
`; 