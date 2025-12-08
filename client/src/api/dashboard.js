import axios from "axios";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/dashboard`;

export const fetchDashboardData = async (params = {}) => {
    try {
        const res = await axios.get(BASE_URL, { params });
        return res.data;
    } catch (err) {
        console.error("Error fetching dashboard data:", err.response || err);
        throw err;
    }
};
