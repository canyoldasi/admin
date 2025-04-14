import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query GetUsers($input: GetUsersDTO!) {
    getUsers(input: $input) {
      items {
        id
        username
        fullName
        isActive
        createdAt
        role {
          id
          name
          code
        }
        account {
            id
            name
        }
      }
      itemCount
      pageCount
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: String!) {
    getUser(id: $id) {
      id
      username
      fullName
      password
      isActive
      createdAt
      role {
        id
        name
        rolePermissions {
          permission
        }
      }
    }
  }
`;

export const GET_ROLES = gql`
  query GetRoles($input: GetRolesDTO!) {
    getRoles(input: $input) {
      id
      name
    }
  }
`;

export const GET_ME = gql`
  query Me {
    me {
      id
      fullName
      role {
        id
        name
        rolePermissions {
          permission
        }
      }
    }
  }
`;

export const GET_PERMISSIONS = gql`
  query GetPermissions {
    getPermissions
  }
`; 