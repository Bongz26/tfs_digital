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
                <div key={i} className="text-sm text-gray-900 border-b border-gray-200 last:border-0 pb-2 last:pb-0 mb-2 last:mb-0">
                    {r.assignment_role && (
                        <div className="text-xs font-bold text-red-600 uppercase mb-1">
                            {r.assignment_role}
                        </div>
                    )}
                    <div>
                        <span className="font-semibold text-gray-600">Vehicle:</span>
                        {r.external_vehicle ? (
                            <span> {r.external_vehicle} <span className="text-red-500 text-xs uppercase font-bold">(Hired)</span></span>
                        ) : (
                            <span> {r.vehicle?.reg_number} <span className="text-gray-500">({formatVehicleType(r.vehicle?.type)})</span></span>
                        )}
                    </div>
                    <div>
                        <span className="font-semibold text-gray-600">Driver:</span> {r.driver?.name || "TBD"}
                    </div>
                </div>
            ))}
        </div>
    );
}
