import axios from "axios";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/directions`;

/**
 * Get directions from origin to destination
 * @param {string} origin - Starting location (address or lat,lng)
 * @param {string} destination - Ending location (address or lat,lng)
 * @param {string[]} waypoints - Optional intermediate points
 * @returns {Promise} Directions data
 */
export const getDirections = async (origin, destination, waypoints = []) => {
  try {
    let url = `${BASE_URL}?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    
    if (waypoints.length > 0) {
      url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
    }

    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    console.error("Error fetching directions:", err.response || err);
    throw err;
  }
};

/**
 * Get route for a specific case
 * @param {number} caseId - Case ID
 * @param {string} vehicleLocation - Optional current vehicle location
 * @returns {Promise} Route data
 */
export const getRouteForCase = async (caseId, vehicleLocation = null) => {
  try {
    const res = await axios.post(`${BASE_URL}/route`, {
      caseId,
      vehicleLocation
    });
    return res.data;
  } catch (err) {
    console.error("Error fetching route for case:", err.response || err);
    throw err;
  }
};

