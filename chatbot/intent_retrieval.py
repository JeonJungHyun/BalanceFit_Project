import json
import os
import pickle
from pathlib import Path
from typing import Any

import faiss
from dotenv import load_dotenv
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings


BASE_DIR = Path(__file__).resolve().parent
VECTORSTORE_DIR = BASE_DIR / "vectorstore"
ENV_PATH = BASE_DIR / ".env"
EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_RETRIEVER_K = 5


INTENT_FIELDS = (
    "intent",
    "sub_intent",
    "topic",
    "user_goal",
)


def load_settings() -> str:
    load_dotenv(ENV_PATH)

    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to chatbot/.env.")

    return api_key


def load_documents() -> list[Document]:
    docs_path = VECTORSTORE_DIR / "docs.pickle"

    if not docs_path.exists():
        raise FileNotFoundError(f"Vectorstore documents not found: {docs_path}")

    with docs_path.open("rb") as file:
        documents = pickle.load(file)

    if not isinstance(documents, list) or not documents:
        raise RuntimeError("Vectorstore documents are empty or invalid.")
    if not all(isinstance(document, Document) for document in documents):
        raise RuntimeError("Vectorstore documents must be LangChain Document objects.")

    return documents


def load_vectorstore() -> FAISS:
    index_path = VECTORSTORE_DIR / "index.faiss"

    if not index_path.exists():
        raise FileNotFoundError(f"FAISS index not found: {index_path}")

    documents = load_documents()
    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)
    index = faiss.read_index(str(index_path))

    docstore_ids = [str(index_number) for index_number in range(len(documents))]
    docstore = InMemoryDocstore(dict(zip(docstore_ids, documents)))
    index_to_docstore_id = {
        index_number: docstore_id
        for index_number, docstore_id in enumerate(docstore_ids)
    }

    return FAISS(
        embedding_function=embeddings,
        index=index,
        docstore=docstore,
        index_to_docstore_id=index_to_docstore_id,
    )


def parse_intent_result(raw_intent_result: str) -> dict[str, Any]:
    try:
        intent_result = json.loads(raw_intent_result)
    except json.JSONDecodeError as error:
        raise ValueError("Intent analysis result must be valid JSON.") from error

    if not isinstance(intent_result, dict):
        raise ValueError("Intent analysis result must be a JSON object.")

    missing_fields = [
        field for field in INTENT_FIELDS if not str(intent_result.get(field, "")).strip()
    ]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise ValueError(f"Intent analysis result is missing required fields: {missing}")

    return intent_result


def build_retrieval_query(user_question: str, intent_result: dict[str, Any]) -> str:
    query_parts = [
        str(intent_result["intent"]).strip(),
        str(intent_result["sub_intent"]).strip(),
        str(intent_result["topic"]).strip(),
        str(intent_result["user_goal"]).strip(),
    ]

    confidence = intent_result.get("confidence")
    if confidence is not None:
        query_parts.append(f"confidence: {confidence}")

    query_parts.extend(
        [
            "",
            "Original Question:",
            user_question.strip(),
        ]
    )

    return "\n".join(query_parts)


def serialize_document(document: Document) -> dict[str, Any]:
    return {
        "content": document.page_content,
        "metadata": {
            "source": document.metadata.get("source", "unknown"),
            "chunk_number": document.metadata.get("chunk_number", "unknown"),
        },
    }


def retrieve_documents(
    user_question: str,
    intent_result: dict[str, Any],
    retriever: Any,
) -> dict[str, Any]:
    retrieval_query = build_retrieval_query(user_question, intent_result)
    documents = retriever.invoke(retrieval_query)

    return {
        "retrieval_query": retrieval_query,
        "document_count": len(documents),
        "documents": [serialize_document(document) for document in documents],
    }


def main() -> None:
    load_settings()
    vectorstore = load_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": DEFAULT_RETRIEVER_K})

    print("BalanceFit Intent-Based FAISS Retrieval")
    print("Type 'exit' or 'quit' as the user question to stop.")
    print("Paste the intent analysis result as one-line JSON.")

    while True:
        user_question = input("\nUser question: ").strip()

        if not user_question:
            continue
        if user_question.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        raw_intent_result = input("Intent analysis JSON: ").strip()
        intent_result = parse_intent_result(raw_intent_result)
        result = retrieve_documents(user_question, intent_result, retriever)

        print("\nRetrieval result:")
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
