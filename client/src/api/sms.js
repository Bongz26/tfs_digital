import axios from 'axios';
import { API_HOST } from './config';

const BASE_URL = `${API_HOST}/api/sms`;

export const createAirtimeRequest = async (payload) => {
  const res = await axios.post(`${BASE_URL}/airtime-requests`, payload);
  return res.data.request;
};

export const listAirtimeRequests = async () => {
  const res = await axios.get(`${BASE_URL}/airtime-requests`);
  return res.data.requests || [];
};

export const updateAirtimeRequestStatus = async (id, status, operator_notes) => {
  const res = await axios.patch(`${BASE_URL}/airtime-requests/${id}/status`, { status, operator_notes });
  return res.data.request;
};

