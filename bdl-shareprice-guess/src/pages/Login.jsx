import { useState } from "react";
import { login } from "../api";

const LATE_REG_EMAIL =
  "mailto:kgaddy@kegtus.com,kamstutz@kegtus.com?subject=" +
  encodeURIComponent("Late Registration to 2026 Shareholders") +
  "&body=" +
  encodeURIComponent(
    "Name: \nEmployee Number: \nGuest Name (if bringing one): \n"
  );

export default function Login({ onSuccess }) {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [status, setStatus] = useState(null); // null | "not-found" | "already" | "error"
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeNumber.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const data = await login(employeeNumber.trim());
      if (!data.eligible) {
        setStatus("not-found");
      } else if (data.alreadyGuessed) {
        setStatus("already");
      } else {
        onSuccess({ employeeNumber: employeeNumber.trim(), name: data.name });
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>Guess the Share Price</h1>
      <p className="subtitle">2026 Shareholders Dinner &middot; Closest guess wins $500</p>

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="empNum">Employee Number</label>
        <input
          id="empNum"
          type="text"
          inputMode="numeric"
          value={employeeNumber}
          onChange={(e) => {
            setEmployeeNumber(e.target.value);
            setStatus(null);
          }}
          placeholder="Enter your employee number"
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? "Checking…" : "Log In"}
        </button>
      </form>

      {status === "not-found" && (
        <div className="notice notice-warning">
          <p>
            We don't see this employee number on the list for this year's
            Shareholders Dinner, so we're not able to record a guess.
          </p>
          <p>
            If you'd like to attend, reach out to Kasey Gaddy or Kelly
            Amstutz to register. Be sure to include your name, employee
            number, and your guest's name if you're bringing one.
          </p>
          <a className="btn-link" href={LATE_REG_EMAIL}>
            Email Kasey &amp; Kelly to Register
          </a>
        </div>
      )}

      {status === "already" && (
        <div className="notice notice-info">
          <p>
            We already have a recorded guess for employee number{" "}
            {employeeNumber.trim()}.
          </p>
          <p>
            Each employee gets one guess. If you think this is an error,
            contact Kasey Gaddy.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="notice notice-error">
          <p>Something went wrong. Please try again in a moment.</p>
        </div>
      )}
    </div>
  );
}
