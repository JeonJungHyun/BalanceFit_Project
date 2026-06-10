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


MEMORY_CONTEXT_VALIDATION_PROMPT = """You are a memory retrieval and context validation AI for BalanceFit, a Pilates smart reservation service.

Your task is ONLY to evaluate previous conversation summaries against the current user question, current intent, current emotion analysis, and current intent-focused document summary.
Do not answer the user directly.
Do not generate customer-facing text.
Do not create or store new memory.
Do not recommend actions.
Do not process reservations, refunds, cancellations, or user requests.

Analyze these inputs:
1. Current user question
2. Intent analysis result
3. Emotion analysis result
4. Current intent-focused document summary
5. Previous conversation summaries

Use ONLY the provided memory summaries and current document summary.
Never invent conversation history.
Never invent policies or missing document facts.
Never conclude that a previous answer was supported unless the current document summary supports it.
If a previous memory claim is related but not confirmed by the current document summary, flag it as potentially unverified.

Return exactly one valid JSON object.
Do not include markdown, code fences, explanations, or extra text.

Required JSON schema:
{{
  "relevant_memories": [
    {{
      "question": "string",
      "reason": "string"
    }}
  ],
  "ignored_memories": [
    {{
      "question": "string",
      "reason": "string"
    }}
  ],
  "missing_information": ["string"],
  "potentially_unverified_information": ["string"],
  "recommended_context": ["string"],
  "confidence": 0.0
}}

Field rules:
- relevant_memories: previous memories related to the current intent, topic, user goal, or directly related policy context.
- ignored_memories: previous memories that should not influence the final response because they are unrelated or duplicate-only.
- missing_information: requested details or policy facts that are absent from the current document summary and relevant memories.
- potentially_unverified_information: previous answer claims that are not supported by the current document summary or conflict with it.
- recommended_context: concise internal context to pass to a future final response generator.
- confidence: number from 0.0 to 1.0. Lower it when memory or document summary evidence is weak, incomplete, or ambiguous.

Current user question:
{question}

Intent analysis result:
{intent_result}

Emotion analysis result:
{emotion_result}

Current intent-focused document summary:
{document_summary}

Previous conversation summaries:
{memory_summaries}

JSON output:"""


REQUIRED_INTENT_FIELDS = (
    "intent",
)

REQUIRED_SUMMARY_FIELDS = (
    "key_points",
)

REQUIRED_VALIDATION_FIELDS = {
    "relevant_memories",
    "ignored_memories",
    "missing_information",
    "potentially_unverified_information",
    "recommended_context",
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


def parse_json(raw_json: str, label: str) -> Any:
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError as error:
        raise ValueError(f"{label} must be valid JSON.") from error


def parse_json_object(raw_json: str, label: str) -> dict[str, Any]:
    parsed = parse_json(raw_json, label)

    if not isinstance(parsed, dict):
        raise ValueError(f"{label} must be a JSON object.")

    return parsed


def parse_memory_summaries(raw_json: str) -> list[dict[str, Any]]:
    parsed = parse_json(raw_json, "Memory summaries")

    if not isinstance(parsed, list):
        raise ValueError("Memory summaries must be a JSON list.")

    memories: list[dict[str, Any]] = []

    for memory in parsed:
        if not isinstance(memory, dict):
            raise ValueError("Each memory summary must be a JSON object.")

        question = str(memory.get("question", "")).strip()
        answer_summary = str(memory.get("answer_summary", "")).strip()

        if not question or not answer_summary:
            raise ValueError("Each memory summary must include question and answer_summary.")

        memories.append(memory)

    return memories


def validate_required_fields(
    payload: dict[str, Any],
    required_fields: tuple[str, ...],
    label: str,
) -> None:
    missing_fields = [
        field for field in required_fields if not str(payload.get(field, "")).strip()
    ]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise ValueError(f"{label} is missing required fields: {missing}")


def parse_validation_json(raw_output: str) -> dict[str, Any]:
    cleaned_output = raw_output.strip()

    try:
        parsed = json.loads(cleaned_output)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned_output, flags=re.DOTALL)
        if not match:
            raise ValueError(f"Model did not return JSON: {raw_output}") from None
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("Memory context validation output must be a JSON object.")

    missing_fields = REQUIRED_VALIDATION_FIELDS - parsed.keys()
    if missing_fields:
        missing = ", ".join(sorted(missing_fields))
        raise ValueError(
            f"Memory context validation output is missing required fields: {missing}"
        )

    for field in (
        "relevant_memories",
        "ignored_memories",
        "missing_information",
        "potentially_unverified_information",
        "recommended_context",
    ):
        if not isinstance(parsed[field], list):
            raise ValueError(f"Memory context validation {field} must be a list.")

    confidence = parsed["confidence"]
    if not isinstance(confidence, (int, float)):
        raise ValueError("Memory context validation confidence must be numeric.")
    if confidence < 0 or confidence > 1:
        raise ValueError("Memory context validation confidence must be between 0.0 and 1.0.")

    parsed["confidence"] = float(confidence)
    return parsed


def format_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2)


def validate_memory_context(
    user_question: str,
    intent_result: dict[str, Any],
    emotion_result: dict[str, Any],
    document_summary: dict[str, Any],
    memory_summaries: list[dict[str, Any]],
    model: ChatOpenAI,
) -> dict[str, Any]:
    validate_required_fields(intent_result, REQUIRED_INTENT_FIELDS, "Intent analysis result")
    validate_required_fields(document_summary, REQUIRED_SUMMARY_FIELDS, "Document summary")

    chain = (
        PromptTemplate.from_template(MEMORY_CONTEXT_VALIDATION_PROMPT)
        | model
        | StrOutputParser()
    )

    raw_output = chain.invoke(
        {
            "question": user_question,
            "intent_result": format_json(intent_result),
            "emotion_result": format_json(emotion_result),
            "document_summary": format_json(document_summary),
            "memory_summaries": format_json(memory_summaries),
        }
    )
    return parse_validation_json(raw_output)


def main() -> None:
    api_key, model_name = load_settings()
    model = ChatOpenAI(api_key=api_key, model=model_name, temperature=0)

    print("BalanceFit Memory Retrieval & Context Validation")
    print("Type 'exit' or 'quit' as the user question to stop.")
    print("Paste all structured inputs as one-line JSON.")

    while True:
        user_question = input("\nCurrent user question: ").strip()

        if not user_question:
            continue
        if user_question.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        raw_intent_result = input("Intent analysis JSON: ").strip()
        raw_emotion_result = input("Emotion analysis JSON: ").strip()
        raw_document_summary = input("Document summary JSON: ").strip()
        raw_memory_summaries = input("Memory summaries JSON list: ").strip()

        intent_result = parse_json_object(raw_intent_result, "Intent analysis result")
        emotion_result = parse_json_object(raw_emotion_result, "Emotion analysis result")
        document_summary = parse_json_object(raw_document_summary, "Document summary")
        memory_summaries = parse_memory_summaries(raw_memory_summaries)

        result = validate_memory_context(
            user_question,
            intent_result,
            emotion_result,
            document_summary,
            memory_summaries,
            model,
        )

        print("\nMemory context validation:")
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
