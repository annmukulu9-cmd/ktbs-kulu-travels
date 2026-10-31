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
    const companyLogo = typeof brand.logo_url === "string" && brand.logo_url.trim()
      ? brand.logo_url.trim()
      : null;
    const icon = companyLogo || "/ktbs-icon.svg";
    const iconType = companyLogo
      ? (/\\.jpe?g(?:[?#]|$)/i.test(companyLogo) ? "image/jpeg"
        : /\\.webp(?:[?#]|$)/i.test(companyLogo) ? "image/webp"
        : "image/png")
      : "image/svg+xml";
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
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
        { src: icon, type: iconType, purpose: "any" }
      ]
    });
  } catch {
    res.status(503).json({ error: "Could not build app manifest." });
  }
};
