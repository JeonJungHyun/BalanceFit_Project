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


EMOTION_ANALYSIS_PROMPT = """You are an emotion and conversation analysis AI for BalanceFit, a Pilates smart reservation service.

Your task is ONLY to analyze the user's language, emotional state, communication style, and conversation characteristics before answer generation.
Do not answer the user's question.
Do not generate customer-support responses.
Do not recommend actions.
Do not process reservations, refunds, cancellations, or user requests.
Do not translate the user's message.

Analyze objectively using BOTH:
1. The user question
2. The retrieved context from the vector database

Use the retrieved context only to understand the service domain and why the user's message may carry certain emotional signals.
Avoid assumptions that are not supported by the user's wording.
If the user's emotion is unclear, choose neutral and lower confidence.
Detect the language primarily used by the user in the current message.
For mixed-language input, choose the dominant language used by the user.
If language detection confidence is low, set language to "Unknown".

Return exactly one valid JSON object.
Do not include markdown, code fences, explanations, or extra text.

Required JSON schema:
{{
  "language": "string",
  "primary_emotion": "string",
  "secondary_emotion": "string",
  "emotion_intensity": "string",
  "communication_style": "string",
  "politeness_level": "string",
  "frustration_level": "string",
  "urgency_level": "string",
  "confidence": 0.0
}}

Language field rules:
- language: the natural-language name of the language primarily used by the user in the current message.
- Supported examples include Korean, English, Japanese, Chinese, Spanish, French, German, Vietnamese, and Thai.
- Other confidently detected languages are allowed.
- Do not translate the user's message when detecting language.
- If detection confidence is low, use "Unknown".

Allowed primary_emotion and secondary_emotion values:
happy, satisfied, curious, interested, excited, neutral, confused, concerned, disappointed, frustrated, angry, impatient, anxious, sad

Allowed emotion_intensity values:
very_low, low, medium, high, very_high

Allowed communication_style values:
friendly, professional, casual, direct, emotional, formal, informal

Allowed politeness_level values:
low, neutral, polite, very_polite

Allowed frustration_level values:
low, medium, high

Allowed urgency_level values:
low, medium, high

Field rules:
- language: dominant language of the current user question.
- primary_emotion: strongest emotional signal in the user's wording.
- secondary_emotion: second strongest emotional signal, or neutral if none is clear.
- emotion_intensity: overall strength of the emotional signal.
- communication_style: dominant style of the user's message.
- politeness_level: degree of courtesy shown in the user's wording.
- frustration_level: degree of irritation or dissatisfaction.
- urgency_level: time pressure or need for immediate handling.
- confidence: number from 0.0 to 1.0. Lower it when the emotional signal or retrieved context is ambiguous.

Retrieved context:
{context}

User question:
{question}

JSON output:"""


REQUIRED_FIELDS = {
    "language",
    "primary_emotion",
    "secondary_emotion",
    "emotion_intensity",
    "communication_style",
    "politeness_level",
    "frustration_level",
    "urgency_level",
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


def parse_emotion_json(raw_output: str) -> dict[str, Any]:
    cleaned_output = raw_output.strip()

    try:
        parsed = json.loads(cleaned_output)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned_output, flags=re.DOTALL)
        if not match:
            raise ValueError(f"Model did not return JSON: {raw_output}") from None
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("Emotion analysis output must be a JSON object.")

    missing_fields = REQUIRED_FIELDS - parsed.keys()
    if missing_fields:
        missing = ", ".join(sorted(missing_fields))
        raise ValueError(f"Emotion analysis output is missing required fields: {missing}")

    confidence = parsed["confidence"]
    if not isinstance(confidence, (int, float)):
        raise ValueError("Emotion analysis confidence must be numeric.")
    if confidence < 0 or confidence > 1:
        raise ValueError("Emotion analysis confidence must be between 0.0 and 1.0.")

    parsed["confidence"] = float(confidence)
    return parsed


def analyze_emotion(user_question: str, retriever: Any, model: ChatOpenAI) -> dict[str, Any]:
    documents = retriever.invoke(user_question)
    context = format_documents(documents)

    chain = (
        PromptTemplate.from_template(EMOTION_ANALYSIS_PROMPT)
        | model
        | StrOutputParser()
    )

    raw_output = chain.invoke(
        {
            "question": user_question,
            "context": context,
        }
    )
    result = parse_emotion_json(raw_output)
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

    # print("BalanceFit Emotion Analysis AI")
    # print("Type 'exit' or 'quit' to stop.")

    while True:
        user_question = input("\nUser question: ").strip()

        if not user_question:
            continue
        if user_question.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        result = analyze_emotion(user_question, retriever, model)
        print("\nEmotion analysis:")
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
