import { gql } from '@apollo/client';

export const GET_TRANSACTIONS = gql`
  query GetTransactions($input: GetTransactionsDTO!) {
    getTransactions(input: $input) {
      items {
        id
        no
        amount
        note
        createdAt
        type {
          id
          name
          code
        }
        status {
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
      }
      itemCount
      pageCount
    }
  }
`;

export const GET_TRANSACTION = gql`
  query GetTransaction($id: String!) {
    getTransaction(id: $id) {
      id
      no
      amount
      note
      createdAt
      transactionDate
      address
      postalCode
      successDate
      successNote
      updatedAt
      country {
        id
        name
      }
      city {
        id
        name
      }
      district {
        id
        name
      }
      type {
        id
        name
        code
      }
      status {
        id
        name
        code
      }
      account {
        id
        name
        email
        phone
      }
      assignedUser {
        id
        fullName
      }
      channel {
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
    }
  }
`;

export const GET_TRANSACTION_TYPES = gql`
  query GetTransactionTypes {
    getTransactionTypesLookup {
      id
      name
      code
      sequence
    }
  }
`;

export const GET_TRANSACTION_STATUSES = gql`
  query GetTransactionStatuses {
    getTransactionStatusesLookup {
      id
      name
      code
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

export const GET_PRODUCTS_LOOKUP = gql`
  query GetProducts {
    getProductsLookup {
      items {
        id
        name
      }
    }
  }
`;

export const GET_COUNTRIES = gql`
  query GetCountries {
    getCountries {
      id
      name
    }
  }
`;

export const GET_CITIES = gql`
  query GetCities($countryId: String!) {
    getCities(countryId: $countryId) {
      id
      name
    }
  }
`;

export const GET_CHANNELS_LOOKUP = gql`
  query GetChannelsLookup {
    getChannelsLookup {
      id
      name
    }
  }
`;

export const GET_ACCOUNTS_LOOKUP = gql`
  query GetAccountsLookup($input: GetAccountsDTO!) {
    getAccounts(input: $input) {
      items {
        id
        name
      }
      itemCount
      pageCount
    }
  }
`;

export const GET_COUNTIES = gql`
  query GetCounties($cityId: String!) {
    getCounties(cityId: $cityId) {
      id
      name
    }
  }
`;

export const GET_DISTRICTS = gql`
  query GetDistricts($countyId: String!) {
    getDistricts(countyId: $countyId) {
      id
      name
    }
  }
`; 