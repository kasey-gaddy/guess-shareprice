export default function Confirmation({ result }) {
  return (
    <div className="card">
      <h1>You're Locked In</h1>
      <p className="subtitle">Thanks, {result.name}</p>
      <div className="guess-preview">${result.guess.toFixed(2)}</div>
      <p className="confirmation-text">
        Your guess has been recorded. Good luck &mdash; we'll announce the
        winner at the dinner.
      </p>
    </div>
  );
}
