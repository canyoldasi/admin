import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { setAuthorization } from "../helpers/api_helper";
import { useDispatch } from "react-redux";

import { useProfile } from "../Components/Hooks/UserHooks";

import { logoutUser } from "../slices/auth/login/thunk";

const AuthProtected = (props : any) =>{
  const dispatch : any = useDispatch();
  const { userProfile, loading, token } = useProfile();
  const location = useLocation();
  
  useEffect(() => {
    if (userProfile && !loading && token) {
      setAuthorization(token);
    } else if (!userProfile && loading && !token) {
      dispatch(logoutUser());
    }
  }, [token, userProfile, loading, dispatch]);

  /*
    Navigate is un-auth access protected routes via url
    */

  // Dashboard route kontrolü
  if (location.pathname === "/dashboard" || location.pathname === "/" || location.pathname === "") {
        if (localStorage.getItem("role_code") == "vendor") {
            return (
                <Navigate to={{ pathname: "/agile/reservations"}} />
              );
        }
  }

  if (!userProfile && loading && !token) {
    return (
      <Navigate to={{ pathname: "/login"}} />
    );
  }

  return <>{props.children}</>;
};


export default AuthProtected;