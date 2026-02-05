import axios from "axios";
import { API_HOST } from "./config";
import { getAccessToken } from "./auth";

const BASE_URL = `${API_HOST}/api/drivers`;

export const fetchDrivers = async () => {
  try {
    const token = getAccessToken();
    const res = await axios.get(BASE_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.data.drivers || [];
  } catch (err) {
    console.error("Error fetching drivers:", err.response || err);
    throw err;
  }
};
