import React from "react";
import POForm from "../components/PurchaseOrders/POForm";
import POList from "../components/PurchaseOrders/POList";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";




const PurchaseOrdersPage = () => {
  const { purchaseOrders, loading, error, createPO, addItemToPO, reloadPOs } = usePurchaseOrders();

  if (loading) return <div className="p-4"><p>Loading purchase orders...</p></div>;
  if (error) {
    const errorMsg = error.message || error.error || "Unknown error";
    return (
      <div className="p-4 text-red-600">
        <p className="font-bold">Error loading purchase orders:</p>
        <p>{errorMsg}</p>
        {error.hint && <p className="text-sm mt-2 text-gray-600">💡 {error.hint}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
      <POForm onCreate={createPO} />
      <POList 
        purchaseOrders={purchaseOrders} 
        onAddItem={addItemToPO} 
        onReload={reloadPOs}
      />
    </div>
  );
};

export default PurchaseOrdersPage;
