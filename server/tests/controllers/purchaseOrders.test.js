const purchaseOrdersController = require('../../controllers/purchaseOrdersController');
const db = require('../../config/db');
const supabase = require('../../config/supabaseClient');
const nodemailer = require('nodemailer');

jest.mock('../../config/db');
jest.mock('../../config/supabaseClient', () => ({
    from: jest.fn(),
}));
jest.mock('nodemailer');

describe('Purchase Orders Controller', () => {
    let req, res, mockClient;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            headersSent: false,
        };

        // Mock DB Client for Transactions
        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        };
        db.getClient.mockResolvedValue(mockClient);
        // db.query.mockImplementation(mockClient.query); // Removed to avoid confusion

        jest.clearAllMocks();
    });

    describe('getSuppliers', () => {
        it('should return a list of suppliers', async () => {
            const mockSuppliers = [{ id: 1, name: 'Supplier A' }];
            db.query.mockResolvedValue({ rows: mockSuppliers });

            await purchaseOrdersController.getSuppliers(req, res);

            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, name'));
            expect(res.json).toHaveBeenCalledWith({ success: true, suppliers: mockSuppliers });
        });

        it('should handle errors', async () => {
            const errorMessage = 'Database error';
            db.query.mockRejectedValue(new Error(errorMessage));

            await purchaseOrdersController.getSuppliers(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Failed to fetch suppliers' }));
        });
    });

    describe('createPurchaseOrder', () => {
        it('should create a purchase order successfully with transaction', async () => {
            req.body = {
                po_number: 'PO-123',
                supplier_name: 'Test Supplier',
                order_date: '2023-10-27',
                items: [{ inventory_id: 101, quantity_ordered: 5, unit_cost: 10 }]
            };

            // Mock sequence of client.query calls
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Supplier lookup (found)
                .mockResolvedValueOnce({ rows: [{ id: 1, po_number: 'PO-123' }] }) // Insert PO Header
                .mockResolvedValueOnce({ rows: [{ unit_price: 10 }] }) // Fetch Inventory Price
                .mockResolvedValueOnce() // Insert Item
                .mockResolvedValueOnce() // COMMIT
                .mockResolvedValueOnce({ rows: [{ id: 1, po_number: 'PO-123', items: [] }] }); // Fetch full PO

            await purchaseOrdersController.createPurchaseOrder(req, res);

            expect(db.getClient).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                purchase_order: expect.objectContaining({ po_number: 'PO-123' })
            }));
        });

        it('should rollback transaction on error', async () => {
            req.body = {
                po_number: 'PO-FAIL',
                supplier_name: 'Test Supplier',
                order_date: '2023-10-27',
            };

            // Simulate error during supplier lookup
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockRejectedValueOnce(new Error('Database connection failed')); // Error

            await purchaseOrdersController.createPurchaseOrder(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should return 400 if required fields are missing', async () => {
            req.body = {}; // Missing fields

            await purchaseOrdersController.createPurchaseOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Missing required fields' }));
        });
    });

    describe('updatePurchaseOrder', () => {
        it('should update a draft purchase order', async () => {
            req.params.id = 1;
            req.body = { po_number: 'PO-UPDATED' };

            // Mock update query via mockClient
            mockClient.query.mockResolvedValue({ rows: [{ id: 1, po_number: 'PO-UPDATED', status: 'draft' }] });

            await purchaseOrdersController.updatePurchaseOrder(req, res);

            expect(db.getClient).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE purchase_orders'), expect.any(Array));
            expect(mockClient.release).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                purchase_order: expect.objectContaining({ po_number: 'PO-UPDATED' })
            }));
        });

        it('should return 404 if PO not found or not draft', async () => {
            req.params.id = 999;
            req.body = { po_number: 'PO-UPDATED' };

            // Mock update query returning no rows via mockClient
            mockClient.query.mockResolvedValue({ rows: [] });

            await purchaseOrdersController.updatePurchaseOrder(req, res);

            expect(mockClient.release).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Purchase order not found or not in draft status' }));
        });
    });
});
