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
          website: form.website || ""
        }
      });
      if (error) {
        let detail = "";
        try { detail = await error.context?.json?.().then(x => x.error || "").catch(() => ""); } catch {}
        throw new Error(detail || error.message || "Registration could not be completed.");
      }
      if (!data?.success) throw new Error(data?.error || "Registration could not be completed.");
      message.classList.add("success");
      message.textContent = data.message || "Trial workspace created. Check your email for the secure invitation link.";
      submit.textContent = "Invitation Requested";
      signup.querySelectorAll("input,select,button").forEach(el => { if (el.id !== "showLogin") el.disabled = true; });
    } catch (err) {
      message.classList.add("error");
      message.textContent = err.message || "Something went wrong. Please try again later.";
      submit.disabled = false;
      submit.textContent = "Create Trial Workspace";
    }
  });
})();