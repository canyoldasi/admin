import { GET_ME } from "graphql/queries/userQueries";
import { client } from "helpers/graphql_helper";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Navdata = () => {
    const history = useNavigate();
    //state data
    const [isDashboard, setIsDashboard] = useState(false);
    const [isApps, setIsApps] = useState(false);
    const [isAuth, setIsAuth] = useState(false);
    const [isPages, setIsPages] = useState(false);
    const [isBaseUi, setIsBaseUi] = useState(false);
    const [isAdvanceUi, setIsAdvanceUi] = useState(false);
    const [isForms, setIsForms] = useState(false);
    const [isTables, setIsTables] = useState(false);
    const [isCharts, setIsCharts] = useState(false);
    const [isIcons, setIsIcons] = useState(false);
    const [isMaps, setIsMaps] = useState(false);
    const [isMultiLevel, setIsMultiLevel] = useState(false);

    // Apps
    const [isCalendar, setCalendar] = useState<boolean>(false);
    const [isEmail, setEmail] = useState(false);
    const [isSubEmail, setSubEmail] = useState(false);
    const [isEcommerce, setIsEcommerce] = useState(false);
    const [isProjects, setIsProjects] = useState(false);
    const [isTasks, setIsTasks] = useState(false);
    const [isCRM, setIsCRM] = useState(false);
    const [isCrypto, setIsCrypto] = useState(false);
    const [isInvoices, setIsInvoices] = useState(false);
    const [isSupportTickets, setIsSupportTickets] = useState(false);
    const [isNFTMarketplace, setIsNFTMarketplace] = useState(false);
    const [isJobs, setIsJobs] = useState(false);
    const [isJobList, setIsJobList] = useState(false);
    const [isCandidateList, setIsCandidateList] = useState(false);

    // Authentication
    const [isSignIn, setIsSignIn] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [isPasswordReset, setIsPasswordReset] = useState(false);
    const [isPasswordCreate, setIsPasswordCreate] = useState(false);
    const [isLockScreen, setIsLockScreen] = useState(false);
    const [isLogout, setIsLogout] = useState(false);
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);
    const [isVerification, setIsVerification] = useState(false);
    const [isError, setIsError] = useState(false);

    // Pages
    const [isProfile, setIsProfile] = useState(false);
    const [isLanding, setIsLanding] = useState(false);
    const [isBlog, setIsBlog] = useState<boolean>(false);

    // Charts
    const [isApex, setIsApex] = useState(false);

    // Multi Level
    const [isLevel1, setIsLevel1] = useState(false);
    const [isLevel2, setIsLevel2] = useState(false);

    const [iscurrentState, setIscurrentState] = useState('Dashboard');

    const [userRole, setUserRole] = useState("MenuRole");
    const [menuItems, setMenuItems] = useState([]);


    function updateIconSidebar(e: any) {
        if (e && e.target && e.target.getAttribute("sub-items")) {
            const ul: any = document.getElementById("two-column-menu");
            const iconItems = ul.querySelectorAll(".nav-icon.active");
            let activeIconItems = [...iconItems];
            activeIconItems.forEach((item) => {
                item.classList.remove("active");

                var id = item.getAttribute("sub-items");
                const getID = document.getElementById(id) as HTMLElement
                if (getID)
                    getID.classList.remove("show");
            });
        }
    }

    useEffect(() => {
        document.body.classList.remove('twocolumn-panel');
        if (iscurrentState !== 'Dashboard') {
            setIsDashboard(false);
        }
        if (iscurrentState !== 'Apps') {
            setIsApps(false);
        }
        if (iscurrentState !== 'Auth') {
            setIsAuth(false);
        }
        if (iscurrentState !== 'Pages') {
            setIsPages(false);
        }
        if (iscurrentState !== 'BaseUi') {
            setIsBaseUi(false);
        }
        if (iscurrentState !== 'AdvanceUi') {
            setIsAdvanceUi(false);
        }
        if (iscurrentState !== 'Forms') {
            setIsForms(false);
        }
        if (iscurrentState !== 'Tables') {
            setIsTables(false);
        }
        if (iscurrentState !== 'Charts') {
            setIsCharts(false);
        }
        if (iscurrentState !== 'Icons') {
            setIsIcons(false);
        }
        if (iscurrentState !== 'Maps') {
            setIsMaps(false);
        }
        if (iscurrentState !== 'MuliLevel') {
            setIsMultiLevel(false);
        }
        if (iscurrentState === 'Widgets') {
            history("/widgets");
            document.body.classList.add('twocolumn-panel');
        }
        if (iscurrentState !== 'Landing') {
            setIsLanding(false);
        }
    }, [
        history,
        iscurrentState,
        isDashboard,
        isApps,
        isAuth,
        isPages,
        isBaseUi,
        isAdvanceUi,
        isForms,
        isTables,
        isCharts,
        isIcons,
        isMaps,
        isMultiLevel
    ]);


    // Function to get user data from me() service
    const getUserData = async () => {
        try {
            try {
                const { data: userData } = await client.query({
                    query: GET_ME,
                    fetchPolicy: 'network-only'
                });
                
                console.log('çekti. userData', JSON.stringify(userData));

                const rolePermission = userData.me.role.rolePermissions.find((x: any) => x.permission.startsWith('TransactionRead'));
                console.log('permission', rolePermission);


                if (userData.me.role.code == 'vendor') {
                    setMenuItems([
                        {
                            id: "reservations",
                            label: "Reservations",
                            icon: "ri-calendar-check-line",
                            link: "/agile/reservations",
                        }
                    ]);
                } else {
                    setMenuItems([
                        {
                            label: "CRM",
                            isHeader: true,
                        },
                        {
                            id: "crm-dashboard",
                            label: "Dashboard",
                            icon: "las la-tachometer-alt",
                            link: "/dashboard-crm",
                        },
                        {
                            id: "reservations",
                            label: "Reservations",
                            icon: "ri-calendar-check-line",
                            link: "/agile/reservations",
                        },
                        {
                            id: "accounts",
                            label: "Accounts",
                            icon: "ri-user-settings-line",
                            link: "/accounts",
                        },
                        {
                            label: "SETTINGS",
                            isHeader: true,
                        },
                        {
                            id: "users",
                            label: "Users",
                            icon: "ri-settings-4-fill",
                            link: "/users",
                        },
                    ]);
                }

                if (userData && userData.me) {
                    if (userData.me.role && userData.me.role.name) {
                        setUserRole(userData.me.role.name);
                    }
                }
            } catch (userError) {
                console.error('Error fetching user data:', userError);
            }
            
        } catch (error) {
            console.error('Error in getUserData:', error);
        }
    };

    useEffect(() => {
        getUserData();
    }, []);

    return <React.Fragment>{menuItems}</React.Fragment>;
};
export default Navdata;