export default function GenerateButton({ disabled, isLoading, onClick }) {
  return (
    <button className="generate-btn" disabled={disabled || isLoading} onClick={onClick}>
      {isLoading ? "이미지 생성 중..." : "안전 검사 후 이미지 생성"}
    </button>
  );
}
