import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // La dirección de su Backend
});

export default api;