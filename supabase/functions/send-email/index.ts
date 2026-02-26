// ============================================
// SUN TOWER RWA - Email Edge Function
// ============================================
// Sends emails via Gmail SMTP using Nodemailer
// Triggered by: direct invocation or pg_cron
//
// Environment variables (set in Supabase Dashboard → Edge Functions → Secrets):
//   GMAIL_USER     — Gmail address (e.g. suntowershipra@gmail.com)
//   GMAIL_APP_PASS — Gmail App Password (16-char, from Google Account → Security → App Passwords)
//   SUPABASE_URL   — Auto-set by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — Auto-set by Supabase

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER") || "";
const GMAIL_APP_PASS = Deno.env.get("GMAIL_APP_PASS") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const SOCIETY_NAME = "Sun Tower RWA";
const SOCIETY_WEBSITE = "https://suntower.in";

// Email templates
const TEMPLATES: Record<string, (data: any) => { subject: string; html: string }> = {
  welcome: (data) => ({
    subject: `Welcome to ${SOCIETY_NAME} Portal`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#1a237e;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0">${SOCIETY_NAME}</h1>
        </div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
          <h2>Welcome, ${data.name || 'Resident'}!</h2>
          <p>Your account has been approved. You can now login to the society portal.</p>
          <p><strong>Flat:</strong> ${data.flat_no || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
          <p><strong>Temporary Password:</strong> ${data.temp_password || '(set by admin)'}</p>
          <p style="margin-top:20px">
            <a href="${SOCIETY_WEBSITE}" style="background:#1a237e;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block">Login to Portal</a>
          </p>
          <p style="color:#666;font-size:12px;margin-top:20px">Please change your password after first login.</p>
        </div>
      </div>
    `
  }),

  notice: (data) => ({
    subject: `[${SOCIETY_NAME}] ${data.category || 'Notice'}: ${data.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#1a237e;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">${SOCIETY_NAME} — Notice</h2>
        </div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
          <span style="background:#e8eaf6;color:#1a237e;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600">${data.category || 'General'}</span>
          <h3 style="margin-top:12px">${data.title}</h3>
          <p>${data.summary || ''}</p>
          <p style="color:#666;font-size:13px">Date: ${data.date || new Date().toLocaleDateString('en-IN')}</p>
          <p><a href="${SOCIETY_WEBSITE}" style="color:#1a237e">View on Portal</a></p>
        </div>
      </div>
    `
  }),

  complaint_ack: (data) => ({
    subject: `[${SOCIETY_NAME}] Complaint Received: ${data.subject}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#e65100;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Complaint Acknowledged</h2>
        </div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
          <p>Dear ${data.resident_name || 'Resident'},</p>
          <p>Your complaint has been received and logged.</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Category:</strong> ${data.category || 'Other'}</p>
          <p><strong>Priority:</strong> ${data.priority || 'Medium'}</p>
          <p><strong>Reference:</strong> ${data.complaint_id || 'N/A'}</p>
          <p>We will review and update you on the status. You can track progress on the portal.</p>
          <p><a href="${SOCIETY_WEBSITE}" style="color:#1a237e">Track on Portal</a></p>
        </div>
      </div>
    `
  }),

  complaint_resolved: (data) => ({
    subject: `[${SOCIETY_NAME}] Complaint Resolved: ${data.subject}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#2e7d32;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Complaint Resolved</h2>
        </div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
          <p>Dear ${data.resident_name || 'Resident'},</p>
          <p>Your complaint has been resolved.</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Resolution:</strong> ${data.resolution_notes || 'Issue resolved.'}</p>
          <p>If the issue persists, please raise a new complaint on the portal.</p>
        </div>
      </div>
    `
  }),

  monthly_report: (data) => ({
    subject: `[${SOCIETY_NAME}] Monthly Report — ${data.month_name || 'This Month'}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#1a237e;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">${SOCIETY_NAME} — Monthly Report</h2>
          <p style="margin:4px 0 0;opacity:0.9">${data.month_name || ''}</p>
        </div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
          ${data.report_html || '<p>Monthly report is available on the portal.</p>'}
          <p style="margin-top:20px"><a href="${SOCIETY_WEBSITE}" style="color:#1a237e">View Full Report on Portal</a></p>
        </div>
      </div>
    `
  }),

  payment_reminder: (data) => ({
    subject: `[${SOCIETY_NAME}] Maintenance Due Reminder — ${data.flat_no || ''}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#f57c00;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Maintenance Due Reminder</h2>
        </div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
          <p>Dear Resident (${data.flat_no || ''}),</p>
          <p>This is a reminder that your maintenance payment is pending.</p>
          <p><strong>Amount Due:</strong> &#8377;${data.amount_due || '0'}</p>
          <p><strong>Month:</strong> ${data.month_name || 'Current'}</p>
          <p>Please make the payment at the earliest.</p>
        </div>
      </div>
    `
  }),

  meeting_invite: (data) => ({
    subject: `[${SOCIETY_NAME}] Meeting: ${data.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#1565c0;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Meeting Invitation</h2>
        </div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
          <h3>${data.title}</h3>
          <p><strong>Date:</strong> ${data.event_date || 'TBA'}</p>
          <p><strong>Venue:</strong> ${data.venue || 'Society Premises'}</p>
          <p>${data.description || ''}</p>
          <p><a href="${SOCIETY_WEBSITE}" style="color:#1a237e">View Details & RSVP on Portal</a></p>
        </div>
      </div>
    `
  })
};

serve(async (req: Request) => {
  try {
    // CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
        }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    let body: any = {};
    try { body = await req.json(); } catch {}

    // Mode 1: Process email queue (batch mode — called by cron or manual trigger)
    if (!body.to_email && !body.id) {
      const { data: pending, error } = await supabase
        .from("email_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(20);

      if (error || !pending || pending.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: "No pending emails" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      let sent = 0;
      let failed = 0;

      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: { username: GMAIL_USER, password: GMAIL_APP_PASS }
        }
      });

      for (const email of pending) {
        try {
          await client.send({
            from: `${SOCIETY_NAME} <${GMAIL_USER}>`,
            to: email.to_email,
            subject: email.subject,
            content: "auto",
            html: email.body_html
          });

          await supabase.from("email_queue").update({
            status: "sent",
            sent_at: new Date().toISOString()
          }).eq("id", email.id);

          sent++;
        } catch (e: any) {
          await supabase.from("email_queue").update({
            status: "failed",
            error_message: e.message || "Send failed"
          }).eq("id", email.id);
          failed++;
        }
      }

      await client.close();

      return new Response(JSON.stringify({ sent, failed, total: pending.length }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Mode 2: Direct send (queue + send immediately)
    if (body.to_email && body.subject) {
      let html = body.body_html || "";

      // Use template if specified
      if (body.template && TEMPLATES[body.template]) {
        const tmpl = TEMPLATES[body.template](body.template_data || {});
        html = tmpl.html;
        if (!body.subject) body.subject = tmpl.subject;
      }

      // Insert into queue
      const { data: queued, error: queueErr } = await supabase.from("email_queue").insert({
        to_email: body.to_email,
        to_name: body.to_name || "",
        subject: body.subject,
        body_html: html,
        template: body.template || null,
        metadata: body.metadata || {}
      }).select().single();

      if (queueErr) {
        return new Response(JSON.stringify({ error: queueErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Send immediately
      try {
        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: { username: GMAIL_USER, password: GMAIL_APP_PASS }
          }
        });

        await client.send({
          from: `${SOCIETY_NAME} <${GMAIL_USER}>`,
          to: body.to_email,
          subject: body.subject,
          content: "auto",
          html: html
        });

        await client.close();

        await supabase.from("email_queue").update({
          status: "sent",
          sent_at: new Date().toISOString()
        }).eq("id", queued.id);

        return new Response(JSON.stringify({ success: true, id: queued.id }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        await supabase.from("email_queue").update({
          status: "failed",
          error_message: e.message || "Send failed"
        }).eq("id", queued.id);

        return new Response(JSON.stringify({ error: e.message, queued_id: queued.id }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid request. Provide to_email + subject, or call with no body to process queue." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
