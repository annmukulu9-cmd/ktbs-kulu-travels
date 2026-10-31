const SUPABASE_URL = "https://oysgxbikgruarnqumkog.supabase.co";
const SUPABASE_KEY = "sb_publishable_l7tIN-JHo6-rgY9tN-A0lQ_tuHr95fI";

module.exports = async function handler(req, res) {
  const slug = String(req.query.company || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    res.status(400).json({ error: "Invalid company." });
    return;
  }
  try {
    const response = await fetch(SUPABASE_URL + "/functions/v1/ktbs-get-branding", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ slug })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      res.status(404).json({ error: "Company app manifest unavailable." });
      return;
    }
    const company = result.company;
    const brand = result.branding;
    const origin = "https://ktbs-kulu-travels.vercel.app";
    const icon = brand.logo_url
      ? (brand.logo_url.startsWith("/") ? origin + brand.logo_url : brand.logo_url)
      : origin + "/ktbs-icon.svg";
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).json({
      id: "/login/" + slug,
      name: company.name + " · KTBS",
      short_name: company.name.slice(0, 18),
      description: "Your " + company.name + " business workspace, powered by KTBS.",
      start_url: "/login/" + slug,
      scope: "/",
      display: "standalone",
      background_color: brand.background_color,
      theme_color: brand.primary_color,
      icons: [
        { src: icon, sizes: "192x192", type: icon.endsWith(".svg") ? "image/svg+xml" : "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: icon.endsWith(".svg") ? "image/svg+xml" : "image/png", purpose: "any maskable" }
      ]
    });
  } catch {
    res.status(503).json({ error: "Could not build app manifest." });
  }
};
