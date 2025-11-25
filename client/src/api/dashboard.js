import http from "./http";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/dashboard`;

export const fetchDashboardData = async () => {
    try {
        const res = await http.get(BASE_URL);
        return res.data;
    } catch (err) {
        console.error("Error fetching dashboard data:", err.response || err);
        throw err;
    }
};
