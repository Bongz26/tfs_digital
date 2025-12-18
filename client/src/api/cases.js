import axios from "axios";
import { API_HOST } from "./config";
import { getAccessToken } from "./auth";

const BASE_URL = `${API_HOST}/api/cases`;

export const fetchCases = async () => {
    try {
        const token = getAccessToken();
        const res = await axios.get(BASE_URL, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.cases || [];
    } catch (err) {
        console.error("Error fetching cases:", err.response || err);
        throw err;
    }
};

export const fetchCaseById = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.case;
    } catch (err) {
        console.error(`Error fetching case ${id}:`, err.response || err);
        throw err;
    }
};

export const createCase = async (caseData) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(BASE_URL, caseData, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.case;
    } catch (err) {
        console.error("Error creating case:", err.response || err);
        throw err;
    }
};

export const updateCase = async (id, caseData) => {
    try {
        const token = getAccessToken();
        const res = await axios.put(`${BASE_URL}/${id}`, caseData, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.case;
    } catch (err) {
        console.error(`Error updating case ${id}:`, err.response || err);
        throw err;
    }
};

export const updateCaseStatus = async (id, status, notes) => {
    try {
        const token = getAccessToken();
        const res = await axios.patch(`${BASE_URL}/${id}/status`, { status, notes }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.case;
    } catch (err) {
        console.error(`Error updating case status ${id}:`, err.response || err);
        throw err;
    }
};

export const updateFuneralTime = async (id, funeralTime, funeralDate) => {
    try {
        const token = getAccessToken();
        const res = await axios.patch(`${BASE_URL}/${id}/funeral-time`, {
            funeral_time: funeralTime,
            funeral_date: funeralDate
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.case;
    } catch (err) {
        console.error(`Error updating funeral time ${id}:`, err.response || err);
        throw err;
    }
};

export const updateCaseVenue = async (id, data) => {
    try {
        const token = getAccessToken();
        const res = await axios.patch(`${BASE_URL}/${id}/venue`, data, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.case;
    } catch (err) {
        console.error(`Error updating case venue ${id}:`, err.response || err);
        throw err;
    }
};

export const assignVehicle = async (caseId, assignmentData) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/assign/${caseId}`, assignmentData, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.roster;
    } catch (err) {
        console.error(`Error assigning vehicle to case ${caseId}:`, err.response || err);
        throw err;
    }
};

export const fetchCaseAuditLog = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/audit/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.logs || [];
    } catch (err) {
        console.error(`Error fetching audit log ${id}:`, err.response || err);
        throw err;
    }
};

export const fetchCancelledCases = async () => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/list/cancelled`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.cases || [];
    } catch (err) {
        console.error('Error fetching cancelled cases:', err.response || err);
        throw err;
    }
};

export const lookupCase = async (params = {}) => {
    const search = new URLSearchParams();
    if (params.deceased_id) search.append('deceased_id', params.deceased_id);
    if (params.case_number) search.append('case_number', params.case_number);
    if (params.policy_number) search.append('policy_number', params.policy_number);
    if (params.deceased_name) search.append('deceased_name', params.deceased_name);
    if (params.nok_contact) search.append('nok_contact', params.nok_contact);
    const url = `${BASE_URL}/lookup?${search.toString()}`;
    try {
        const token = getAccessToken();
        const res = await axios.get(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.case || null;
    } catch (err) {
        if (err.response && err.response.status === 404) return null;
        console.error('Error looking up case:', err.response || err);
        throw err;
    }
};

export const searchCases = async (term, limit = 10) => {
    try {
        const params = new URLSearchParams();
        params.append('term', term);
        if (limit) params.append('limit', String(limit));
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/search?${params.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.cases || [];
    } catch (err) {
        console.error('Error searching cases:', err.response || err);
        throw err;
    }
};
