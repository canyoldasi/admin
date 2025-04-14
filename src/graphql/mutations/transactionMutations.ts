import { gql } from "@apollo/client";

export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: CreateUpdateTransactionDTO!) {
    createTransaction(input: $input) {
      id
      no
      amount
      note
      status {
        id
        name
        code
      }
      type {
        id
        name
        code
      }
      account {
        id
        name
      }
      assignedUser {
        id
        fullName
      }
      channel {
        id
        name
      }
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
      transactionDate
      createdAt
      address
      postalCode
    }
  }
`;

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($input: CreateUpdateTransactionDTO!) {
    updateTransaction(input: $input) {
      id
      no
      amount
      note
      status {
        id
        name
        code
      }
      type {
        id
        name
        code
      }
      account {
        id
        name
      }
      assignedUser {
        id
        fullName
      }
      channel {
        id
        name
      }
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
      transactionDate
      createdAt
      address
      postalCode
      cancelDate
      cancelNote
      successDate
      successNote
    }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: String!) {
    deleteTransaction(id: $id)
  }
`;
