import axios from "axios";
import { API_HOST } from "./config";
import { getAccessToken, getAuthHeaders } from "./auth";

const BASE_URL = `${API_HOST}/api/roster`;

export const fetchRoster = async () => {
    try {
        const res = await axios.get(BASE_URL, { headers: getAuthHeaders() });
        return res.data.roster || [];
    } catch (err) {
        console.error("Error fetching roster:", err.response || err);
        throw err;
    }
};

export const updateRoster = async (id, data) => {
    try {
        const token = getAccessToken();
        const res = await axios.patch(`${BASE_URL}/${id}`, data, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.roster;
    } catch (err) {
        console.error(`Error updating roster ${id}:`, err.response || err);
        throw err;
    }
};

export const deleteRoster = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.delete(`${BASE_URL}/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error(`Error deleting roster ${id}:`, err.response || err);
        throw err;
    }
};
