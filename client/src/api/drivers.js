import http from "./http";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/drivers`;

export const fetchDrivers = async () => {
    try {
        const res = await http.get(BASE_URL);
        return res.data.drivers || [];
    } catch (err) {
        console.error("Error fetching drivers:", err.response || err);
        throw err;
    }
};
