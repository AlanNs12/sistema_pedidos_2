# Top Peças Report - Relatório de Peças Mais Vendidas

## Overview

The Top Peças report provides comprehensive sales analytics for parts, allowing admins to identify best-selling products and generate purchase requests based on actual sales data.

## Features

- **Date Range Filtering**: Filter results by custom date ranges (dataInicio/dataFim)
- **Brand Filtering**: Filter by specific marca (brand) or view all brands
- **Grouping Options**: 
  - View individual parts (default)
  - Group by compatibility groups (part groups)
- **Multiple Export Formats**:
  - JSON (for programmatic access)
  - PDF (for printing/sharing)
  - Excel/XLSX (for further analysis)
- **Confirmed Orders Only**: Only includes confirmed orders (pvconfirmado = 'S')
- **No Limit**: Shows all matching products (no top-N cap)

## API Endpoints

### 1. Get Report Data (JSON)

**Endpoint**: `GET /v2/relatorios/top-pecas`

**Authentication**: Required (autenticarToken middleware)

**Query Parameters**:
- `dataInicio` (optional): Start date in YYYY-MM-DD format
- `dataFim` (optional): End date in YYYY-MM-DD format
- `marca` (optional): Brand ID (integer)
- `groupBy` (optional): `peca` (default) or `grupo`

**Response** (groupBy='peca'):
```json
[
  {
    "peca": "Part name",
    "qtde_vendida": 150,
    "modelo": "Model name",
    "grupo": "Group name or -"
  }
]
```

**Response** (groupBy='grupo'):
```json
[
  {
    "grupo": "Group name",
    "qtde_vendida": 300,
    "modelo": "Model 1, Model 2",
    "peca": "Part 1, Part 2"
  }
]
```

### 2. Export to PDF

**Endpoint**: `GET /v2/relatorios/top-pecas/pdf`

**Authentication**: Required (autenticarToken middleware)

**Query Parameters**: Same as JSON endpoint

**Response**: PDF file download

### 3. Export to Excel

**Endpoint**: `GET /v2/relatorios/top-pecas/xls`

**Authentication**: Required (autenticarToken middleware)

**Query Parameters**: Same as JSON endpoint

**Response**: XLSX file download

## Frontend Usage

### Access

Navigate to **Relatórios** in the admin menu, or directly access `/relatorios`

### Interface Components

1. **Filters Section**:
   - Data Início: Start date picker
   - Data Fim: End date picker
   - Marca: Dropdown with all available brands
   - Agrupar por: Toggle between individual parts and groups

2. **Results Section**:
   - Data table with columns based on grouping:
     - By Part: Peça | Qtde Vendida | Modelo | Grupo
     - By Group: Grupo | Qtde Vendida | Modelo | Peça
   - Export buttons for PDF and Excel

### Workflow

1. Select desired filters (dates, brand, grouping)
2. Click "Filtrar" to load results
3. Review results in the table
4. Export to PDF or Excel as needed
5. Use "Limpar" to reset filters

## Database Schema

The report uses the following tables:
- `pv`: Orders table (filters by pvconfirmado = 'S')
- `pvi`: Order items table (source of quantity sold)
- `pro`: Parts table
- `modelo`: Models table
- `marcas`: Brands table
- `part_groups`: Compatibility groups table (optional join)

## Implementation Files

### Backend
- **Model**: `src/models/relatoriosModels.js` - Database queries
- **Controller**: `src/controllers/relatoriosController.js` - Request handlers and export logic
- **Routes**: `src/routes/relatoriosRoutes.js` - API endpoint definitions

### Frontend
- **HTML/JS**: `public/html/auth/admin/html/painel-relatorios.html` - Complete UI

### Configuration
- **Routes Registration**: `src/app.js` - Wired relatoriosRoutes and page route
- **Menu**: `public/html/auth/js/componentes.js` - Added "Relatórios" menu item

## Dependencies

The following NPM packages were added:
- `exceljs@4.4.0`: Excel file generation (no known vulnerabilities)
- `pdfkit@0.17.2`: PDF file generation (no known vulnerabilities)

## Security

- All endpoints require authentication via `autenticarToken` middleware
- Query parameters are properly sanitized through parameterized queries
- No SQL injection vulnerabilities
- File downloads use appropriate Content-Type and Content-Disposition headers

## Usage Examples

### Example 1: Get all sales from January 2024
```
GET /v2/relatorios/top-pecas?dataInicio=2024-01-01&dataFim=2024-01-31
```

### Example 2: Get sales for a specific brand, grouped by compatibility groups
```
GET /v2/relatorios/top-pecas?marca=5&groupBy=grupo
```

### Example 3: Export all-time sales to Excel
```
GET /v2/relatorios/top-pecas/xls
```

## Future Enhancements

Potential improvements for future versions:
- Add sorting options (by quantity, name, etc.)
- Add pagination for very large datasets
- Include revenue calculations (quantity × price)
- Add chart visualizations
- Support for multiple brand selection
- Date range presets (last 7 days, last month, etc.)
