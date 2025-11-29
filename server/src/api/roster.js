import axios from "axios";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/roster`;

export const fetchRoster = async () => {
    try {
        const res = await axios.get(BASE_URL);
        return res.data.roster || [];
    } catch (err) {
        console.error("Error fetching roster:", err.response || err);
        throw err;
    }
};
