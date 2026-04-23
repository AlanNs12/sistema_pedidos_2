# Migration Notes - Part Groups (Compatibility Groups)

## Overview

This migration adds support for **Part Groups** (compatibility groups), which allow multiple parts to share a single inventory stock. This is useful when different part variants (e.g., different suppliers, descriptions, or prices) are physically the same part and should decrement from a shared stock pool.

## Database Changes

### New Tables

#### `part_groups`
- `id` (UUID, Primary Key) - Unique identifier
- `name` (TEXT, NOT NULL) - Display name for the group
- `stock_quantity` (INTEGER, NOT NULL, DEFAULT 0) - Shared stock quantity
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

#### `part_group_audit`
- `id` (UUID, Primary Key) - Unique identifier  
- `part_group_id` (UUID, FK to part_groups) - Reference to the group
- `change` (INTEGER) - Stock change amount (positive = increase, negative = decrease)
- `reason` (TEXT) - Reason for the change (e.g., "sale", "manual_adjustment")
- `reference_id` (TEXT, NULLABLE) - Reference to related entity (e.g., part ID)
- `created_at` (TIMESTAMPTZ) - Timestamp of the change

### Table Modifications

#### `pro` (parts table)
- Added `part_group_id` (UUID, NULLABLE, FK to part_groups) - Links part to its compatibility group

### Indexes
- `idx_part_group_audit_group_id` on `part_group_audit(part_group_id)`
- `idx_pro_part_group_id` on `pro(part_group_id)`

## Migration Behavior

### Automatic Migration for Existing Parts

When the migration runs, it will:

1. **Create individual groups for each existing part** - Each part gets its own group with the part's current stock quantity (`proqtde`)
2. **Link parts to their groups** - The `part_group_id` foreign key is set
3. **Preserve existing behavior** - Since each part initially has its own group, stock behavior remains unchanged until groups are consolidated

### Important Notes

- The `pro.proqtde` column is **preserved** and remains in the database
- New code reads/writes stock from `part_groups.stock_quantity`
- The migration is **non-destructive** - no data is lost
- Groups can be consolidated later by admin users through the admin UI

## Verification Steps

After running the migration, verify the following:

1. **Check tables exist:**
   ```sql
   SELECT COUNT(*) FROM part_groups;
   SELECT COUNT(*) FROM part_group_audit;
   ```

2. **Check all parts have groups:**
   ```sql
   SELECT COUNT(*) FROM pro WHERE part_group_id IS NULL;
   -- Should return 0
   ```

3. **Check stock was migrated correctly:**
   ```sql
   SELECT p.procod, p.prodes, p.proqtde as old_stock, pg.stock_quantity as group_stock
   FROM pro p
   JOIN part_groups pg ON pg.id = p.part_group_id
   WHERE p.proqtde != pg.stock_quantity;
   -- Should return 0 rows (stocks should match)
   ```

## How to Use

### Admin UI

Navigate to `/part-groups` (requires admin authentication) to:

- View all compatibility groups
- Create new groups
- Add/remove parts from groups
- Adjust group stock quantities
- View stock change history (audit trail)

### API Endpoints (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/part-groups` | List all groups |
| GET | `/part-groups/:id` | Get group details with parts |
| GET | `/part-groups/:id/audit` | Get audit history |
| POST | `/part-groups` | Create new group |
| PUT | `/part-groups/:id` | Update group name |
| PUT | `/part-groups/:id/stock` | Update group stock |
| POST | `/part-groups/:id/parts` | Add part to group |
| DELETE | `/part-groups/parts/:partId` | Remove part from group |
| DELETE | `/part-groups/:id` | Delete group |

### Consolidating Groups (TODO)

After migration, admins should:

1. Identify parts that should share inventory
2. Create a new group (or use an existing one)
3. Move compatible parts into the same group
4. Set the combined stock quantity

**Example workflow:**
- Part A (Samsung A50 Screen - Supplier 1) has stock 10
- Part B (Samsung A50 Screen - Supplier 2) has stock 5
- Create group "Samsung A50 Screen Compatible"
- Add both parts to the group
- Set group stock to 15 (combined)

## Technical Notes

### Concurrency Safety

Stock decrement operations use `SELECT ... FOR UPDATE` to prevent race conditions:

```javascript
// In partGroupModels.js
const groupResult = await txClient.query(`
  SELECT id, stock_quantity, name
  FROM part_groups
  WHERE id = $1
  FOR UPDATE
`, [part.part_group_id]);
```

### Database Triggers

The system uses PostgreSQL triggers to automatically update stock on order confirmation/cancellation:

- **`atualizar_saldo`** - Triggered when `pvconfirmado = 'S'` (order confirmed)
  - Decrements `procor.procorqtde` for items with colors
  - Decrements `pro.proqtde` for items without colors (legacy)
  - **NEW:** Decrements `part_groups.stock_quantity` for parts with a group
  - **NEW:** Creates audit records in `part_group_audit`

- **`retornar_saldo`** - Triggered when `pvsta = 'X'` (order cancelled)
  - Returns stock to `procor.procorqtde` and `pro.proqtde`
  - **NEW:** Returns stock to `part_groups.stock_quantity`
  - **NEW:** Creates audit records for cancellations

### Audit Trail

All stock changes are recorded in `part_group_audit`:

- Sales automatically create audit entries with reason "sale"
- Manual adjustments create entries with the selected reason
- The `reference_id` field links to the part involved (if applicable)

## Rollback

To rollback this migration (if needed):

```sql
-- Remove foreign key from pro
ALTER TABLE pro DROP CONSTRAINT IF EXISTS fk_pro_part_group;
ALTER TABLE pro DROP COLUMN IF EXISTS part_group_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_part_group_audit_group_id;
DROP INDEX IF EXISTS idx_pro_part_group_id;

-- Drop tables
DROP TABLE IF EXISTS part_group_audit;
DROP TABLE IF EXISTS part_groups;
```

**Warning:** Rollback will lose all group configurations. Stock data in `pro.proqtde` is preserved.

## Running Tests

To run the part groups integration tests:

```bash
# From the project root directory
node tests/partGroups.test.js
```

**Prerequisites:**
- PostgreSQL database running with the schema created
- Environment variables configured (`.env` file)
- Migration must have run first (happens automatically on app startup)

**Test Coverage:**
- Creating groups
- Listing groups
- Updating group name and stock
- Audit record creation
- Stock decrement with sufficient/insufficient stock
- Stock increment

## Future Improvements (TODO)

- [ ] Consolidate groups tool (batch merge multiple groups)
- [ ] Low stock alerts per group
- [ ] Stock transfer between groups
- [ ] Import/export group configurations
