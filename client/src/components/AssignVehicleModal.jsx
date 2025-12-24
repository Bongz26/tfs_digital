import React, { useState, useEffect } from "react";

export default function AssignVehicleModal({
    isOpen,
    onClose,
    onAssign,
    vehicles = [],
    drivers = [],
    caseNumber,
    caseId
}) {
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);

    // Reset state when modal opens/closes or case changes
    useEffect(() => {
        if (isOpen) {
            setSelectedVehicle(null);
            setSelectedDriver(null);
            setIsAssigning(false);
        }
    }, [isOpen, caseId]);

    if (!isOpen) return null;

    const formatVehicleType = (type) => {
        if (!type) return "";
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    };

    const handleConfirm = async () => {
        if (!selectedVehicle || !selectedDriver) return;

        setIsAssigning(true);
        try {
            await onAssign(caseId, {
                vehicle_id: selectedVehicle.id,
                driver_id: selectedDriver.id,
                driver_name: selectedDriver.name
            });
            // The parent is responsible for closing, but we can reset internal state or wait
        } catch (error) {
            console.error("Assignment failed in modal", error);
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-80 animate-in fade-in zoom-in duration-200">
                <h3 className="font-bold text-lg mb-1">Assign Transport</h3>
                {caseNumber && <p className="text-sm text-gray-500 mb-4">Case: {caseNumber}</p>}

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">VEHICLE</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            value={selectedVehicle?.id || ""}
                            onChange={e => {
                                const v = vehicles.find(x => x.id === +e.target.value);
                                setSelectedVehicle(v);
                            }}
                        >
                            <option value="">Select Vehicle</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>
                                    {formatVehicleType(v.type)} - {v.reg_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">DRIVER</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            value={selectedDriver?.id || ""}
                            onChange={e => {
                                const d = drivers.find(x => x.id === +e.target.value);
                                setSelectedDriver(d);
                            }}
                        >
                            <option value="">Select Driver</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 font-semibold text-sm transition disabled:opacity-50"
                            disabled={isAssigning || !selectedVehicle || !selectedDriver}
                            onClick={handleConfirm}
                        >
                            {isAssigning ? "Assigning..." : "Confirm"}
                        </button>
                        <button
                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 font-semibold text-sm transition"
                            onClick={onClose}
                            disabled={isAssigning}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
