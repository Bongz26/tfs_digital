const { query } = require('../config/db');

async function main() {
  const items = [
    { model: 'Flat Lid', color: 'Redwood', qty: 1 },
    { model: 'Econo', color: 'Cherry', qty: 2 },
    { model: 'Dutch Cleveland', color: 'Kiaat', qty: 3 },
    { model: 'Dutch Cleveland', color: 'Redwood', qty: 1 },
    { model: 'Octagon', color: 'Redwood', qty: 1 },
    { model: 'Dutch Cleveland', color: 'Brown', qty: 1 },
    { model: 'Flat Lid', color: 'Fume', qty: 1 },
    { model: 'Flat Lid', color: 'Cherry', qty: 1 },
    { model: 'Spider', color: null, qty: 1 },
    { model: 'Raised Halfview', color: 'Glass', qty: 1 },
    { model: 'Raised Halfview', color: 'Platinum', qty: 1 },
    { model: '4 Tiers', color: 'Black', qty: 1 },
  ];

  const location = 'HQ Storeroom & showroom';

  // Ensure columns exist
  await query('ALTER TABLE inventory ADD COLUMN IF NOT EXISTS model VARCHAR(100)');
  await query('ALTER TABLE inventory ADD COLUMN IF NOT EXISTS color VARCHAR(50)');

  let upserts = 0;
  for (const it of items) {
    const name = it.color ? `${it.model} ${it.color}` : it.model;
    const sel = await query(
      'SELECT id FROM inventory WHERE UPPER(model)=UPPER($1) AND (color IS NOT DISTINCT FROM $2) AND location=$3 AND category=$4 LIMIT 1',
      [it.model, it.color, location, 'coffin']
    );
    if (sel.rows.length) {
      const id = sel.rows[0].id;
      await query(
        'UPDATE inventory SET stock_quantity=$1, low_stock_threshold=1, updated_at=NOW() WHERE id=$2',
        [it.qty, id]
      );
      upserts++;
    } else {
      await query(
        'INSERT INTO inventory (name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, model, color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [name, 'coffin', null, it.qty, 0, 1, location, it.model, it.color]
      );
      upserts++;
    }
  }

  const summary = await query(
    'SELECT COUNT(*) AS count, COALESCE(SUM(stock_quantity),0) AS total_qty FROM inventory WHERE location=$1 AND category=$2',
    [location, 'coffin']
  );
  console.log('Upserts:', upserts, 'HQ items:', summary.rows[0].count, 'Total qty:', summary.rows[0].total_qty);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
