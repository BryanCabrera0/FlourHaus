import "server-only";

import { isEmailSendingConfigured, sendTransactionalEmail } from "@/lib/email";

// Email-to-SMS carrier gateways. Sends a short email to <phone>@<gateway>
// which arrives as a text message via the existing Resend integration.
export const SMS_CARRIERS: Record<string, { label: string; gateway: string }> =
  {
    att: { label: "AT&T", gateway: "txt.att.net" },
    tmobile: { label: "T-Mobile", gateway: "tmomail.net" },
    verizon: { label: "Verizon", gateway: "vtext.com" },
    sprint: { label: "Sprint", gateway: "messaging.sprintpcs.com" },
    uscellular: { label: "US Cellular", gateway: "email.uscc.net" },
    boost: { label: "Boost Mobile", gateway: "sms.myboostmobile.com" },
    cricket: { label: "Cricket", gateway: "sms.cricketwireless.net" },
    metro: { label: "Metro by T-Mobile", gateway: "mymetropcs.com" },
    google_fi: { label: "Google Fi", gateway: "msg.fi.google.com" },
    xfinity: { label: "Xfinity Mobile", gateway: "vtext.com" },
    visible: { label: "Visible", gateway: "vtext.com" },
    mint: { label: "Mint Mobile", gateway: "tmomail.net" },
  };

type SendSmsResult =
  | { ok: true }
  | { ok: false; error: string };

export function isSmsSendingConfigured(): boolean {
  return isEmailSendingConfigured();
}

export function isValidCarrier(carrier: string): boolean {
  return carrier in SMS_CARRIERS;
}

export async function sendSms({
  phone,
  carrier,
  body,
}: {
  phone: string;
  carrier: string;
  body: string;
}): Promise<SendSmsResult> {
  const entry = SMS_CARRIERS[carrier];
  if (!entry) {
    return { ok: false, error: `Unknown carrier: ${carrier}` };
  }

  const to = `${phone}@${entry.gateway}`;

  const result = await sendTransactionalEmail({
    to,
    subject: "",
    text: body,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
