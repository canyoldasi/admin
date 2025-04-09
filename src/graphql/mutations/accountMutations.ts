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
      gender
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
      gender
      assignedUser {
        id
        fullName
      }
      channel {
        id
        name
      }
      segments {
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

export const UPDATE_ACCOUNT_LOCATIONS = gql`
  mutation UpdateAccountLocations($input: UpdateAccountLocationsInput!) {
    updateAccountLocations(input: $input) {
      id
      locations {
        id
        address
        postalCode
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
      }
    }
  }
`; 