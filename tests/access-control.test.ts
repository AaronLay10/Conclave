import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPage, type AppRole } from "../lib/access-control.ts";

const commonPages = ["/dashboard", "/calendar", "/events", "/events/event-id"];

test("all authenticated roles can open member-facing pages", () => {
  const roles: AppRole[] = ["event_director", "council", "alliance_lead", "viewer"];
  roles.forEach((role) => commonPages.forEach((page) => assert.equal(canAccessPage(role, page), true)));
});

test("only leadership roles can open Alliance Activity", () => {
  assert.equal(canAccessPage("event_director", "/activity"), true);
  assert.equal(canAccessPage("council", "/activity"), true);
  assert.equal(canAccessPage("alliance_lead", "/activity"), true);
  assert.equal(canAccessPage("viewer", "/activity"), false);
});

test("Event Director-only operational pages stay restricted", () => {
  const directorPages = ["/settings", "/predictions", "/events/import", "/events/new", "/events/event-id/edit"];
  directorPages.forEach((page) => {
    assert.equal(canAccessPage("event_director", page), true);
    assert.equal(canAccessPage("council", page), false);
    assert.equal(canAccessPage("alliance_lead", page), false);
    assert.equal(canAccessPage("viewer", page), false);
  });
});

test("unknown pages default to denied", () => {
  assert.equal(canAccessPage("event_director", "/future-admin-page"), false);
  assert.equal(canAccessPage(null, "/dashboard"), false);
});
