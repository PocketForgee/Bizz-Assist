// Runs once when the Next server starts: apply the schema before serving traffic.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { applySchema } = await import("./lib/db");
  try {
    await applySchema();
    console.log("[db] schema applied");
  } catch (err) {
    // Fail loudly: a server without its tables only produces confusing 500s.
    console.error("[db] schema apply failed", err);
    throw err;
  }
}
