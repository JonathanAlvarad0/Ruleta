/* ACAVEN DE R.L. — lógica de la experiencia */
(function ($) {
  "use strict";
  const baseConfig = JSON.parse(JSON.stringify(window.ACAVEN_CONFIG));
  let state = loadState();
  let spinning = false;
  let currentRotation = 0;
  let spinTickTimer = null;
  let pointerRafId = null;
  let lastPinIndex = null;
  let confettiWaveTimers = [];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(window.ACAVEN_CONFIG.storageKey));
      if (saved && saved.version === window.ACAVEN_CONFIG.version && Array.isArray(saved.prizes)) {
        return saved;
      }
    } catch (e) { /* archivo local o storage bloqueado: usar valores base */ }
    return clone(window.ACAVEN_CONFIG);
  }
  function saveState() {
    try { localStorage.setItem(window.ACAVEN_CONFIG.storageKey, JSON.stringify(state)); } catch (e) { /* continuar en modo memoria */ }
  }
  function text(path) {
    return path.split(".").reduce((obj, key) => obj && obj[key], state) || "";
  }
  function fillConfigText() {
    $("[data-config]").each(function () { $(this).text(text($(this).data("config"))); });
    $("#brand-logo").attr("src", state.brand.logo);
    $("#brand-watermark").attr("src", state.brand.logo);
    $("#modal-brand-logo").attr("src", state.brand.logo);
    $("#config-version").text(state.version);
    document.title = state.brand.name + " · " + state.brand.title;
  }
  function availablePrizes() { return state.prizes.filter(p => Number(p.stock) > 0); }
  function totalStock() { return availablePrizes().reduce((sum, p) => sum + Number(p.stock), 0); }
  function updateStatus() {
    const total = totalStock();
    $("#remaining-count").text(total);
    $("#remaining-label").text(total === 1 ? state.labels.remainingOne : state.labels.remaining);
    $("#spin-button").prop("disabled", spinning || total === 0);
    $("#spin-label").text("GIRAR");
    if (total === 0) $("#spin-label").text(state.labels.noStock);
  }
  function renderWheel() {
    const prizes = availablePrizes();
    const count = prizes.length;
    const $wheel = $("#wheel").empty();
    if (!count) { $wheel.css("background", "radial-gradient(circle,#174d99,#06194d)"); updateStatus(); return; }
    const colors = ["#126edc", "#093b9c", "#1595e8", "#2553c5", "#0d6bb5", "#1b2e91"];
    const segment = 360 / count;
    const stops = prizes.map((p, i) => `${colors[i % colors.length]} ${i * segment}deg ${(i + 1) * segment}deg`).join(",");
    $wheel.css("background", `conic-gradient(${stops})`);
    const narrowFactor = count >= 8 ? 0.76 : count >= 6 ? 0.88 : 1;
    prizes.forEach((prize, i) => {
      const centerAngle = i * segment + segment / 2;
      const $label = $("<span>", { class: "wheel-label", title: prize.title }).text(prize.title).css({
        width: `${Math.round(115 * narrowFactor)}px`,
        transform: `translate(-50%, -50%) rotate(${centerAngle - 90}deg) translateX(var(--label-radius, 148px))`
      });
      $wheel.append($label);
    });
    updateStatus();
  }
  function chooseUniform(prizes) {
    // El stock solo determina si participa; todos los premios disponibles tienen la misma probabilidad.
    return prizes[Math.floor(Math.random() * prizes.length)];
  }
  function getAudioContext() {
    if (!state.celebration.soundEnabled) return null;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!window.__acavenAudioCtx) {
        window.__acavenAudioCtx = new AudioContext();
      }
      if (window.__acavenAudioCtx.state === "suspended") {
        window.__acavenAudioCtx.resume();
      }
      return window.__acavenAudioCtx;
    } catch (e) {
      return null;
    }
  }
  function getCurrentWheelAngle() {
    const wheelEl = document.getElementById("wheel");
    if (!wheelEl) return currentRotation;
    const style = window.getComputedStyle(wheelEl);
    const transform = style.transform;
    if (!transform || transform === "none") return currentRotation;
    const values = transform.match(/matrix\(([^)]+)\)/);
    if (!values) return currentRotation;
    const parts = values[1].split(",").map(Number);
    const rad = Math.atan2(parts[1], parts[0]);
    const deg = (rad * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
  }
  function triggerPinRub(isSlowPhase) {
    const pointerEl = document.querySelector(".pointer");
    if (!pointerEl) return;
    pointerEl.classList.remove("pin-hit", "pin-slow");
    void pointerEl.offsetWidth;
    pointerEl.classList.add("pin-hit");
    if (isSlowPhase) {
      pointerEl.classList.add("pin-slow");
    }
  }
  function startPointerPinTracker(durationMs, pinCount) {
    stopPointerPinTracker();
    const startedAt = Date.now();
    const stepDeg = 360 / Math.max(4, pinCount);
    lastPinIndex = Math.floor(getCurrentWheelAngle() / stepDeg);

    // Dispara de inmediato al arrancar el giro para que no haya silencio inicial
    triggerPinRub(false);
    playTickSound(0, false);

    function track() {
      if (!spinning) return;
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / Math.max(1000, durationMs));
      const angle = getCurrentWheelAngle();
      const pinIndex = Math.floor(angle / stepDeg);

      if (pinIndex !== lastPinIndex) {
        lastPinIndex = pinIndex;
        const isSlowPhase = progress > 0.72;
        triggerPinRub(isSlowPhase);
        playTickSound(progress, isSlowPhase);
      }

      if (progress < 1) {
        pointerRafId = requestAnimationFrame(track);
      }
    }

    pointerRafId = requestAnimationFrame(track);
  }
  function stopPointerPinTracker() {
    if (pointerRafId) {
      cancelAnimationFrame(pointerRafId);
      pointerRafId = null;
    }
    document.querySelector(".pointer")?.classList.remove("pin-hit", "pin-slow");
  }
  function playTickSound(progress, isSuspense) {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const clickOsc = ctx.createOscillator();
      const gain = ctx.createGain();
      const clickGain = ctx.createGain();

      const baseFreq = isSuspense ? 1140 : 860 + (1 - progress) * 320;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.055);

      const volume = isSuspense ? 0.36 : 0.25;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      clickOsc.type = "triangle";
      clickOsc.frequency.setValueAtTime(2200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(520, now + 0.025);
      clickGain.gain.setValueAtTime(0.001, now);
      clickGain.gain.exponentialRampToValueAtTime(volume * 0.85, now + 0.003);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      osc.connect(gain).connect(ctx.destination);
      clickOsc.connect(clickGain).connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
      clickOsc.start(now);
      clickOsc.stop(now + 0.032);
    } catch (e) { /* audio no disponible */ }
  }
  function startSpinSound(durationMs, pinCount) {
    stopSpinSound();
    if (!state.celebration.soundEnabled) return;
    startPointerPinTracker(durationMs, pinCount);
  }
  function stopSpinSound() {
    if (spinTickTimer) {
      clearTimeout(spinTickTimer);
      spinTickTimer = null;
    }
    stopPointerPinTracker();
  }
  function playWinSound() {
    if (!state.celebration.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((frequency, i) => {
        const startAt = ctx.currentTime + i * 0.095;
        const dur = i === notes.length - 1 ? 0.65 : 0.34;
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(frequency, startAt);
        overtone.type = "sine";
        overtone.frequency.setValueAtTime(frequency * 2, startAt);
        gain.gain.setValueAtTime(0.001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.32, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
        osc.connect(gain);
        overtone.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        overtone.start(startAt);
        osc.stop(startAt + dur + 0.02);
        overtone.stop(startAt + dur + 0.02);
      });
    } catch (e) { /* audio no disponible */ }
  }
  function spawnConfettiBatch(count, delayOffsetSec, appendMode) {
    const colors = ["#ffd34f", "#ff2e4c", "#19b86b", "#fff5b0", "#27c7ff", "#ffffff"];
    const $box = $("#confetti");
    if (!appendMode) $box.empty();
    for (let i = 0; i < count; i++) {
      const sizeW = 7 + Math.random() * 9;
      const sizeH = 12 + Math.random() * 14;
      $("<i>", { class: "confetto" }).css({
        left: `${Math.random() * 100}%`,
        width: `${sizeW}px`,
        height: `${sizeH}px`,
        background: colors[i % colors.length],
        "--x": `${(Math.random() - .5) * 340}px`,
        animationDuration: `${2.1 + Math.random() * 2.9}s`,
        animationDelay: `${delayOffsetSec + Math.random() * 0.85}s`,
        transform: `rotate(${Math.random() * 360}deg)`
      }).appendTo($box);
    }
  }
  function launchConfetti() {
    confettiWaveTimers.forEach(t => clearTimeout(t));
    confettiWaveTimers = [];
    const baseCount = Math.max(220, Number(state.celebration.confettiPieces) || 260);
    spawnConfettiBatch(baseCount, 0, false);
    confettiWaveTimers.push(setTimeout(() => spawnConfettiBatch(Math.round(baseCount * 0.7), 0, true), 650));
    confettiWaveTimers.push(setTimeout(() => spawnConfettiBatch(Math.round(baseCount * 0.6), 0, true), 1450));
    confettiWaveTimers.push(setTimeout(() => $("#confetti").empty(), 7200));
  }
  function showWinner(prize) {
    $("#modal-brand-logo").attr("src", state.brand.logo);
    $("#winner-title").text(state.labels.winnerTitle);
    $("#winner-lead").text(state.labels.winnerLead);
    $("#winner-image").attr({ src: prize.image, alt: prize.title });
    $("#winner-prize").text(prize.title);
    $("#modal-continue").text(state.labels.close);
    $("#winner-modal").prop("hidden", false);
    launchConfetti();
    $("#modal-continue, #close-modal").trigger("focus");
  }
  function spin() {
    if (spinning || totalStock() === 0) return;
    const prizes = availablePrizes(), count = prizes.length, segment = 360 / count, winner = chooseUniform(prizes), index = prizes.findIndex(p => p.id === winner.id);
    spinning = true; updateStatus(); $(".stage").addClass("spin-active");
    const duration = Number(state.celebration.spinDurationMs) || 10000;
    const pinCount = Math.max(count * 3, 12);
    startSpinSound(duration, pinCount);
    const targetCenter = index * segment + segment / 2;
    const target = 360 - targetCenter;
    currentRotation += 360 * 6 + ((target - currentRotation) % 360 + 360) % 360;
    $("#wheel").css("transform", `rotate(${currentRotation}deg)`);
    setTimeout(() => {
      stopSpinSound();
      winner.stock = Math.max(0, Number(winner.stock) - 1);
      saveState();
      spinning = false;
      $(".stage").removeClass("spin-active");
      renderWheel();
      launchConfetti();
      playWinSound();
      showWinner(winner);
    }, duration + 100);
  }
  function renderMaintenance() {
    const $list = $("#prize-list").empty();
    state.prizes.forEach((prize, index) => {
      const $row = $("<div>", { class: "prize-row", "data-index": index });
      $row.append($("<img>", { src: prize.image, alt: prize.title }));
      const $title = $("<div>").append($("<label>").text(state.labels.title)).append($("<input>", { class: "title-field", value: prize.title }));
      const $stock = $("<div>").append($("<label>").text(state.labels.stock)).append($("<input>", { class: "stock-field", type: "number", min: 0, value: prize.stock }));
      const $image = $("<div>", { class: "image-field" }).append($("<label>").text(state.labels.image)).append($("<input>", { class: "image-field-input", value: prize.image }));
      const $delete = $("<button>", { class: "delete-prize", type: "button" }).text(state.labels.delete);
      $row.append($title, $stock, $image, $delete).appendTo($list);
    });
  }
  function routeIsMaintenance() { return location.hash.toLowerCase() === "#mantenimiento" || new URLSearchParams(location.search).get("mantenimiento") === "1"; }
  function applyRoute() { const maint = routeIsMaintenance(); $("#public-view").prop("hidden", maint); $("#maintenance-view").prop("hidden", !maint); if (maint) renderMaintenance(); }
  function flash(message) { $("#maintenance-message").text(message).addClass("show"); setTimeout(() => $("#maintenance-message").removeClass("show"), 1800); }
  function downloadConfig() {
    const output = "window.ACAVEN_CONFIG = " + JSON.stringify(state, null, 2) + ";\n";
    const blob = new Blob([output], { type: "application/javascript" }), url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "config.js"; a.click(); URL.revokeObjectURL(url);
  }
  function init() {
    fillConfigText(); renderWheel(); applyRoute();
    $("#spin-button").on("click", spin); $(document).on("keydown", e => { if (e.code === "Space" && !$(e.target).is("input,textarea,button")) { e.preventDefault(); spin(); } });
    $("#modal-continue, #close-modal").on("click", () => $("#winner-modal").prop("hidden", true)); $("#winner-modal").on("click", e => { if (e.target === e.currentTarget) $("#winner-modal").prop("hidden", true); });
    $(window).on("hashchange", applyRoute);
    $("#prize-list").on("input change", "input", function () { const $row = $(this).closest(".prize-row"), i = Number($row.data("index")), prize = state.prizes[i]; if ($(this).hasClass("title-field")) prize.title = $(this).val() || "Premio"; if ($(this).hasClass("stock-field")) prize.stock = Math.max(0, Number($(this).val()) || 0); if ($(this).hasClass("image-field-input")) { prize.image = $(this).val(); $row.find("img").attr("src", prize.image); } saveState(); renderWheel(); });
    $("#delete-prize").on("click", function () {});
    $("#prize-list").on("click", ".delete-prize", function () { const i = Number($(this).closest(".prize-row").data("index")); state.prizes.splice(i, 1); saveState(); renderMaintenance(); renderWheel(); flash("Premio eliminado"); });
    $("#add-prize").on("click", () => { state.prizes.push({ id: "premio-" + Date.now(), title: "Nuevo premio", image: "img/nuevo-premio.png", stock: 1, accent: "#36c7ff" }); saveState(); renderMaintenance(); renderWheel(); flash("Premio agregado"); });
    $("#reset-config").on("click", () => { if (window.confirm("¿Restaurar todos los valores base?")) { state = clone(baseConfig); saveState(); fillConfigText(); renderMaintenance(); renderWheel(); flash("Valores restaurados"); } });
    $("#download-config").on("click", downloadConfig); $("#copy-config").on("click", async () => { try { await navigator.clipboard.writeText("window.ACAVEN_CONFIG = " + JSON.stringify(state, null, 2) + ";"); flash(state.labels.copied); } catch (e) { downloadConfig(); } });
  }
  $(init);
})(jQuery);