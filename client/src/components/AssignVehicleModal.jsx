import React, { useState, useEffect } from "react";
import { sanitizeDrivers, sanitizeVehicles } from "../utils/caseFormatters";

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
    const [assignmentRole, setAssignmentRole] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);
    const [isHired, setIsHired] = useState(false);
    const [externalVehicle, setExternalVehicle] = useState("");
    const [manualDriver, setManualDriver] = useState("");

    // Reset state when modal opens/closes or case changes
    useEffect(() => {
        if (isOpen) {
            setSelectedVehicle(null);
            setSelectedDriver(null);
            setAssignmentRole("");
            setIsHired(false);
            setExternalVehicle("");
            setManualDriver("");
            setIsAssigning(false);
        }
    }, [isOpen, caseId]);

    if (!isOpen) return null;

    const formatVehicleType = (type) => {
        if (!type) return "";
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    };

    const handleConfirm = async () => {
        if (!isHired && (!selectedVehicle || !selectedDriver)) return;
        if (isHired && (!externalVehicle || !manualDriver)) return;

        setIsAssigning(true);
        try {
            const payload = isHired ? {
                external_vehicle: externalVehicle,
                driver_name: manualDriver,
                assignment_role: assignmentRole,
                is_hired: true
            } : {
                vehicle_id: selectedVehicle.id,
                driver_id: selectedDriver.id,
                driver_name: selectedDriver.name,
                assignment_role: assignmentRole
            };

            await onAssign(caseId, payload);
        } catch (error) {
            console.error("Assignment failed in modal", error);
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96 animate-in fade-in zoom-in duration-200">
                <h3 className="font-bold text-lg mb-1">Assign Transport</h3>
                {caseNumber && <p className="text-sm text-gray-500 mb-4">Case: {caseNumber}</p>}

                <div className="mb-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isHired}
                            onChange={e => setIsHired(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Hired / 3rd Party Vehicle</span>
                    </label>
                </div>

                <div className="space-y-3">
                    {!isHired ? (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">VEHICLE</label>
                            <select
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                value={selectedVehicle?.id || ""}
                                onChange={e => {
                                    const v = vehicles.find(x => x.id === +e.target.value);
                                    setSelectedVehicle(v);
                                    // Auto-select role based on vehicle type if possible
                                    if (v) {
                                        if (v.type === 'hearse') setAssignmentRole('Hearse');
                                        else if (v.type === 'bus') setAssignmentRole('Bus');
                                    }
                                }}
                            >
                                <option value="">Select Vehicle</option>
                                {sanitizeVehicles(vehicles).map(v => (
                                    <option key={v.id} value={v.id}>
                                        {formatVehicleType(v.type)} - {v.reg_number}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">VEHICLE DETAILS</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="e.g. Hired Hearse (ABC 123 GP)"
                                value={externalVehicle}
                                onChange={e => setExternalVehicle(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">ROLE</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            value={assignmentRole}
                            onChange={e => setAssignmentRole(e.target.value)}
                        >
                            <option value="">Select Role (Optional)</option>
                            <option value="Hearse">Hearse</option>
                            <option value="Family Car">Family Car</option>
                            <option value="Lead Car">Lead Car</option>
                            <option value="Bus">Bus</option>
                            <option value="Flower Car">Flower Car</option>
                            <option value="Removal">Removal / First Call</option>
                        </select>
                    </div>

                    {!isHired ? (
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
                                {sanitizeDrivers(drivers).map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">DRIVER NAME</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Enter driver name"
                                value={manualDriver}
                                onChange={e => setManualDriver(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 font-semibold text-sm transition disabled:opacity-50"
                            disabled={isAssigning || (!isHired && (!selectedVehicle || !selectedDriver)) || (isHired && (!externalVehicle || !manualDriver))}
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
