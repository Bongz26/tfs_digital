import axios from "axios";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/active-cases`;

export const fetchActiveCases = async () => {
    try {
        const res = await axios.get(BASE_URL);
        return {
            cases: res.data.cases || [],
            vehicles: res.data.vehicles || []
        };
    } catch (err) {
        console.error("Error fetching active cases:", err.response || err);
        throw err;
    }
};

export const sendActiveCasesAlerts = async (toEmail) => {
    try {
        if (process.env.REACT_APP_ENABLE_ALERTS !== 'true') {
            return { success: false, disabled: true };
        }
        const res = await axios.post(`${BASE_URL}/alerts`, { to: toEmail });
        return res.data;
    } catch (err) {
        console.error("Error sending active cases alerts:", err.response || err);
        throw err;
    }
};
