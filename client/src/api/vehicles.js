import axios from "axios";
import { API_HOST } from "./config";
import { getAccessToken } from "./auth";

const BASE_URL = `${API_HOST}/api/vehicles`;

export const fetchVehicles = async () => {
    try {
        const token = getAccessToken();
        const res = await axios.get(BASE_URL, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.vehicles || [];
    } catch (err) {
        console.error("Error fetching vehicles:", err.response || err);
        throw err;
    }
};

export const fetchAvailableVehicles = async () => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/available`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.vehicles || [];
    } catch (err) {
        console.error("Error fetching available vehicles:", err.response || err);
        throw err;
    }
};
