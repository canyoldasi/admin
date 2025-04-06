import { gql } from '@apollo/client';

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: CreateUpdateAccountDTO!) {
    createAccount(input: $input) {
      id
      name
      firstName
      lastName
      email
      phone
      phone2
      taxNumber
      taxOffice
      nationalId
      address
      postalCode
      note
      assignedUser {
        id
        fullName
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
      createdAt
    }
  }
`;

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($input: CreateUpdateAccountDTO!) {
    updateAccount(input: $input) {
      id
      name
      firstName
      lastName
      email
      phone
      phone2
      taxNumber
      taxOffice
      nationalId
      address
      postalCode
      note
      assignedUser {
        id
        fullName
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
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: String!) {
    deleteAccount(id: $id)
  }
`; 