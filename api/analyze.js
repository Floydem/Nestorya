export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    seller: { type: ["string","null"] },
    brand: { type: ["string","null"] },
    product_name: { type: ["string","null"] },
    model_reference: { type: ["string","null"] },
    serial_number: { type: ["string","null"] },
    purchase_date: { type: ["string","null"] },
    price_total: { type: ["number","null"] },
    currency: { type: ["string","null"] },
    category: { type: ["string","null"] },
    warranty_duration_months: { type: ["integer","null"] },
    warranty_end_date: { type: ["string","null"] },
    warranty_basis: { type: ["string","null"] },
    manual_url: { type: ["string","null"] },
    maintenance_needed: { type: ["boolean","null"] },
    maintenance_frequency_days: { type: ["integer","null"] },
    maintenance_tasks: { type: "array", items: { type: "string" } },
    notes: { type: ["string","null"] },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" }, url: { type: "string" } },
        required: ["title","url"]
      }
    }
  },
  required: ["seller","brand","product_name","model_reference","serial_number","purchase_date","price_total","currency","category","warranty_duration_months","warranty_end_date","warranty_basis","manual_url","maintenance_needed","maintenance_frequency_days","maintenance_tasks","notes","sources"]
};

function outputText(json) {
  if (typeof json.output_text === "string" && json.output_text) return json.output_text;
  for (const item of json.output || []) {
    if (item.type === "message") {
      for (const c of item.content || []) {
        if (c.type === "output_text" && c.text) return c.text;
      }
    }
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "L’IA Nestorya n’est pas configurée. Ajoute OPENAI_API_KEY dans Vercel." });
  }

  const { dataUrl, mime, filename } = req.body || {};
  if (!dataUrl || typeof dataUrl !== "string" || dataUrl.length > 12000000) {
    return res.status(400).json({ error: "Document absent ou trop volumineux." });
  }

  const isPdf = String(mime || "").includes("pdf") || String(dataUrl).startsWith("data:application/pdf");
  const content = [{
    type: "input_text",
    text: `Analyse ce justificatif d'achat pour Nestorya. Extrais uniquement les informations réellement lisibles ou fortement fiables : vendeur/site, marque, nom du produit, référence ou modèle exact, numéro de série si visible, date d'achat, prix TTC, devise et catégorie. Si la marque et le modèle sont suffisamment identifiés, utilise la recherche web pour trouver la garantie constructeur standard applicable, calculer la date de fin de garantie à partir de la date d'achat seulement si la durée est fiable, trouver la notice ou page support officielle la plus spécifique possible, et identifier les entretiens réellement recommandés par le fabricant. Ne fabrique jamais une référence, une garantie, une date, une notice ou un entretien. Si une information est incertaine, mets null et explique-la brièvement dans notes. manual_url doit être officiel si possible. maintenance_frequency_days doit être null si aucune fréquence fiable n'est indiquée. Les sources doivent contenir seulement les pages effectivement utilisées. Réponds en français pour notes et maintenance_tasks. Toutes les dates doivent être YYYY-MM-DD. Fichier : ${filename || "facture"}.`
  }];

  if (isPdf) content.push({ type: "input_file", filename: filename || "facture.pdf", file_data: dataUrl });
  else content.push({ type: "input_image", image_url: dataUrl, detail: "high" });

  try {
    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "nestorya_invoice", strict: true, schema } },
        store: false
      })
    });

    const raw = await apiRes.json();
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: raw?.error?.message || "Erreur de l’API d’analyse." });

    const text = outputText(raw);
    if (!text) return res.status(502).json({ error: "L’IA n’a pas retourné de fiche exploitable." });

    let result;
    try { result = JSON.parse(text); }
    catch { return res.status(502).json({ error: "Réponse IA non exploitable." }); }

    return res.status(200).json({ result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur pendant l’analyse." });
  }
}
