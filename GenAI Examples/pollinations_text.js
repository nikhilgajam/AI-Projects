async function generateText(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://text.pollinations.ai/prompt/${encodedPrompt}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Request Failed: ${response.status} - ${await response.text()}`);
  }
  const text = await response.text();
  return text;
}

async function main() {
  const prompt = "Write a short poem about the future of AI.";
  console.log(`Generating text for prompt: '${prompt}'...`);
  try {
    const text = await generateText(prompt);
    console.log("\nGenerated Text:\n", text);
  } catch (error) {
    console.error(error);
  }
}

main();
