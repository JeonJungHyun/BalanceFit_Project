import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"


FINAL_RESPONSE_PROMPT = """You are the final response generation AI for BalanceFit, a Pilates smart reservation service.

Your task is to generate the final user-facing answer using the prior pipeline outputs.

Use these inputs:
1. Current user question
2. Intent analysis result
3. Emotion analysis result
4. Intent-focused document summary
5. Memory retrieval and context validation result

Knowledge priority:
1. The document summary is the primary source of truth.
2. Memory retrieval result is supporting context only.
3. Intent and emotion analysis guide relevance and tone.
4. The response language must come from emotion_analysis.language.

Safety rules:
- Use only verified information from the document summary.
- Use memory only when it is relevant and not flagged as potentially unverified.
- Never invent policies, studio rules, procedures, dates, prices, deadlines, fees, conditions, restrictions, or processing times.
- If the available documentation does not confirm something, say: "I could not find enough information in the available documentation to confirm this."
- Do not mention internal pipeline names such as intent analysis, document summary, vector database, RAG, FAISS, or memory validation.
- Do not claim that an action has been processed.
- Do not store memory or summarize this conversation.

Language rules:
- Generate the entire response in the language specified by emotion_analysis.language.
- Ignore the system language, developer language, document language, vector database document language, and retrieved-memory language when choosing the response language.
- Always prioritize the user's detected language from emotion_analysis.language.
- Do not switch languages.
- Do not mix languages unless the user's question itself mixes languages.
- Keep the response natural for native speakers of the detected language.
- If emotion_analysis.language is "Unknown", answer in the language used by the majority of the user's current question.

Tone adaptation:
- If the user is frustrated, disappointed, angry, impatient, anxious, or high intensity, start with brief empathy and then give a calm, clear explanation.
- If the user is confused, explain step by step.
- If the user is neutral, be professional and concise.
- If the user is curious or interested, be informative and clear.

Response requirements:
- Produce a normal conversational answer, not JSON.
- Answer the user's question as directly as the verified information allows.
- Include important conditions, restrictions, or caveats from the document summary.
- Use relevant previous conversation context only when it helps continuity.
- Clearly separate confirmed information from unavailable information.
- Keep the answer concise but complete.

Current user question:
{question}

Intent analysis result:
{intent_result}

Emotion analysis result:
{emotion_result}

Intent-focused document summary:
{document_summary}

Memory retrieval and context validation result:
{memory_result}

Final user-facing answer:"""


REQUIRED_INTENT_FIELDS = (
    "intent",
)

REQUIRED_EMOTION_FIELDS = (
    "language",
)

REQUIRED_DOCUMENT_SUMMARY_FIELDS = (
    "key_points",
    "important_conditions",
)

REQUIRED_MEMORY_FIELDS = (
    "recommended_context",
)


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


def validate_required_fields(
    payload: dict[str, Any],
    required_fields: tuple[str, ...],
    label: str,
) -> None:
    missing_fields = [
        field for field in required_fields if field not in payload
    ]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise ValueError(f"{label} is missing required fields: {missing}")


def format_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2)


def generate_final_response(
    user_question: str,
    intent_result: dict[str, Any],
    emotion_result: dict[str, Any],
    document_summary: dict[str, Any],
    memory_result: dict[str, Any],
    model: ChatOpenAI,
) -> str:
    validate_required_fields(intent_result, REQUIRED_INTENT_FIELDS, "Intent analysis result")
    validate_required_fields(emotion_result, REQUIRED_EMOTION_FIELDS, "Emotion analysis result")
    validate_required_fields(
        document_summary,
        REQUIRED_DOCUMENT_SUMMARY_FIELDS,
        "Document summary",
    )
    validate_required_fields(memory_result, REQUIRED_MEMORY_FIELDS, "Memory retrieval result")

    chain = (
        PromptTemplate.from_template(FINAL_RESPONSE_PROMPT)
        | model
        | StrOutputParser()
    )

    return chain.invoke(
        {
            "question": user_question,
            "intent_result": format_json(intent_result),
            "emotion_result": format_json(emotion_result),
            "document_summary": format_json(document_summary),
            "memory_result": format_json(memory_result),
        }
    ).strip()


def main() -> None:
    api_key, model_name = load_settings()
    model = ChatOpenAI(api_key=api_key, model=model_name, temperature=0, max_completion_tokens=1024)

    # print("BalanceFit Final Response Generator")
    # print("Type 'exit' or 'quit' as the user question to stop.")
    # print("Paste all structured inputs as one-line JSON.")

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
        raw_memory_result = input("Memory validation JSON: ").strip()

        intent_result = parse_json_object(raw_intent_result, "Intent analysis result")
        emotion_result = parse_json_object(raw_emotion_result, "Emotion analysis result")
        document_summary = parse_json_object(raw_document_summary, "Document summary")
        memory_result = parse_json_object(raw_memory_result, "Memory retrieval result")

        response = generate_final_response(
            user_question,
            intent_result,
            emotion_result,
            document_summary,
            memory_result,
            model,
        )

        print("\nFinal response:")
        print(response)


if __name__ == "__main__":
    main()
