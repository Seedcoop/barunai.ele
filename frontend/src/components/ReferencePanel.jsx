export default function ReferencePanel({ reference }) {
  return (
    <section className="card reference-card">
      <h3>기준 이미지</h3>
      <div className="turnaround-preview">
        <img src={reference.src} alt="턴어라운드 기준 이미지" />
      </div>
    </section>
  );
}
