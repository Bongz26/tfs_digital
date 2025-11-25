import { useState, useEffect } from "react";
import { fetchPurchaseOrders, createPurchaseOrder, addPOItem } from "../api/purchaseOrders";

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPOs = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await fetchPurchaseOrders();
      setPurchaseOrders(Array.isArray(pos) ? pos : []);
    } catch (err) {
      console.error("Error loading POs:", err);
      setError(err.response?.data || err);
      setPurchaseOrders([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const createPO = async (poData) => {
    try {
      const newPO = await createPurchaseOrder(poData);
      await loadPOs(); // Reload all POs to get updated list
      return newPO;
    } catch (err) {
      // Re-throw with better error message
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.message || 
                      err.message || 
                      "Failed to create purchase order";
      const enhancedError = new Error(errorMsg);
      enhancedError.response = err.response;
      throw enhancedError;
    }
  };

  const addItemToPO = async (poId, itemData) => {
    try {
      const newItem = await addPOItem(poId, itemData);
      setPurchaseOrders(prev =>
        prev.map(po =>
          po.id === poId
            ? { ...po, items: [...(po.items || []), newItem] }
            : po
        )
      );
      return newItem;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadPOs();
  }, []);

  return { purchaseOrders, loading, error, createPO, addItemToPO, reloadPOs: loadPOs };
};
