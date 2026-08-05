import { useState, useMemo } from "react";
import { adminRequest } from "../api";

function bucketLabel(value, size) {
  const start = Math.floor(value / size) * size;
  const end = start + size;
  return `$${start.toFixed(2)} \u2013 $${end.toFixed(2)}`;
}

function bucketSortKey(label) {
  const n = parseFloat(label.replace("$", ""));
  return n;
}

function downloadCSV(csvText, filename) {
  const blob = new Blob([csvText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [employees, setEmployees] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [bucketSize, setBucketSize] = useState(5);

  const [addRows, setAddRows] = useState([
    { employeeNumber: "", name: "", guestName: "" },
    { employeeNumber: "", name: "", guestName: "" },
  ]);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const [wiping, setWiping] = useState(false);

  const WIPE_PHRASE = "WIPE FOR NEXT YEAR";

  const refresh = async (pw = password) => {
    setLoading(true);
    try {
      const data = await adminRequest(pw, "stats", {});
      setEmployees(data.employees);
      setGuesses(data.guesses);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const data = await adminRequest(password, "stats", {});
      setEmployees(data.employees);
      setGuesses(data.guesses);
      setAuthed(true);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalEligible = employees.length;
  const totalVoted = guesses.length;
  const pctVoted = totalEligible ? Math.round((totalVoted / totalEligible) * 100) : 0;

  const buckets = useMemo(() => {
    const map = {};
    guesses.forEach((g) => {
      const label = bucketLabel(Number(g.guess), bucketSize);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => bucketSortKey(a.label) - bucketSortKey(b.label));
  }, [guesses, bucketSize]);

  const mostCommon = useMemo(() => {
    if (!buckets.length) return null;
    return buckets.reduce((max, b) => (b.count > max.count ? b : max), buckets[0]);
  }, [buckets]);

  const maxBucketCount = Math.max(1, ...buckets.map((b) => b.count));

  const handleExportGuesses = async () => {
    try {
      const csv = await adminRequest(password, "exportGuessesCSV", {});
      downloadCSV(csv, "shareprice-guesses.csv");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleExportEmployees = async () => {
    try {
      const csv = await adminRequest(password, "exportEmployeesCSV", {});
      downloadCSV(csv, "shareprice-employees.csv");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleAddRowChange = (idx, field, value) => {
    setAddRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleAddAnotherRow = () => {
    setAddRows((rows) => [...rows, { employeeNumber: "", name: "", guestName: "" }]);
  };

  const handleAddEmployees = async () => {
    const valid = addRows.filter((r) => r.employeeNumber.trim() && r.name.trim());
    if (!valid.length) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await adminRequest(password, "addEmployees", { employees: valid });
      setMessage({
        type: result.duplicates.length ? "warning" : "success",
        text:
          `Added ${result.added.length} employee(s).` +
          (result.duplicates.length
            ? ` Skipped duplicate employee number(s): ${result.duplicates.join(", ")}.`
            : ""),
      });
      setAddRows([
        { employeeNumber: "", name: "", guestName: "" },
        { employeeNumber: "", name: "", guestName: "" },
      ]);
      await refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const parseImportText = (text) => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [employeeNumber, name, guestName] = line.split(",").map((s) => (s || "").trim());
        return { employeeNumber, name, guestName: guestName || "" };
      });
  };

  const handleImport = async () => {
    const rows = parseImportText(importText);
    if (!rows.length) return;
    setLoading(true);
    setMessage(null);
    setImportResult(null);
    try {
      const result = await adminRequest(password, "importEmployees", { rows });
      setImportResult(result);
      await refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setImportText(evt.target.result);
    reader.readAsText(file);
  };

  const handleWipeForNextYear = async () => {
    if (wipeConfirmText.trim() !== WIPE_PHRASE) return;
    if (
      !confirm(
        "This permanently deletes every employee and every guess currently stored. This cannot be undone. Continue?"
      )
    ) {
      return;
    }
    setWiping(true);
    setMessage(null);
    try {
      await adminRequest(password, "wipeForNextYear", { confirm: wipeConfirmText.trim() });
      setMessage({
        type: "success",
        text: "Everything has been wiped. The app is reset and ready for next year's employee list and guesses.",
      });
      setWipeConfirmText("");
      await refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setWiping(false);
    }
  };

  const handleDelete = async (employeeNumber) => {
    if (!confirm(`Remove employee number ${employeeNumber} from the eligible list?`)) return;
    setLoading(true);
    try {
      await adminRequest(password, "deleteEmployee", { employeeNumber });
      await refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return (
      <div className="card">
        <h1>Admin Login</h1>
        <form onSubmit={handleLogin} className="form">
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {authError && (
            <div className="notice notice-error">
              <p>{authError}</p>
            </div>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Checking…" : "Log In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>Share Price Guess &mdash; Admin</h1>
        <button className="btn-secondary" onClick={() => refresh()} disabled={loading}>
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`notice notice-${
            message.type === "error" ? "error" : message.type === "warning" ? "warning" : "success"
          }`}
        >
          <p>{message.text}</p>
        </div>
      )}

      <div className="admin-tabs">
        {["overview", "guesses", "employees"].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "overview" ? "Overview" : t === "guesses" ? "Guesses" : "Employees"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-label">Eligible Employees</div>
              <div className="stat-value">{totalEligible}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Guesses Submitted</div>
              <div className="stat-value">{totalVoted}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Participation</div>
              <div className="stat-value">{pctVoted}%</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Most Common Range</div>
              <div className="stat-value stat-value-sm">{mostCommon ? mostCommon.label : "—"}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Guess Distribution</h2>
              <div className="bucket-control">
                <label htmlFor="bucketSize">Group by $</label>
                <select
                  id="bucketSize"
                  value={bucketSize}
                  onChange={(e) => setBucketSize(Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
            </div>
            {buckets.length === 0 && <p className="empty-text">No guesses yet.</p>}
            {buckets.map((b) => (
              <div key={b.label} className="bar-row">
                <div className="bar-label">{b.label}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(b.count / maxBucketCount) * 100}%` }}
                  />
                </div>
                <div className="bar-count">{b.count}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>Export</h2>
            <div className="button-row">
              <button onClick={handleExportGuesses}>Export All Guesses (CSV)</button>
              <button className="btn-secondary" onClick={handleExportEmployees}>
                Export Employee List (CSV)
              </button>
            </div>
            <p className="helper-text" style={{ marginTop: 10 }}>
              Export both lists before wiping below if you want a record of this year's data.
            </p>
          </div>

          <div className="panel danger-zone">
            <h2>Wipe for Next Year</h2>
            <p className="helper-text">
              Permanently deletes the entire employee list and every submitted guess, so the app
              is a clean slate for next year's dinner. This cannot be undone &mdash; export your
              CSVs above first if you want to keep a copy of this year's results.
            </p>
            <label htmlFor="wipeConfirm">
              Type <strong>{WIPE_PHRASE}</strong> to enable the button
            </label>
            <input
              id="wipeConfirm"
              type="text"
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder={WIPE_PHRASE}
            />
            <div className="button-row">
              <button
                className="btn-danger"
                style={{ padding: "13px 20px", fontSize: 15 }}
                onClick={handleWipeForNextYear}
                disabled={wiping || wipeConfirmText.trim() !== WIPE_PHRASE}
              >
                {wiping ? "Wiping…" : "Wipe Everything"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "guesses" && (
        <div className="panel">
          <h2>All Guesses ({guesses.length})</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee #</th>
                  <th>Name</th>
                  <th>Guess</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {[...guesses]
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                  .map((g) => (
                    <tr key={g.employeeNumber}>
                      <td>{g.employeeNumber}</td>
                      <td>{g.name}</td>
                      <td>${Number(g.guess).toFixed(2)}</td>
                      <td>{new Date(g.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                {guesses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-text">
                      No guesses yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "employees" && (
        <div>
          <div className="panel">
            <h2>Add Employees</h2>
            {addRows.map((row, idx) => (
              <div key={idx} className="add-row">
                <input
                  placeholder="Employee #"
                  value={row.employeeNumber}
                  onChange={(e) => handleAddRowChange(idx, "employeeNumber", e.target.value)}
                />
                <input
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) => handleAddRowChange(idx, "name", e.target.value)}
                />
                <input
                  placeholder="Guest Name (optional)"
                  value={row.guestName}
                  onChange={(e) => handleAddRowChange(idx, "guestName", e.target.value)}
                />
              </div>
            ))}
            <div className="button-row">
              <button className="btn-secondary" onClick={handleAddAnotherRow}>
                + Add Another Row
              </button>
              <button onClick={handleAddEmployees} disabled={loading}>
                Save Employees
              </button>
            </div>
          </div>

          <div className="panel">
            <h2>Mass Import</h2>
            <p className="helper-text">
              Paste CSV rows (Employee #, Name, Guest Name) &mdash; one per line, no header row
              &mdash; or upload a .csv file. Duplicates against the existing list or within the
              same import are automatically skipped and called out below.
            </p>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} />
            <textarea
              rows={8}
              placeholder={"2970,Kasey Gaddy,\n1500,Rob Zedaker,Jane Doe"}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="button-row">
              <button onClick={handleImport} disabled={loading}>
                Import
              </button>
            </div>
            {importResult && (
              <div
                className={`notice ${importResult.totalDuplicates ? "notice-warning" : "notice-success"}`}
              >
                <p>Imported {importResult.totalAdded} employee(s).</p>
                {importResult.totalDuplicates > 0 && (
                  <p>
                    Skipped {importResult.totalDuplicates} duplicate employee number(s):{" "}
                    {importResult.duplicates.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Eligible Employees ({employees.length})</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee #</th>
                    <th>Name</th>
                    <th>Guest</th>
                    <th>Guessed?</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const g = guesses.find(
                      (g) => String(g.employeeNumber) === String(e.employeeNumber)
                    );
                    return (
                      <tr key={e.employeeNumber}>
                        <td>{e.employeeNumber}</td>
                        <td>{e.name}</td>
                        <td>{e.guestName || "—"}</td>
                        <td>{g ? `Yes ($${Number(g.guess).toFixed(2)})` : "No"}</td>
                        <td>
                          <button
                            className="btn-danger"
                            onClick={() => handleDelete(e.employeeNumber)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-text">
                        No employees loaded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
