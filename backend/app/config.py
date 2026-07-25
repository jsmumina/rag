"""
Central configuration: chat/vision LLMs, embeddings, and the Qdrant vector store.

Provider auto-detection (as described in the project guide):
  - GOOGLE_API_KEY set  -> Google Gemini   (free tier, embedding dim 3072)
  - OPENAI_API_KEY set  -> OpenAI          (embedding dim 1536)
Set LLM_PROVIDER=google|openai to force one when both keys are present.

IMPORTANT: the embedding dimension must match the Qdrant collection, so each
provider gets its own collection name by default.
"""
import os

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from langchain_qdrant import QdrantVectorStore

# ---------- provider detection ----------

_HAS_GOOGLE = bool(os.environ.get("GOOGLE_API_KEY", "").strip())
_HAS_OPENAI = bool(os.environ.get("OPENAI_API_KEY", "").strip())

PROVIDER = os.environ.get("LLM_PROVIDER", "").strip().lower()
if not PROVIDER:
    PROVIDER = "google" if _HAS_GOOGLE else "openai"

if PROVIDER == "google" and not _HAS_GOOGLE:
    raise RuntimeError("LLM_PROVIDER=google but GOOGLE_API_KEY is not set.")
if PROVIDER == "openai" and not _HAS_OPENAI:
    raise RuntimeError(
        "No API key found. Set GOOGLE_API_KEY (free: aistudio.google.com/apikey) "
        "or OPENAI_API_KEY."
    )

# ---------- per-provider defaults ----------

if PROVIDER == "google":
    # Pinned model names (gemini-2.0-flash, gemini-2.5-flash) now return HTTP 429
    # "free tier limit: 0" or 404 for newly-issued API keys. gemini-flash-latest
    # is the alias that stays on a currently free-tier-eligible flash model.
    _DEF_CHAT = "gemini-flash-latest"
    _DEF_VISION = "gemini-flash-latest"
    # text-embedding-004 was retired; gemini-embedding-001 is the current GA
    # Gemini embedding model (3072-dim output).
    _DEF_EMBED = "models/gemini-embedding-001"
    _DEF_DIM = 3072
    _DEF_COLLECTION = "agentic_rag_gemini"
else:
    _DEF_CHAT = "gpt-4o-mini"
    _DEF_VISION = "gpt-4o-mini"
    _DEF_EMBED = "text-embedding-3-small"
    _DEF_DIM = 1536
    _DEF_COLLECTION = "agentic_rag_openai"

CHAT_MODEL = os.environ.get("CHAT_MODEL", _DEF_CHAT)
VISION_MODEL = os.environ.get("VISION_MODEL", _DEF_VISION)
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", _DEF_EMBED)
EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", str(_DEF_DIM)))

# Embedded Qdrant by default (no server needed). Set QDRANT_URL to use a real
# server/cluster instead — recommended on Hugging Face Spaces, where the
# container disk is wiped on every restart/rebuild.
QDRANT_URL = os.environ.get("QDRANT_URL", "").strip()
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "").strip() or None
QDRANT_PATH = os.environ.get("QDRANT_PATH", "./qdrant_db")
QDRANT_COLLECTION = os.environ.get("QDRANT_COLLECTION", _DEF_COLLECTION)

MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))

# Free-tier friendliness: how many chunks to embed per batch, and how long to
# pause between batches (Gemini free tier allows ~100 embed requests/minute).
EMBED_BATCH_SIZE = int(os.environ.get("EMBED_BATCH_SIZE", "50"))
EMBED_BATCH_PAUSE = float(os.environ.get("EMBED_BATCH_PAUSE", "20" if PROVIDER == "google" else "0"))


# ---------- model factories ----------

def get_llm(temperature: float = 0.0):
    if PROVIDER == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=CHAT_MODEL, temperature=temperature)
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model=CHAT_MODEL, temperature=temperature)


def get_vision_llm():
    if PROVIDER == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=VISION_MODEL, temperature=0.0)
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model=VISION_MODEL, temperature=0.0)


def get_embeddings():
    if PROVIDER == "google":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        return GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL)
    from langchain_openai import OpenAIEmbeddings
    return OpenAIEmbeddings(model=EMBEDDING_MODEL)


# ---------- vector store ----------

def _make_client() -> QdrantClient:
    if QDRANT_URL:
        return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    return QdrantClient(path=QDRANT_PATH)


_qdrant_client = _make_client()

_existing = [c.name for c in _qdrant_client.get_collections().collections]
if QDRANT_COLLECTION not in _existing:
    _qdrant_client.create_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
    )

vectorstore = QdrantVectorStore(
    client=_qdrant_client,
    collection_name=QDRANT_COLLECTION,
    embedding=get_embeddings(),
)
