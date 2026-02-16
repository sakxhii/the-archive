import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("GOOGLE_API_KEY")
URL = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

with open("backend/models_list.txt", "w") as f:
    if not API_KEY:
        f.write("Error: GOOGLE_API_KEY not found in environment.\n")
    else:
        f.write(f"Checking models with key: {API_KEY[:5]}...\n")
        try:
            response = requests.get(URL)
            if response.status_code == 200:
                data = response.json()
                f.write("\nAvailable Models for generateContent:\n")
                found_any = False
                for model in data.get('models', []):
                    if "generateContent" in model.get('supportedGenerationMethods', []):
                        f.write(f"- {model['name']} ({model['displayName']})\n")
                        found_any = True
                
                if not found_any:
                    f.write("No models found that support 'generateContent'.\n")
            else:
                f.write(f"Error {response.status_code}: {response.text}\n")
        except Exception as e:
            f.write(f"Request failed: {e}\n")
