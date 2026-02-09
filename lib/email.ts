import "server-only";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

const RESEND_API_ENDPOINT = "https://api.resend.com/emails";

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

export function isEmailSendingConfigured() {
  return getEmailConfig() !== null;
}

export async function sendTransactionalEmail({
  to,
  subject,
  text,
  replyTo,
}: SendEmailInput): Promise<SendEmailResult> {
  const config = getEmailConfig();
  if (!config) {
    return {
      ok: false,
      error: "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  try {
    const response = await fetch(RESEND_API_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; error?: { message?: string } }
      | null;

    if (!response.ok) {
      const errorMessage =
        payload?.message ??
        payload?.error?.message ??
        "Email provider rejected the request.";
      return {
        ok: false,
        error: `Failed to send email: ${errorMessage}`,
      };
    }

    return {
      ok: true,
      id: typeof payload?.id === "string" ? payload.id : null,
    };
  } catch {
    return {
      ok: false,
      error: "Failed to send email due to a network error.",
    };
  }
}

