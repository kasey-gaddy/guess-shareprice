import { useState } from "react";
import Login from "./pages/Login";
import Guess from "./pages/Guess";
import Confirmation from "./pages/Confirmation";
import Admin from "./pages/Admin";

export default function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");
  const [employee, setEmployee] = useState(null);
  const [result, setResult] = useState(null);

  if (isAdmin) {
    return (
      <div className="page">
        <Admin />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="brand-header">
        <div className="brand-mark">BDL</div>
        <div className="brand-sub">Blue Diamond Legacy Holdings</div>
      </div>

      {!employee && <Login onSuccess={setEmployee} />}
      {employee && !result && <Guess employee={employee} onDone={setResult} />}
      {result && <Confirmation result={result} />}

      <div className="page-footer">2026 Shareholders Dinner</div>
    </div>
  );
}
