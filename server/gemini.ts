// server/gemini.ts

export interface StallContext {
  name: string;
  route: string;
  lat: number;
  lon: number;
  stallDurationMin: number;
}

export interface GeminiAlert {
  summary: string;
  likelyCause: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

export async function analyzeStall(ctx: StallContext): Promise<GeminiAlert> {
  const prompt = `You are Sentinel, an AI transit monitoring system for Rowan University in Glassboro, NJ.

A campus shuttle has stalled. Analyze and respond ONLY with valid JSON, no markdown, no backticks.

Shuttle data:
- Name: ${ctx.name}
- Route: ${ctx.route}
- Coordinates: ${ctx.lat.toFixed(5)}, ${ctx.lon.toFixed(5)}
- Stall duration: ${ctx.stallDurationMin} minutes

Known factors:
- NJ Transit rail crossing on Rt 322 causes frequent delays
- Heavy traffic on Route 322 during rush hours
- Rowan campus construction near Bozorth Hall and Engineering Hall
- Glassboro downtown events sometimes block Rt 47

Respond with exactly this JSON shape:
{
  "summary": "one sentence describing the situation",
  "likelyCause": "most likely cause based on location and time",
  "severity": "low" or "medium" or "high",
  "recommendation": "one actionable recommendation for riders"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json() as { content: { text: string }[] };
    const text = data.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as GeminiAlert;
    return parsed;
  } catch (err) {
    console.error("[AI] Failed:", err);
    return {
      summary: `${ctx.name} has been stationary for ${ctx.stallDurationMin} minutes.`,
      likelyCause: "Possible traffic delay on Route 322 or NJ Transit crossing.",
      severity: ctx.stallDurationMin >= 5 ? "high" : "medium",
      recommendation: "Check Rowan Transit app or find alternate route.",
    };
  }
}
