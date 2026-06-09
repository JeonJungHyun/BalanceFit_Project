import json
import os
import pickle
from datetime import datetime
from pathlib import Path

import faiss
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


BASE_DIR = Path(__file__).resolve().parents[1]
DOCUMENTS_DIR = BASE_DIR / "documents"
VECTORSTORE_DIR = BASE_DIR / "vectorstore"
ENV_PATH = BASE_DIR / ".env"
EMBEDDING_MODEL = "text-embedding-3-small"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


def load_markdown_documents() -> list[Document]:
    if not DOCUMENTS_DIR.exists():
        raise FileNotFoundError(f"Documents directory not found: {DOCUMENTS_DIR}")

    documents: list[Document] = []
    markdown_files = sorted(DOCUMENTS_DIR.glob("*.md"))

    if not markdown_files:
        raise RuntimeError(f"No markdown files found in: {DOCUMENTS_DIR}")

    for path in markdown_files:
        content = path.read_text(encoding="utf-8").strip()
        if not content:
            raise RuntimeError(f"Markdown file is empty: {path.name}")

        documents.append(
            Document(
                page_content=content,
                metadata={"source": path.name},
            )
        )

    return documents


def split_documents(documents: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    chunks: list[Document] = []

    for document in documents:
        split_chunks = splitter.split_documents([document])

        for chunk_number, chunk in enumerate(split_chunks, start=1):
            chunk.metadata = {
                **chunk.metadata,
                "chunk_number": chunk_number,
            }
            chunks.append(chunk)

    return chunks


def build_vectorstore(chunks: list[Document]) -> FAISS:
    load_dotenv(ENV_PATH)

    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to chatbot/.env.")

    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)
    return FAISS.from_documents(chunks, embeddings)


def save_vectorstore(vectorstore: FAISS, chunks: list[Document], document_count: int) -> None:
    VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)

    faiss.write_index(vectorstore.index, str(VECTORSTORE_DIR / "index.faiss"))

    with (VECTORSTORE_DIR / "docs.pickle").open("wb") as file:
        pickle.dump(chunks, file)

    metadata = {
        "document_count": document_count,
        "chunk_count": len(chunks),
        "generated_at": datetime.now().replace(microsecond=0).isoformat(),
        "embedding_model": EMBEDDING_MODEL,
    }

    with (VECTORSTORE_DIR / "metadata.json").open("w", encoding="utf-8") as file:
        json.dump(metadata, file, ensure_ascii=False, indent=2)
        file.write("\n")


def print_summary(document_count: int, chunk_count: int) -> None:
    print("==================================")
    print("VECTORSTORE BUILD COMPLETE")
    print("==========================")
    print()
    print(f"Documents Loaded: {document_count}")
    print(f"Chunks Generated: {chunk_count}")
    print()
    print("Saved:")
    print()
    print("* vectorstore/index.faiss")
    print("* vectorstore/docs.pickle")
    print("* vectorstore/metadata.json")
    print()
    print("==================================")


def main() -> None:
    documents = load_markdown_documents()
    chunks = split_documents(documents)

    if not chunks:
        raise RuntimeError("No chunks were generated.")

    vectorstore = build_vectorstore(chunks)
    save_vectorstore(vectorstore, chunks, len(documents))
    print_summary(len(documents), len(chunks))


if __name__ == "__main__":
    main()
