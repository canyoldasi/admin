//Include Both Helper File with needed methods
import { getFirebaseBackend } from "../../../helpers/firebase_helper";
import {
  postFakeLogin,
  postJwtLogin,
} from "../../../helpers/fakebackend_helper";
import { gql } from '@apollo/client';
import { postGraphQLLogin } from '../../../helpers/api_helper';

import { loginSuccess, logoutUserSuccess, apiError, reset_login_flag } from './reducer';

export const loginUser = (user : any, history : any) => async (dispatch : any) => {
  try {
    const response = await postGraphQLLogin(gql`
        query Login($username: String!, $password: String!) {
          login(username: $username, password: $password)
        }
      `, {
        username: user.email,
        password: user.password
      });

      if (response.data?.login) {
        sessionStorage.setItem("token", response.data.login);
        dispatch(loginSuccess(response.data.login));
        history('/dashboard');
      } else {
        dispatch(apiError(response.data.login));
      }
  } catch (error: any) {
    if (error.graphQLErrors) {
        const errorMessage = error.graphQLErrors[0]?.message || 'Bir hata oluştu';
        dispatch(apiError({
            data: errorMessage,
            status: error.graphQLErrors[0]?.extensions?.code || 'error'
        }));
    } else if (error.networkError) {
        dispatch(apiError({
            data: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
            status: 'network_error'
        }));
    } else {
        dispatch(apiError({
            data: 'Beklenmeyen bir hata oluştu.',
            status: 'unknown_error'
        }));
    }
  }
};

export const logoutUser = () => async (dispatch : any) => {
  try {
    sessionStorage.removeItem("authUser");
    let fireBaseBackend : any = getFirebaseBackend();
    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const response = fireBaseBackend.logout;
      dispatch(logoutUserSuccess(response));
    } else {
      dispatch(logoutUserSuccess(true));
    }

  } catch (error) {
    dispatch(apiError(error));
  }
};

export const socialLogin = (type : any, history : any) => async (dispatch : any) => {
  try {
    let response;

    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const fireBaseBackend : any = getFirebaseBackend();
      response = fireBaseBackend.socialLoginUser(type);
    }
    //  else {
      //   response = postSocialLogin(data);
      // }
      
      const socialdata = await response;
    if (socialdata) {
      sessionStorage.setItem("authUser", JSON.stringify(response));
      dispatch(loginSuccess(response));
      history('/dashboard')
    }

  } catch (error) {
    dispatch(apiError(error));
  }
};

export const resetLoginFlag = () => async (dispatch : any) => {
  try {
    const response = dispatch(reset_login_flag());
    return response;
  } catch (error) {
    dispatch(apiError(error));
  }
};