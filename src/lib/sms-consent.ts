// The one SMS consent wording used everywhere a phone number is collected
// (the optional opt-in box on every form, and the /sms-consent page). It is
// sent with each opt-in and stored in sms_consents, so what the person saw
// is on record. Keep it under 600 characters: the API truncates there.
export const SMS_CONSENT_TEXT =
  "Yes, text me about my request. I agree to receive text messages from FALCO (Patrick Armour, TN licensed auctioneer) at the number I provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time, or HELP for help. We don't send spam or anything you didn't ask for. Consent is not a condition of any purchase or service. Privacy policy: falco.llc/privacy."

/** Records an SMS opt-in through the same audit trail as /sms-consent.
 *  Returns an error message, or null when it was saved. */
export async function recordSmsConsent(input: { name: string; phone: string; property?: string }): Promise<string | null> {
  try {
    const res = await fetch("/api/sms/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        property: input.property ?? "",
        consent: true,
        consent_text: SMS_CONSENT_TEXT,
        website: "", // honeypot
      }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    return res.ok && json?.ok ? null : json?.error ?? "Your text opt-in did not save."
  } catch {
    return "Your text opt-in did not save."
  }
}
