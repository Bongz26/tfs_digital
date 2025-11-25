import http from "./http";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/cases`;

export const fetchCases = async () => {
    try {
        const res = await http.get(BASE_URL);
        return res.data.cases || [];
    } catch (err) {
        console.error("Error fetching cases:", err.response || err);
        throw err;
    }
};

export const fetchCaseById = async (id) => {
    try {
        const res = await http.get(`${BASE_URL}/${id}`);
        return res.data.case;
    } catch (err) {
        console.error(`Error fetching case ${id}:`, err.response || err);
        throw err;
    }
};

export const createCase = async (caseData) => {
    try {
        const res = await http.post(BASE_URL, caseData);
        return res.data.case;
    } catch (err) {
        console.error("Error creating case:", err.response || err);
        throw err;
    }
};

export const updateCaseStatus = async (id, status, notes) => {
    try {
        const res = await http.patch(`${BASE_URL}/${id}/status`, { status, notes });
        return res.data.case;
    } catch (err) {
        console.error(`Error updating case status ${id}:`, err.response || err);
        throw err;
    }
};

export const updateFuneralTime = async (id, funeralTime, funeralDate) => {
    try {
        const res = await http.patch(`${BASE_URL}/${id}/funeral-time`, {
            funeral_time: funeralTime,
            funeral_date: funeralDate
        });
        return res.data.case;
    } catch (err) {
        console.error(`Error updating funeral time ${id}:`, err.response || err);
        throw err;
    }
};

export const assignVehicle = async (caseId, assignmentData) => {
    try {
        const res = await http.post(`${BASE_URL}/assign/${caseId}`, assignmentData);
        return res.data.roster;
    } catch (err) {
        console.error(`Error assigning vehicle to case ${caseId}:`, err.response || err);
        throw err;
    }
};
