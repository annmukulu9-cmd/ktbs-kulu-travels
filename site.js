(() => {
  const $ = id => document.getElementById(id);
  const landing = $("publicSite");
  const login = $("login");
  const showLogin = () => {
    landing?.classList.add("hidden");
    login?.classList.remove("hidden");
    $("loginForm")?.classList.remove("hidden");
    $("signupForm")?.classList.add("hidden");
    $("inviteSetupForm")?.classList.add("hidden");
    $("showSignup")?.classList.remove("hidden");
    $("showLogin")?.classList.add("hidden");
    $("trialLimits")?.classList.add("hidden");
    $("loginMessage").textContent = "Sign in to your KTBS workspace.";
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const showSignup = () => {
    showLogin();
    $("loginForm")?.classList.remove("signup-muted");
    $("showSignup")?.click();
    $("signupForm")?.scrollIntoView({behavior:"smooth",block:"center"});
  };
  document.querySelectorAll("[data-open-login]").forEach(button => button.addEventListener("click",showLogin));
  document.querySelectorAll("[data-open-signup]").forEach(button => button.addEventListener("click",showSignup));
  const invite = new URLSearchParams(location.search).get("type")==="invite" || new URLSearchParams(location.hash.slice(1)).get("type")==="invite";
  if(invite){landing?.classList.add("hidden");login?.classList.remove("hidden");}
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