# Lorex LLM Loader

import os
import argparse
from llama_cpp import Llama

MODEL_DIR = "./models"

def load_model(model_name: str):
    model_path = os.path.join(MODEL_DIR, model_name)
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        return None
    
    print(f"Loading model from {model_path}...")
    llm = Llama(model_path=model_path, verbose=False)
    print("Model loaded successfully!")
    return llm

def chat_with_model(llm: Llama):
    print("\nStarting chat with the model. Type 'quit' to exit.")
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'quit':
            break
        
        # Basic prompt engineering - can be expanded
        prompt = f"Q: {user_input}\nA:"
        output = llm(prompt, max_tokens=150, stop=["Q:", "\n"], echo=True)
        print(f"Model: {output['choices'][0]['text'].strip()}")

def main():
    parser = argparse.ArgumentParser(description="Lorex LLM Loader")
    parser.add_argument("--model_dir", type=str, default=MODEL_DIR,
                        help="Directory containing GGUF models (default: ./models)")
    args = parser.parse_args()

    global MODEL_DIR
    MODEL_DIR = args.model_dir

    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR, exist_ok=True)
        print(f"Created {MODEL_DIR} directory. Please place your GGUF models here.")

    print("Available models in the 'models' directory:")
    models = [f for f in os.listdir(MODEL_DIR) if f.endswith(('.gguf', '.bin'))]

    if not models:
        print("No models found. Please download a GGUF model and place it in the 'models' directory.")
        print("Example: Download a GGUF model from Hugging Face and place it in the 'models' folder.")
        print("e.g., https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/blob/main/llama-2-7b-chat.Q4_K_M.gguf")
        return

    for i, model_name in enumerate(models):
        print(f"{i + 1}. {model_name}")

    while True:
        try:
            choice = input("Select a model to load (number): ")
            model_index = int(choice) - 1
            if 0 <= model_index < len(models):
                selected_model_name = models[model_index]
                break
            else:
                print("Invalid choice. Please enter a valid number.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    llm = load_model(selected_model_name)
    if llm:
        chat_with_model(llm)

if __name__ == "__main__":
    main()