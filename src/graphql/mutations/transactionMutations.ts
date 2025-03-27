import { gql } from '@apollo/client';

export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
      no
      amount
      details
      note
      status {
        id
        name
      }
      type {
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
      createdAt
    }
  }
`;

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($input: UpdateTransactionInput!) {
    updateTransaction(input: $input) {
      id
      no
      amount
      details
      note
      status {
        id
        name
      }
      type {
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
      createdAt
    }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`; 