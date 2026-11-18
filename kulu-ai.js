(() => {
  const style = document.createElement("style");
  style.textContent = `
    .kulu-ai-launch{position:fixed;right:26px;bottom:24px;z-index:9000;border:0;border-radius:999px;padding:13px 19px;background:#0aa3b3;color:#fff;font-weight:800;box-shadow:0 8px 28px #163b4a2b;display:flex;align-items:center;gap:9px}
    .kulu-ai-launch:hover{background:#087f8d}
    .kulu-ai-panel[hidden],.kulu-ai-launch[hidden],.kulu-ai-history[hidden]{display:none!important}
    .kulu-ai-panel{position:fixed;right:26px;bottom:84px;width:min(440px,calc(100vw - 28px));height:min(650px,calc(100vh - 115px));z-index:9001;background:#fff;border:1px solid #dce8eb;border-radius:18px;box-shadow:0 18px 55px #183b4a35;display:flex;flex-direction:column;overflow:hidden}
    .kulu-ai-head{padding:13px 16px;background:linear-gradient(120deg,#eafafb,#fff);border-bottom:1px solid #e5ebef;display:flex;justify-content:space-between;align-items:center;gap:8px}
    .kulu-ai-head strong{font:500 20px Georgia,serif;color:#172b35}.kulu-ai-head small{display:block;color:#6c7883;font-size:11px;margin-top:4px}
    .kulu-ai-head-actions{display:flex;align-items:center;gap:6px}
    .kulu-ai-head-actions button{border:1px solid #d9e8eb;border-radius:8px;background:#fff;color:#31525b;font-size:11px;font-weight:700;padding:7px 9px}
    .kulu-ai-close{border:0!important;background:transparent!important;font-size:24px!important;color:#65747c!important;padding:2px 6px!important}
    .kulu-ai-history{padding:10px 12px;border-bottom:1px solid #e5ebef;background:#fff;max-height:190px;overflow:auto}
    .kulu-ai-history-title{font-size:11px;font-weight:800;color:#61747b;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em}
    .kulu-ai-history-row{display:flex;gap:6px;align-items:center;margin:5px 0}
    .kulu-ai-history-open{flex:1;min-width:0;text-align:left;border:1px solid #e5edef;background:#fbfdfd;border-radius:8px;padding:8px 9px;color:#24343b;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .kulu-ai-history-action{border:0;background:transparent;color:#6b7d83;font-size:10px;padding:6px}
    .kulu-ai-history-empty{font-size:12px;color:#7a898e;padding:8px 2px}
    .kulu-ai-messages{padding:15px;flex:1;overflow:auto;background:#fbfdfd;display:flex;flex-direction:column;gap:10px}
    .kulu-ai-msg{max-width:90%;padding:10px 12px;border-radius:13px;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
    .kulu-ai-msg.assistant{align-self:flex-start;background:#eef7f8;color:#24343b;border-bottom-left-radius:4px}
    .kulu-ai-msg.user{align-self:flex-end;background:#0aa3b3;color:white;border-bottom-right-radius:4px}
    .kulu-ai-status{font-size:11px;color:#75838a;padding:0 15px 8px;min-height:18px}
    .kulu-ai-form{padding:12px;border-top:1px solid #e5ebef;display:flex;gap:8px;background:#fff}
    .kulu-ai-form textarea{min-height:43px;max-height:110px;resize:vertical;flex:1;font-size:13px;border:1px solid #d8e3e6;border-radius:9px;padding:9px}
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
    <div class="kulu-ai-head">
      <div><strong>Kulu AI Concierge</strong><small>Your KTBS travel assistant</small></div>
      <div class="kulu-ai-head-actions">
        <button type="button" data-action="new">＋ New chat</button>
        <button type="button" data-action="history">History</button>
        <button class="kulu-ai-close" type="button" aria-label="Close">×</button>
      </div>
    </div>
    <div class="kulu-ai-history" hidden>
      <div class="kulu-ai-history-title">Your conversations</div>
      <div class="kulu-ai-history-list"></div>
    </div>
    <div class="kulu-ai-messages" aria-live="polite"></div>
    <div class="kulu-ai-status" role="status"></div>
    <form class="kulu-ai-form"><textarea maxlength="4000" rows="2" placeholder="Ask Kulu AI…" required></textarea><button type="submit">Send</button></form>
    <div class="kulu-ai-foot">Conversation history is saved to your KTBS workspace · Verify prices and availability with a consultant</div>`;
  document.body.appendChild(panel);

  const messages = panel.querySelector(".kulu-ai-messages");
  const form = panel.querySelector("form");
  const input = form.querySelector("textarea");
  const status = panel.querySelector(".kulu-ai-status");
  const historyPanel = panel.querySelector(".kulu-ai-history");
  const historyList = panel.querySelector(".kulu-ai-history-list");
  const sendButton = form.querySelector("button");
  const history = [];
  const aiClient = window.supabase.createClient(window.KTBS_SUPABASE_URL, window.KTBS_SUPABASE_ANON_KEY);
  let currentConversationId = null;
  let currentOrganizationId = null;
  let currentUserId = null;
  let currentArchived = false;
  let busy = false;

  function addMessage(role, content) {
    const item = document.createElement("div");
    item.className = "kulu-ai-msg " + role;
    item.textContent = content;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }
  function showWelcome() {
    messages.innerHTML = "";
    addMessage("assistant", "Hello. I’m Kulu’s AI Concierge. I can help with service information, client enquiries and drafting responses. What would you like help with?");
  }
  function resetConversation() {
    currentConversationId = null;
    currentArchived = false;
    history.length = 0;
    showWelcome();
    status.textContent = "";
    input.disabled = false;
    sendButton.disabled = false;
    historyPanel.hidden = true;
    input.focus();
  }
  async function ensureWorkspace() {
    const { data: { user }, error: userError } = await aiClient.auth.getUser();
    if (userError || !user) throw new Error("Please sign in again to access your conversation history.");
    currentUserId = user.id;
    const { data: orgId, error } = await aiClient.rpc("current_organization_id");
    if (error || !orgId) throw new Error("Your active KTBS workspace could not be identified.");
    currentOrganizationId = orgId;
  }
  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  async function loadConversationList() {
    await ensureWorkspace();
    historyList.innerHTML = '<div class="kulu-ai-history-empty">Loading conversations…</div>';
    const { data, error } = await aiClient.from("kulu_ai_conversations")
      .select("id,title,last_message_at,archived_at")
      .eq("organization_id", currentOrganizationId)
      .eq("user_id", currentUserId)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    historyList.innerHTML = "";
    const rows = (data || []).filter(row => !!row.archived_at === showArchived);
    if (!rows.length) {
      historyList.innerHTML = '<div class="kulu-ai-history-empty">No conversations here yet.</div>';
      return;
    }
    rows.forEach(row => {
      const wrap = document.createElement("div");
      wrap.className = "kulu-ai-history-row";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "kulu-ai-history-open";
      open.textContent = (row.title || "New conversation") + " · " + formatDate(row.last_message_at);
      open.title = row.title || "New conversation";
      open.addEventListener("click", () => openConversation(row.id));
      const archive = document.createElement("button");
      archive.type = "button";
      archive.className = "kulu-ai-history-action";
      archive.textContent = row.archived_at ? "Restore" : "Archive";
      archive.addEventListener("click", () => setArchived(row.id, !row.archived_at));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "kulu-ai-history-action";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteConversation(row.id));
      wrap.append(open, archive, remove);
      historyList.appendChild(wrap);
    });
  }
  let showArchived = false;
  async function openConversation(id) {
    status.textContent = "Loading conversation…";
    const { data: conversation, error: conversationError } = await aiClient.from("kulu_ai_conversations")
      .select("id,title,archived_at")
      .eq("id", id)
      .single();
    if (conversationError) { status.textContent = conversationError.message; return; }
    const { data: rows, error } = await aiClient.from("kulu_ai_messages")
      .select("role,content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) { status.textContent = error.message; return; }
    currentConversationId = conversation.id;
    currentArchived = !!conversation.archived_at;
    history.length = 0;
    messages.innerHTML = "";
    (rows || []).forEach(row => {
      addMessage(row.role, row.content);
      history.push({ role: row.role, content: row.content });
    });
    historyPanel.hidden = true;
    input.disabled = currentArchived;
    sendButton.disabled = currentArchived;
    status.textContent = currentArchived ? "This conversation is archived. Restore it from History to continue." : "";
  }
  async function setArchived(id, archived) {
    const { error } = await aiClient.from("kulu_ai_conversations")
      .update({ archived_at: archived ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { status.textContent = error.message; return; }
    if (currentConversationId === id) currentArchived = archived;
    await loadConversationList();
    status.textContent = archived ? "Conversation archived." : "Conversation restored.";
  }
  async function deleteConversation(id) {
    if (!window.confirm("Permanently delete this conversation and its messages?")) return;
    const { error } = await aiClient.from("kulu_ai_conversations").delete().eq("id", id);
    if (error) { status.textContent = error.message; return; }
    if (currentConversationId === id) resetConversation();
    await loadConversationList();
    status.textContent = "Conversation deleted.";
  }
  async function createConversation(firstMessage) {
    const title = firstMessage.replace(/\s+/g, " ").trim().slice(0, 72) || "New conversation";
    const { data, error } = await aiClient.from("kulu_ai_conversations")
      .insert({ organization_id: currentOrganizationId, user_id: currentUserId, title })
      .select("id")
      .single();
    if (error) throw error;
    currentConversationId = data.id;
    return data.id;
  }
  async function saveMessage(role, content) {
    const { error } = await aiClient.from("kulu_ai_messages").insert({
      conversation_id: currentConversationId,
      organization_id: currentOrganizationId,
      user_id: currentUserId,
      role,
      content
    });
    if (error) throw error;
    const now = new Date().toISOString();
    const updates = { updated_at: now, last_message_at: now };
    if (role === "user" && history.length === 0) {
      updates.title = content.replace(/\s+/g, " ").trim().slice(0, 72) || "New conversation";
    }
    const result = await aiClient.from("kulu_ai_conversations").update(updates).eq("id", currentConversationId);
    if (result.error) throw result.error;
  }
  async function toggleHistory() {
    historyPanel.hidden = !historyPanel.hidden;
    if (!historyPanel.hidden) {
      showArchived = false;
      try { await loadConversationList(); }
      catch (error) { historyList.textContent = error.message || "Could not load history."; }
      const tabs = document.createElement("div");
      tabs.style.cssText = "display:flex;gap:8px;margin-bottom:8px";
      ["Recent", "Archived"].forEach((label, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "kulu-ai-history-action";
        button.textContent = label;
        button.addEventListener("click", async () => {
          showArchived = index === 1;
          try { await loadConversationList(); }
          catch (error) { historyList.textContent = error.message || "Could not load history."; }
        });
        tabs.appendChild(button);
      });
      const existing = historyPanel.querySelector(".kulu-ai-history-tabs");
      if (existing) existing.remove();
      tabs.className = "kulu-ai-history-tabs";
      historyPanel.insertBefore(tabs, historyList);
    }
  }
  function syncVisibility() {
    const app = document.getElementById("app");
    const signedIn = !!(app && !app.classList.contains("hidden"));
    launch.hidden = !signedIn;
    if (!signedIn) panel.hidden = true;
  }

  launch.addEventListener("click", async () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      input.focus();
      try { await ensureWorkspace(); await loadConversationList(); }
      catch (error) { status.textContent = error.message || "Conversation history is not available."; }
    }
  });
  panel.querySelector(".kulu-ai-close").addEventListener("click", () => { panel.hidden = true; });
  panel.querySelector('[data-action="new"]').addEventListener("click", resetConversation);
  panel.querySelector('[data-action="history"]').addEventListener("click", toggleHistory);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || currentArchived) return;
    const message = input.value.trim();
    if (!message) return;
    busy = true;
    addMessage("user", message);
    input.value = "";
    status.textContent = "Saving and asking Kulu AI…";
    sendButton.disabled = true;
    try {
      await ensureWorkspace();
      if (!currentConversationId) await createConversation(message);
      await saveMessage("user", message);
      history.push({ role: "user", content: message });
      const requestHistory = history.slice(0, -1).slice(-8);
      const conciergeFunction = window.KTBS_READ_ONLY_PREVIEW === true ? "kulu-ai-concierge-preview" : "kulu-ai-concierge";
      const { data, error } = await aiClient.functions.invoke(conciergeFunction, {
        body: { message, history: requestHistory }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.reply) throw new Error("No response received. Please try again.");
      addMessage("assistant", data.reply);
      await saveMessage("assistant", data.reply);
      history.push({ role: "assistant", content: data.reply });
      if (history.length > 8) history.splice(0, history.length - 8);
      status.textContent = "";
      await loadConversationList();
    } catch (error) {
      status.textContent = (error.message || "Kulu AI is not available yet.") + " Your message may already be saved in this conversation.";
    } finally {
      busy = false;
      sendButton.disabled = currentArchived;
      input.focus();
    }
  });

  const observer = new MutationObserver(syncVisibility);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  setInterval(syncVisibility, 1500);
  showWelcome();
  syncVisibility();
})();