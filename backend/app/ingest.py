"""
Multimodal ingest: PDFs (text + images, images captioned by a vision model)
and plain text/markdown files -> chunks -> Qdrant.
Ported from Agentic_RAG_ready.ipynb (cells 8-10).
"""
import base64
import time
from pathlib import Path
from typing import List

import fitz  # PyMuPDF
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import (
    get_vision_llm,
    vectorstore,
    PROVIDER,
    EMBED_BATCH_SIZE,
    EMBED_BATCH_PAUSE,
)

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
MIN_IMAGE_BYTES = 3000  # skip tiny icons/decorations


def _image_part(b64: str) -> dict:
    """Gemini wants image_url as a plain data-URL string; OpenAI wants {"url": ...}."""
    data_url = f"data:image/png;base64,{b64}"
    if PROVIDER == "google":
        return {"type": "image_url", "image_url": data_url}
    return {"type": "image_url", "image_url": {"url": data_url}}


def caption_image(image_bytes: bytes, vision_llm) -> str:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    msg = HumanMessage(
        content=[
            {
                "type": "text",
                "text": (
                    "Describe this image/diagram in 1-3 sentences, focusing on any "
                    "text, labels, numbers, or technical content visible in it. "
                    "Be factual and specific."
                ),
            },
            _image_part(b64),
        ]
    )
    return vision_llm.invoke([msg]).content


def load_pdf(path: Path, vision_llm) -> List[Document]:
    docs: List[Document] = []
    pdf = fitz.open(path)

    for page_num, page in enumerate(pdf, start=1):
        text = page.get_text().strip()
        if text:
            docs.append(Document(
                page_content=text,
                metadata={"source": path.name, "page": page_num, "type": "text"},
            ))

        for img_index, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            base_image = pdf.extract_image(xref)
            image_bytes = base_image["image"]
            if len(image_bytes) < MIN_IMAGE_BYTES:
                continue
            try:
                caption = caption_image(image_bytes, vision_llm)
            except Exception as e:  # noqa: BLE001
                print(f"  [!] Image captioning failed ({path.name} p{page_num}): {e}")
                continue
            docs.append(Document(
                page_content=f"[Image] {caption}",
                metadata={
                    "source": path.name,
                    "page": page_num,
                    "type": "image",
                    "image_index": img_index,
                },
            ))

    pdf.close()
    return docs


def load_text_file(path: Path) -> List[Document]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return [Document(page_content=text, metadata={"source": path.name, "type": "text"})]


def load_path(path: Path, vision_llm) -> List[Document]:
    docs: List[Document] = []
    files = [path] if path.is_file() else sorted(path.rglob("*"))
    for f in files:
        if not f.is_file():
            continue
        if f.suffix.lower() == ".pdf":
            docs.extend(load_pdf(f, vision_llm))
        elif f.suffix.lower() in {".txt", ".md"}:
            docs.extend(load_text_file(f))
    return docs


def run_ingest(source_path: str) -> dict:
    path = Path(source_path)
    if not path.exists():
        raise FileNotFoundError(f"Not found: {source_path}")

    vision_llm = get_vision_llm()
    raw_docs = load_path(path, vision_llm)
    if not raw_docs:
        return {"documents": 0, "chunks": 0}

    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    chunks = splitter.split_documents(raw_docs)

    _add_documents_in_batches(chunks)
    return {"documents": len(raw_docs), "chunks": len(chunks)}


def _add_documents_in_batches(chunks, batch_size: int = None, pause: float = None) -> None:
    """Embed + upsert in batches, pausing between them and backing off on 429s.

    The Gemini free tier caps embedding calls (~100/min); sending a whole book
    at once is what produces `429 ResourceExhausted`.
    """
    batch_size = batch_size or EMBED_BATCH_SIZE
    pause = EMBED_BATCH_PAUSE if pause is None else pause

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        delay = 20.0
        for attempt in range(5):
            try:
                vectorstore.add_documents(batch)
                break
            except Exception as e:  # noqa: BLE001
                msg = str(e).lower()
                rate_limited = "429" in msg or "resource" in msg and "exhaust" in msg or "quota" in msg
                if not rate_limited or attempt == 4:
                    raise
                print(f"  [!] Rate limited, waiting {delay:.0f}s then retrying batch {i // batch_size + 1}")
                time.sleep(delay)
                delay *= 2
        if pause and i + batch_size < len(chunks):
            time.sleep(pause)
