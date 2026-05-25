const OPENAI_BASE_URL =
  import.meta.env.VITE_OPENAI_BASE_URL ?? "https://api.openai.com/v1";

async function callOpenAI(endpoint, apiKey, payload) {
  const response = await fetch(`${OPENAI_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ?? "OpenAI API 요청 중 오류가 발생했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function moderatePrompt(apiKey, prompt) {
  const data = await callOpenAI("/moderations", apiKey, {
    model: "omni-moderation-latest",
    input: prompt
  });

  return data?.results?.[0] ?? null;
}

export async function generateImage(apiKey, prompt, options) {
  const payload = {
    model: "gpt-image-1",
    prompt,
    size: options.size,
    quality: options.quality,
    output_format: "png",
    background: options.transparent ? "transparent" : "opaque"
  };

  const data = await callOpenAI("/images/generations", apiKey, payload);
  const base64Image = data?.data?.[0]?.b64_json;

  if (!base64Image) {
    throw new Error("이미지 생성 결과를 가져오지 못했습니다.");
  }

  return {
    imageUrl: `data:image/png;base64,${base64Image}`,
    usage: data?.usage ?? null
  };
}
