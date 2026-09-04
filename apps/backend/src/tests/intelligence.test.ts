import test from "node:test";
import assert from "node:assert/strict";
import { estimateUrbanRoute, haversineDistanceKm } from "../utils/geo";
import { ALLOWED_STATUS_TRANSITIONS } from "../validators/project.validators";
import { ProjectStatus } from "../models/Project";

test("haversine distance is zero for identical coordinates", () => {
  assert.equal(haversineDistanceKm({ latitude: 28.6, longitude: 77.2 }, { latitude: 28.6, longitude: 77.2 }), 0);
});

test("route estimate is positive and slower than straight-line travel", () => {
  const result = estimateUrbanRoute(10);
  assert.ok(result.roadKm > 10);
  assert.ok(result.etaMinutes >= 4);
});

test("project workflow cannot skip directly from new to completed", () => {
  assert.equal(ALLOWED_STATUS_TRANSITIONS[ProjectStatus.NEW].includes(ProjectStatus.COMPLETED), false);
  assert.equal(ALLOWED_STATUS_TRANSITIONS[ProjectStatus.IN_PROGRESS].includes(ProjectStatus.COMPLETED), true);
});
