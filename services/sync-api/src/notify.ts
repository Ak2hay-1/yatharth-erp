/** Optional SMTP notify when the public contact form is submitted. */

export type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.CONTACT_NOTIFY_TO?.trim() &&
      process.env.CONTACT_NOTIFY_FROM?.trim(),
  );
}

type NodemailerModule = {
  createTransport?: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> };
  default?: {
    createTransport?: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> };
  };
};

export async function notifyContactInquiry(payload: ContactPayload) {
  const subject = `Website enquiry from ${payload.name}`;
  const body = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "—"}`,
    "",
    payload.message,
  ].join("\n");

  const webhook = process.env.CONTACT_NOTIFY_WEBHOOK?.trim();
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, ...payload }),
    });
    return { sent: true as const, via: "webhook" as const };
  }

  if (!smtpConfigured()) return { sent: false as const, reason: "smtp-not-configured" as const };

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT ?? 587) || 587;
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const to = process.env.CONTACT_NOTIFY_TO!.trim();
  const from = process.env.CONTACT_NOTIFY_FROM!.trim();

  try {
    const nodemailer = (await import("nodemailer")) as NodemailerModule;
    const createTransport = nodemailer.createTransport ?? nodemailer.default?.createTransport;
    if (!createTransport) throw new Error("nodemailer createTransport missing");
    const transport = createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    await transport.sendMail({
      from,
      to,
      replyTo: payload.email,
      subject,
      text: body,
    });
    return { sent: true as const, via: "smtp" as const };
  } catch (err) {
    console.error("contact notify failed", err);
    return { sent: false as const, reason: "send-failed" as const };
  }
}
