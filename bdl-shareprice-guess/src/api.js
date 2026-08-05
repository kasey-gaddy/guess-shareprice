export async function login(employeeNumber) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeNumber }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export async function submitGuess(employeeNumber, guess) {
  const res = await fetch("/api/submit-guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeNumber, guess }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export async function adminRequest(password, action, payload) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action, payload }),
  });

  const contentType = res.headers.get("Content-Type") || "";

  if (!res.ok) {
    let errText = "Request failed.";
    try {
      const data = await res.json();
      errText = data.error || errText;
    } catch {
      /* ignore */
    }
    throw new Error(errText);
  }

  if (contentType.includes("text/csv")) {
    return res.text();
  }
  return res.json();
}
