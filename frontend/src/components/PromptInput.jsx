export default function PromptInput({ prompt, onPromptChange }) {
  return (
    <section className="card prompt-card">
      <h3>프롬프트 작성</h3>

      <label htmlFor="prompt">캐릭터 설명</label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="예: 초록색 콩 모양 가방을 멘 귀여운 펭귄이 손을 흔들며 인사하는 장면"
      />
    </section>
  );
}
