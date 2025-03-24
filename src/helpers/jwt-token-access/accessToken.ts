import { getToken } from "./auth-token-header";
const tokenData = getToken();
const accessToken = tokenData && tokenData.accessToken ? `Bearer ${tokenData.accessToken}` : "boşlukkkkk";

const getTokenText = () => {
    const tokenVariable = localStorage.getItem("authUser");
    return tokenVariable ? JSON.parse(tokenVariable).accessToken : null;
};

export { accessToken, getTokenText }
