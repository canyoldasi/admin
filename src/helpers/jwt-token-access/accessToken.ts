import { getToken } from "./auth-token-header";
const tokenData = getToken();
const accessToken = tokenData && tokenData.accessToken ? `Bearer ${tokenData.accessToken}` : "boşlukkkkk";

const getAuthHeader = () => {
    const tokenVariable = localStorage.getItem("authUser");
    console.log("tokenVariable", tokenVariable);
    return tokenVariable ? `Bearer ${JSON.parse(tokenVariable).accessToken}` : null;
};

export { accessToken, getAuthHeader }