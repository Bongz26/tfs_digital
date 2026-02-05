import React from 'react';

const TransferGatePass = ({ transfer, items, driver }) => {
    if (!transfer) return null;

    const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const date = new Date(transfer.created_at).toLocaleDateString();

    return (
        <div className="hidden print:block print:w-full print:h-screen bg-white p-8 text-black" id="gate-pass-print-area">
            <div className="border-4 border-gray-800 p-6 rounded-lg max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <img src="/logo_full.png" alt="Thusanang Logo" className="h-24 mx-auto mb-2 object-contain" />
                    <h1 className="text-4xl font-extrabold uppercase">Gate Pass</h1>
                    <p className="text-sm mt-2 text-gray-600">Authorized Stock Movement</p>
                </div>

                {/* Transfer Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-xs uppercase text-gray-500 font-bold">Transfer Number</p>
                        <p className="text-2xl font-mono font-bold">{transfer.transfer_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-gray-500 font-bold">Date</p>
                        <p className="text-xl font-semibold">{date}</p>
                    </div>
                </div>

                {/* Locations */}
                <div className="flex items-center justify-between bg-gray-100 p-4 rounded mb-8 border border-gray-300">
                    <div className="text-center w-1/3">
                        <p className="text-xs uppercase text-gray-500 font-bold mb-1">From</p>
                        <p className="text-xl font-bold uppercase">{transfer.from_location}</p>
                    </div>
                    <div className="text-3xl text-gray-400">➔</div>
                    <div className="text-center w-1/3">
                        <p className="text-xs uppercase text-gray-500 font-bold mb-1">To</p>
                        <p className="text-xl font-bold uppercase">{transfer.to_location}</p>
                    </div>
                </div>

                {/* Driver */}
                <div className="mb-8 p-4 border border-gray-200 rounded">
                    <p className="text-xs uppercase text-gray-500 font-bold mb-1">Authorized Driver</p>
                    <p className="text-lg font-bold">{driver?.name || 'Unassigned'}</p>
                    <p className="text-sm text-gray-600">{driver?.phone_number || ''}</p>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold border-b-2 border-black mb-2 pb-1">Items Manifest</h3>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-400">
                                <th className="py-2">Item</th>
                                <th className="py-2">Model/Color</th>
                                <th className="py-2 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-2 font-medium">{item.name}</td>
                                    <td className="py-2 text-gray-600">{item.model} {item.color}</td>
                                    <td className="py-2 text-right font-bold">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-bold text-lg">
                                <td colSpan="2" className="py-2 text-right pr-4">Total Items:</td>
                                <td className="py-2 text-right">{totalQty}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t-2 border-gray-300">
                    <div>
                        <p className="mb-8 text-xs uppercase text-gray-500 font-bold">Dispatched By (Sign)</p>
                        <div className="border-b border-black w-full h-8"></div>
                    </div>
                    <div>
                        <p className="mb-8 text-xs uppercase text-gray-500 font-bold">Received By (Sign)</p>
                        <div className="border-b border-black w-full h-8"></div>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>Generated by TFS System • {new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

export default TransferGatePass;
