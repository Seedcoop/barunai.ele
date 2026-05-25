export default function ReferencePanel({
  references,
  activeReference,
  selectedReferenceId,
  onSelectReference,
  onUploadReference
}) {
  return (
    <section className="card reference-card">
      <h3>기준 이미지</h3>
      <p className="muted">아래 이미지를 보고 더 비슷한 캐릭터가 나오도록 프롬프트를 개선해 보세요.</p>

      <div className="reference-grid">
        {references.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`reference-tile ${selectedReferenceId === item.id ? "active" : ""}`}
            onClick={() => onSelectReference(item.id)}
          >
            <img src={item.src} alt={item.name} />
            <span>{item.name}</span>
          </button>
        ))}
      </div>

      <label className="upload-box" htmlFor="reference-upload">
        사용자 기준 이미지 업로드 (PNG/JPG)
        <input
          id="reference-upload"
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={onUploadReference}
        />
      </label>

      <div className="active-reference-preview">
        <img src={activeReference.src} alt="현재 기준 이미지" />
      </div>
    </section>
  );
}
