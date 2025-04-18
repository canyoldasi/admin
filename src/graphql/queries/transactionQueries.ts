import { gql } from "@apollo/client";

export const GET_TRANSACTIONS = gql`
  query GetTransactions($input: GetTransactionsDTO!) {
    getTransactions(input: $input) {
      items {
        id
        no
        amount
        createdAt
        transactionDate
        name
        firstName
        lastName
        externalId
        note
        phone
        email
        address
        postalCode
        cancelDate
        cancelNote
        successDate
        successNote
        flightNumber
        type {
          id
          name
          code
        }
        status {
          id
          name
          code
          isCancel
          isSuccess
        }
        currency {
          id
          name
          symbol
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
        locations {
          id
          code
          address
          plannedDate
          actualDate
          note
          postalCode
          latitude
          longitude
          city {
            id
            name
          }
          country {
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
      cancelDate
      cancelNote
      updatedAt
      name
      phone
      flightNumber
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
        accountTypes {
          id
          name
        }
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
        postalCode
        address
        latitude
        longitude
        note
        plannedDate
        actualDate
        location {
          id
          name
          code
        }
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
    getUsersLookup(input: { id: "", isActive: true, text: "" }) {
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

export const GET_CURRENCIES = gql`
  query GetCurrencies {
    getCurrenciesLookup {
      id
      name
      symbol
      code
    }
  }
`;

export const GET_TRANSACTIONS_AS_EXCEL = gql`
  query GetTransactionsAsExcel($input: GetTransactionsDTO!) {
    getTransactionsAsExcel(input: $input)
  }
`;

