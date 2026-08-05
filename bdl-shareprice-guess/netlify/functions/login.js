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
    const { employeeNumber } = await req.json();
    const empNum = String(employeeNumber || "").trim();

    if (!empNum) {
      return new Response(JSON.stringify({ error: "Employee number is required." }), { status: 400 });
    }

    const store = getBlobStore();
    const employees = (await store.get("employees", { type: "json" })) || [];
    const guesses = (await store.get("guesses", { type: "json" })) || [];

    const employee = employees.find((e) => String(e.employeeNumber).trim() === empNum);
    if (!employee) {
      return new Response(JSON.stringify({ eligible: false }), { status: 200 });
    }

    const alreadyGuessed = guesses.some((g) => String(g.employeeNumber).trim() === empNum);

    return new Response(
      JSON.stringify({ eligible: true, alreadyGuessed, name: employee.name }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500 }
    );
  }
};

export const config = { path: "/api/login" };
