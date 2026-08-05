import { useState } from "react";
import { submitGuess } from "../api";

export default function Guess({ employee, onDone }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const parsed = Number(value);
  const isValidFormat = /^\d{1,3}(\.\d{1,2})?$/.test(value.trim());
  const isValid = isValidFormat && parsed >= 0 && parsed <= 999.99;

  const handleContinue = (e) => {
    e.preventDefault();
    if (!isValid) {
      setError("Enter a guess between 00.00 and 999.99, e.g. 42.50");
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await submitGuess(employee.employeeNumber, parsed);
      onDone(result);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="card">
        <h1>Confirm Your Guess</h1>
        <p className="subtitle">Welcome, {employee.name}</p>
        <div className="guess-preview">${parsed.toFixed(2)}</div>
        <div className="notice notice-warning">
          <p>
            Once submitted, this guess is final. You won't be able to edit
            it or guess again.
          </p>
        </div>
        {error && (
          <div className="notice notice-error">
            <p>{error}</p>
          </div>
        )}
        <div className="button-row">
          <button
            className="btn-secondary"
            onClick={() => setConfirming(false)}
            disabled={loading}
          >
            Go Back
          </button>
          <button onClick={handleConfirm} disabled={loading}>
            {loading ? "Submitting…" : "Lock In My Guess"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Guess the Share Price</h1>
      <p className="subtitle">Welcome, {employee.name}</p>

      <form onSubmit={handleContinue} className="form">
        <label htmlFor="guess">Your Guess ($00.00 &ndash; $999.99)</label>
        <input
          id="guess"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="e.g. 42.50"
          autoFocus
        />
        {error && (
          <div className="notice notice-error">
            <p>{error}</p>
          </div>
        )}
        <div className="notice notice-warning">
          <p>
            You get one guess. Once submitted, you won't be able to edit it
            or guess again.
          </p>
        </div>
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}
