import PropTypes from "prop-types";
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { logoutUser } from "../../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";

import withRouter from "../../Components/Common/withRouter";
import { createSelector } from "reselect";

// Import constants from logo service (we don't want to remove these during logout)
import { LOGO_KEY, LOGO_TIMESTAMP_KEY } from '../../services/logoService';

const Logout = () => {
  const dispatch = useDispatch<any>();

  const isUserLogoutSelector = createSelector(
    (state) => state.Login,
    (isUserLogout) => isUserLogout.isUserLogout
  );
  const isUserLogout = useSelector(isUserLogoutSelector);

  useEffect(() => {
    // Safely preserve the logo in localStorage before logging out
    const preserveLogoData = () => {
      try {
        // Get the logo data from localStorage
        const logoData = localStorage.getItem(LOGO_KEY);
        const logoTimestamp = localStorage.getItem(LOGO_TIMESTAMP_KEY);
        
        // Dispatch logout action (which will clear localStorage)
        dispatch(logoutUser());
        
        // If we had logo data, restore it
        if (logoData && logoTimestamp) {
          localStorage.setItem(LOGO_KEY, logoData);
          localStorage.setItem(LOGO_TIMESTAMP_KEY, logoTimestamp);
        }
      } catch (error) {
        console.error('Error preserving logo data during logout:', error);
        // Fall back to just logging out
        dispatch(logoutUser());
      }
    };
    
    preserveLogoData();
  }, [dispatch]);

  if (isUserLogout) {
    return <Navigate to="/login" />;
  }

  return <></>;
};

Logout.propTypes = {
  history: PropTypes.object,
};

export default withRouter(Logout);