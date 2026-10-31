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