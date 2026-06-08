# Medipal — AI-Powered Healthcare Assistant

**Medipal** is a fully local, privacy-first, decoupled healthcare intelligence platform. It combines a modern React single-page application with a FastAPI backend, PostgreSQL vector database, and on-device large language model inference via Ollama. No third-party cloud AI APIs are required—clinical reference data, embeddings, and generative responses remain under your operational control.

---

## Core Features

| Capability | Description |
|------------|-------------|
| **Real-time symptom chat** | Interactive conversational interface with streaming LLM responses over a persistent WebSocket connection (`/chat/ws`), plus an HTTP fallback endpoint for synchronous replies. |
| **Local RAG pipeline** | Retrieval-Augmented Generation powered by `pgvector` cosine similarity search over ingested medical documents, grounded by Ollama `llama3.2`. |
| **Specialist recommendation** | Dynamic provider matching from a PostgreSQL `specialists` table, filterable by medical specialty with urgency and availability metadata. |
| **Admin document ingestion** | Asynchronous web upload portal supporting **PDF**, **CSV**, **TXT**, and **Markdown**—with background chunking, embedding, and persistence via FastAPI `BackgroundTasks`. |
| **JWT authentication** | User registration and token-based auth endpoints (backend-ready for future frontend integration). |

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite 8, TypeScript 5, Tailwind CSS 3, shadcn/ui (Radix UI), TanStack Query 5, React Router 6, Lucide React |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0 (async), Alembic, python-jose, passlib |
| **Database** | PostgreSQL 15 with **pgvector** extension (Docker: `pgvector/pgvector:pg15`) |
| **AI / ML** | Ollama (`llama3.2` chat, `nomic-embed-text` embeddings), LangChain (`langchain-ollama`, `langchain-text-splitters`) |
| **Infrastructure** | Docker Compose, asyncpg, pgvector Python bindings |

---

## System Architecture

### High-Level Component Diagram

```mermaid
graph TD
    subgraph Client["Frontend (React + Vite :8080)"]
        UI[ChatInterface / DataIngestion / SpecialistRecommendation]
        Proxy[Vite Dev Proxy /api → :8000]
    end

    subgraph API["FastAPI Backend (:8000)"]
        REST[REST Routers<br/>/chat /admin /specialists /auth]
        WS[WebSocket /chat/ws]
        RAG[ai_service.py — RAG Orchestrator]
        ING[ingestion_service.py — Document Pipeline]
    end

    subgraph Data["Docker PostgreSQL (:5432)"]
        PG[(medipal_db)]
        VEC[pgvector — medical_documents]
        SPEC[(specialists)]
        USR[(users)]
    end

    subgraph LocalAI["Ollama (localhost:11434)"]
        LLM[llama3.2 — Chat Generation]
        EMB[nomic-embed-text — 768-dim Embeddings]
    end

    UI --> Proxy
    Proxy --> REST
    UI -.->|WebSocket streaming| WS
    REST --> RAG
    REST --> ING
    WS --> RAG
    RAG --> EMB
    RAG --> LLM
    RAG --> VEC
    ING --> EMB
    ING --> VEC
    REST --> SPEC
    REST --> USR
    VEC --> PG
    SPEC --> PG
    USR --> PG
```

### RAG Chat Message Flow

```mermaid
flowchart LR
    A[User sends message] --> B[WebSocket Reception<br/>/chat/ws]
    B --> C[Query Vectorization<br/>nomic-embed-text]
    C --> D[pgvector Similarity Search<br/>TOP_K cosine distance]
    D --> E[Context Injection<br/>System prompt + retrieved chunks]
    E --> F[Ollama Streaming Generation<br/>llama3.2]
    F --> G[Token-by-token emission<br/>to client]
    G --> H[UI renders streaming response]
    F --> I[[DONE] sentinel]
```

---

## Project Directory Structure

```
medipal/
├── alembic/                          # Database migration environment
│   ├── versions/                     # Revision scripts (initial schema + pgvector)
│   └── env.py                        # Async Alembic configuration
├── alembic.ini
├── docker-compose.yml                # PostgreSQL + pgvector container
├── package.json                      # Frontend dependencies & scripts
├── vite.config.ts                    # Vite dev server + /api proxy
├── tailwind.config.ts
├── tsconfig.json
│
├── src/                              # React frontend
│   ├── components/
│   │   ├── ChatInterface.tsx         # Symptom assessment chat UI
│   │   ├── DataIngestion.tsx         # Admin drag-and-drop upload portal
│   │   ├── SpecialistRecommendation.tsx
│   │   ├── MedicalDisclaimer.tsx
│   │   └── ui/                       # shadcn/ui component library
│   ├── pages/
│   │   ├── Index.tsx                 # Landing page + view router
│   │   └── NotFound.tsx
│   ├── hooks/
│   ├── lib/
│   ├── App.tsx
│   └── main.tsx
│
└── backend/
    ├── .env                          # Runtime secrets (not committed)
    ├── requirements.txt
    └── app/
        ├── main.py                   # FastAPI application entry point
        ├── settings.py               # Pydantic settings loader
        ├── core/
        │   └── database.py           # Async SQLAlchemy engine + session
        ├── models/
        │   ├── user.py
        │   ├── specialist.py
        │   └── document.py           # MedicalDocument + Vector(768)
        ├── routers/
        │   ├── chat.py               # POST /chat/ + WebSocket /chat/ws
        │   ├── admin.py              # POST /admin/upload
        │   ├── specialists.py        # GET /specialists/
        │   └── auth.py               # POST /auth/register, /auth/token
        ├── services/
        │   ├── ai_service.py         # RAG streaming pipeline
        │   └── ingestion_service.py  # Multi-format document ingestion
        ├── scripts/
        │   ├── ingest_data.py        # CLI bulk directory ingestion
        │   └── seed_specialists.py   # Idempotent specialist seeding
        └── data/
            ├── sample_guidelines.txt # Example RAG source document
            └── uploads/              # Web-uploaded files (runtime)
```

---

## Setup & Installation

### Prerequisites

Install the following before proceeding:

1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** — runs the PostgreSQL + pgvector container.
2. **[Ollama](https://ollama.com/)** — serves local LLM and embedding models.
3. **Node.js 18+** and **npm** — frontend toolchain.
4. **Python 3.11+** — backend runtime.

Pull required Ollama models:

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

Ensure Ollama is running:

```bash
ollama serve
```

---

### Step 1 — Database (Docker + Environment)

From the project root, start PostgreSQL:

```bash
docker compose up -d
```

Create `backend/.env` with credentials matching `docker-compose.yml`:

```env
DATABASE_URL=postgresql+asyncpg://medipal_user:YOUR_PASSWORD@localhost:5432/medipal_db
SECRET_KEY=generate_a_secure_random_jwt_signing_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> **Note:** Replace `YOUR_PASSWORD` with the `POSTGRES_PASSWORD` value defined in `docker-compose.yml`.

The `pgvector` extension is enabled automatically by the Alembic initial migration (`CREATE EXTENSION IF NOT EXISTS vector`). To verify manually:

```bash
docker exec -it medipal-postgres psql -U medipal_user -d medipal_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

### Step 2 — Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run async database migrations
alembic upgrade head

# Seed specialist reference data (optional, idempotent)
python -m app.scripts.seed_specialists

# Ingest sample medical guidelines (optional)
python -m app.scripts.ingest_data --dir app/data/

# Launch the API server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

### Step 3 — Frontend

From the project root:

```bash
npm install
npm run dev
```

The application is served at [http://localhost:8080](http://localhost:8080). API requests to `/api/*` are proxied to the FastAPI backend on port `8000`.

| Route | Purpose |
|-------|---------|
| `/` | Landing page, chat, specialists, disclaimer |
| Hero → **Admin: Upload Medical Documents** | Admin ingestion dashboard |

---

## API Reference (Summary)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat/` | Synchronous RAG chat (JSON request/response) |
| `WS` | `/chat/ws` | Streaming RAG chat (token-by-token + `[DONE]`) |
| `GET` | `/specialists/` | List specialists (`?specialty=` filter) |
| `POST` | `/admin/upload` | Upload document for background ingestion |
| `POST` | `/auth/register` | Create user account |
| `POST` | `/auth/token` | Obtain JWT access token |

Frontend proxy mapping: `http://localhost:8080/api/chat/` → `http://127.0.0.1:8000/chat/`

---

## Operational Scripts

```bash
# Bulk-ingest all supported files from a directory (CLI)
python -m app.scripts.ingest_data --dir app/data/

# Seed mock Chennai-area healthcare providers
python -m app.scripts.seed_specialists
```

Supported ingestion formats: `.txt`, `.md`, `.pdf`, `.csv`.

---

## Development Commands

```bash
# Frontend
npm run dev          # Start Vite dev server (:8080)
npm run build        # Production build
npm run lint         # ESLint

# Backend
uvicorn app.main:app --reload
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## Medical Disclaimer

> **IMPORTANT — NOT FOR CLINICAL USE**
>
> Medipal is provided strictly for **educational and personal demonstration purposes**. The AI-generated symptom assessments, health information, and specialist recommendations produced by this software **do not constitute professional medical advice, diagnosis, or treatment**. The system has not been validated for clinical accuracy, regulatory compliance (including HIPAA), or use in emergency or life-threatening situations.
>
> **Always consult a qualified, licensed healthcare provider** for medical decisions. If you are experiencing a medical emergency, contact your local emergency services immediately. The authors and contributors of this project accept no liability for any health outcomes resulting from use of this software.

---

## License

MIT License — see repository for details.
