export default function GatewayLock({
  password,
  error,
  onPasswordChange,
  onSubmit
}) {
  return (
    <main className="gateway-screen">
      <form className="gateway-panel" onSubmit={onSubmit}>
        <div className="gateway-badge">Kyobo AI Studio</div>
        <h1>접속 비밀번호</h1>
        <p>수업용 페이지입니다. 비밀번호를 입력하면 웹앱이 열립니다.</p>

        <label htmlFor="gateway-password">비밀번호</label>
        <input
          id="gateway-password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          autoComplete="current-password"
          autoFocus
        />

        {error && <div className="gateway-error">{error}</div>}

        <button className="gateway-button" type="submit">
          열기
        </button>
      </form>
    </main>
  );
}
