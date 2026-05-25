export default function GatewayLock({
  password,
  error,
  onPasswordChange,
  onSubmit
}) {
  return (
    <main className="gateway-screen">
      <form className="gateway-panel" onSubmit={onSubmit}>
        <h1>비밀번호를 입력하세요.</h1>
        <input
          id="gateway-password"
          aria-label="비밀번호"
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
