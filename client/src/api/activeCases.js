import axios from "axios";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/active-cases`;

export const fetchActiveCases = async (params = {}) => {
    try {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', String(params.page));
        if (params.limit) searchParams.append('limit', String(params.limit));
        if (params.search) searchParams.append('search', params.search);
        if (params.status) searchParams.append('status', params.status);
        if (params.from_date) searchParams.append('from_date', params.from_date);
        if (params.to_date) searchParams.append('to_date', params.to_date);
        if (params.age_filter) searchParams.append('age_filter', params.age_filter);

        const url = searchParams.toString() ? `${BASE_URL}?${searchParams.toString()}` : BASE_URL;
        const res = await axios.get(url);
        return {
            cases: res.data.cases || [],
            vehicles: res.data.vehicles || [],
            page: res.data.page || 1,
            total: res.data.total || (res.data.cases ? res.data.cases.length : 0),
            limit: res.data.limit || params.limit || 20
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
