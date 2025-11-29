const inventoryController = require('../../controllers/inventoryController');
const db = require('../../config/db');

jest.mock('../../config/db');

describe('Inventory Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {},
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe('getAllInventory', () => {
        it('should return all inventory items', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ exists: true }] }); // Table check
            const mockInventory = [{ id: 1, name: 'Item A' }];
            db.query.mockResolvedValueOnce({ rows: mockInventory }); // Inventory fetch

            await inventoryController.getAllInventory(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true, inventory: mockInventory });
        });

        it('should handle missing table', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ exists: false }] });

            await inventoryController.getAllInventory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Database table not found' }));
        });
    });

    describe('updateStockQuantity', () => {
        it('should update stock quantity', async () => {
            req.params.id = 1;
            req.body.stock_quantity = 10;

            db.query.mockResolvedValueOnce({ rows: [{ stock_quantity: 5, low_stock_threshold: 2 }] }); // Get item
            db.query.mockResolvedValueOnce({}); // Update

            await inventoryController.updateStockQuantity(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true, stock_quantity: 10, is_low_stock: false });
        });

        it('should return 404 if item not found', async () => {
            req.params.id = 999;
            db.query.mockResolvedValueOnce({ rows: [] });

            await inventoryController.updateStockQuantity(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
