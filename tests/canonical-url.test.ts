import assert from "node:assert/strict";
import test from "node:test";
import { canonicalConclaveUrl } from "../lib/canonical-url.ts";

test("production Vercel requests return to the Conclave custom domain", () => {
  const result = canonicalConclaveUrl({
    host: "conclave-aaronlay10s-projects.vercel.app",
    pathname: "/auth/complete",
    search: "?code=oauth-code&next=%2Fdashboard",
    isProduction: true
  });
  assert.equal(result?.toString(), "https://conclave.drunstan.com/auth/complete?code=oauth-code&next=%2Fdashboard");
});

test("custom-domain and non-production requests do not redirect", () => {
  assert.equal(canonicalConclaveUrl({ host: "conclave.drunstan.com", pathname: "/dashboard", search: "", isProduction: true }), null);
  assert.equal(canonicalConclaveUrl({ host: "localhost:3000", pathname: "/dashboard", search: "", isProduction: false }), null);
});
