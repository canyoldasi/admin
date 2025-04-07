import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { useSelector } from 'react-redux';

// Import images (keep as fallback)
import avatar1 from "../../assets/images/users/user-dummy-img.jpg";
import { Link } from 'react-router-dom';
import { createSelector } from 'reselect';

// Import GraphQL client and queries
import { client } from '../../helpers/graphql_helper';
import { GET_ME } from '../../graphql/queries/userQueries';
import { gql } from '@apollo/client';
import { toast } from 'react-toastify';

const ProfileDropdown = () => {
    const profiledropdownData = createSelector(
        (state: any) => state.Profile,
        (user) => user.user
    );
    // Inside your component
    const user = useSelector(profiledropdownData);

    const [userName, setUserName] = useState("Admin");
    const [userRole, setUserRole] = useState("Founder");
    const [profileImage, setProfileImage] = useState<string>(avatar1);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // GraphQL query for getApp
    const GET_APP = gql`
        query GetApp {
            getApp {
                logo
                name
            }
        }
    `;

    // Function to get user data from me() service
    const getUserData = async () => {
        try {
            setIsLoading(true);
            
            try {
                // Fetch user data from me() service
                const { data: userData } = await client.query({
                    query: GET_ME,
                    fetchPolicy: 'network-only'
                });
                
                if (userData && userData.me) {
                    // Update user name and role
                    setUserName(userData.me.fullName);
                    if (userData.me.role && userData.me.role.name) {
                        setUserRole(userData.me.role.name);
                    }
                }
            } catch (userError) {
                console.error('Error fetching user data:', userError);
                // Don't show toast for this error to avoid multiple error messages
            }
            
            try {
                // Fetch app data to get the logo/profile image
                const { data: appData } = await client.query({
                    query: GET_APP,
                    fetchPolicy: 'network-only'
                });
                
                if (appData && appData.getApp && appData.getApp.logo) {
                    // If the logo is already a complete data URL
                    if (appData.getApp.logo.startsWith('data:image')) {
                        setProfileImage(appData.getApp.logo);
                    } 
                    // If it's just the base64 string without the data URL prefix
                    else {
                        setProfileImage(`data:image/png;base64,${appData.getApp.logo}`);
                    }
                }
            } catch (appError) {
                console.error('Error fetching app logo:', appError);
                // Don't show toast for this error to avoid multiple error messages
            }
        } catch (error) {
            console.error('Error in getUserData:', error);
            // Show a single toast for any uncaught errors
            toast.error("Profil bilgileri yüklenirken bir hata oluştu");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Get user data and app logo when component mounts
        getUserData();
    }, []);

    //Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };
    
    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className="ms-sm-3 header-item topbar-user">
                <DropdownToggle tag="button" type="button" className="btn">
                    <span className="d-flex align-items-center">
                        <img className="rounded-circle header-profile-user" src={avatar1}
                            alt="Header Avatar" />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{userName}</span>
                            <span className="d-none d-xl-block ms-1 fs-13 text-muted user-name-sub-text">{userRole}</span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">Merhaba {userName}!</h6>
                    <DropdownItem className='p-0'>
                        <Link to="/logout" className="dropdown-item">
                            <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> 
                            <span className="align-middle" data-key="t-logout">Güvenli Çıkış</span>
                        </Link>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;