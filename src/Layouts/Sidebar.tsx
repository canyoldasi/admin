import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
//import logo
import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";

//Import Components
import VerticalLayout from "./VerticalLayouts";
import TwoColumnLayout from "./TwoColumnLayout";
import { Container } from "reactstrap";
import HorizontalLayout from "./HorizontalLayout";
// Import logo service
import { fetchAndStoreAppLogo, getStoredLogo } from "../services/logoService";

const Sidebar = ({ layoutType }:any) => {
  // State for dynamic logo
  const [dynamicLogo, setDynamicLogo] = useState<string>(logoLight);
  const [isLogoLoading, setIsLogoLoading] = useState<boolean>(true);

  useEffect(() => {
    var verticalOverlay = document.getElementsByClassName("vertical-overlay");
    if (verticalOverlay) {
      verticalOverlay[0].addEventListener("click", function () {
        document.body.classList.remove("vertical-sidebar-enable");
      });
    }
  });

  // Add effect to load the dynamic logo
  useEffect(() => {
    // Load logo from localStorage or fetch from API
    const loadLogo = async () => {
      try {
        setIsLogoLoading(true);
        const logo = await fetchAndStoreAppLogo(logoLight);
        setDynamicLogo(logo);
      } catch (error) {
        console.error('Error loading logo:', error);
        // Fallback to default logo
        setDynamicLogo(logoLight);
      } finally {
        setIsLogoLoading(false);
      }
    };
    
    // Check if we have the logo in localStorage
    const storedLogo = getStoredLogo();
    if (storedLogo) {
      setDynamicLogo(storedLogo);
      setIsLogoLoading(false);
    } else {
      // Fetch logo only if not in localStorage
      loadLogo();
    }
  }, []);

  const addEventListenerOnSmHoverMenu = () => {
    // add listener Sidebar Hover icon on change layout from setting
    if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover-active');
    } else if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover-active') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    } else {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    };
    }
  return (
    <React.Fragment>
      <div className="app-menu navbar-menu">
        <div className="navbar-brand-box">
          <Link to="/" className="logo logo-dark">
            <span className="logo-sm">
              <img src={logoSm} alt="" height="22" />
            </span>
            <span className="logo-lg">
              <img src={isLogoLoading ? logoDark : dynamicLogo} alt="" height="50" />
            </span>
          </Link>

          <Link to="/" className="logo logo-light">
            <span className="logo-sm">
              <img src={isLogoLoading ? logoLight : dynamicLogo} alt="" height="22" />
            </span>
            <span className="logo-lg">
              <img src={isLogoLoading ? logoLight : dynamicLogo} alt="" height="50" />
            </span>
          </Link>
          <button
            onClick={addEventListenerOnSmHoverMenu}
            type="button"
            className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
            id="vertical-hover"
            aria-label="Toggle sidebar size"
            title="Toggle sidebar size"
          >
            <i className="ri-record-circle-line"></i>
          </button>
        </div>
        {layoutType === "horizontal" ? (
          <div id="scrollbar">
            <Container fluid>
              <div id="two-column-menu"></div>
              <ul className="navbar-nav" id="navbar-nav">
                <HorizontalLayout />
              </ul>
            </Container>
          </div>
        ) : layoutType === 'twocolumn' ? (
          <React.Fragment>
            <TwoColumnLayout layoutType={layoutType} />
            <div className="sidebar-background"></div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <SimpleBar id="scrollbar" className="h-100">
              <Container fluid>
                <div id="two-column-menu"></div>
                <ul className="navbar-nav" id="navbar-nav">
                  <VerticalLayout layoutType={layoutType} />
                </ul>
              </Container>
            </SimpleBar>
            <div className="sidebar-background"></div>
          </React.Fragment>
        )}
      </div>
      <div className="vertical-overlay"></div>
    </React.Fragment>
  );
};

export default Sidebar;
