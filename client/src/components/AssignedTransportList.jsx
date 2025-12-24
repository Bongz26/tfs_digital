import React from "react";

export default function AssignedTransportList({ roster = [] }) {
    if (!roster || roster.length === 0) return null;

    const formatVehicleType = (type) => {
        if (!type) return "";
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    };

    return (
        <div className="bg-black/5 border border-red-600 rounded-lg p-3 space-y-2">
            <div className="text-xs uppercase font-bold text-yellow-600 tracking-wide mb-2">
                Assigned Transport
            </div>
            {roster.map((r, i) => (
                <div key={i} className="text-sm text-gray-900 border-b border-gray-200 last:border-0 pb-1 last:pb-0">
                    <div>
                        <strong className="text-red-600">Vehicle:</strong> {r.vehicle?.reg_number} ({formatVehicleType(r.vehicle?.type)})
                    </div>
                    <div>
                        <strong className="text-red-600">Driver:</strong> {r.driver?.name}
                    </div>
                </div>
            ))}
        </div>
    );
}
