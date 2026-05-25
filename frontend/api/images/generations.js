import {
  forwardToOpenAI,
  getJsonBody,
  requireOpenAIKey,
  requirePost
} from "../_openai.js";

const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);
const ALLOWED_QUALITIES = new Set(["low", "medium", "high"]);

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
    const prompt = String(body.prompt ?? "").trim();
    const size = ALLOWED_SIZES.has(body.size) ? body.size : "1024x1024";
    const quality = ALLOWED_QUALITIES.has(body.quality) ? body.quality : "medium";
    const transparent = Boolean(body.transparent);

    if (!prompt) {
      response.status(400).json({ message: "생성할 프롬프트가 없습니다." });
      return;
    }

    await forwardToOpenAI(response, "/images/generations", apiKey, {
      model: "gpt-image-1",
      prompt,
      size,
      quality,
      output_format: "png",
      background: transparent ? "transparent" : "opaque"
    });
  } catch (error) {
    response.status(500).json({
      message: error.message || "이미지 생성 요청 중 오류가 발생했습니다."
    });
  }
}
