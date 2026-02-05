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

export const receiveGRV = async (poId, receivedItems, receivedBy) => {
  try {
    const res = await axios.post(`${BASE_URL}/${poId}/receive`, {
      received_items: receivedItems,
      received_by: receivedBy
    });
    return res.data;
  } catch (err) {
    console.error("Error receiving GRV:", err.response || err);
    throw err;
  }
};

export const fetchSuppliers = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/suppliers`);
    return res.data.suppliers || [];
  } catch (err) {
    console.error("Error fetching suppliers:", err.response || err);
    throw err;
  }
};

export const fetchSupplierItems = async (supplierId) => {
  try {
    const res = await axios.get(`${BASE_URL}/suppliers/${supplierId}/items`);
    return res.data;
  } catch (err) {
    console.error(`Error fetching items for supplier ${supplierId}:`, err.response || err);
    throw err;
  }
};

export const deletePurchaseOrder = async (poId) => {
  try {
    const res = await axios.delete(`${BASE_URL}/${poId}`);
    return res.data;
  } catch (err) {
    console.error("Error deleting PO:", err.response || err);
    throw err;
  }
};

export const updatePurchaseOrder = async (poId, poData) => {
  try {
    const res = await axios.put(`${BASE_URL}/${poId}`, poData);
    return res.data.purchase_order;
  } catch (err) {
    console.error("Error updating PO:", err.response || err);
    throw err;
  }
};
