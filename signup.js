(() => {
  const $ = id => document.getElementById(id);
  const supabaseClient = window.supabase.createClient(
    window.KTBS_SUPABASE_URL,
    window.KTBS_SUPABASE_ANON_KEY
  );
  const signup = $("signupForm");
  const login = $("loginForm");
  const message = $("signupMessage");
  const submit = $("signupSubmit");

  $("showSignup")?.addEventListener("click", () => {
    signup.classList.remove("hidden");
    $("showSignup").classList.add("hidden");
    $("showLogin").classList.remove("hidden");
    $("trialLimits").classList.remove("hidden");
    login.classList.add("signup-muted");
  });
  $("showLogin")?.addEventListener("click", () => {
    signup.classList.add("hidden");
    $("showSignup").classList.remove("hidden");
    $("showLogin").classList.add("hidden");
    $("trialLimits").classList.add("hidden");
    login.classList.remove("signup-muted");
    message.textContent = "We'll email you a secure invitation link to set up your account.";
  });

  const inviteForm = $("inviteSetupForm");
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const isInvite = hashParams.get("type") === "invite" || queryParams.get("type") === "invite";

  if (isInvite) {
    $("app")?.classList.add("hidden");
    $("login")?.classList.remove("hidden");
    login?.classList.add("hidden");
    $("showSignup")?.classList.add("hidden");
    signup?.classList.add("hidden");
    $("trialLimits")?.classList.add("hidden");
    $("showLogin")?.classList.add("hidden");
    inviteForm?.classList.remove("hidden");
  }

  inviteForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(inviteForm).entries());
    const password = String(fields.new_password || "");
    const confirm = String(fields.confirm_password || "");
    const note = $("inviteSetupMessage");
    const button = $("inviteSetupSubmit");
    if (password.length < 10) {
      note.textContent = "Please use at least 10 characters.";
      note.className = "signup-message error";
      return;
    }
    if (password !== confirm) {
      note.textContent = "The passwords do not match.";
      note.className = "signup-message error";
      return;
    }
    button.disabled = true;
    button.textContent = "Securing account…";
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      note.textContent = error.message || "We could not set your password. Please try again.";
      note.className = "signup-message error";
      button.disabled = false;
      button.textContent = "Set Password & Continue";
      return;
    }
    note.textContent = "Password saved. Opening your KTBS workspace…";
    note.className = "signup-message success";
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.reload();
  });

  const logoInput = $("companyLogo");
  const logoPreviewWrap = $("logoPreviewWrap");
  const logoPreview = $("companyLogoPreview");
  const logoFileName = $("logoFileName");
  const colorPanel = $("suggestedBrandColors");
  let selectedLogo = null;
  let logoData = "";
  let logoMime = "";
  const hex = n => "#" + n.toString(16).padStart(2, "0");
  function readableBrandColors(file) {
    return new Promise(resolve => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 48; canvas.height = 48;
          const ctx = canvas.getContext("2d", {willReadFrequently:true});
          ctx.drawImage(image, 0, 0, 48, 48);
          const pixels = ctx.getImageData(0, 0, 48, 48).data;
          const buckets = new Map();
          for(let i=0;i<pixels.length;i+=16){
            const a=pixels[i+3]; if(a<150) continue;
            const r=Math.round(pixels[i]/32)*32,g=Math.round(pixels[i+1]/32)*32,b=Math.round(pixels[i+2]/32)*32;
            const key=[r,g,b].join(",");
            buckets.set(key,(buckets.get(key)||0)+1);
          }
          const candidates=[...buckets.entries()].sort((a,b)=>b[1]-a[1]).map(([key])=>key.split(",").map(Number))
            .filter(([r,g,b])=>Math.max(r,g,b)-Math.min(r,g,b)>28 && (r+g+b)>100 && (r+g+b)<690);
          const chosen=candidates[0]||[8,126,128];
          const primary=hex(chosen[0])+hex(chosen[1])+hex(chosen[2]);
          const accent=hex(Math.min(255,Math.round(chosen[0]*.35+166)))+hex(Math.min(255,Math.round(chosen[1]*.35+210)))+hex(Math.min(255,Math.round(chosen[2]*.35+205)));
          resolve({primary,accent});
        } catch { resolve({primary:"#202725",accent:"#45ffef"}); }
        URL.revokeObjectURL(objectUrl);
      };
      image.onerror=()=>{URL.revokeObjectURL(objectUrl);resolve({primary:"#202725",accent:"#45ffef"});};
      image.src=objectUrl;
    });
  }
  logoInput?.addEventListener("change",async()=>{
    const file=logoInput.files?.[0];
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp","image/svg+xml"].includes(file.type)||file.size>2*1024*1024){
      logoInput.value=""; alert("Choose a PNG, JPG, WEBP or SVG logo up to 2 MB."); return;
    }
    selectedLogo=file;
    logoMime=file.type;
    logoData=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=reject;reader.readAsDataURL(file);
    });
    logoPreview.src=URL.createObjectURL(file);
    logoFileName.textContent=file.name;
    logoPreviewWrap.classList.remove("hidden");
    colorPanel.classList.remove("hidden");
    const suggested=await readableBrandColors(file);
    $("brandPrimary").value=suggested.primary;
    $("brandAccent").value=suggested.accent;
    $("brandBackground").value="#f8f8f4";
  });
  $("removeCompanyLogo")?.addEventListener("click",()=>{
    selectedLogo=null;logoData="";logoMime="";logoInput.value="";
    logoPreviewWrap.classList.add("hidden");colorPanel.classList.add("hidden");
  });

  signup?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(signup).entries());
    submit.disabled = true;
    submit.textContent = "Creating workspace…";
    message.className = "signup-message";
    message.textContent = "Setting up your secure trial workspace. Please wait.";
    try {
      const { data, error } = await supabaseClient.functions.invoke("ktbs-start-trial", {
        body: {
          full_name: String(form.full_name || "").trim(),
          company_name: String(form.company_name || "").trim(),
          email: String(form.email || "").trim(),
          country: form.country || "Kenya",
          currency: form.currency || "KES",
          website: form.website || "",
          logo_data: logoData,
          logo_mime: logoMime,
          brand_primary: $("brandPrimary")?.value || "#202725",
          brand_accent: $("brandAccent")?.value || "#45ffef",
          brand_background: $("brandBackground")?.value || "#f8f8f4"
        }
      });
      if (error) {
        let detail = "";
        try {
          const context = error.context;
          if (context && typeof context.json === "function") {
            const payload = await context.json();
            detail = payload.error || "";
          }
        } catch {}
        throw new Error(detail || error.message || "Registration could not be completed.");
      }
      if (!data?.success) throw new Error(data?.error || "Registration could not be completed.");
      message.classList.add("success");
      message.textContent = data.message || "Trial workspace created. Check your email for the secure invitation link.";
      submit.textContent = "Invitation Requested";
      signup.querySelectorAll("input,select,button").forEach(el => { el.disabled = true; });
    } catch (err) {
      message.classList.add("error");
      message.textContent = err.message || "Something went wrong. Please try again later.";
      submit.disabled = false;
      submit.textContent = "Create Trial Workspace";
    }
  });
})();