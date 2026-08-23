import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERNAL_USER_EMAIL_HEADER,
  authenticatedUserFromHeaders,
  identityFromHeaders,
} from "../app/lib/platform-identity.ts";

test("resolves the verified owner email as its exact owner key", () => {
  const identity = identityFromHeaders(new Headers({
    [INTERNAL_USER_EMAIL_HEADER]: "grouparslan@gmail.com",
  }));
  assert.equal(identity.key, "grouparslan@gmail.com");
});

test("keeps another verified user isolated under their own email", () => {
  const identity = identityFromHeaders(new Headers({
    [INTERNAL_USER_EMAIL_HEADER]: "arslanomerfaruk@gmail.com",
  }));
  assert.equal(identity.key, "arslanomerfaruk@gmail.com");
});

test("does not trust a client-supplied platform email header", () => {
  const identity = authenticatedUserFromHeaders(new Headers({
    "oai-authenticated-user-email": "grouparslan@gmail.com",
  }));
  assert.equal(identity, null);
});
