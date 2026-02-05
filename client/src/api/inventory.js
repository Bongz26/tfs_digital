import axios from "axios";
import { API_HOST } from "./config";
import { getAccessToken } from "./auth";

const BASE_URL = `${API_HOST}/api/inventory`;

export const fetchInventory = async (category = 'all') => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}?category=${category}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.inventory || [];
    } catch (err) {
        console.error("Error fetching inventory:", err.response || err);
        throw err;
    }
};

export const fetchInventoryStats = async () => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/stats`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.stats;
    } catch (err) {
        console.error("Error fetching inventory stats:", err.response || err);
        throw err;
    }
};

export const fetchLowStockItems = async (category = 'all') => {
    try {
        const token = getAccessToken();
        const params = category && category !== 'all' ? `?category=${category}` : '';
        const res = await axios.get(`${BASE_URL}/low-stock${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.items || [];
    } catch (err) {
        console.error("Error fetching low stock items:", err.response || err);
        throw err;
    }
};

export const createInventoryItem = async (itemData) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(BASE_URL, itemData, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.item;
    } catch (err) {
        console.error("Error creating inventory item:", err.response || err);
        throw err;
    }
};

export const updateStockQuantity = async (id, quantity) => {
    try {
        const token = getAccessToken();
        const res = await axios.patch(`${BASE_URL}/${id}/stock`, { stock_quantity: quantity }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error(`Error updating stock ${id}:`, err.response || err);
        throw err;
    }
};

export const adjustStock = async (id, adjustmentData) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/${id}/adjust`, adjustmentData, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error(`Error adjusting stock ${id}:`, err.response || err);
        throw err;
    }
};

// Stock Take API calls
export const fetchOpenStockTakes = async () => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/stock-take/open`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.stock_takes || [];
    } catch (err) {
        console.error("Error fetching open stock takes:", err.response || err);
        throw err;
    }
};

export const startStockTake = async (takenBy) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/stock-take/start`, { taken_by: takenBy }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error("Error starting stock take:", err.response || err);
        throw err;
    }
};

export const fetchStockTake = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${BASE_URL}/stock-take/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error(`Error fetching stock take ${id}:`, err.response || err);
        throw err;
    }
};

export const updateStockTakeItem = async (stockTakeId, itemId, data) => {
    try {
        const token = getAccessToken();
        const res = await axios.put(`${BASE_URL}/stock-take/${stockTakeId}/item/${itemId}`, data, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.item;
    } catch (err) {
        console.error(`Error updating stock take item ${itemId}:`, err.response || err);
        throw err;
    }
};

export const cancelStockTake = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/stock-take/${id}/cancel`, null, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error(`Error cancelling stock take ${id}:`, err.response || err);
        throw err;
    }
};

export const completeStockTake = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/stock-take/${id}/complete`, null, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error(`Error completing stock take ${id}:`, err.response || err);
        throw err;
    }
};


// --- STOCK TRANSFERS ---

export const fetchTransfers = async (status) => {
    try {
        const token = getAccessToken();
        const params = status ? `?status=${status}` : '';
        const res = await axios.get(`${BASE_URL}/transfers${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error("Error fetching transfers:", err.response || err);
        throw err;
    }
};

export const createTransferRequest = async (data) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/transfers/create`, data, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error("Error creating transfer:", err.response || err);
        throw err;
    }
};

export const dispatchTransferRequest = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/transfers/${id}/dispatch`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error("Error dispatching transfer:", err.response || err);
        throw err;
    }
};

export const receiveTransferRequest = async (id) => {
    try {
        const token = getAccessToken();
        const res = await axios.post(`${BASE_URL}/transfers/${id}/receive`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error("Error receiving transfer:", err.response || err);
        throw err;
    }
};

export const updateTransferRequest = async (id, data) => {
    try {
        const token = getAccessToken();
        const res = await axios.put(`${BASE_URL}/transfers/${id}`, data, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data;
    } catch (err) {
        console.error("Error updating transfer:", err.response || err);
        throw err;
    }
};

export const fetchLocations = async () => {
    try {
        const token = getAccessToken();
        const res = await axios.get(`${API_HOST}/api/locations`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return res.data.locations || [];
    } catch (err) {
        console.error("Error fetching locations:", err.response || err);
        return [];
    }
};
