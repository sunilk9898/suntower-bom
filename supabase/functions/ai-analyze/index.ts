// ============================================
// SUN TOWER RWA - AI Analysis Edge Function
// ============================================
// Routes AI requests to Claude API (Haiku) for various analysis types
//
// Environment variables:
//   ANTHROPIC_API_KEY — Claude API key
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-set

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const SOCIETY_CONTEXT = `You are an AI assistant for Sun Tower Residential Welfare Association (RWA), a housing society in India. The society has 3 towers (STA1, STB, STC, STD) with approximately 858 residents. You help with:
- Financial analysis and trend detection
- Complaint classification and prioritization
- Meeting minutes summarization
- Monthly report generation
- Project health assessment
- Resident sentiment analysis
Keep responses concise, actionable, and formatted as structured JSON where requested.`;

// System prompts per analysis type
const SYSTEM_PROMPTS: Record<string, string> = {
  financial_trend: `${SOCIETY_CONTEXT}
Analyze the financial data provided. Return JSON:
{
  "trend": "improving|stable|declining",
  "anomalies": ["description of any unusual patterns"],
  "recommendations": ["actionable recommendations"],
  "summary": "2-3 sentence executive summary",
  "risk_level": "low|medium|high"
}`,

  project_health: `${SOCIETY_CONTEXT}
Analyze the project data. Return JSON:
{
  "risk_score": 1-10,
  "predicted_overrun_pct": number,
  "status_assessment": "on_track|at_risk|delayed|critical",
  "recommendations": ["actionable items"],
  "summary": "2-3 sentence assessment"
}`,

  complaint_classify: `${SOCIETY_CONTEXT}
Classify this complaint. Return JSON:
{
  "suggested_priority": "Low|Medium|High|Critical",
  "suggested_category": "Maintenance|Security|Housekeeping|Parking|Noise|Lift|Water|Electrical|Suggestion|Other",
  "suggested_committee": "A|B|C|D|E|F|G",
  "urgency_reason": "brief explanation",
  "estimated_resolution_days": number
}`,

  meeting_summary: `${SOCIETY_CONTEXT}
Summarize these meeting minutes. Return JSON:
{
  "summary_bullets": ["3-5 key points"],
  "decisions": [{"decision": "text", "assignee": "name", "deadline": "date or TBD"}],
  "action_items": [{"item": "text", "owner": "name", "due": "date"}],
  "key_numbers": {"metric": "value"},
  "follow_up_needed": ["items requiring follow-up"]
}`,

  monthly_report_admin: `${SOCIETY_CONTEXT}
Generate an executive monthly report for BOM members. Return JSON:
{
  "executive_summary": "3-4 sentence overview",
  "financial_highlights": {"collection_pct": number, "major_expenses": [], "fund_status": "text"},
  "project_updates": [{"name": "text", "status": "text", "key_update": "text"}],
  "complaint_stats": {"total": number, "resolved": number, "avg_resolution_days": number, "trending_issues": []},
  "achievements": ["notable accomplishments"],
  "concerns": ["items needing attention"],
  "upcoming": ["important dates and tasks"]
}`,

  monthly_report_resident: `${SOCIETY_CONTEXT}
Generate a resident-friendly monthly newsletter summary. Return JSON:
{
  "greeting": "warm opening line",
  "highlights": ["3-5 positive updates in simple language"],
  "financial_snapshot": {"collected_pct": number, "major_spends": "simplified text"},
  "projects_update": "2-3 sentence simplified update",
  "upcoming_events": ["list of upcoming events"],
  "tips": ["1-2 community tips or reminders"],
  "closing": "positive closing line"
}`,

  sentiment: `${SOCIETY_CONTEXT}
Analyze sentiment from recent complaints and messages. Return JSON:
{
  "overall_score": 1-10 (10=very positive),
  "trend": "improving|stable|declining",
  "trending_issues": ["top 3 complaint themes"],
  "positive_themes": ["positive topics mentioned"],
  "satisfaction_areas": {"maintenance": 1-10, "security": 1-10, "management": 1-10, "amenities": 1-10},
  "recommendations": ["how to improve satisfaction"]
}`,

  chatbot: `${SOCIETY_CONTEXT}
You are the Sun Tower RWA chatbot. Answer resident questions helpfully and concisely.
If you don't know the specific answer, say so and suggest who to contact (BOM office, security desk, etc.).
Format response as: {"answer": "your response text", "confidence": "high|medium|low", "suggest_human": true/false}`
};

async function callClaude(systemPrompt: string, userMessage: string): Promise<any> {
  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text || "";

  // Try to parse as JSON
  try {
    // Extract JSON from possible markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    return JSON.parse(jsonMatch[1].trim());
  } catch {
    return { raw_response: text };
  }
}

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

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { type, data, cache_key } = body;

    if (!type || !SYSTEM_PROMPTS[type]) {
      return new Response(JSON.stringify({
        error: "Invalid type. Valid types: " + Object.keys(SYSTEM_PROMPTS).join(", ")
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache (for non-chatbot requests)
    if (type !== "chatbot" && cache_key) {
      const { data: cached } = await supabase
        .from("ai_reports")
        .select("content, generated_at")
        .eq("report_type", cache_key)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        const ageHours = (Date.now() - new Date(cached.generated_at).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          return new Response(JSON.stringify({ ...cached.content, _cached: true, _age_hours: Math.round(ageHours) }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }

    // Call Claude
    const userMessage = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const result = await callClaude(SYSTEM_PROMPTS[type], userMessage);

    // Cache result (for non-chatbot)
    if (type !== "chatbot" && cache_key) {
      await supabase.from("ai_reports").insert({
        report_type: cache_key,
        report_month: body.report_month || null,
        content: result
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
