export default function PromptInput({
  apiKey,
  prompt,
  size,
  quality,
  transparent,
  onApiKeyChange,
  onPromptChange,
  onSizeChange,
  onQualityChange,
  onTransparentChange
}) {
  return (
    <section className="card prompt-card">
      <h3>프롬프트 작성</h3>

      <label htmlFor="api-key">OpenAI API Key</label>
      <input
        id="api-key"
        type="password"
        value={apiKey}
        onChange={(event) => onApiKeyChange(event.target.value)}
        placeholder="sk-..."
        autoComplete="off"
      />

      <label htmlFor="prompt">캐릭터 설명</label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="예: 초록색 콩 모양 가방을 멘 귀여운 펭귄이 손을 흔들며 인사하는 장면"
      />

      <div className="grid-two">
        <div>
          <label htmlFor="size">이미지 크기</label>
          <select id="size" value={size} onChange={(event) => onSizeChange(event.target.value)}>
            <option value="1024x1024">정사각형 (1024x1024)</option>
            <option value="1536x1024">가로형 (1536x1024)</option>
            <option value="1024x1536">세로형 (1024x1536)</option>
          </select>
        </div>

        <div>
          <label htmlFor="quality">품질</label>
          <select
            id="quality"
            value={quality}
            onChange={(event) => onQualityChange(event.target.value)}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
      </div>

      <label className="checkbox-row" htmlFor="transparent">
        <input
          id="transparent"
          type="checkbox"
          checked={transparent}
          onChange={(event) => onTransparentChange(event.target.checked)}
        />
        투명 배경으로 생성
      </label>
    </section>
  );
}
