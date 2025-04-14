import { gql } from "@apollo/client";

export const CREATE_RESERVATION = gql`
  mutation CreateReservation($input: CreateUpdateTransactionDTO!) {
    createTransaction(input: $input) {
      id
      no
      amount
      transactionDate
      status {
        id
        name
      }
      type {
        id
        name
      }
      channel {
        id
        name
      }
      account {
        id
        name
      }
      assignedUser {
        id
        fullName
      }
      locations {
        id
        code
        country {
          id
          name
        }
        city {
          id
          name
        }
        county {
          id
          name
        }
        district {
          id
          name
        }
        address
        postalCode
        plannedDate
      }
      transactionProducts {
        id
        product {
          id
          name
        }
        quantity
        unitPrice
        totalPrice
      }
      name
      phone
      email
      note
      createdAt
    }
  }
`;

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($input: CreateUpdateTransactionDTO!) {
    updateTransaction(input: $input) {
      id
      no
      amount
      transactionDate
      status {
        id
        name
      }
      type {
        id
        name
      }
      channel {
        id
        name
      }
      account {
        id
        name
      }
      transactionProducts {
        id
        product {
          id
          name
        }
        quantity
        unitPrice
        totalPrice
      }
      name
      note
      assignedUser {
        id
        fullName
      }
      updatedAt
    }
  }
`;

export const DELETE_RESERVATION = gql`
  mutation DeleteReservation($id: String!) {
    deleteReservation(id: $id)
  }
`;
