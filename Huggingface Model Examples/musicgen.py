import requests

def query_musicgen(prompt):
    url = "https://router.huggingface.co/hf-inference/models/facebook/musicgen-small"
    headers = {
        "Authorization": "Bearer token",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": prompt
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        raise Exception(f"API Request Failed: {response.status_code} - {response.text}")
    return response.content

def main():
    prompt = "Lo-fi beat with a chill acoustic guitar and soft drums"
    try:
        audio_bytes = query_musicgen(prompt)
        with open("generated_music.flac", "wb") as f:
            f.write(audio_bytes)
        print("Music successfully generated and saved to generated_music.flac")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()