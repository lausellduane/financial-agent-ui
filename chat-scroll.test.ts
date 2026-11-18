import assert from "node:assert/strict";
import { test } from "node:test";
import { isNearBottom, nextForceScrollFlag, shouldAutoScroll } from "./chat-scroll.ts";

test("shouldAutoScroll forces a scroll on user send even when not near the bottom", () => {
  assert.equal(
    shouldAutoScroll({
      force: true,
      appended: true,
      contentGrew: false,
      nearBottom: false,
    }),
    true,
  );
  assert.equal(
    shouldAutoScroll({
      force: false,
      appended: true,
      contentGrew: false,
      nearBottom: false,
    }),
    false,
  );
});

test("shouldAutoScroll follows incoming replies and content growth only when near the bottom", () => {
  assert.equal(
    shouldAutoScroll({
      force: false,
      appended: true,
      contentGrew: false,
      nearBottom: true,
    }),
    true,
  );
  assert.equal(
    shouldAutoScroll({
      force: false,
      appended: false,
      contentGrew: true,
      nearBottom: true,
    }),
    true,
  );
  assert.equal(
    shouldAutoScroll({
      force: false,
      appended: false,
      contentGrew: true,
      nearBottom: false,
    }),
    false,
  );
  assert.equal(
    shouldAutoScroll({
      force: true,
      appended: false,
      contentGrew: true,
      nearBottom: false,
    }),
    true,
  );
  assert.equal(
    shouldAutoScroll({
      force: false,
      appended: false,
      contentGrew: false,
      nearBottom: true,
    }),
    false,
  );
});

test("isNearBottom uses an 80px threshold and an unmeasured fallback", () => {
  assert.equal(isNearBottom(1000, 920, 80, false), true);
  assert.equal(isNearBottom(1000, 800, 80, false), false);
  assert.equal(isNearBottom(1000, 0, 0, true), true);
  assert.equal(isNearBottom(1000, 0, 0, false), false);
});

test("force-scroll flag stays set until content is applied, and clears on a layout switch", () => {
  assert.equal(nextForceScrollFlag(false, "send"), true);
  assert.equal(nextForceScrollFlag(true, "send"), true);
  assert.equal(nextForceScrollFlag(true, "content-applied"), false);
  assert.equal(nextForceScrollFlag(false, "content-applied"), false);
  assert.equal(nextForceScrollFlag(true, "layout-switch"), false);
  assert.equal(nextForceScrollFlag(false, "layout-switch"), false);
});
