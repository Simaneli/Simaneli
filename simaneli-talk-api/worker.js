const ORIGIN = "https://simaneli.github.io";
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
  "Cache-Control": "no-store"
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      if (request.headers.get("Origin") !== ORIGIN) {
        return json({ error: "Origin not allowed" }, 403);
      }
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname === "/" && request.method === "GET") {
      return json({ app: "Simaneli Talk", status: "online" });
    }
    if (url.pathname !== "/transcribe" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }
    // CORS only restricts browser access; it is NOT authentication.
    if (request.headers.get("Origin") !== ORIGIN) {
      return json({ error: "Origin not allowed" }, 403);
    }
    if (!env.GROQ_API_KEY) {
      return json({ error: "Server is not configured" }, 503);
    }
    const declaredSize = Number(request.headers.get("Content-Length") || 0);
    if (declaredSize > MAX_AUDIO_BYTES + 100000) {
      return json({ error: "Audio too large" }, 413);
    }
    try {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
        return json({ error: "Expected multipart form data" }, 415);
      }
      const incoming = await request.formData();
      const audio = incoming.get("file");
      const language = incoming.get("language");
      if (!audio || typeof audio.arrayBuffer !== "function" || audio.size === 0) {
        return json({ error: "Audio file required" }, 400);
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        return json({ error: "Audio too large" }, 413);
      }
      if (language !== "hy" && language !== "zh") {
        return json({ error: "Language must be hy or zh" }, 400);
      }
      const form = new FormData();
      const file = new File([audio], "recording." + (audio.type.includes("mp4") ? "m4a" : "webm"), {
        type: audio.type || "audio/webm"
      });
      form.set("file", file);
      form.set("model", "whisper-large-v3");
      form.set("response_format", "json");
      // Specify the chosen language explicitly instead of auto-detection.
      form.set("language", language);
      const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.GROQ_API_KEY },
        body: form
      });
      if (!upstream.ok) {
        return json({ error: "Transcription provider error", provider_status: upstream.status }, 502);
      }
      const data = await upstream.json();
      return json({ text: data.text || "", requested_language: language });
    } catch (e) {
      return json({ error: "Transcription failed" }, 500);
    }
  }
};
