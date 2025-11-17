import React, { useState } from "react";

const POItemRow = ({ poId, onAddItem }) => {
  const [inventoryId, setInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inventoryId || !quantity || !unitCost) return alert("Fill all fields");

    await onAddItem(poId, {
      inventory_id: Number(inventoryId),
      quantity_ordered: Number(quantity),
      unit_cost: Number(unitCost),
    });

    setInventoryId("");
    setQuantity("");
    setUnitCost("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end mb-2">
      <input
        type="number"
        placeholder="Inventory ID"
        value={inventoryId}
        onChange={e => setInventoryId(e.target.value)}
        className="border p-1 rounded w-24"
        required
      />
      <input
        type="number"
        placeholder="Quantity"
        value={quantity}
        onChange={e => setQuantity(e.target.value)}
        className="border p-1 rounded w-20"
        required
      />
      <input
        type="number"
        placeholder="Unit Cost"
        value={unitCost}
        onChange={e => setUnitCost(e.target.value)}
        className="border p-1 rounded w-24"
        required
      />
      <button type="submit" className="bg-red-800 text-white px-2 py-1 rounded hover:bg-red-600">
        Add Item
      </button>
    </form>
  );
};

export default POItemRow;
