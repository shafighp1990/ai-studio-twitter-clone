const messages: Record<string, string> = {
  "Current password is incorrect": "رمز فعلی درست نیست. آخرین رمز موقت را وارد کن.",
  "Sign in required": "نشست ورود پایان یافته است. دوباره وارد حساب شو.",
  "Sign in again": "دوباره وارد حساب شو و تغییر رمز را انجام بده.",
  "Verify your authenticator first": "ابتدا کد ورود دومرحله‌ای را تأیید کن.",
  "Use a different password, 12–72 bytes long": "یک رمز متفاوت با حداقل ۱۲ کاراکتر و حداکثر ۷۲ بایت انتخاب کن.",
  "Invalid origin": "صفحه را تازه کن و دوباره تلاش کن.",
};

export async function submitPasswordChange(currentPassword: string, newPassword: string) {
  let response: Response;
  try {
    response = await fetch("/api/auth/change-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    throw new Error("ارتباط با سایت برقرار نشد. اتصال را بررسی کن و دوباره تلاش کن.");
  }
  let result: { data?: { redirect?: string }; error?: { message?: string } } | null;
  try {
    result = await response.json();
  } catch {
    throw new Error(`پاسخ سرور قابل خواندن نبود (کد ${response.status}). صفحه را تازه کن و دوباره تلاش کن.`);
  }
  if (!response.ok || result?.error) {
    const message = result?.error?.message ?? "";
    throw new Error(messages[message] ?? (response.status === 429
      ? "تعداد تلاش‌ها زیاد شده است. پنج دقیقه صبر کن و دوباره تلاش کن."
      : `تغییر رمز انجام نشد (کد ${response.status}). دوباره تلاش کن.`));
  }
  // Only accept the two destinations returned by the password-change endpoint.
  const redirect = result?.data?.redirect;
  if (redirect !== "/" && redirect !== "/admin") {
    throw new Error("پاسخ ذخیرهٔ رمز کامل نبود. دوباره وارد حساب شو و وضعیت را بررسی کن.");
  }
  return redirect;
}
