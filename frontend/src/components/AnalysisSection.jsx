function SimilarityBadge({ similarity }) {
  if (similarity === null) {
    return <span className="similarity-badge waiting">유사도 계산 전</span>;
  }

  let toneClass = "low";
  if (similarity >= 80) toneClass = "high";
  else if (similarity >= 60) toneClass = "mid";

  return <span className={`similarity-badge ${toneClass}`}>유사도 {similarity.toFixed(1)}%</span>;
}

export default function AnalysisSection({ similarity, analysis }) {
  return (
    <section className="card analysis-card">
      <div className="result-title-row">
        <h3>이미지 분석</h3>
        <SimilarityBadge similarity={similarity} />
      </div>

      {analysis ? (
        <div className="analysis-text">
          <p>{analysis.reason}</p>
          <div className="analysis-grid">
            <div>
              <strong>가장 유사한 기준</strong>
              <span>턴어라운드 {analysis.poseIndex}번 이미지</span>
            </div>
            <div>
              <strong>부위별 색감</strong>
              <span>{analysis.colorScore.toFixed(1)}%</span>
            </div>
            <div>
              <strong>형태 유사도</strong>
              <span>{analysis.shapeScore.toFixed(1)}%</span>
            </div>
            <div>
              <strong>특징 요소</strong>
              <span>{analysis.featureScore.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="analysis-empty">
          생성 후 턴어라운드 기준 이미지들과 비교한 분석이 표시됩니다.
        </div>
      )}
    </section>
  );
}
