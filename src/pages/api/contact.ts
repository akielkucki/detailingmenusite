import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

// The only on-demand route on the site — everything else prerenders.
export const prerender = false;

interface ContactEnv {
    RESEND_API_KEY?: string;
    CONTACT_TO_EMAIL?: string;
    CONTACT_FROM_EMAIL?: string;
}

const MAX_LENGTHS = { name: 100, email: 200, message: 5000 } as const;

const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );

export const POST: APIRoute = async ({ request }) => {
    const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = env as ContactEnv;

    let payload: Record<string, unknown>;
    try {
        payload = await request.json();
    } catch {
        return json({ error: "Malformed request." }, 400);
    }

    // Bots fill every field they find; humans never see this one.
    if (typeof payload.company === "string" && payload.company.trim() !== "") {
        return json({ ok: true }, 200);
    }

    const name = String(payload.name ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const message = String(payload.message ?? "").trim();

    if (!name || !email || !message) {
        return json({ error: "Name, email, and message are all required." }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ error: "That email address doesn't look right." }, 400);
    }
    if (
        name.length > MAX_LENGTHS.name ||
        email.length > MAX_LENGTHS.email ||
        message.length > MAX_LENGTHS.message
    ) {
        return json({ error: "That message is too long to send." }, 400);
    }

    if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY is not configured");
        return json({ error: "Email is not configured yet. Please call the shop instead." }, 503);
    }

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: `BPD Website <${CONTACT_FROM_EMAIL ?? "onboarding@resend.dev"}>`,
            to: [CONTACT_TO_EMAIL ?? "alex.kielkucki@gmail.com"],
            reply_to: email,
            subject: `New contact form message from ${name}`,
            text: `From: ${name} <${email}>\n\n${message}`,
            html: `
                <h2>New message from the BPD site</h2>
                <p><strong>Name:</strong> ${escapeHtml(name)}</p>
                <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
                <hr>
                <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
            `,
        }),
    });

    if (!res.ok) {
        // Log the provider's reason for us; never surface it to the visitor.
        console.error("Resend rejected the message", res.status, await res.text());
        return json({ error: "We couldn't send that just now. Please try again or call us." }, 502);
    }

    return json({ ok: true }, 200);
};
