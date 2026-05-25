const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function callBackend(endpoint, payload) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ??
      data?.message ??
      "OpenAI API 요청 중 오류가 발생했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function moderatePrompt(prompt) {
  const data = await callBackend("/moderations", {
    input: prompt
  });

  return data?.results?.[0] ?? null;
}

export async function generateImage(prompt, options) {
  const data = await callBackend("/images/generations", {
    prompt,
    size: options.size,
    quality: options.quality,
    transparent: options.transparent
  });

  const base64Image = data?.data?.[0]?.b64_json;

  if (!base64Image) {
    throw new Error("이미지 생성 결과를 가져오지 못했습니다.");
  }

  return {
    imageUrl: `data:image/png;base64,${base64Image}`,
    usage: data?.usage ?? null
  };
}
