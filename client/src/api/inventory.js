import http from "./http";
import { API_HOST } from "./config";

const BASE_URL = `${API_HOST}/api/inventory`;

export const fetchInventory = async (category = 'all') => {
    try {
        const res = await http.get(`${BASE_URL}?category=${category}`);
        return res.data.inventory || [];
    } catch (err) {
        console.error("Error fetching inventory:", err.response || err);
        throw err;
    }
};

export const fetchInventoryStats = async () => {
    try {
        const res = await http.get(`${BASE_URL}/stats`);
        return res.data.stats;
    } catch (err) {
        console.error("Error fetching inventory stats:", err.response || err);
        throw err;
    }
};

export const createInventoryItem = async (itemData) => {
    try {
        const res = await http.post(BASE_URL, itemData);
        return res.data.item;
    } catch (err) {
        console.error("Error creating inventory item:", err.response || err);
        throw err;
    }
};

export const updateStockQuantity = async (id, quantity) => {
    try {
        const res = await http.patch(`${BASE_URL}/${id}/stock`, { stock_quantity: quantity });
        return res.data;
    } catch (err) {
        console.error(`Error updating stock ${id}:`, err.response || err);
        throw err;
    }
};

export const adjustStock = async (id, adjustmentData) => {
    try {
        const res = await http.post(`${BASE_URL}/${id}/adjust`, adjustmentData);
        return res.data;
    } catch (err) {
        console.error(`Error adjusting stock ${id}:`, err.response || err);
        throw err;
    }
};

// Stock Take API calls
export const fetchOpenStockTakes = async () => {
    try {
        const res = await http.get(`${BASE_URL}/stock-take/open`);
        return res.data.stock_takes || [];
    } catch (err) {
        console.error("Error fetching open stock takes:", err.response || err);
        throw err;
    }
};

export const startStockTake = async (takenBy) => {
    try {
        const res = await http.post(`${BASE_URL}/stock-take/start`, { taken_by: takenBy });
        return res.data;
    } catch (err) {
        console.error("Error starting stock take:", err.response || err);
        throw err;
    }
};

export const fetchStockTake = async (id) => {
    try {
        const res = await http.get(`${BASE_URL}/stock-take/${id}`);
        return res.data;
    } catch (err) {
        console.error(`Error fetching stock take ${id}:`, err.response || err);
        throw err;
    }
};

export const updateStockTakeItem = async (stockTakeId, itemId, data) => {
    try {
        const res = await http.put(`${BASE_URL}/stock-take/${stockTakeId}/item/${itemId}`, data);
        return res.data.item;
    } catch (err) {
        console.error(`Error updating stock take item ${itemId}:`, err.response || err);
        throw err;
    }
};

export const cancelStockTake = async (id) => {
    try {
        const res = await http.post(`${BASE_URL}/stock-take/${id}/cancel`);
        return res.data;
    } catch (err) {
        console.error(`Error cancelling stock take ${id}:`, err.response || err);
        throw err;
    }
};

export const completeStockTake = async (id) => {
    try {
        const res = await http.post(`${BASE_URL}/stock-take/${id}/complete`);
        return res.data;
    } catch (err) {
        console.error(`Error completing stock take ${id}:`, err.response || err);
        throw err;
    }
};
