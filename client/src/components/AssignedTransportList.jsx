import React from "react";

export default function AssignedTransportList({ roster = [] }) {
    if (!roster || roster.length === 0) return null;

    const formatVehicleType = (type) => {
        if (!type) return "";
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    };

    // Group roster entries by driver name
    const groupByDriver = () => {
        const groups = {};

        roster.forEach(entry => {
            const driverKey = entry.driver_name || 'TBD';

            if (!groups[driverKey]) {
                groups[driverKey] = {
                    driver: driverKey,
                    assignments: []
                };
            }

            groups[driverKey].assignments.push(entry);
        });

        return Object.values(groups);
    };

    const driverGroups = groupByDriver();

    // If only one group, display simplified view
    if (driverGroups.length === 1 && driverGroups[0].assignments.length === 1) {
        const r = driverGroups[0].assignments[0];
        return (
            <div className="bg-black/5 border border-red-600 rounded-lg p-3 space-y-2">
                <div className="text-xs uppercase font-bold text-yellow-600 tracking-wide mb-2">
                    Assigned Transport
                </div>
                <div className="text-sm text-gray-900">
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
                            <span> {r.reg_number || 'Not assigned'} {r.vehicle_type && <span className="text-gray-500">({formatVehicleType(r.vehicle_type)})</span>}</span>
                        )}
                    </div>
                    <div>
                        <span className="font-semibold text-gray-600">Driver:</span> {r.driver_name || "TBD"}
                    </div>
                </div>
            </div>
        );
    }

    // Multiple groups or multiple assignments - show grouped view
    return (
        <div className="space-y-4">
            <div className="text-xs uppercase font-bold text-yellow-600 tracking-wide">
                Assigned Transport ({roster.length} vehicle{roster.length !== 1 ? 's' : ''})
            </div>

            {driverGroups.map((group, groupIndex) => (
                <div
                    key={groupIndex}
                    className="bg-gradient-to-r from-red-50 to-yellow-50 border-2 border-red-600 rounded-lg p-4 shadow-sm"
                >
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-red-300">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {groupIndex + 1}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-red-800">
                                    Group {groupIndex + 1}
                                </div>
                                <div className="text-xs text-gray-600">
                                    Driver: <span className="font-semibold text-gray-800">{group.driver}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-xs bg-red-600 text-white px-2 py-1 rounded-full font-semibold">
                            {group.assignments.length} vehicle{group.assignments.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Group Assignments */}
                    <div className="space-y-2">
                        {group.assignments.map((r, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition"
                            >
                                {r.assignment_role && (
                                    <div className="text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                                        {r.assignment_role}
                                    </div>
                                )}
                                <div className="text-sm">
                                    <div className="mb-1">
                                        <span className="font-semibold text-gray-600">Vehicle:</span>
                                        {r.external_vehicle ? (
                                            <span className="ml-1">
                                                {r.external_vehicle}
                                                <span className="ml-1 text-red-500 text-xs uppercase font-bold">(Hired)</span>
                                            </span>
                                        ) : (
                                            <span className="ml-1">
                                                {r.reg_number || 'Not assigned'}
                                                {r.vehicle_type && (
                                                    <span className="text-gray-500 text-xs ml-1">
                                                        ({formatVehicleType(r.vehicle_type)})
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {r.pickup_time && (
                                        <div className="text-xs text-gray-500">
                                            Pickup: {new Date(r.pickup_time).toLocaleString('en-ZA', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
