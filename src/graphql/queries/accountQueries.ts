import { gql } from '@apollo/client';

export const GET_ACCOUNTS = gql`
  query GetAccounts($input: GetAccountsDTO!) {
    getAccounts(input: $input) {
      items {
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
        createdAt
        personType
        assignedUser {
          id
          fullName
        }
        accountTypes {
          id
          name
        }
        segments {
          id
          name
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
        channel {
          id
          name
        }
      }
      itemCount
      pageCount
    }
  }
`;

export const GET_ACCOUNT = gql`
  query GetAccount($id: String!) {
    getAccount(id: $id) {
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
      createdAt
      updatedAt
      personType
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
      assignedUser {
        id
        fullName
      }
      accountTypes {
        id
        name
      }
      segments {
        id
        name
      }
      channel {
        id
        name
      }
      gender
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
        location {
          id
          name
          code
        }
      }
    }
  }
`;

export const GET_USERS_LOOKUP = gql`
  query GetUsersLookup {
    getUsersLookup {
      items {
        id
        fullName
      }
      itemCount
      pageCount
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

export const GET_SEGMENTS = gql`
  query GetSegmentsLookup {
    getSegmentsLookup {
      id
      name
    }
  }
`;

export const GET_ACCOUNT_TYPES = gql`
  query GetAccountTypesLookup {
    getAccountTypesLookup {
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