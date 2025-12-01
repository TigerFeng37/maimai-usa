# Reports API Documentation

This API provides endpoints for managing issue reports for maimai locations.

## Setup

### Install Dependencies

```bash
npm install
# or
yarn install
```

This will install Express and CORS dependencies needed for the API server.

### Environment Variables

Create a `.env` file in the root directory (optional):

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Server Configuration
PORT=3001
```

### Start the API Server

```bash
npm run server
# or
yarn server
```

The API server will start on `http://localhost:3001` (or the port specified in the `.env` file).

## API Endpoints

### Health Check

```
GET /health
```

Returns the health status of the API server.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Reports for a Store

```
GET /api/reports/:storeId
```

Returns all reports for a specific store, sorted by timestamp (newest first).

**Parameters:**
- `storeId` (path parameter): The store ID

**Response:**
```json
[
  {
    "id": "1234567890abc",
    "storeId": "store123",
    "storeName": "Round1 Location",
    "address": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "issues": ["Broken Parts", "Offline"],
    "description": "Cabinet not working properly",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "resolved": false,
    "resolvedBy": null,
    "resolvedAt": null,
    "workingStatus": null
  }
]
```

### Create a Report

```
POST /api/reports/:storeId
```

Creates a new report for a specific store.

**Parameters:**
- `storeId` (path parameter): The store ID

**Request Body:**
```json
{
  "issues": ["Broken Parts", "Offline"],
  "description": "Cabinet not working properly",
  "storeName": "Round1 Location",
  "address": "123 Main St",
  "city": "Los Angeles",
  "state": "CA"
}
```

**Response:**
```json
{
  "id": "1234567890abc",
  "storeId": "store123",
  "storeName": "Round1 Location",
  "address": "123 Main St",
  "city": "Los Angeles",
  "state": "CA",
  "issues": ["Broken Parts", "Offline"],
  "description": "Cabinet not working properly",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "resolved": false,
  "resolvedBy": null,
  "resolvedAt": null,
  "workingStatus": null
}
```

### Update a Report

```
PATCH /api/reports/:storeId/:reportId
```

Updates an existing report.

**Parameters:**
- `storeId` (path parameter): The store ID
- `reportId` (path parameter): The report ID

**Request Body:**
```json
{
  "resolved": true,
  "workingStatus": "yes"
}
```

**Response:**
```json
{
  "id": "1234567890abc",
  "storeId": "store123",
  "storeName": "Round1 Location",
  "address": "123 Main St",
  "city": "Los Angeles",
  "state": "CA",
  "issues": ["Broken Parts", "Offline"],
  "description": "Cabinet not working properly",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "resolved": true,
  "resolvedBy": null,
  "resolvedAt": "2024-01-01T01:00:00.000Z",
  "workingStatus": "yes"
}
```

**Special Behavior:**
- If `workingStatus` is set to `"yes"`, the report will automatically be marked as resolved
- If `workingStatus` is set to `"no"` and the report was resolved, it will be unmarked as resolved

### Delete a Report

```
DELETE /api/reports/:storeId/:reportId
```

Deletes a report.

**Parameters:**
- `storeId` (path parameter): The store ID
- `reportId` (path parameter): The report ID

**Response:**
```json
{
  "message": "Report deleted successfully"
}
```

## Data Storage

Reports are stored as JSON files in the `server/data/` directory. Each store has its own file named `reports_{storeId}.json`.

## Frontend Integration

The frontend uses the API client in `src/utils/reportsApi.js`, which automatically falls back to localStorage if the API is unavailable. This ensures the application continues to work even if the API server is not running.

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Created (for POST requests)
- `400`: Bad Request (missing required fields)
- `404`: Not Found (report doesn't exist)
- `500`: Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message"
}
```

