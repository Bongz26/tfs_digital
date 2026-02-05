import React from 'react';
import { Link } from 'react-router-dom';
import VehicleCalendar from '../components/VehicleCalendar';

export default function Roster() {
    function getUpcomingSaturday() {
        const today = new Date();
        const day = today.getDay(); // 0 = Sunday, 6 = Saturday
        const daysUntilSaturday = (6 - day + 7) % 7;
        const saturday = new Date();
        saturday.setDate(today.getDate() + daysUntilSaturday);
        return saturday;
    }

    function formatRosterDate(date) {
        return date.toLocaleDateString("en-ZA", {
            weekday: "long",
            day: "numeric",
            month: "short"
        });
    }

    return (
        <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-red-800">Vehicle Roster</h1>
                    <p className="text-gray-600 mt-1">
                        {formatRosterDate(getUpcomingSaturday())}
                    </p>
                </div>
                <Link
                    to="/dashboard"
                    className="text-red-600 hover:text-red-800 font-medium flex items-center gap-2"
                >
                    <span>&larr;</span> Back to Dashboard
                </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
                <VehicleCalendar />
            </div>
        </div>
    );
}
