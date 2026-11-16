(() => {
  const style = document.createElement("style");
  style.textContent = `
    .kulu-ai-launch{position:fixed;right:26px;bottom:24px;z-index:9000;border:0;border-radius:999px;padding:13px 19px;background:#0aa3b3;color:#fff;font-weight:800;box-shadow:0 8px 28px #163b4a2b;display:flex;align-items:center;gap:9px}
    .kulu-ai-launch:hover{background:#087f8d}
    .kulu-ai-panel{position:fixed;right:26px;bottom:84px;width:min(390px,calc(100vw - 28px));height:min(570px,calc(100vh - 115px));z-index:9001;background:#fff;border:1px solid #dce8eb;border-radius:18px;box-shadow:0 18px 55px #183b4a35;display:flex;flex-direction:column;overflow:hidden}
    .kulu-ai-head{padding:17px 18px;background:linear-gradient(120deg,#eafafb,#fff);border-bottom:1px solid #e5ebef;display:flex;justify-content:space-between;align-items:center}
    .kulu-ai-head strong{font:500 20px Georgia,serif;color:#172b35}.kulu-ai-head small{display:block;color:#6c7883;font-size:11px;margin-top:4px}
    .kulu-ai-close{border:0;background:transparent;font-size:24px;color:#65747c}
    .kulu-ai-messages{padding:15px;flex:1;overflow:auto;background:#fbfdfd;display:flex;flex-direction:column;gap:10px}
    .kulu-ai-msg{max-width:90%;padding:10px 12px;border-radius:13px;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
    .kulu-ai-msg.assistant{align-self:flex-start;background:#eef7f8;color:#24343b;border-bottom-left-radius:4px}
    .kulu-ai-msg.user{align-self:flex-end;background:#0aa3b3;color:white;border-bottom-right-radius:4px}
    .kulu-ai-status{font-size:11px;color:#75838a;padding:0 15px 8px;min-height:18px}
    .kulu-ai-form{padding:12px;border-top:1px solid #e5ebef;display:flex;gap:8px;background:#fff}
    .kulu-ai-form textarea{min-height:43px;max-height:100px;resize:vertical;flex:1;font-size:13px}
    .kulu-ai-form button{border:0;border-radius:9px;background:#0aa3b3;color:#fff;font-weight:800;padding:0 15px}
    .kulu-ai-foot{font-size:10px;color:#87939a;text-align:center;padding:0 10px 10px}
    @media(max-width:600px){.kulu-ai-launch{right:14px;bottom:14px}.kulu-ai-panel{right:14px;bottom:72px}}
  `;
  document.head.appendChild(style);

  const launch = document.createElement("button");
  launch.className = "kulu-ai-launch";
  launch.type = "button";
  launch.innerHTML = "✦ <span>Kulu AI Concierge</span>";
  launch.hidden = true;
  document.body.appendChild(launch);

  const panel = document.createElement("section");
  panel.className = "kulu-ai-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="kulu-ai-head"><div><strong>Kulu AI Concierge</strong><small>Your KTBS travel assistant</small></div><button class="kulu-ai-close" type="button" aria-label="Close">×</button></div>
    <div class="kulu-ai-messages" aria-live="polite"><div class="kulu-ai-msg assistant">Hello. I’m Kulu’s AI Concierge. I can help with service information, client enquiries and drafting responses. What would you like help with?</div></div>
    <div class="kulu-ai-status" role="status"></div>
    <form class="kulu-ai-form"><textarea maxlength="4000" rows="2" placeholder="Ask Kulu AI…" required></textarea><button type="submit">Send</button></form>
    <div class="kulu-ai-foot">AI assistance · Please verify prices and availability with a consultant</div>`;
  document.body.appendChild(panel);

  const messages = panel.querySelector(".kulu-ai-messages");
  const form = panel.querySelector("form");
  const input = form.querySelector("textarea");
  const status = panel.querySelector(".kulu-ai-status");
  const history = [];

  function addMessage(role, content) {
    const item = document.createElement("div");
    item.className = "kulu-ai-msg " + role;
    item.textContent = content;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }
  function syncVisibility() {
    const signedIn = !!(window.sb && window.me && window.organization);
    launch.hidden = !signedIn;
    if (!signedIn) panel.hidden = true;
  }
  launch.addEventListener("click", () => { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); });
  panel.querySelector(".kulu-ai-close").addEventListener("click", () => { panel.hidden = true; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addMessage("user", message);
    input.value = "";
    status.textContent = "Kulu AI is thinking…";
    form.querySelector("button").disabled = true;
    try {
      const { data, error } = await window.sb.functions.invoke("kulu-ai-concierge", {
        body: { message, history: history.slice(-8) }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.reply) throw new Error("No response received. Please try again.");
      addMessage("assistant", data.reply);
      history.push({ role: "user", content: message }, { role: "assistant", content: data.reply });
      if (history.length > 8) history.splice(0, history.length - 8);
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message || "Kulu AI is not available yet.";
    } finally {
      form.querySelector("button").disabled = false;
      input.focus();
    }
  });

  const observer = new MutationObserver(syncVisibility);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  setInterval(syncVisibility, 1500);
  syncVisibility();
})();