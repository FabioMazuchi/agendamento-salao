export default function Loading({ text = "Carregando…", inline = false }) {
  return (
    <div
      className={inline ? "loading inline" : "loading"}
      role="status"
      aria-live="polite"
    >
      <span className="spinner" aria-hidden="true"></span>
      <span>{text}</span>
    </div>
  );
}
