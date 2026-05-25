const BLOCKED_KEYWORDS = [
  "살인",
  "죽여",
  "피",
  "총",
  "칼부림",
  "테러",
  "폭탄",
  "자해",
  "자살",
  "마약",
  "담배",
  "술",
  "도박",
  "음란",
  "야한",
  "노출",
  "성행위",
  "혐오",
  "괴롭힘",
  "협박",
  "kill",
  "blood",
  "gun",
  "knife",
  "bomb",
  "terror",
  "suicide",
  "self-harm",
  "drug",
  "alcohol",
  "gambling",
  "nude",
  "nudity",
  "sexual",
  "porn",
  "gore",
  "violent"
];

const MODERATION_BLOCK_CATEGORIES = [
  "sexual",
  "sexual/minors",
  "violence",
  "violence/graphic",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "hate",
  "hate/threatening",
  "harassment/threatening",
  "illicit",
  "illicit/violent"
];

const CATEGORY_LABEL = {
  sexual: "성적 콘텐츠",
  "sexual/minors": "아동 성적 콘텐츠",
  violence: "폭력",
  "violence/graphic": "잔혹 폭력",
  "self-harm": "자해",
  "self-harm/intent": "자해 의도",
  "self-harm/instructions": "자해 지시",
  hate: "혐오",
  "hate/threatening": "혐오/위협",
  "harassment/threatening": "괴롭힘/위협",
  illicit: "불법 행위",
  "illicit/violent": "폭력적 불법 행위"
};

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function runLocalPromptSafetyCheck(prompt) {
  const normalized = normalize(prompt);
  const matched = BLOCKED_KEYWORDS.filter((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );

  if (matched.length > 0) {
    return {
      allowed: false,
      reason:
        "교육용 안전 규칙에 맞지 않는 단어가 포함되어 있어요. 폭력/선정성/비윤리 요소를 제거해 주세요.",
      details: matched.slice(0, 6)
    };
  }

  return { allowed: true, reason: "통과", details: [] };
}

export function runModerationSafetyCheck(moderationResult) {
  const categories = moderationResult?.categories ?? {};
  const blocked = MODERATION_BLOCK_CATEGORIES.filter((name) => categories[name]);

  if (blocked.length > 0) {
    return {
      allowed: false,
      reason:
        "모더레이션 검사에서 교육용으로 부적절한 요소가 감지되어 생성이 차단되었습니다.",
      details: blocked.map((name) => CATEGORY_LABEL[name] ?? name)
    };
  }

  if (moderationResult?.flagged) {
    return {
      allowed: false,
      reason:
        "모더레이션 검사에서 잠재적 위험이 감지되어 생성이 차단되었습니다.",
      details: ["잠재적 위험"]
    };
  }

  return { allowed: true, reason: "통과", details: [] };
}

export const SAFETY_PROMPT_PREFIX = [
  "아래 조건을 반드시 지켜 초등 고학년 교육용 캐릭터 이미지를 만들어라.",
  "선정성, 신체 노출, 폭력, 공포, 혐오, 범죄, 약물, 무기, 욕설, 비윤리적 행동은 포함하지 않는다.",
  "실제 인물보다는 귀여운 3D 캐릭터 스타일로 만든다.",
  "배경은 깔끔하고 명확하게 구성한다."
].join(" ");
