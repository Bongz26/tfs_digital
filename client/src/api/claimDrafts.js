import axios from 'axios';
import { API_HOST } from './config';

const BASE_URL = `${API_HOST}/api/claim-drafts`;

export const saveDraft = async ({ policy_number, data, department }) => {
  const res = await axios.post(BASE_URL, { policy_number, data, department });
  return res.data.draft;
};

export const getDraftByPolicy = async (policy) => {
  try {
    const res = await axios.get(`${BASE_URL}/${encodeURIComponent(policy)}`);
    return res.data.draft;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
};

export const getLastDraft = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/last`);
    return res.data.draft;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
};

export const deleteDraftByPolicy = async (policy, reason) => {
  await axios.delete(`${BASE_URL}/${encodeURIComponent(policy)}`, { data: { reason } });
  return true;
};

export const listDrafts = async (department) => {
  const params = {};
  if (department) params.department = department;
  const res = await axios.get(BASE_URL, { params });
  return res.data.drafts || [];
};

export const getDraftHistory = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/history`);
    return res.data.history || [];
  } catch (err) {
    console.error('Failed to load draft history', err);
    return [];
  }
};
