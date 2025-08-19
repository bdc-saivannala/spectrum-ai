// /api/webhook.js
let events = []; // in-memory store of received events

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      const payload = JSON.parse(rawBody.toString());

      console.log("Incoming webhook payload:", payload);

      // Extract structured data if present
      const structuredData =
        payload.structuredData ||
        payload.analysis ||
        payload.data?.structuredData ||
        payload.event?.structuredData ||
        null;

      // Build analysis
      const analysis = buildAnalysis(structuredData, payload);

      if (structuredData) {
        events.unshift({
          structuredData,
          analysis,
          timestamp: Date.now()
        });
      } else {
        events.unshift({
          structuredData: { note: "structuredData not found", raw: payload },
          analysis,
          timestamp: Date.now()
        });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error parsing webhook:", err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'GET') {
    // Return only structuredData array
    return res.status(200).json(events);
  }

  res.status(405).send('Method Not Allowed');
}

// Helper: get raw body because Vercel may not parse automatically
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

// Helper: build analysis with summary + key points
function buildAnalysis(structuredData, rawPayload) {
  if (!structuredData || structuredData.note) {
    return {
      summary: "No structured data found. Stored raw payload for debugging.",
      successEvaluation: false,
      key_points: [
        "Payload received but missing structuredData.",
        "Raw payload stored in events for later inspection."
      ]
    };
  }

  // Pull some useful info if available
  const name = structuredData.name || "Unknown user";
  const topic = structuredData.topic || "Unspecified topic";
  const teamSize = structuredData.team_size || "N/A";
  const format = structuredData.training_format || "Unspecified format";
  const timeline = structuredData.training_timeline || "No timeline provided";

  return {
    summary: `${name} requested training on '${topic}' for a team of ${teamSize}, to be conducted in ${format}, scheduled ${timeline}.`,
    successEvaluation: true,
    key_points: [
      "Training request captured with timeline and format.",
      "Team size and expertise level clarified if available.",
      "Contact details and next steps prepared for follow-up."
    ]
  };
}
