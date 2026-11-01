import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user's identity
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, context } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "burn_calories":
        systemPrompt = "You are a certified fitness coach. Suggest 3-5 specific exercises/activities to burn excess calories. Be concise, practical, and include estimated calories burned per activity. Format as a numbered list.";
        userPrompt = `The user consumed ${context.totalCalories} calories today but their goal is ${context.calorieGoal} calories. They are ${context.excessCalories} calories over their goal. Suggest activities to burn the excess calories. Consider they've already burned ${context.caloriesBurned} calories through exercise today.`;
        break;
      case "meal_suggestion":
        systemPrompt = "You are a certified nutritionist. Suggest 3-5 meals that fit within the user's remaining calorie budget. Include meal name and approximate calories. Be practical and include a mix of options. Format as a numbered list.";
        userPrompt = `The user has ${context.remainingCalories} calories remaining for today out of a ${context.calorieGoal} calorie goal. They've consumed ${context.consumedCalories} calories so far. Suggest meals that fit within their remaining budget.`;
        break;
      case "diet_plan":
        systemPrompt = "You are a certified nutritionist and fitness coach. Create a comprehensive daily diet and exercise plan. Include breakfast, lunch, dinner, snacks with calories, and 3-4 exercises with duration. Be specific and practical. Use markdown formatting.";
        userPrompt = `Create a daily diet and exercise plan for someone with a ${context.calorieGoal} calorie goal. ${context.preferences ? 'Preferences: ' + context.preferences : ''}`;
        break;
      case "pregnancy_wellness":
        systemPrompt = "You are a certified prenatal/postnatal health expert. Provide safe, evidence-based wellness advice. Include nutrition tips, safe exercises, and self-care practices. Always remind to consult their healthcare provider. Use markdown formatting with sections.";
        userPrompt = `Provide a daily wellness plan for a ${context.stage} woman. Include safe meals, gentle exercises, and wellness tips. ${context.trimester ? 'Trimester: ' + context.trimester : ''}`;
        break;
      case "toddler_health":
        systemPrompt = "You are a certified pediatric health expert. Provide evidence-based advice on toddler nutrition, activities, and safety. Include age-appropriate meals, play activities for development, and safety tips. Use markdown formatting.";
        userPrompt = `Provide a daily health and wellness plan for a toddler. Include nutritious meal ideas, age-appropriate physical activities, developmental play suggestions, and safety reminders. ${context.ageMonths ? 'Age: ' + context.ageMonths + ' months' : ''}`;
        break;
      default:
        throw new Error("Invalid type");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No suggestion available.";

    return new Response(JSON.stringify({ suggestion: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lifestyle-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
