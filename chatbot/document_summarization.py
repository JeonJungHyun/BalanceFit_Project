import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"


DOCUMENT_SUMMARIZATION_PROMPT = """You are an intent-focused document summarization AI for BalanceFit, a Pilates smart reservation service.

Your task is ONLY to summarize retrieved documents for internal knowledge preparation before final answer generation.
Do not answer the user directly.
Do not generate customer-facing text.
Do not recommend actions.
Do not process reservations, refunds, cancellations, or user requests.

Analyze these inputs:
1. User question
2. Intent analysis result
3. Retrieved FAISS documents

Prioritize the detected intent, sub-intent, topic, and user goal.
Use ONLY facts explicitly present in the retrieved documents.
Ignore irrelevant retrieved content.
Never invent policies, deadlines, fees, eligibility rules, requirements, or processing times.
If a requested detail is not present in the retrieved documents, omit it instead of guessing.

Return exactly one valid JSON object.
Do not include markdown, code fences, explanations, or extra text.

Required JSON schema:
{{
  "summary_topic": "string",
  "key_points": ["string"],
  "important_conditions": ["string"],
  "confidence": 0.0
}}

Field rules:
- summary_topic: use the intent topic when it matches the retrieved documents; otherwise use the closest retrieved-document topic.
- key_points: concise facts relevant to the user's intent.
- important_conditions: restrictions, requirements, eligibility criteria, deadlines, fees, dependencies, or caveats relevant to the intent.
- confidence: number from 0.0 to 1.0. Lower it when the retrieved documents are weak, incomplete, conflicting, or only partially relevant.

User question:
{question}

Intent analysis result:
{intent_result}

Retrieved FAISS documents:
{retrieved_documents}

JSON output:"""


INTENT_FIELDS = (
    "intent",
    "sub_intent",
    "topic",
    "user_goal",
)

REQUIRED_SUMMARY_FIELDS = {
    "summary_topic",
    "key_points",
    "important_conditions",
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


def parse_json_object(raw_json: str, label: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as error:
        raise ValueError(f"{label} must be valid JSON.") from error

    if not isinstance(parsed, dict):
        raise ValueError(f"{label} must be a JSON object.")

    return parsed


def validate_intent_result(intent_result: dict[str, Any]) -> None:
    missing_fields = [
        field for field in INTENT_FIELDS if not str(intent_result.get(field, "")).strip()
    ]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise ValueError(f"Intent analysis result is missing required fields: {missing}")


def extract_retrieved_documents(retrieval_result: dict[str, Any]) -> list[dict[str, Any]]:
    raw_documents = retrieval_result.get("documents")

    if not isinstance(raw_documents, list) or not raw_documents:
        raise ValueError("Retrieval result must contain a non-empty documents list.")

    documents: list[dict[str, Any]] = []

    for index_number, raw_document in enumerate(raw_documents, start=1):
        if isinstance(raw_document, str):
            content = raw_document.strip()
            metadata = {}
        elif isinstance(raw_document, dict):
            content = str(
                raw_document.get("content")
                or raw_document.get("page_content")
                or ""
            ).strip()
            metadata = raw_document.get("metadata") or {}
        else:
            raise ValueError("Each retrieved document must be a string or JSON object.")

        if not content:
            continue

        documents.append(
            {
                "document_number": index_number,
                "content": content,
                "metadata": metadata if isinstance(metadata, dict) else {},
            }
        )

    if not documents:
        raise ValueError("Retrieval result does not contain any document content.")

    return documents


def format_intent_result(intent_result: dict[str, Any]) -> str:
    return json.dumps(intent_result, ensure_ascii=False, indent=2)


def format_retrieved_documents(documents: list[dict[str, Any]]) -> str:
    formatted_documents: list[str] = []

    for document in documents:
        metadata = document["metadata"]
        source = metadata.get("source", "unknown")
        chunk_number = metadata.get("chunk_number", "unknown")
        formatted_documents.append(
            f"[Document {document['document_number']} | source={source} | chunk={chunk_number}]\n"
            f"{document['content']}"
        )

    return "\n\n".join(formatted_documents)


def parse_summary_json(raw_output: str) -> dict[str, Any]:
    cleaned_output = raw_output.strip()

    try:
        parsed = json.loads(cleaned_output)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned_output, flags=re.DOTALL)
        if not match:
            raise ValueError(f"Model did not return JSON: {raw_output}") from None
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("Document summary output must be a JSON object.")

    missing_fields = REQUIRED_SUMMARY_FIELDS - parsed.keys()
    if missing_fields:
        missing = ", ".join(sorted(missing_fields))
        raise ValueError(f"Document summary output is missing required fields: {missing}")

    if not isinstance(parsed["key_points"], list):
        raise ValueError("Document summary key_points must be a list.")
    if not isinstance(parsed["important_conditions"], list):
        raise ValueError("Document summary important_conditions must be a list.")

    confidence = parsed["confidence"]
    if not isinstance(confidence, (int, float)):
        raise ValueError("Document summary confidence must be numeric.")
    if confidence < 0 or confidence > 1:
        raise ValueError("Document summary confidence must be between 0.0 and 1.0.")

    parsed["confidence"] = float(confidence)
    return parsed


def summarize_documents(
    user_question: str,
    intent_result: dict[str, Any],
    retrieval_result: dict[str, Any],
    model: ChatOpenAI,
) -> dict[str, Any]:
    validate_intent_result(intent_result)
    documents = extract_retrieved_documents(retrieval_result)

    chain = (
        PromptTemplate.from_template(DOCUMENT_SUMMARIZATION_PROMPT)
        | model
        | StrOutputParser()
    )

    raw_output = chain.invoke(
        {
            "question": user_question,
            "intent_result": format_intent_result(intent_result),
            "retrieved_documents": format_retrieved_documents(documents),
        }
    )
    result = parse_summary_json(raw_output)
    result["source_documents"] = [
        {
            "source": document["metadata"].get("source", "unknown"),
            "chunk_number": document["metadata"].get("chunk_number", "unknown"),
        }
        for document in documents
    ]
    return result


def main() -> None:
    api_key, model_name = load_settings()
    model = ChatOpenAI(api_key=api_key, model=model_name, temperature=0)

    # print("BalanceFit Intent-Focused Document Summarizer")
    # print("Type 'exit' or 'quit' as the user question to stop.")
    # print("Paste intent analysis and retrieval results as one-line JSON.")

    while True:
        user_question = input("\nUser question: ").strip()

        if not user_question:
            continue
        if user_question.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        raw_intent_result = input("Intent analysis JSON: ").strip()
        raw_retrieval_result = input("Retrieval result JSON: ").strip()

        intent_result = parse_json_object(raw_intent_result, "Intent analysis result")
        retrieval_result = parse_json_object(raw_retrieval_result, "Retrieval result")
        result = summarize_documents(user_question, intent_result, retrieval_result, model)

        print("\nDocument summary:")
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
