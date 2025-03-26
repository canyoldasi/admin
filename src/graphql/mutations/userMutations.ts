import { gql } from '@apollo/client';

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUpdateUserDto!) {
    createUser(input: $input)
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($input: CreateUpdateUserDto!) {
    updateUser(input: $input)
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: String!) {
    deleteUser(id: $id)
  }
`;

export const LOGIN = gql`
  query Login($username: String!, $password: String!) {
    login(username: $username, password: $password)
  }
`; 