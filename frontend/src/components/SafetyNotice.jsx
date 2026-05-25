const SAFETY_ITEMS = [
  "선정적, 폭력적, 혐오 표현 프롬프트는 자동 차단됩니다.",
  "무기, 공포, 범죄, 자해 관련 단어를 넣지 마세요.",
  "수업 활동에서는 타인을 존중하는 문장을 사용해 주세요."
];

export default function SafetyNotice() {
  return (
    <section className="card safety-card">
      <h3>교육용 안전 규칙</h3>
      <ul>
        {SAFETY_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
