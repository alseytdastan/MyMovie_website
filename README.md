# Movies Management System - Node.js + Express + MongoDB Atlas

A full-stack web application with CRUD operations for managing movies using Node.js, Express, and MongoDB Atlas (native driver).

## Features

### Backend
- ✅ Node.js + Express server
- ✅ MongoDB native driver (no Mongoose)
- ✅ Full CRUD API for movies collection
- ✅ Filtering by genre
- ✅ Sorting by year (ascending/descending)
- ✅ Field projection support
- ✅ Proper HTTP status codes (200, 201, 400, 404, 500)
- ✅ Custom logger middleware
- ✅ Global 404 handler for API routes
- ✅ Input validation and error handling

### Frontend
- ✅ Single-page application with full CRUD operations
- ✅ Table displaying all movies
- ✅ Form to add new movies (fields: title, genre, year)
- ✅ Edit and delete buttons for each movie
- ✅ Genre filtering input
- ✅ Year sorting button
- ✅ Dynamic table updates after all operations
- ✅ Responsive design
- ✅ User-friendly error/success messages

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (cloud) or local MongoDB
- **Frontend**: HTML, CSS, JavaScript (Vanilla JS with Fetch API)

## Installation

1. **Clone or download the project**
   ```bash
   cd MyMovie_wb_project_ass_3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB Atlas**

   1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   2. Create a new cluster (free tier available)
   3. Create a database user (username and password)
   4. Whitelist your IP address:
      - Click "Network Access" → "Add IP Address"
      - For development, you can use `0.0.0.0/0` (allows all IPs)
   5. Get your connection string:
      - Click "Connect" → "Connect your application"
      - Copy the connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/`)
   
   6. Set environment variables:
      ```bash
      export MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/"
      export MONGO_DB_NAME="mymovie"
      ```
   
   Or create a `.env` file (recommended):
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
   MONGO_DB_NAME=mymovie
   ```
   
   If using `.env`, install dotenv:
   ```bash
   npm install dotenv
   ```
   Then add at the top of `server.js`:
   ```javascript
   require('dotenv').config();
   ```

   **Alternative: Local MongoDB**
   
   If you prefer local MongoDB:
   ```bash
   export MONGO_URI="mongodb://localhost:27017"
   export MONGO_DB_NAME="mymovie"
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   Or:
   ```bash
   node server.js
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## API Endpoints

### Base URL
```
http://localhost:3000/api/movies
```

### Endpoints

| Method | Route | Description | Status Codes |
|--------|-------|-------------|--------------|
| `GET` | `/api/movies` | Get all movies | 200 OK, 400 Bad Request, 500 Internal Server Error |
| `GET` | `/api/movies/:id` | Get single movie by ID | 200 OK, 400 Bad Request (invalid id), 404 Not Found, 500 Internal Server Error |
| `POST` | `/api/movies` | Create new movie | 201 Created, 400 Bad Request (missing fields), 500 Internal Server Error |
| `PUT` | `/api/movies/:id` | Update movie | 200 OK, 400 Bad Request (invalid id/missing fields), 404 Not Found, 500 Internal Server Error |
| `DELETE` | `/api/movies/:id` | Delete movie | 200 OK, 400 Bad Request (invalid id), 404 Not Found, 500 Internal Server Error |

### Query Parameters

**GET /api/movies**
- `genre` - Filter by genre (e.g., `?genre=Action`)
- `sort` - Sort by year (`?sort=year:asc` or `?sort=year:desc`)
- `fields` - Project specific fields (e.g., `?fields=title,year`)

**Examples:**
```
GET /api/movies
GET /api/movies?genre=Action
GET /api/movies?sort=year:asc
GET /api/movies?genre=Drama&sort=year:desc
GET /api/movies?fields=title,year,genre
```

### Request/Response Examples

**POST /api/movies**
```json
Request Body:
{
  "title": "The Matrix",
  "genre": "Sci-Fi",
  "year": 1999
}

Response (201 Created):
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "The Matrix",
  "genre": "Sci-Fi",
  "year": 1999,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**PUT /api/movies/:id**
```json
Request Body:
{
  "title": "The Matrix Reloaded",
  "year": 2003
}

Response (200 OK):
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "The Matrix Reloaded",
  "genre": "Sci-Fi",
  "year": 2003,
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

**DELETE /api/movies/:id**
```json
Response (200 OK):
{
  "message": "Movie deleted successfully"
}
```

## Database Schema

### Collection: `movies`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB document ID |
| `title` | String | Yes | Movie title |
| `genre` | String | No | Movie genre (default: "general") |
| `year` | Number | Yes | Release year (1800 - current year + 1) |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

## Project Structure

```
MyMovie_wb_project_ass_3/
├── database/
│   └── mongo.js          # MongoDB connection logic
├── routes/
│   └── movies.js         # Movies API routes
├── views/
│   └── index.html        # Frontend application
├── public/
│   └── style.css         # Styles
├── server.js             # Express server setup
├── package.json          # Dependencies
└── README.md            # This file
```

## Testing the API

### Using curl

**Get all movies:**
```bash
curl http://localhost:3000/api/movies
```

**Get movies filtered by genre:**
```bash
curl http://localhost:3000/api/movies?genre=Action
```

**Get movies sorted by year:**
```bash
curl http://localhost:3000/api/movies?sort=year:asc
```

**Create new movie:**
```bash
curl -X POST http://localhost:3000/api/movies \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Inception",
    "genre": "Sci-Fi",
    "year": 2010
  }'
```

**Update movie:**
```bash
curl -X PUT http://localhost:3000/api/movies/<movie-id> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Inception",
    "genre": "Science Fiction",
    "year": 2010
  }'
```

**Delete movie:**
```bash
curl -X DELETE http://localhost:3000/api/movies/<movie-id>
```

### Using the Frontend

1. Open `http://localhost:3000` in your browser
2. Fill out the form to add a new movie (title, genre, year)
3. Use the filter input to filter by genre
4. Use the sort dropdown to sort by year
5. Click "Edit" to update a movie
6. Click "Delete" to remove a movie
7. Table updates dynamically after all operations

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGO_DB_NAME` | Database name | `mymovie` |
| `PORT` | Server port | `3000` |

## Error Handling

The API returns appropriate HTTP status codes:

- **200 OK** - Successful GET, PUT, DELETE operations
- **201 Created** - Successful POST operation
- **400 Bad Request** - Invalid input, missing required fields, invalid ID format
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server or database errors

All error responses are in JSON format:
```json
{
  "error": "Error message here"
}
```

## Middleware

- **express.json()** - Parses JSON request bodies
- **express.urlencoded()** - Parses URL-encoded form data
- **express.static()** - Serves static files from public directory
- **Custom Logger** - Logs HTTP method + URL for every request

## Features Implemented

✅ **Backend Requirements:**
- Node.js + Express
- MongoDB native driver (no Mongoose)
- Collection: "movies"
- Full CRUD API with all required endpoints
- Filtering by genre
- Sorting by year
- Field projection support
- Proper HTTP status codes (200, 201, 400, 404, 500)
- express.json() middleware
- Custom logger middleware (logs method + URL)
- Global 404 handler for API routes

✅ **Frontend Requirements:**
- HTML page (index.html) served from Express
- Table showing all movies
- Form to add new movie (fields: title, genre, year)
- Buttons to update and delete movies
- Input to filter movies by genre
- Button to sort movies by year
- All operations use fetch() to call API
- Table updates dynamically after add/update/delete/filter/sort

## License

ISC

## Authors

- Dastan Alseit – SE-2424
- Akylbek Sabyrzhan – SE-2424
