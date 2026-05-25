import { useState } from "react";
import Header from "./components/Header";
import PromptInput from "./components/PromptInput";
import ReferencePanel from "./components/ReferencePanel";
import SafetyNotice from "./components/SafetyNotice";
import GenerateButton from "./components/GenerateButton";
import ResultSection from "./components/ResultSection";
import GatewayLock from "./components/GatewayLock";
import AnalysisSection from "./components/AnalysisSection";
import {
  runLocalPromptSafetyCheck,
  runModerationSafetyCheck,
  SAFETY_PROMPT_PREFIX
} from "./lib/contentFilter";
import { moderatePrompt, generateImage } from "./lib/openaiClient";
import { calculateTurnaroundSimilarity } from "./lib/similarity";

const TURNAROUND_REFERENCE = {
  id: "turnaround",
  name: "턴어라운드",
  src: `${import.meta.env.BASE_URL}assets/reference-turnaround.png`
};

const GATEWAY_PASSWORD = "KYOBO26";
const GATEWAY_STORAGE_KEY = "kyobo-elementary-unlocked";

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return window.localStorage.getItem(GATEWAY_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [gatewayPassword, setGatewayPassword] = useState("");
  const [gatewayError, setGatewayError] = useState("");

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");
  const [similarity, setSimilarity] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState("준비 완료: 안전한 프롬프트를 입력해 주세요.");
  const [error, setError] = useState("");
  const [moderationDetails, setModerationDetails] = useState([]);

  const canGenerate = prompt.trim().length > 0;

  const handleGatewaySubmit = (event) => {
    event.preventDefault();

    if (gatewayPassword.trim() !== GATEWAY_PASSWORD) {
      setGatewayError("비밀번호가 맞지 않습니다.");
      return;
    }

    try {
      window.localStorage.setItem(GATEWAY_STORAGE_KEY, "true");
    } catch {
      // Storage may be unavailable in private browsing; unlocking for this page is enough.
    }
    setIsUnlocked(true);
    setGatewayPassword("");
    setGatewayError("");
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError("프롬프트를 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    setGeneratedImage("");
    setSimilarity(null);
    setAnalysis(null);
    setError("");
    setModerationDetails([]);

    try {
      setStatus("1/4 로컬 안전 키워드 검사 중...");
      const localCheck = runLocalPromptSafetyCheck(prompt);
      if (!localCheck.allowed) {
        setStatus(localCheck.reason);
        setModerationDetails(localCheck.details);
        return;
      }

      setStatus("2/4 OpenAI 모더레이션 검사 중...");
      const moderation = await moderatePrompt(prompt.trim());
      const moderationCheck = runModerationSafetyCheck(moderation);
      if (!moderationCheck.allowed) {
        setStatus(moderationCheck.reason);
        setModerationDetails(moderationCheck.details);
        return;
      }

      setStatus("3/4 이미지 생성 중...");
      const safePrompt = `${SAFETY_PROMPT_PREFIX} 사용자 요청: ${prompt.trim()}`;
      const result = await generateImage(safePrompt, {
        size: "1024x1024",
        quality: "medium",
        transparent: false
      });

      setGeneratedImage(result.imageUrl);

      setStatus("4/4 턴어라운드 기준 이미지와 유사도 계산 중...");
      const detail = await calculateTurnaroundSimilarity(
        TURNAROUND_REFERENCE.src,
        result.imageUrl
      );
      setSimilarity(detail.score);
      setAnalysis(detail);
      setStatus(`완료: 턴어라운드 ${detail.poseIndex}번 이미지와 유사도 ${detail.score.toFixed(1)}%`);
    } catch (generationError) {
      setError(generationError.message || "생성 중 오류가 발생했습니다.");
      setStatus("생성 실패");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isUnlocked) {
    return (
      <GatewayLock
        password={gatewayPassword}
        error={gatewayError}
        onPasswordChange={setGatewayPassword}
        onSubmit={handleGatewaySubmit}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="content-flow">
        <ReferencePanel reference={TURNAROUND_REFERENCE} />
        <PromptInput prompt={prompt} onPromptChange={setPrompt} />
        <SafetyNotice />
        <GenerateButton disabled={!canGenerate} isLoading={isLoading} onClick={handleGenerate} />
        <ResultSection
          generatedImage={generatedImage}
          status={status}
          error={error}
          moderationDetails={moderationDetails}
        />
        <AnalysisSection similarity={similarity} analysis={analysis} />
      </main>
    </div>
  );
}
