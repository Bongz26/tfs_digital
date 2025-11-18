import axios from "axios";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/purchase-orders`;

export const fetchPurchaseOrders = async () => {
  try {
    const res = await axios.get(BASE_URL);
    return res.data.purchase_orders || [];
  } catch (err) {
    console.error("Error fetching POs:", err.response || err);
    throw err;
  }
};

export const createPurchaseOrder = async (poData) => {
  try {
    const res = await axios.post(BASE_URL, poData);
    // Handle both response formats
    return res.data.purchase_order || res.data.data || res.data;
  } catch (err) {
    console.error("Error creating PO:", err.response?.data || err.message);
    throw err;
  }
};

export const addPOItem = async (poId, itemData) => {
  try {
    const res = await axios.post(`${BASE_URL}/${poId}/items`, itemData);
    return res.data.item;
  } catch (err) {
    console.error("Error adding PO item:", err.response || err);
    throw err;
  }
};

export const processPurchaseOrder = async (poId, adminEmail) => {
  try {
    const res = await axios.post(`${BASE_URL}/${poId}/process`, { admin_email: adminEmail });
    return res.data;
  } catch (err) {
    console.error("Error processing PO:", err.response || err);
    throw err;
  }
};
