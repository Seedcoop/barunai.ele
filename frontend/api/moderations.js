import {
  forwardToOpenAI,
  getJsonBody,
  requireOpenAIKey,
  requirePost
} from "./_openai.js";

export default async function handler(request, response) {
  if (!requirePost(request, response)) {
    return;
  }

  const apiKey = requireOpenAIKey(response);
  if (!apiKey) {
    return;
  }

  try {
    const body = getJsonBody(request);
    const input = String(body.input ?? "").trim();

    if (!input) {
      response.status(400).json({ message: "검사할 프롬프트가 없습니다." });
      return;
    }

    await forwardToOpenAI(response, "/moderations", apiKey, {
      model: "omni-moderation-latest",
      input
    });
  } catch (error) {
    response.status(500).json({
      message: error.message || "모더레이션 요청 중 오류가 발생했습니다."
    });
  }
}
