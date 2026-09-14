async function queryQwen(prompt) {
  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      headers: {
        Authorization: `Bearer token`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      }),
    }
  );
  const result = await response.json();
  return result;
}

async function main() {
  const prompt = "Write a song about the beauty of nature.";
  try {
    const response = await queryQwen(prompt);
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error(error);
  }
}

main();
