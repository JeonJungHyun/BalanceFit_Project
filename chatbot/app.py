import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


def load_settings() -> tuple[str, str]:
    load_dotenv(Path(__file__).with_name(".env"))

    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("MODEL")

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to your .env file.")
    if not model:
        raise RuntimeError("MODEL is missing. Add it to your .env file.")

    return api_key, model


def main() -> None:
    api_key, model = load_settings()
    client = OpenAI(api_key=api_key)

    print("OpenAI terminal chatbot")
    print("Type 'exit' or 'quit' to stop.")

    while True:
        user_input = input("\nYou: ").strip()

        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        response = client.responses.create(
            model=model,
            input=user_input,
        )

        print(f"\nAI: {response.output_text}")


if __name__ == "__main__":
    main()
