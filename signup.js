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
      signup.querySelectorAll("input,select,button").forEach(el => { if (el.id !== "showLogin") el.disabled = true; });
    } catch (err) {
      message.classList.add("error");
      message.textContent = err.message || "Something went wrong. Please try again later.";
      submit.disabled = false;
      submit.textContent = "Create Trial Workspace";
    }
  });
})();