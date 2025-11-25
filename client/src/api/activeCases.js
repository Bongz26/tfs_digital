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
