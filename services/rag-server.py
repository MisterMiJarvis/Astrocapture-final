#!/usr/bin/env python3
"""
AstroSuite RAG Server — Knowledge base for astrophotography
Port 5090 — queried by AstroCapture API (/api/rag-query)

Uses:
- nomic-embed-text via Ollama for embeddings (local)
- Cosine similarity for retrieval
- GLM-5.2 via Ollama for answer generation
"""

import json
import os
import hashlib
import math
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# === Config ===
KNOWLEDGE_DIR = Path("/home/ubuntu/astrocapture/data/knowledge")
INDEX_DIR = Path("/home/ubuntu/astrocapture/data/rag-index")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
EMBED_MODEL = "nomic-embed-text"
LLM_MODEL = os.environ.get("RAG_LLM_MODEL", "qwen2.5:3b")
PORT = 5090
CHUNK_SIZE = 1500  # chars
CHUNK_OVERLAP = 200  # chars
TOP_K = 2

INDEX_DIR.mkdir(parents=True, exist_ok=True)


def ollama_embed(text: str) -> list[float]:
    """Get embedding from Ollama nomic-embed-text."""
    payload = json.dumps({"model": EMBED_MODEL, "input": text}).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/embed",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    embeddings = data.get("embeddings", [])
    return embeddings[0] if embeddings else []


def ollama_chat(messages: list[dict], model: str = None) -> str:
    """Chat completion via Ollama."""
    model = model or LLM_MODEL
    # Strip provider prefix if present
    if "/" in model and not model.startswith("http"):
        model = model.split("/")[-1]
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.3, "num_ctx": 2048},
    }).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    return data.get("message", {}).get("content", "")


def extract_pdf_text(pdf_path: Path) -> str:
    """Extract all text from a PDF file."""
    import pymupdf
    doc = pymupdf.open(str(pdf_path))
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            pages.append(f"--- Page {i+1} ---\n{text}")
    doc.close()
    return "\n\n".join(pages)


def extract_text_file(path: Path) -> str:
    """Extract text from markdown/txt files."""
    return path.read_text(encoding="utf-8", errors="replace")


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks, trying to break at paragraph/sentence boundaries."""
    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            # Try to break at a paragraph or sentence boundary
            for boundary in ["\n\n", "\n", ". ", "! ", "? "]:
                idx = text.rfind(boundary, end - overlap, end)
                if idx > start + chunk_size // 2:
                    end = idx + len(boundary)
                    break
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap if end < len(text) else len(text)
        if start >= len(text):
            break
    return chunks


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def build_index():
    """Build the RAG index from all knowledge files."""
    chunks = []
    chunk_index_path = INDEX_DIR / "chunks.json"
    embeddings_path = INDEX_DIR / "embeddings.json"

    # Check if index already exists and is up to date
    knowledge_files = list(KNOWLEDGE_DIR.glob("*.pdf")) + list(KNOWLEDGE_DIR.glob("*.md")) + list(KNOWLEDGE_DIR.glob("*.txt"))
    if not knowledge_files:
        print(f"[RAG] No knowledge files found in {KNOWLEDGE_DIR}")
        return []

    # Check if rebuild needed
    needs_rebuild = False
    if not chunk_index_path.exists() or not embeddings_path.exists():
        needs_rebuild = True
    else:
        # Check file hashes
        existing_hashes = {}
        try:
            with open(chunk_index_path) as f:
                existing_data = json.load(f)
            for item in existing_data:
                existing_hashes[item.get("source")] = item.get("source_hash")
        except Exception:
            pass

        for f in knowledge_files:
            h = hashlib.md5(f.read_bytes()).hexdigest()
            if existing_hashes.get(str(f)) != h:
                needs_rebuild = True
                break

    if not needs_rebuild:
        try:
            with open(chunk_index_path) as f:
                chunks = json.load(f)
            with open(embeddings_path) as f:
                embeddings = json.load(f)
            # Attach embeddings to chunks
            for i, chunk in enumerate(chunks):
                if i < len(embeddings):
                    chunk["embedding"] = embeddings[i]
            print(f"[RAG] Loaded existing index: {len(chunks)} chunks")
            return chunks
        except Exception as e:
            print(f"[RAG] Failed to load index: {e}, rebuilding...")

    # Build new index
    print(f"[RAG] Building index from {len(knowledge_files)} files...")
    all_chunks = []
    for f in knowledge_files:
        print(f"[RAG] Processing {f.name}...")
        try:
            if f.suffix == ".pdf":
                text = extract_pdf_text(f)
            else:
                text = extract_text_file(f)
        except Exception as e:
            print(f"[RAG] Error reading {f.name}: {e}")
            continue

        file_hash = hashlib.md5(f.read_bytes()).hexdigest()
        file_chunks = chunk_text(text)
        for i, chunk in enumerate(file_chunks):
            all_chunks.append({
                "id": f"{f.stem}_{i}",
                "source": str(f),
                "source_name": f.name,
                "source_hash": file_hash,
                "chunk_index": i,
                "text": chunk,
            })

    print(f"[RAG] Total chunks: {len(all_chunks)}, generating embeddings...")

    # Generate embeddings in batches
    embeddings = []
    for i, chunk in enumerate(all_chunks):
        try:
            emb = ollama_embed(chunk["text"])
            embeddings.append(emb)
            if (i + 1) % 50 == 0:
                print(f"[RAG] Embedded {i+1}/{len(all_chunks)} chunks")
                # Save progress
                with open(embeddings_path, "w") as ef:
                    json.dump(embeddings, ef)
                with open(chunk_index_path, "w") as cf:
                    json.dump(all_chunks, cf)
        except Exception as e:
            print(f"[RAG] Embedding error at chunk {i}: {e}")
            embeddings.append([])

    # Save index
    with open(chunk_index_path, "w") as cf:
        json.dump(all_chunks, cf)
    with open(embeddings_path, "w") as ef:
        json.dump(embeddings, ef)

    # Attach embeddings to chunks
    for i, chunk in enumerate(all_chunks):
        if i < len(embeddings):
            chunk["embedding"] = embeddings[i]

    print(f"[RAG] Index built: {len(all_chunks)} chunks")
    return all_chunks


def query_rag(question: str, history: list = None) -> dict:
    """Query the RAG system."""
    if not CHUNKS:
        return {"answer": "Knowledge base is empty. Add documents to data/knowledge/", "sources": []}

    # Embed the question
    try:
        q_embedding = ollama_embed(question)
    except Exception as e:
        return {"answer": f"Failed to generate query embedding: {e}", "sources": []}

    # Score all chunks
    scored = []
    for chunk in CHUNKS:
        emb = chunk.get("embedding", [])
        if emb:
            score = cosine_similarity(q_embedding, emb)
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:TOP_K]

    if not top or top[0][0] < 0.1:
        return {"answer": "I don't have enough information to answer that question.", "sources": []}

    # Build context
    context_parts = []
    sources = []
    for score, chunk in top:
        context_parts.append(f"[{chunk['source_name']}]\n{chunk['text']}")
        sources.append({
            "file": chunk["source_name"],
            "score": round(score, 3),
        })

    context = "\n\n---\n\n".join(context_parts)

    # Build chat messages
    system_prompt = (
        "You are Hal, an astrophotography knowledge assistant integrated into AstroSuite. "
        "Answer questions about astrophotography techniques, equipment, software (NINA, PixInsight, PHD2, etc.), "
        "and deep-sky imaging. Use the provided context to answer accurately. "
        "If the context doesn't contain the answer, say so. "
        "Be concise, practical, and technical. Respond in the same language as the question."
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Add history
    if history:
        for h in history[-4:]:  # Last 4 messages
            if h.get("role") and h.get("content"):
                messages.append({"role": h["role"], "content": h["content"]})

    messages.append({
        "role": "user",
        "content": f"Context from knowledge base:\n\n{context}\n\nQuestion: {question}",
    })

    # Generate answer
    try:
        answer = ollama_chat(messages)
    except Exception as e:
        return {"answer": f"Failed to generate answer: {e}", "sources": sources}

    return {"answer": answer, "sources": sources}


# === HTTP Server ===
from http.server import HTTPServer, BaseHTTPRequestHandler


class RAGHandler(BaseHTTPRequestHandler):
    def _send_json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(200, {"status": "ok"})

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {
                "status": "ok",
                "chunks": len(CHUNKS),
                "knowledge_files": len(list(KNOWLEDGE_DIR.glob("*"))),
            })
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/query":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body)
                question = data.get("question", "").strip()
                history = data.get("history", [])
                if not question:
                    self._send_json(400, {"error": "Question required"})
                    return
                result = query_rag(question, history)
                self._send_json(200, result)
            except Exception as e:
                print(f"[RAG] Query error: {e}")
                self._send_json(500, {"error": str(e)})
        elif self.path == "/reindex":
            global CHUNKS
            CHUNKS = build_index()
            self._send_json(200, {"status": "reindexed", "chunks": len(CHUNKS)})
        else:
            self._send_json(404, {"error": "Not found"})

    def log_message(self, format, *args):
        print(f"[RAG] {args[0]}")


# === Main ===
CHUNKS = []

if __name__ == "__main__":
    print("[RAG] Starting AstroSuite RAG Server on port", PORT)
    print(f"[RAG] Knowledge dir: {KNOWLEDGE_DIR}")
    print(f"[RAG] Ollama URL: {OLLAMA_URL}")
    print(f"[RAG] Embed model: {EMBED_MODEL}")
    print(f"[RAG] LLM model: {LLM_MODEL}")

    # Build index on startup
    CHUNKS = build_index()

    server = HTTPServer(("127.0.0.1", PORT), RAGHandler)
    print(f"[RAG] Server listening on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[RAG] Shutting down...")
        server.shutdown()