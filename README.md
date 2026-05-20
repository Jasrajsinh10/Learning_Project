# NexStore | AI-Powered Hybrid Search & Voice Portal

NexStore is a progressive backend server built with [NestJS](https://nestjs.com/) that implements a highly optimized, state-of-the-art hybrid search system. It combines semantic search (using vector embeddings) with traditional lexical full-text search, enhanced by AI relevance explanations and streaming audio transcription.

---

## 🚀 Key Features

*   **Hybrid Search Engine**: Integrates lexical search (PostgreSQL Full-Text Search) with semantic search (`pgvector` cosine similarity) using **Reciprocal Rank Fusion (RRF)** to deliver highly accurate matches.
*   **On-Premise Embedding Generation**: Generates 768-dimensional text embeddings locally on the server using `@xenova/transformers` with the `all-mpnet-base-v2` model.
*   **Voice Search / Whisper Integration**: Accepts audio files, transcribes them using a local Python script running `faster-whisper` (on CPU, quantized to `int8`), and performs a product search using the resulting text.
*   **Generative AI Explanations**: Uses Llama-3.3-70b via the **Groq SDK** to dynamically generate concise relevance explanations (under 10 words) for each search result.
*   **Redis Caching Layer**: Caches search results for identical queries in Redis to minimize database loads and API latency.
*   **Secure Authentication**: User signup, login, and token-based logout using JWT and bcrypt-hashed credentials stored in PostgreSQL.
*   **Statically Served Frontend**: Built-in glassmorphic SPA UI to register/login, search, and perform real-time voice capture search.

---

## 📐 System Architecture

The following diagram illustrates how the system modules, databases, python scripts, and external APIs communicate with each other:

```mermaid
graph TD
    Client[Web Client / Voice Search] -->|HTTP Request| API[NestJS API Gateway]
    
    %% Auth
    API -->|Auth routes| UsersModule[Users Service]
    UsersModule -->|Query/Auth| DB[(PostgreSQL DB)]
    
    %% Search
    API -->|Search routes| SearchModule[Search Service]
    SearchModule -->|1. Generate Embedding| Embedder[Local Transformers <br/> all-mpnet-base-v2]
    SearchModule -->|2. Check Cache| Redis[(Redis Cache)]
    
    %% Whisper
    Client -->|Audio Chunk| WhisperModule[Whisper Service]
    WhisperModule -->|Spawn process| Python[Python transcribe.py <br/> faster-whisper]
    Python -->|Transcribed Text| WhisperModule
    WhisperModule -->|Text Query| Client
    
    %% Hybrid Search
    SearchModule -->|3. Hybrid Search <br/> pgvector + FTS| DB
    SearchModule -->|4. Generate Explanation| Groq[Groq API <br/> llama-3.3-70b-versatile]
    SearchModule -->|5. Cache Results| Redis
    SearchModule -->|6. Return Results| Client
```

---

## 💾 Database Schema

The application uses PostgreSQL with the `pgvector` extension. Here is the SQL schema to set up the required tables:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    auth_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    price NUMERIC,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Generated Column & GIN Index for Full-Text Search
ALTER TABLE products ADD COLUMN IF NOT EXISTS text_search_vector tsvector 
GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || description)) STORED;

CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING GIN(text_search_vector);
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```ini
# Server Configuration
PORT=3000

# Database Configuration
DB_URL=postgresql://username:password@localhost:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=yourpassword

# Redis Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication
JWT_SECRET=your_jwt_signing_secret_here

# Groq AI Service
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

## 🛠️ Installation & Setup

### Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **PostgreSQL** (with `pgvector` installed)
*   **Redis Server**
*   **Python 3.8+** (for Whisper transcribing service)

### 1. Clone & Install Node Dependencies

```bash
# Install NPM packages
npm install
```

### 2. Configure Python Environment for Whisper

The transcribing service depends on `faster-whisper`. Create and configure the virtual environment inside `src/python-services/`:

```bash
# Navigate to python-services directory
cd src/python-services

# Create a virtual environment named 'venv'
python3 -m venv venv

# Activate the environment
source venv/bin/activate

# Install dependencies
pip install faster-whisper

# Return to root directory
cd ../..
```

### 3. Run Database Migrations & Seeds

To add the full-text search indexes/columns, run the migration script:
```bash
# Run migration script
npx ts-node src/database/migrations/migration.ts
```

If you wish to seed the database with initial products, you can configure and uncomment `seed.ts` and run it:
```bash
npx ts-node seed.ts
```

---

## 💻 Running the Application

```bash
# Development (with hot-reload)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Run Tests
npm run test
```

---

## 🔌 API Endpoints

### 🔐 Authentication (`UsersModule`)

#### 1. User Registration
*   **Endpoint**: `POST /users/register`
*   **Request Body**:
    ```json
    {
      "username": "johndoe",
      "password": "securepassword"
    }
    ```
*   **Response**:
    ```json
    {
      "success": true,
      "user": {
        "id": "user-uuid",
        "username": "johndoe"
      }
    }
    ```

#### 2. User Login
*   **Endpoint**: `POST /users/login`
*   **Request Body**:
    ```json
    {
      "username": "johndoe",
      "password": "securepassword"
    }
    ```
*   **Response**:
    ```json
    {
      "success": true,
      "access_token": "jwt-token-string",
      "user": {
        "id": "user-uuid",
        "username": "johndoe"
      }
    }
    ```

#### 3. User Logout
*   **Endpoint**: `POST /users/logout`
*   **Headers**: `Authorization: Bearer <token>`
*   **Response**:
    ```json
    {
      "success": true,
      "message": "Logged out successfully"
    }
    ```

---

### 🔍 Product Search (`SearchModule` / `WhisperModule`)

#### 1. Unified Search (Hybrid)
*   **Endpoint**: `GET /search?search=<query>`
*   **Headers**: `Authorization: Bearer <token>`
*   **Response**:
    ```json
    [
      {
        "id": "product-uuid",
        "name": "Mechanical Keyboard",
        "description": "Tactile switch mechanical keyboard ideal for programmers.",
        "hybrid_score": 0.03333,
        "relevance_explanation": "Product description explicitly mentions 'programmers' seeking mechanical switches."
      }
    ]
    ```

#### 2. Add New Product(s)
*   **Endpoint**: `POST /search/add-product`
*   **Request Body**:
    ```json
    [
      {
        "name": "Wireless Mouse",
        "description": "Ergonomic wireless mouse with customizable keys.",
        "category": "electronics",
        "price": 49.99
      }
    ]
    ```
*   **Response**:
    ```json
    [
      {
        "id": "new-product-uuid",
        "name": "Wireless Mouse",
        "description": "Ergonomic wireless mouse with customizable keys.",
        "category": "electronics",
        "price": "49.99"
      }
    ]
    ```

#### 3. Audio Search Translation
*   **Endpoint**: `POST /whisper/translate`
*   **Headers**: `Authorization: Bearer <token>`
*   **Request Body**: `multipart/form-data` with key `file` containing the audio recording (e.g., `.webm` or `.wav`).
*   **Response**: Raw transcribed text (string).

---

## 📄 License

This project is [MIT licensed](LICENSE).
