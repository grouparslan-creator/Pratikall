export const INTERNAL_USER_EMAIL_HEADER = "x-pratikall-authenticated-user-email";
export const INTERNAL_USER_ID_HEADER = "x-pratikall-authenticated-user-id";
export const INTERNAL_USER_FULL_NAME_HEADER = "x-pratikall-authenticated-user-full-name";
export const INTERNAL_USER_FULL_NAME_ENCODING_HEADER =
  "x-pratikall-authenticated-user-full-name-encoding";

export function authenticatedUserFromHeaders(requestHeaders: Headers) {
  const email = requestHeaders.get(INTERNAL_USER_EMAIL_HEADER)?.trim().toLowerCase() ?? "";
  if (!email) return null;

  return {
    email,
    userId: requestHeaders.get(INTERNAL_USER_ID_HEADER)?.trim() || null,
    encodedFullName: requestHeaders.get(INTERNAL_USER_FULL_NAME_HEADER),
    fullNameEncoding: requestHeaders.get(INTERNAL_USER_FULL_NAME_ENCODING_HEADER),
  };
}

export function identityFromHeaders(requestHeaders: Headers) {
  const user = authenticatedUserFromHeaders(requestHeaders);
  return {
    key: user?.email ?? "site-owner",
    displayName: user?.email ?? "",
  };
}
