import { getToken } from "./auth-token-header";
const tokenData = getToken();
const accessToken = tokenData && tokenData.accessToken ? `Bearer ${tokenData.accessToken}` : "";


const nodeApiToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyNWQwOTUyNTU3NThiYjM0YWU4YzAyZSIsImlhdCI6MTY2MjAwNzk0MSwiZXhwIjoxNjY5NzgzOTQxfQ.a2lluJh51ioMmaTY8GDxEtDjcOkavEyFKEvnrgL1mvA"

export { accessToken, nodeApiToken }
