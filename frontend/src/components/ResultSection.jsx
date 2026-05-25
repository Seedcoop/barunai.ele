export default function ResultSection({
  generatedImage,
  status,
  error,
  moderationDetails
}) {
  return (
    <section className="card result-card">
      <h3>생성 결과</h3>

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
          <a className="download-link" href={generatedImage} download={`edu-character-${Date.now()}.png`}>
            이미지 다운로드
          </a>
        </>
      ) : (
        <div className="result-empty">
          <p>생성된 이미지가 여기에 표시됩니다.</p>
        </div>
      )}
    </section>
  );
}
