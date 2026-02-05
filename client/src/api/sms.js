import axios from 'axios';
import { API_HOST } from './config';
import { getAccessToken } from './auth';

const BASE_URL = `${API_HOST}/api/sms`;

export const createAirtimeRequest = async (payload) => {
  const token = getAccessToken();
  const res = await axios.post(`${BASE_URL}/airtime-requests`, payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data.request;
};

export const listAirtimeRequests = async () => {
  const token = getAccessToken();
  const res = await axios.get(`${BASE_URL}/airtime-requests`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data.requests || [];
};

export const listArchivedAirtimeRequests = async () => {
  const token = getAccessToken();
  const res = await axios.get(`${BASE_URL}/airtime-requests/archived`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data.requests || [];
};

export const updateAirtimeRequestStatus = async (id, status, operator_notes) => {
  const token = getAccessToken();
  const res = await axios.patch(`${BASE_URL}/airtime-requests/${id}/status`, { status, operator_notes }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data.request;
};
