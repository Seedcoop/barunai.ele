function SimilarityBadge({ similarity }) {
  if (similarity === null) {
    return <span className="similarity-badge waiting">유사도 계산 전</span>;
  }

  let toneClass = "low";
  if (similarity >= 80) toneClass = "high";
  else if (similarity >= 60) toneClass = "mid";

  return <span className={`similarity-badge ${toneClass}`}>유사도 {similarity.toFixed(1)}%</span>;
}

export default function ResultSection({
  generatedImage,
  similarity,
  finalPrompt,
  status,
  error,
  moderationDetails
}) {
  return (
    <section className="card result-card">
      <div className="result-title-row">
        <h3>생성 결과</h3>
        <SimilarityBadge similarity={similarity} />
      </div>

      {status && <p className="status-msg">{status}</p>}
      {error && <p className="error-msg">{error}</p>}

      {moderationDetails.length > 0 && (
        <div className="moderation-box">
          <strong>차단된 위험 유형:</strong> {moderationDetails.join(", ")}
        </div>
      )}

      {generatedImage ? (
        <>
          <div className="result-image-wrap">
            <img src={generatedImage} alt="생성된 캐릭터" />
          </div>
          <div className="prompt-log">
            <strong>적용된 프롬프트</strong>
            <p>{finalPrompt}</p>
          </div>
          <a className="download-link" href={generatedImage} download={`edu-character-${Date.now()}.png`}>
            이미지 다운로드
          </a>
        </>
      ) : (
        <div className="result-empty">
          <p>오른쪽에 생성 결과가 표시됩니다.</p>
        </div>
      )}
    </section>
  );
}
