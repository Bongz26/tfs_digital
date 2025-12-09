const casesController = require('../../controllers/casesController');
const db = require('../../config/db');

jest.mock('../../config/db');

describe('Cases Controller', () => {
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

    describe('getAllCases', () => {
        it('should return all cases', async () => {
            const mockCases = [{ id: 1, case_number: 'THS-2023-001' }];
            db.query.mockResolvedValue({ rows: mockCases });

            await casesController.getAllCases(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true, cases: mockCases });
        });
    });

    describe('createCase', () => {
        it('should create a case successfully', async () => {
            req.body = {
                deceased_name: 'John Doe',
                intake_day: '2023-11-22', // Wednesday
                delivery_date: '2023-11-24',
                delivery_time: '10:00',
            };

            // Mock case number generation
            db.query.mockResolvedValueOnce({ rows: [] }); // No previous case

            // Mock insert
            const mockCase = { id: 1, ...req.body, case_number: 'THS-2023-001' };
            db.query.mockResolvedValueOnce({ rows: [mockCase] });

            await casesController.createCase(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true, case: mockCase });
        });

        it('should fail if intake day is not Wednesday', async () => {
            req.body = {
                intake_day: '2023-11-23', // Thursday
            };

            await casesController.createCase(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Intake day must be a Wednesday' }));
        });
    });
});
