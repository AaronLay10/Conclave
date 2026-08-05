import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPage, type AppRole } from "../lib/access-control.ts";

const commonPages = ["/dashboard", "/calendar", "/events/event-id"];

test("all authenticated roles can open member-facing pages", () => {
  const roles: AppRole[] = ["event_director", "council", "alliance_lead", "alliance_r4", "alliance_r5", "viewer"];
  roles.forEach((role) => commonPages.forEach((page) => assert.equal(canAccessPage(role, page), true)));
});

test("legacy Events index remains accessible for its redirect to Calendar", () => {
  const roles: AppRole[] = ["event_director", "council", "alliance_lead", "alliance_r4", "alliance_r5", "viewer"];
  roles.forEach((role) => assert.equal(canAccessPage(role, "/events"), true));
});

test("only leadership roles can open Alliance Activity", () => {
  assert.equal(canAccessPage("event_director", "/activity"), true);
  assert.equal(canAccessPage("council", "/activity"), true);
  assert.equal(canAccessPage("alliance_lead", "/activity"), true);
  assert.equal(canAccessPage("alliance_r4", "/activity"), true);
  assert.equal(canAccessPage("alliance_r5", "/activity"), true);
  assert.equal(canAccessPage("viewer", "/activity"), false);
});

test("Event Director-only operational pages stay restricted", () => {
  const directorPages = ["/settings", "/events/import", "/events/new", "/events/event-id/edit", "/activity/import"];
  directorPages.forEach((page) => {
    assert.equal(canAccessPage("event_director", page), true);
    assert.equal(canAccessPage("council", page), false);
    assert.equal(canAccessPage("alliance_lead", page), false);
    assert.equal(canAccessPage("alliance_r4", page), false);
    assert.equal(canAccessPage("alliance_r5", page), false);
    assert.equal(canAccessPage("viewer", page), false);
  });
});

test("retired Predictions route is denied", () => {
  const roles: AppRole[] = ["event_director", "council", "alliance_lead", "alliance_r4", "alliance_r5", "viewer"];
  roles.forEach((role) => assert.equal(canAccessPage(role, "/predictions"), false));
});

test("unknown pages default to denied", () => {
  assert.equal(canAccessPage("event_director", "/future-admin-page"), false);
  assert.equal(canAccessPage(null, "/dashboard"), false);
});
