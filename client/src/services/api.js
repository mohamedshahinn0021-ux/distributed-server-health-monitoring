import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Socket.IO singleton instance
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
});

// API helper functions
export const fetchSystemHealth = async () => {
  const res = await apiClient.get('/health');
  return res.data;
};

export const fetchServers = async (params = {}) => {
  const res = await apiClient.get('/servers', { params });
  return res.data;
};

export const fetchServerById = async (id) => {
  const res = await apiClient.get(`/servers/${id}`);
  return res.data;
};

export const createServer = async (serverData) => {
  const res = await apiClient.post('/servers', serverData);
  return res.data;
};

export const updateServer = async (id, serverData) => {
  const res = await apiClient.put(`/servers/${id}`, serverData);
  return res.data;
};

export const deleteServer = async (id) => {
  const res = await apiClient.delete(`/servers/${id}`);
  return res.data;
};

export const triggerServerCheck = async (id) => {
  const res = await apiClient.post(`/monitoring/${id}/check`);
  return res.data;
};

export const fetchServerHistory = async (id, params = {}) => {
  const res = await apiClient.get(`/servers/${id}/history`, { params });
  return res.data;
};

export const fetchAlerts = async (params = {}) => {
  const res = await apiClient.get('/alerts', { params });
  return res.data;
};

export const markAlertAsRead = async (id) => {
  const res = await apiClient.patch(`/alerts/${id}/read`);
  return res.data;
};

export const markAllAlertsAsRead = async () => {
  const res = await apiClient.patch('/alerts/read-all');
  return res.data;
};

export const deleteAlert = async (id) => {
  const res = await apiClient.delete(`/alerts/${id}`);
  return res.data;
};

export const fetchAnalytics = async () => {
  const res = await apiClient.get('/analytics');
  return res.data;
};

export const fetchTransitions = async (params = {}) => {
  const res = await apiClient.get('/fsm/transitions', { params });
  return res.data;
};

export const fetchFsmRules = async () => {
  const res = await apiClient.get('/fsm/rules');
  return res.data;
};

// Mock Simulator Controls
export const setMockSimulator = async (settings) => {
  const res = await apiClient.post('/mock/simulator/set', settings);
  return res.data;
};

export const getMockSimulatorState = async () => {
  const res = await apiClient.get('/mock/simulator/state');
  return res.data;
};
