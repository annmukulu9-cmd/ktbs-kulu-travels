(() => {
  const $ = id => document.getElementById(id);
  const landing = $("publicSite");
  const login = $("login");
  const registration = $("registrationPage");
  const showLogin = () => {
    landing?.classList.add("hidden");
    registration?.classList.add("hidden");
    login?.classList.remove("hidden");
    $("loginForm")?.classList.remove("hidden");
    $("inviteSetupForm")?.classList.add("hidden");
    $("loginMessage").textContent = "Sign in to your KTBS workspace.";
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const showSignup = () => {
    landing?.classList.add("hidden");
    login?.classList.add("hidden");
    registration?.classList.remove("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
  };
  document.querySelectorAll("[data-open-login]").forEach(button => button.addEventListener("click",showLogin));
  document.querySelectorAll("[data-open-signup]").forEach(button => button.addEventListener("click",showSignup));
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  const invite = params.get("type")==="invite" || hash.get("type")==="invite";
  const signupRoute = params.get("signup")==="1" || location.pathname==="/signup";
  const loginRoute = location.pathname.startsWith("/login/");
  if(invite){landing?.classList.add("hidden");registration?.classList.add("hidden");login?.classList.remove("hidden");}
  else if(signupRoute) showSignup();
  else if(loginRoute) showLogin();
  const companyFromPath = location.pathname.match(/^\\/login\\/([a-z0-9-]+)\\/?$/i)?.[1];
  const companySlug = companyFromPath || new URLSearchParams(location.search).get("company");
  if(companySlug){
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if(manifestLink) manifestLink.href = "/api/manifest?company=" + encodeURIComponent(companySlug);
  }
  if(companySlug && login){
    const loadCompanyBranding = async () => {
      try {
        const response = await fetch(window.KTBS_SUPABASE_URL + "/functions/v1/ktbs-get-branding", {
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":window.KTBS_SUPABASE_ANON_KEY},
          body:JSON.stringify({slug:companySlug})
        });
        const result = await response.json();
        if(!response.ok || !result.success) throw new Error(result.error || "This company login page is unavailable.");
        const company = result.company, brand = result.branding;
        const shell = $("login");
        shell.style.setProperty("--company-primary",brand.primary_color);
        shell.style.setProperty("--company-accent",brand.accent_color);
        shell.style.setProperty("--company-background",brand.background_color);
        $("loginCompanyName").textContent = company.name.toUpperCase();
        $("loginWelcomeTitle").textContent = brand.welcome_message || "Welcome back";
        $("loginWelcomeSubtitle").textContent = company.name + " · Business Management System";
        const logo = $("loginCompanyLogo"), mark = $("loginBrandMark");
        if(brand.logo_url){
          logo.src = brand.logo_url.startsWith("/") ? location.origin + brand.logo_url : brand.logo_url;
          logo.alt = company.name;
          logo.classList.remove("hidden");mark.classList.add("hidden");
        }else{
          logo.classList.add("hidden");mark.textContent=(company.name.trim()[0]||"T").toUpperCase();mark.classList.remove("hidden");
        }
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if(manifestLink) manifestLink.href = "/api/manifest?company=" + encodeURIComponent(company.slug);
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if(themeMeta) themeMeta.content = brand.primary_color;
        document.title = company.name + " | KTBS";
      } catch(error) {
        $("loginMessage").textContent = error.message || "Could not load this company login page.";
      }
    };
    loadCompanyBranding();
  }
  $("siteYear") && ($("siteYear").textContent=new Date().getFullYear());
  let installPrompt = null;
  const install = async () => {
    if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
    alert(/iphone|ipad|ipod/i.test(navigator.userAgent)
      ? "To install KTBS on your iPhone or iPad: open this page in Safari, tap Share, then choose Add to Home Screen."
      : "To install KTBS, open your browser menu and choose Install app or Add to Home Screen. On some browsers this option appears in the address bar.");
  };
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event;document.querySelectorAll("[data-install-app]").forEach(b=>b.classList.remove("hidden"));});
  document.querySelectorAll("[data-install-app]").forEach(b=>b.addEventListener("click",install));
  if("serviceWorker" in navigator && location.protocol==="https:"){window.addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js").catch(()=>{}));}
})();