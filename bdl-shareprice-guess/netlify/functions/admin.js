import { getStore } from "@netlify/blobs";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "K3&GM@rketing";

function getBlobStore() {
  try {
    return getStore("bdl-shareprice");
  } catch (e) {
    return getStore({
      name: "bdl-shareprice",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN,
    });
  }
}

function toCSV(rows, headers) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => esc(r[h])).join(",")));
  return lines.join("\n");
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { password, action, payload = {} } = body;
  if (password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Incorrect password." }), { status: 401 });
  }

  const store = getBlobStore();

  try {
    switch (action) {
      case "stats": {
        const employees = (await store.get("employees", { type: "json" })) || [];
        const guesses = (await store.get("guesses", { type: "json" })) || [];
        return new Response(JSON.stringify({ employees, guesses }), { status: 200 });
      }

      case "addEmployees": {
        const employees = (await store.get("employees", { type: "json" })) || [];
        const newOnes = (payload.employees || []).map((e) => ({
          employeeNumber: String(e.employeeNumber).trim(),
          name: (e.name || "").trim(),
          guestName: (e.guestName || "").trim(),
        }));

        const duplicates = [];
        const added = [];
        newOnes.forEach((n) => {
          if (!n.employeeNumber || !n.name) return;
          if (employees.some((e) => String(e.employeeNumber).trim() === n.employeeNumber)) {
            duplicates.push(n.employeeNumber);
          } else {
            employees.push(n);
            added.push(n.employeeNumber);
          }
        });

        await store.setJSON("employees", employees);
        return new Response(JSON.stringify({ added, duplicates }), { status: 200 });
      }

      case "importEmployees": {
        const employees = (await store.get("employees", { type: "json" })) || [];
        const rows = payload.rows || [];
        const duplicates = [];
        const added = [];
        const seenInBatch = new Set();

        rows.forEach((r) => {
          const empNum = String(r.employeeNumber || "").trim();
          const name = (r.name || "").trim();
          const guestName = (r.guestName || "").trim();
          if (!empNum || !name) return;

          const existsAlready = employees.some((e) => String(e.employeeNumber).trim() === empNum);
          if (existsAlready || seenInBatch.has(empNum)) {
            duplicates.push(empNum);
            return;
          }
          seenInBatch.add(empNum);
          employees.push({ employeeNumber: empNum, name, guestName });
          added.push(empNum);
        });

        await store.setJSON("employees", employees);
        return new Response(
          JSON.stringify({
            added,
            duplicates,
            totalAdded: added.length,
            totalDuplicates: duplicates.length,
          }),
          { status: 200 }
        );
      }

      case "deleteEmployee": {
        let employees = (await store.get("employees", { type: "json" })) || [];
        const empNum = String(payload.employeeNumber || "").trim();
        employees = employees.filter((e) => String(e.employeeNumber).trim() !== empNum);
        await store.setJSON("employees", employees);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      case "exportGuessesCSV": {
        const guesses = (await store.get("guesses", { type: "json" })) || [];
        const csv = toCSV(guesses, ["employeeNumber", "name", "guess", "timestamp"]);
        return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv" } });
      }

      case "exportEmployeesCSV": {
        const employees = (await store.get("employees", { type: "json" })) || [];
        const csv = toCSV(employees, ["employeeNumber", "name", "guestName"]);
        return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv" } });
      }

      case "resetGuesses": {
        // Safety valve for dry-run testing before the real event. Clears guesses only.
        await store.setJSON("guesses", []);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      case "wipeForNextYear": {
        // Full reset for reuse at next year's dinner: clears BOTH the
        // employee list and all guesses. Requires the literal confirmation
        // phrase so it can't be triggered by a stray click.
        if (payload.confirm !== "WIPE FOR NEXT YEAR") {
          return new Response(
            JSON.stringify({ error: "Confirmation phrase did not match. Nothing was wiped." }),
            { status: 400 }
          );
        }
        await store.setJSON("employees", []);
        await store.setJSON("guesses", []);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action." }), { status: 400 });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500 }
    );
  }
};

export const config = { path: "/api/admin" };
