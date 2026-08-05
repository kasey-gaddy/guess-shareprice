import { getStore } from "@netlify/blobs";

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

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { employeeNumber, guess } = await req.json();
    const empNum = String(employeeNumber || "").trim();
    const guessNum = Number(guess);

    if (!empNum) {
      return new Response(JSON.stringify({ error: "Employee number is required." }), { status: 400 });
    }
    if (isNaN(guessNum) || guessNum < 0 || guessNum > 999.99) {
      return new Response(
        JSON.stringify({ error: "Guess must be between 00.00 and 999.99." }),
        { status: 400 }
      );
    }

    const store = getBlobStore();
    const employees = (await store.get("employees", { type: "json" })) || [];
    const employee = employees.find((e) => String(e.employeeNumber).trim() === empNum);

    if (!employee) {
      return new Response(
        JSON.stringify({ error: "Employee number not found on the eligible list." }),
        { status: 403 }
      );
    }

    const guesses = (await store.get("guesses", { type: "json" })) || [];

    if (guesses.some((g) => String(g.employeeNumber).trim() === empNum)) {
      return new Response(
        JSON.stringify({ error: "A guess has already been recorded for this employee number." }),
        { status: 409 }
      );
    }

    const rounded = Math.round(guessNum * 100) / 100;
    guesses.push({
      employeeNumber: empNum,
      name: employee.name,
      guess: rounded,
      timestamp: new Date().toISOString(),
    });

    await store.setJSON("guesses", guesses);

    return new Response(
      JSON.stringify({ success: true, guess: rounded, name: employee.name }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500 }
    );
  }
};

export const config = { path: "/api/submit-guess" };
