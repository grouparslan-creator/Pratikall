import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthConfig, setSupabaseSession } from "@/app/lib/supabase-session";

type SignupError = { code?: string | number; error_code?: string | number; msg?: unknown; message?: unknown };

function signupErrorCode(error: SignupError) {
  const code = String(error.code ?? error.error_code ?? "").toLowerCase();
  const message = String(error.msg ?? error.message ?? "").toLowerCase();
  if (code.includes("over_email_send_rate_limit") || message.includes("rate limit")) return "rate_limit";
  if (code.includes("signup_disabled") || message.includes("signups not allowed")) return "disabled";
  if (
    code.includes("user_already_exists") ||
    code === "23505" ||
    message.includes("already registered") ||
    message.includes("duplicate key")
  ) return "exists";
  if (code.includes("weak_password") || message.includes("password")) return "password";
  return "signup";
}

function loginRedirect(request: NextRequest, params: Record<string, string>) {
  const target = new URL("/login", request.url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const passwordConfirm = String(form.get("password_confirm") ?? "");
  const fullName = String(form.get("full_name") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 20);
  const accountType = form.get("account_type") === "business" ? "business" : "personal";
  const companyName = String(form.get("company_name") ?? "").trim().slice(0, 150);
  const taxNumber = String(form.get("tax_number") ?? "").replace(/\D/g, "").slice(0, 11);
  const taxOffice = String(form.get("tax_office") ?? "").trim().slice(0, 100);
  const billingCity = String(form.get("billing_city") ?? "").trim().slice(0, 60);
  const billingDistrict = String(form.get("billing_district") ?? "").trim().slice(0, 60);
  const billingAddress = String(form.get("billing_address") ?? "").trim().slice(0, 300);
  const { url, key } = getSupabaseAuthConfig();
  if (!url || !key) return loginRedirect(request, { error: "config" });
  if (!email) return loginRedirect(request, { error: "email" });
  if (fullName.length < 3) return loginRedirect(request, { error: "name" });
  if (phone.replace(/\D/g, "").length < 10) return loginRedirect(request, { error: "phone" });
  if (password.length < 8) return loginRedirect(request, { error: "password" });
  if (password !== passwordConfirm) return loginRedirect(request, { error: "password_match" });
  if (form.get("terms_accepted") !== "yes") return loginRedirect(request, { error: "terms" });
  if (accountType === "business" && !companyName) return loginRedirect(request, { error: "company" });
  if (accountType === "business" && !/^\d{10,11}$/.test(taxNumber)) return loginRedirect(request, { error: "tax_number" });
  if (accountType === "business" && (!taxOffice || !billingCity || !billingDistrict || !billingAddress)) {
    return loginRedirect(request, { error: "billing" });
  }

  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: fullName,
          phone,
          account_type: accountType,
          ...(accountType === "business" ? {
            company_name: companyName,
            tax_number: taxNumber,
            tax_office: taxOffice,
            billing_city: billingCity,
            billing_district: billingDistrict,
            billing_address: billingAddress,
          } : {}),
        },
      }),
      cache: "no-store",
    });
  } catch {
    return loginRedirect(request, { error: "unavailable" });
  }

  const data = (await response.json().catch(() => ({}))) as SignupError & {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!response.ok) return loginRedirect(request, { error: signupErrorCode(data) });
  if (data.access_token && data.refresh_token) {
    await setSupabaseSession(data.access_token, data.refresh_token, data.expires_in ?? 3600);
    return NextResponse.redirect(new URL("/app", request.url), 303);
  }
  return NextResponse.redirect(new URL("/verify-email?created=1", request.url), 303);
}
