import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import config from "../config";
import { client as graphqlClient } from './graphql_helper';
import { getToken, setToken, removeToken } from './jwt-token-access/auth-token-header';

const { api } = config;

// default
axios.defaults.baseURL = api.API_URL;
// content type
axios.defaults.headers.post["Content-Type"] = "application/json";

// Set initial auth header
const token = getToken();
if (token?.accessToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token.accessToken}`;
}

// intercepting to capture errors
axios.interceptors.response.use(
  function (response) {
    return response.data ? response.data : response;
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    let message;
    switch (error.status) {
      case 500:
        message = "Internal Server Error";
        break;
      case 401:
        message = "Invalid credentials";
        removeToken();
        break;
      case 404:
        message = "Sorry! the data you are looking for could not be found";
        break;
      default:
        message = error.message || error;
    }
    return Promise.reject(message);
  }
);
/**
 * Sets the default authorization
 * @param {*} token
 */
const setAuthorization = (token: string) => {
  setToken(token);
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

class APIClient {
  /**
   * Fetches data from the given URL
   */
  get = (url: string, params?: any): Promise<AxiosResponse> => {
    let response: Promise<AxiosResponse>;

    let paramKeys: string[] = [];

    if (params) {
      Object.keys(params).map(key => {
        paramKeys.push(key + '=' + params[key]);
        return paramKeys;
      });

      const queryString = paramKeys && paramKeys.length ? paramKeys.join('&') : "";
      response = axios.get(`${url}?${queryString}`, params);
    } else {
      response = axios.get(`${url}`, params);
    }

    return response;
  };

  /**
   * Posts the given data to the URL
   */
  create = (url: string, data: any): Promise<AxiosResponse> => {
    return axios.post(url, data);
  };

  /**
   * Updates data
   */
  update = (url: string, data: any): Promise<AxiosResponse> => {
    return axios.patch(url, data);
  };

  put = (url: string, data: any): Promise<AxiosResponse> => {
    return axios.put(url, data);
  };

  /**
   * Deletes data
   */
  delete = (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> => {
    return axios.delete(url, { ...config });
  };
}

const getLoggedinUser = () => {
  return getToken();
};

// Export graphqlClient as client for backward compatibility
export const client = graphqlClient;

export { APIClient, setAuthorization, getLoggedinUser };

export const postGraphQLLogin = (mutation: any, variables: any) => {
  return graphqlClient.mutate({
    mutation,
    variables
  });
};
