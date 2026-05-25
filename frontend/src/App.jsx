import { useMemo, useState } from "react";
import Header from "./components/Header";
import PromptInput from "./components/PromptInput";
import ReferencePanel from "./components/ReferencePanel";
import SafetyNotice from "./components/SafetyNotice";
import GenerateButton from "./components/GenerateButton";
import ResultSection from "./components/ResultSection";
import GatewayLock from "./components/GatewayLock";
import {
  runLocalPromptSafetyCheck,
  runModerationSafetyCheck,
  SAFETY_PROMPT_PREFIX
} from "./lib/contentFilter";
import { moderatePrompt, generateImage } from "./lib/openaiClient";
import { calculateSimilarity } from "./lib/similarity";

const DEFAULT_REFERENCES = [
  {
    id: "default",
    name: "기본 캐릭터",
    src: `${import.meta.env.BASE_URL}assets/reference-default.png`
  },
  {
    id: "turnaround",
    name: "턴어라운드",
    src: `${import.meta.env.BASE_URL}assets/reference-turnaround.png`
  }
];

const GATEWAY_PASSWORD = "KYOBO26";
const GATEWAY_STORAGE_KEY = "kyobo-elementary-unlocked";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("업로드 이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

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

  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("medium");
  const [transparent, setTransparent] = useState(false);

  const [selectedReferenceId, setSelectedReferenceId] = useState("default");
  const [customReference, setCustomReference] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");
  const [similarity, setSimilarity] = useState(null);
  const [status, setStatus] = useState("준비 완료: 안전한 프롬프트를 입력해 주세요.");
  const [error, setError] = useState("");
  const [moderationDetails, setModerationDetails] = useState([]);
  const [finalPrompt, setFinalPrompt] = useState("");

  const activeReference = useMemo(() => {
    if (selectedReferenceId === "custom" && customReference) {
      return customReference;
    }

    return (
      DEFAULT_REFERENCES.find((item) => item.id === selectedReferenceId) ??
      DEFAULT_REFERENCES[0]
    );
  }, [selectedReferenceId, customReference]);

  const canGenerate = apiKey.trim().length > 0 && prompt.trim().length > 0;

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

  const handleSelectReference = (referenceId) => {
    setSelectedReferenceId(referenceId);
  };

  const handleUploadReference = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const src = await fileToDataUrl(file);
      setCustomReference({
        id: "custom",
        name: `업로드: ${file.name}`,
        src
      });
      setSelectedReferenceId("custom");
      setStatus("기준 이미지가 업로드되었습니다.");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      event.target.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError("API Key와 프롬프트를 모두 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    setGeneratedImage("");
    setSimilarity(null);
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
      const moderation = await moderatePrompt(apiKey.trim(), prompt.trim());
      const moderationCheck = runModerationSafetyCheck(moderation);
      if (!moderationCheck.allowed) {
        setStatus(moderationCheck.reason);
        setModerationDetails(moderationCheck.details);
        return;
      }

      setStatus("3/4 이미지 생성 중...");
      const safePrompt = `${SAFETY_PROMPT_PREFIX} 사용자 요청: ${prompt.trim()}`;
      setFinalPrompt(safePrompt);
      const result = await generateImage(apiKey.trim(), safePrompt, {
        size,
        quality,
        transparent
      });

      setGeneratedImage(result.imageUrl);

      setStatus("4/4 기준 이미지와 유사도 계산 중...");
      const score = await calculateSimilarity(activeReference.src, result.imageUrl);
      setSimilarity(score);
      setStatus(`완료: 기준 이미지와 유사도 ${score.toFixed(1)}%`);
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

      <main className="content-grid">
        <section className="left-panel">
          <PromptInput
            apiKey={apiKey}
            prompt={prompt}
            size={size}
            quality={quality}
            transparent={transparent}
            onApiKeyChange={setApiKey}
            onPromptChange={setPrompt}
            onSizeChange={setSize}
            onQualityChange={setQuality}
            onTransparentChange={setTransparent}
          />

          <ReferencePanel
            references={DEFAULT_REFERENCES}
            activeReference={activeReference}
            selectedReferenceId={selectedReferenceId}
            onSelectReference={handleSelectReference}
            onUploadReference={handleUploadReference}
          />

          <SafetyNotice />

          <GenerateButton disabled={!canGenerate} isLoading={isLoading} onClick={handleGenerate} />
        </section>

        <section className="right-panel">
          <ResultSection
            generatedImage={generatedImage}
            similarity={similarity}
            finalPrompt={finalPrompt}
            status={status}
            error={error}
            moderationDetails={moderationDetails}
          />
        </section>
      </main>
    </div>
  );
}
