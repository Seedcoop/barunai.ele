const OPENAI_BASE_URL = "https://api.openai.com/v1";

export function requireOpenAIKey(response) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    response.status(500).json({
      message: "서버에 OpenAI API Key가 설정되지 않았습니다."
    });
    return null;
  }

  return apiKey;
}

export async function forwardToOpenAI(response, endpoint, apiKey, payload) {
  const upstream = await fetch(`${OPENAI_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const text = await upstream.text();

  response.status(upstream.status);
  response.setHeader("Content-Type", contentType);
  response.send(text);
}

export function getJsonBody(request) {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  return request.body;
}

export function requirePost(request, response) {
  if (request.method === "POST") {
    return true;
  }

  response.setHeader("Allow", "POST");
  response.status(405).json({ message: "POST 요청만 사용할 수 있습니다." });
  return false;
}
