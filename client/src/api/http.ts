// client/src/api/http.ts
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ""
    ? import.meta.env.VITE_API_URL
    : "/api";

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

// configura ou limpa o header Authorization
export function setAuthToken(token: string | null | undefined) {
  if (token && token.trim() !== "") {
    http.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common["Authorization"];
  }
}

// aplica token que já esteja no localStorage (caso exista)
export function applyAuthFromStorage() {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("authToken");
  if (token) {
    setAuthToken(token);
  }
}

applyAuthFromStorage();
