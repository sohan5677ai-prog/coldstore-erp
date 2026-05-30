import axios from "axios";

// This tells React exactly where your backend lives
const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Auth
export const loginUser = (credentials) => API.post("/auth/login", credentials);

// Customers
export const getCustomers = () => API.get("/customers");
export const addCustomer = (newCustomer) => API.post("/customers", newCustomer);
export const updateCustomer = (id, updatedCustomer) =>
  API.put(`/customers/${id}`, updatedCustomer);
export const deleteCustomer = (id) => API.delete(`/customers/${id}`);
