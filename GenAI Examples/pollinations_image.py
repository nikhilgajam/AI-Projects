import requests
import urllib.parse

def generate_image(prompt):
    """
    Generates an image using Pollinations free endpoint without an API token.
    """
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&model=flux&nofeed=true&nologo=true"
    
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"API Request Failed: {response.status_code} - {response.text}")
    return response.content

def main():
    prompt = "A beautiful sunset over a futuristic city"
    try:
        print(f"Generating image for prompt: '{prompt}'...")
        image_bytes = generate_image(prompt)
        with open("generated_image.jpg", "wb") as f:
            f.write(image_bytes)
        print("Image successfully generated and saved to generated_image.jpg")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
