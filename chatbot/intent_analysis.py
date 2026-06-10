import json
import os
import pickle
import re
from pathlib import Path
from typing import Any

import faiss
from dotenv import load_dotenv
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings


BASE_DIR = Path(__file__).resolve().parent
VECTORSTORE_DIR = BASE_DIR / "vectorstore"
ENV_PATH = BASE_DIR / ".env"
EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_RETRIEVER_K = 4


INTENT_ANALYSIS_PROMPT = """You are an intent analysis AI for BalanceFit, a Pilates smart reservation service.

Your task is ONLY to analyze the user's intent before answer generation.
Do not answer the user's question.
Do not recommend actions.
Do not process reservations, refunds, cancellations, or user requests.

Analyze the user's intent using BOTH:
1. The user question
2. The retrieved context from the vector database

Return exactly one valid JSON object.
Do not include markdown, code fences, explanations, or extra text.

Required JSON schema:
{{
  "intent": "string",
  "sub_intent": "string",
  "topic": "string",
  "user_goal": "string",
  "emotion": "string",
  "confidence": 0.0
}}

Field rules:
- intent: concise snake_case category for the main user intent.
- sub_intent: concise snake_case category for the more specific intent.
- topic: concise snake_case knowledge-domain topic grounded in the retrieved context.
- user_goal: short plain-English description of what the user wants to determine or accomplish.
- emotion: one of neutral, confused, frustrated, anxious, urgent, satisfied, dissatisfied, curious.
- confidence: number from 0.0 to 1.0. Lower it when retrieved context is weak, unrelated, or ambiguous.

Retrieved context:
{context}

User question:
{question}

JSON output:"""


REQUIRED_FIELDS = {
    "intent",
    "sub_intent",
    "topic",
    "user_goal",
    "emotion",
    "confidence",
}


def load_settings() -> tuple[str, str]:
    load_dotenv(ENV_PATH)

    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("MODEL")

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to chatbot/.env.")
    if not model:
        raise RuntimeError("MODEL is missing. Add it to chatbot/.env.")

    return api_key, model


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


def format_documents(documents: list[Document]) -> str:
    if not documents:
        return "No relevant context retrieved."

    formatted_documents: list[str] = []

    for index_number, document in enumerate(documents, start=1):
        source = document.metadata.get("source", "unknown")
        chunk_number = document.metadata.get("chunk_number", "unknown")
        formatted_documents.append(
            f"[Document {index_number} | source={source} | chunk={chunk_number}]\n"
            f"{document.page_content}"
        )

    return "\n\n".join(formatted_documents)


def parse_intent_json(raw_output: str) -> dict[str, Any]:
    cleaned_output = raw_output.strip()

    try:
        parsed = json.loads(cleaned_output)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned_output, flags=re.DOTALL)
        if not match:
            raise ValueError(f"Model did not return JSON: {raw_output}") from None
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("Intent analysis output must be a JSON object.")

    missing_fields = REQUIRED_FIELDS - parsed.keys()
    if missing_fields:
        missing = ", ".join(sorted(missing_fields))
        raise ValueError(f"Intent analysis output is missing required fields: {missing}")

    confidence = parsed["confidence"]
    if not isinstance(confidence, (int, float)):
        raise ValueError("Intent analysis confidence must be numeric.")
    if confidence < 0 or confidence > 1:
        raise ValueError("Intent analysis confidence must be between 0.0 and 1.0.")

    parsed["confidence"] = float(confidence)
    return parsed


def analyze_intent(user_question: str, retriever: Any, model: ChatOpenAI) -> dict[str, Any]:
    documents = retriever.invoke(user_question)
    context = format_documents(documents)

    chain = (
        PromptTemplate.from_template(INTENT_ANALYSIS_PROMPT)
        | model
        | StrOutputParser()
    )

    raw_output = chain.invoke(
        {
            "question": user_question,
            "context": context,
        }
    )
    result = parse_intent_json(raw_output)
    result["retrieved_context"] = [
        {
            "source": document.metadata.get("source", "unknown"),
            "chunk_number": document.metadata.get("chunk_number", "unknown"),
        }
        for document in documents
    ]
    return result


def main() -> None:
    api_key, model_name = load_settings()
    vectorstore = load_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": DEFAULT_RETRIEVER_K})
    model = ChatOpenAI(api_key=api_key, model=model_name, temperature=0)

    print("BalanceFit Intent Analysis AI")
    print("Type 'exit' or 'quit' to stop.")

    while True:
        user_question = input("\nUser question: ").strip()

        if not user_question:
            continue
        if user_question.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        result = analyze_intent(user_question, retriever, model)
        print("\nIntent analysis:")
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
