/* BizzAssist website widget. Usage:
 * <script src="https://YOUR_APP/widget.js" data-widget="WIDGET_ID" async></script>
 * Adds a round launcher; opens the chat (/w/WIDGET_ID?embed=1) in an iframe panel.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var widgetId = script.getAttribute("data-widget");
  if (!widgetId || !/^[0-9a-f-]{36}$/i.test(widgetId) || window.__bizzassistLoaded) return;
  window.__bizzassistLoaded = true;

  var origin = new URL(script.src).origin;
  var color = script.getAttribute("data-color") || "#217a70";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  // same rule as onAccent() in components/chat-view.tsx: dark icon on light brand colours
  var ink = (function (m) {
    if (!m) return "#fff";
    var n = parseInt(m[1], 16);
    var lin = function (c) { var s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) > 0.45 ? "#111" : "#fff";
  })(/^#?([0-9a-f]{6})$/i.exec(color));
  var open = false;
  var frame = null;

  var chatIcon =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var closeIcon =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  var btn = document.createElement("button");
  btn.id = "bizzassist-launcher"; // stable ids so a host page can hide the widget on some screens
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = chatIcon;
  btn.style.cssText =
    "position:fixed;bottom:20px;" + side + ":20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "display:flex;align-items:center;justify-content:center;color:" + ink + ";background:" + color + ";" +
    "box-shadow:0 4px 16px rgba(0,0,0,.18);z-index:2147483646;transition:transform .12s cubic-bezier(.25,.1,.25,1)";
  btn.onmousedown = function () { btn.style.transform = "scale(.95)"; };
  btn.onmouseup = btn.onmouseleave = function () { btn.style.transform = ""; };

  var panel = document.createElement("div");
  panel.id = "bizzassist-panel";
  panel.style.cssText =
    "position:fixed;bottom:88px;" + side + ":20px;width:380px;height:600px;max-height:calc(100vh - 108px);" +
    "max-width:calc(100vw - 40px);border-radius:18px;overflow:hidden;background:#fff;" +
    "box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:2147483647;display:none;opacity:0;transform:translateY(8px);" +
    "transition:opacity .24s cubic-bezier(.32,.72,0,1),transform .24s cubic-bezier(.32,.72,0,1)";

  function fullScreenOnPhone() {
    var phone = window.innerWidth < 480;
    // clearing the inset shorthand also clears bottom/left/right, so set the desktop corner again
    panel.style.inset = phone ? "0" : "";
    if (!phone) { panel.style.bottom = "88px"; panel.style[side] = "20px"; }
    panel.style.width = phone ? "100%" : "380px";
    panel.style.height = phone ? "100%" : "600px";
    panel.style.maxHeight = phone ? "none" : "calc(100vh - 108px)";
    panel.style.maxWidth = phone ? "none" : "calc(100vw - 40px)";
    panel.style.borderRadius = phone ? "0" : "18px";
    btn.style.display = phone && open ? "none" : "flex";
  }

  function toggle(next) {
    open = typeof next === "boolean" ? next : !open;
    if (open && !frame) {
      frame = document.createElement("iframe");
      frame.src = origin + "/w/" + widgetId + "?embed=1";
      frame.title = "Chat";
      frame.allow = "clipboard-write";
      frame.style.cssText = "width:100%;height:100%;border:0;display:block";
      panel.appendChild(frame);
    }
    btn.innerHTML = open ? closeIcon : chatIcon;
    btn.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      panel.style.display = "block";
      requestAnimationFrame(function () { panel.style.opacity = "1"; panel.style.transform = "none"; });
    } else {
      panel.style.opacity = "0";
      panel.style.transform = "translateY(8px)";
      setTimeout(function () { if (!open) panel.style.display = "none"; }, 240);
    }
    fullScreenOnPhone();
  }

  btn.onclick = function () { toggle(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });
  window.addEventListener("resize", fullScreenOnPhone);
  // the embedded page can ask to close (phone full-screen has no launcher visible)
  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.type === "bizzassist:close") toggle(false);
  });

  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(btn);
    fullScreenOnPhone();
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
