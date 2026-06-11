import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from document_summarization import summarize_documents
from emotion_analysis import analyze_emotion
from final_response_generation import generate_final_response
from intent_analysis import analyze_intent
from intent_retrieval import DEFAULT_RETRIEVER_K, load_vectorstore, retrieve_documents
from memory_context_validation import validate_memory_context


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
EXIT_COMMANDS = {"exit", "quit", "q"}
DEBUG_LOGS = True
MAX_MEMORY_SUMMARY_LENGTH = 700


def load_settings() -> tuple[str, str]:
    load_dotenv(ENV_PATH)

    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("MODEL")

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to chatbot/.env.")
    if not model:
        raise RuntimeError("MODEL is missing. Add it to chatbot/.env.")

    return api_key, model


def log_section(title: str, payload: Any) -> None:
    if not DEBUG_LOGS:
        return

    print(f"\n[{title}]")
    if isinstance(payload, str):
        print(payload)
        return

    print(json.dumps(payload, ensure_ascii=False, indent=2))


def summarize_for_memory(text: str) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= MAX_MEMORY_SUMMARY_LENGTH:
        return normalized

    return f"{normalized[:MAX_MEMORY_SUMMARY_LENGTH].rstrip()}..."


def build_memory_summary(user_question: str, final_response: str) -> dict[str, str]:
    return {
        "question": user_question,
        "answer_summary": summarize_for_memory(final_response),
    }


def run_pipeline(
    user_question: str,
    conversation_memory: list[dict[str, str]],
    retriever: Any,
    model: ChatOpenAI,
) -> str:
    intent_result = analyze_intent(user_question, retriever, model)
    log_section("Intent Analysis", intent_result)

    emotion_result = analyze_emotion(user_question, retriever, model)
    log_section("Emotion Analysis", emotion_result)

    retrieval_result = retrieve_documents(user_question, intent_result, retriever)
    log_section("Retrieved Documents", retrieval_result)

    document_summary = summarize_documents(
        user_question,
        intent_result,
        retrieval_result,
        model,
    )
    log_section("Document Summary", document_summary)

    memory_context = validate_memory_context(
        user_question,
        intent_result,
        emotion_result,
        document_summary,
        conversation_memory,
        model,
    )
    memory_context["memory_summaries"] = conversation_memory
    log_section("Memory Context", memory_context)

    final_response = generate_final_response(
        user_question,
        intent_result,
        emotion_result,
        document_summary,
        memory_context,
        model,
    )
    log_section("Final Response", final_response)

    conversation_memory.append(build_memory_summary(user_question, final_response))
    return final_response


def main() -> None:
    api_key, model_name = load_settings()
    model = ChatOpenAI(api_key=api_key, model=model_name, temperature=0)
    vectorstore = load_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": DEFAULT_RETRIEVER_K})
    conversation_memory: list[dict[str, str]] = []

    print("BalanceFit RAG Terminal Chatbot")
    print("Type 'exit', 'quit', or 'q' to stop.")

    while True:
        user_question = input("\nUser: ").strip()

        if not user_question:
            continue
        if user_question.lower() in EXIT_COMMANDS:
            print("Program terminated.")
            break

        try:
            final_response = run_pipeline(
                user_question,
                conversation_memory,
                retriever,
                model,
            )
        except Exception as error:
            print(f"\n[Error]\n{error}")
            continue

        print(f"\nAI: {final_response}")


if __name__ == "__main__":
    main()
