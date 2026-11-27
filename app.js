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
  let spinFinishTimer = null;
  let spinFinished = false;
  let pendingWinnerSlot = null;

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
  function preloadPrizeImages() {
    const urls = new Set();
    if (state.brand && state.brand.logo) urls.add(state.brand.logo);
    if (Array.isArray(state.prizes)) {
      state.prizes.forEach(p => {
        if (p && p.image) urls.add(p.image);
      });
    }
    urls.forEach(src => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }
  function expandedStockPrizes() {
    const items = [];
    state.prizes.forEach((prize, prizeIndex) => {
      const qty = Math.max(0, Math.floor(Number(prize.stock) || 0));
      for (let unit = 0; unit < qty; unit++) {
        items.push({
          ...prize,
          prizeIndex,
          unitIndex: unit,
          slotId: `${prize.id || "premio"}-${prizeIndex}-${unit}`
        });
      }
    });
    return items;
  }
  function totalStock() {
    return state.prizes.reduce((sum, p) => sum + Math.max(0, Math.floor(Number(p.stock) || 0)), 0);
  }
  function updateStatus() {
    const total = totalStock();
    $("#remaining-count").text(total);
    $("#remaining-label").text(total === 1 ? state.labels.remainingOne : state.labels.remaining);
    $("#spin-button").prop("disabled", spinning || total === 0);
    $("#spin-label").text(total === 0 ? state.labels.noStock : (state.labels.spin || "GIRAR"));
  }
  function shortSlotLabel(title, count) {
    const clean = String(title || "Premio").trim();
    if (count <= 10) return clean;
    const words = clean.split(/\s+/).filter(w => !["de", "la", "el", "los", "las", "y"].includes(w.toLowerCase()));
    if (count >= 20) {
      return (words[0] || clean).slice(0, 10);
    }
    return words.slice(0, 2).join(" ").slice(0, 15);
  }
  function renderWheel() {
    const slots = expandedStockPrizes();
    const count = slots.length;
    const wheelEl = document.getElementById("wheel");
    if (!wheelEl) return;
    wheelEl.innerHTML = "";

    if (!count) {
      wheelEl.style.background = "radial-gradient(circle,#174d99,#06194d)";
      updateStatus();
      return;
    }

    const palette = ["#126edc", "#093b9c", "#1595e8", "#2553c5", "#0d6bb5", "#1b2e91"];
    const segment = 360 / count;
    const stops = slots.map((item, i) => {
      const fill = i % 2 === 0 ? palette[i % palette.length] : (item.accent || palette[(i + 1) % palette.length]);
      return `${fill} ${i * segment}deg ${(i + 1) * segment}deg`;
    }).join(",");
    wheelEl.style.background = `conic-gradient(${stops})`;

    const isMobile = window.innerWidth <= 640;
    const imgSize = count >= 22 ? (isMobile ? 16 : 20) : count >= 14 ? (isMobile ? 19 : 24) : (isMobile ? 24 : 30);
    const fontSize = count >= 22 ? (isMobile ? 8.5 : 10) : count >= 14 ? (isMobile ? 9.5 : 11) : (isMobile ? 10.5 : 12.5);
    const radialOffset = isMobile ? "18vw" : "132px";

    const fragment = document.createDocumentFragment();
    slots.forEach((slot, i) => {
      const centerAngle = i * segment + segment / 2;
      const slotEl = document.createElement("div");
      slotEl.className = "wheel-slot";
      slotEl.title = `${slot.title} (${Number(slot.stock)} disponibles)`;
      slotEl.style.transform = `translateY(-50%) rotate(${centerAngle - 90}deg)`;

      const trackEl = document.createElement("div");
      trackEl.className = "wheel-slot-track";
      trackEl.style.left = radialOffset;

      const labelEl = document.createElement("span");
      labelEl.className = "wheel-slot-label";
      labelEl.textContent = shortSlotLabel(slot.title, count);
      labelEl.style.fontSize = `${fontSize}px`;

      const imgEl = document.createElement("img");
      imgEl.className = "wheel-slot-img";
      imgEl.src = slot.image;
      imgEl.alt = slot.title;
      imgEl.loading = "eager";
      imgEl.decoding = "async";
      imgEl.style.width = `${imgSize}px`;
      imgEl.style.height = `${imgSize}px`;
      imgEl.onerror = function () { this.style.display = "none"; };

      trackEl.appendChild(labelEl);
      trackEl.appendChild(imgEl);
      slotEl.appendChild(trackEl);
      fragment.appendChild(slotEl);
    });

    wheelEl.appendChild(fragment);
    updateStatus();
    preloadPrizeImages();
  }
  function chooseUniformSlot(slots) {
    return slots[Math.floor(Math.random() * slots.length)];
  }
  function getAudioContext() {
    if (state.celebration && state.celebration.soundEnabled === false) return null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!window.__acavenAudioCtx) {
        window.__acavenAudioCtx = new AudioCtx();
      }
      if (window.__acavenAudioCtx.state === "suspended") {
        window.__acavenAudioCtx.resume().catch(() => {});
      }
      return window.__acavenAudioCtx;
    } catch (e) {
      return null;
    }
  }
  function getCurrentWheelAngle() {
    const wheelEl = document.getElementById("wheel");
    if (!wheelEl) return currentRotation;
    const transform = window.getComputedStyle(wheelEl).transform;
    if (!transform || transform === "none") return currentRotation;
    const match = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!match) return currentRotation;
    const parts = match[1].split(",").map(Number);
    const rad = Math.atan2(parts[1], parts[0]);
    return ((((rad * 180) / Math.PI) % 360) + 360) % 360;
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
    const startedAt = performance.now();
    const stepDeg = 360 / Math.max(4, pinCount);
    lastPinIndex = Math.floor(getCurrentWheelAngle() / stepDeg);

    triggerPinRub(false);
    playTickSound(0, false);

    function track(now) {
      if (!spinning) return;
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / Math.max(1000, durationMs));
      const angle = getCurrentWheelAngle();
      const pinIndex = Math.floor(angle / stepDeg);

      if (pinIndex !== lastPinIndex) {
        lastPinIndex = pinIndex;
        const isSlowPhase = progress > 0.72;
        triggerPinRub(isSlowPhase);
        playTickSound(progress, isSlowPhase);
      }

      if (progress < 1 && spinning) {
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

      const volume = isSuspense ? 0.32 : 0.22;
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
  // Celebración festiva con tambores, redobles e instrumentos de viento/metal
  function playFunApplauseCelebration(ctx, startAt) {
    try {
      function triggerDrumHit(at, isKick, velocity = 0.5) {
        if (isKick) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(145, at);
          osc.frequency.exponentialRampToValueAtTime(44, at + 0.18);

          gain.gain.setValueAtTime(0.001, at);
          gain.gain.linearRampToValueAtTime(velocity, at + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.22);

          osc.connect(gain).connect(ctx.destination);
          osc.start(at);
          osc.stop(at + 0.24);
        } else {
          const dur = 0.09;
          const len = Math.floor(ctx.sampleRate * dur);
          const buf = ctx.createBuffer(1, len, ctx.sampleRate);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < len; i++) {
            const env = Math.pow(1 - i / len, 2.2);
            ch[i] = (Math.random() * 2 - 1) * env;
          }

          const src = ctx.createBufferSource();
          src.buffer = buf;

          const bodyFilter = ctx.createBiquadFilter();
          bodyFilter.type = "bandpass";
          bodyFilter.frequency.setValueAtTime(780, at);
          bodyFilter.Q.setValueAtTime(0.9, at);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, at);
          gain.gain.linearRampToValueAtTime(velocity * 0.55, at + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.001, at + dur);

          src.connect(bodyFilter).connect(gain).connect(ctx.destination);
          src.start(at);
          src.stop(at + dur + 0.01);
        }
      }

      function triggerBrassNote(freq, at, dur, volume = 0.16) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(freq, at);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq * 1.003, at);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 3.2, at);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.5, at + dur);

        gain.gain.setValueAtTime(0.001, at);
        gain.gain.linearRampToValueAtTime(volume, at + 0.02);
        gain.gain.setValueAtTime(volume * 0.85, at + Math.max(0.03, dur - 0.06));
        gain.gain.exponentialRampToValueAtTime(0.001, at + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain).connect(ctx.destination);

        osc1.start(at);
        osc2.start(at);
        osc1.stop(at + dur + 0.02);
        osc2.stop(at + dur + 0.02);
      }

      const kickTimes = [0.00, 0.45, 0.90, 1.35, 1.75, 2.05, 2.35];
      kickTimes.forEach((t, i) => {
        triggerDrumHit(startAt + t, true, i === kickTimes.length - 1 ? 0.65 : 0.48);
      });

      const snareTimes = [
        0.22, 0.67, 1.12, 1.55,
        1.75, 1.85, 1.95, 2.15, 2.25, 2.45, 2.55, 2.65
      ];
      snareTimes.forEach((t, i) => {
        const isRoll = t >= 1.75;
        triggerDrumHit(startAt + t, false, isRoll ? 0.34 + (i % 3) * 0.06 : 0.28);
      });

      const fanfareNotes = [
        { freq: 523.25, at: 0.00, dur: 0.18, vol: 0.14 },
        { freq: 659.25, at: 0.22, dur: 0.18, vol: 0.14 },
        { freq: 783.99, at: 0.45, dur: 0.20, vol: 0.15 },
        { freq: 1046.5, at: 0.67, dur: 0.38, vol: 0.17 },
        { freq: 880.00, at: 1.12, dur: 0.18, vol: 0.14 },
        { freq: 783.99, at: 1.35, dur: 0.18, vol: 0.14 },
        { freq: 987.77, at: 1.55, dur: 0.16, vol: 0.15 },
        { freq: 1046.5, at: 1.75, dur: 0.95, vol: 0.20 }
      ];

      fanfareNotes.forEach(n => {
        triggerBrassNote(n.freq, startAt + n.at, n.dur, n.vol);
      });

      triggerBrassNote(523.25, startAt + 1.75, 0.95, 0.12);
      triggerBrassNote(659.25, startAt + 1.75, 0.95, 0.12);
    } catch (e) { /* audio no disponible */ }
  }
  function startSpinSound(durationMs, pinCount) {
    stopSpinSound();
    if (state.celebration && state.celebration.soundEnabled === false) return;
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
    if (state.celebration && state.celebration.soundEnabled === false) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playFunApplauseCelebration(ctx, ctx.currentTime);
  }
  function spawnConfettiBatch(count, delayOffsetSec, appendMode) {
    const colors = ["#ffd34f", "#ff2e4c", "#19b86b", "#fff5b0", "#27c7ff", "#ffffff"];
    const box = document.getElementById("confetti");
    if (!box) return;
    if (!appendMode) box.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const sizeW = 7 + Math.random() * 8;
      const sizeH = 12 + Math.random() * 13;
      const el = document.createElement("i");
      el.className = "confetto";
      el.style.left = `${Math.random() * 100}%`;
      el.style.width = `${sizeW}px`;
      el.style.height = `${sizeH}px`;
      el.style.background = colors[i % colors.length];
      el.style.setProperty("--x", `${(Math.random() - 0.5) * 320}px`);
      el.style.animationDuration = `${2.1 + Math.random() * 2.4}s`;
      el.style.animationDelay = `${delayOffsetSec + Math.random() * 0.65}s`;
      fragment.appendChild(el);
    }
    box.appendChild(fragment);
  }
  function launchConfetti() {
    confettiWaveTimers.forEach(t => clearTimeout(t));
    confettiWaveTimers = [];
    const isSmall = window.innerWidth <= 768;
    const configured = Number(state.celebration && state.celebration.confettiPieces) || 240;
    const baseCount = isSmall ? Math.min(95, configured) : Math.min(220, configured);
    spawnConfettiBatch(baseCount, 0, false);
    confettiWaveTimers.push(setTimeout(() => spawnConfettiBatch(Math.round(baseCount * 0.6), 0, true), 650));
    confettiWaveTimers.push(setTimeout(() => $("#confetti").empty(), 5600));
  }
  function showWinner(prize) {
    const modalEl = document.getElementById("winner-modal");
    const winImgEl = document.getElementById("winner-image");

    $("#modal-brand-logo").attr("src", state.brand.logo);
    $("#winner-title").text(state.labels.winnerTitle);
    $("#winner-lead").text(state.labels.winnerLead);
    $("#winner-prize").text(prize.title);
    $("#modal-continue").text(state.labels.close);

    if (winImgEl) {
      winImgEl.decoding = "async";
      winImgEl.alt = prize.title;
      winImgEl.src = prize.image;
    }

    if (modalEl) {
      modalEl.hidden = false;
    }

    launchConfetti();
    playWinSound();

    requestAnimationFrame(() => {
      const btn = document.getElementById("modal-continue");
      if (btn && typeof btn.focus === "function") {
        try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }
      }
    });
  }
  function completeSpin(winningSlot) {
    if (spinFinished) return;
    spinFinished = true;
    if (spinFinishTimer) {
      clearTimeout(spinFinishTimer);
      spinFinishTimer = null;
    }
    $("#wheel").off("transitionend.acaven");

    stopSpinSound();
    const targetPrize = state.prizes[winningSlot.prizeIndex];
    if (targetPrize) {
      targetPrize.stock = Math.max(0, Number(targetPrize.stock) - 1);
    }
    pendingWinnerSlot = winningSlot;
    saveState();
    spinning = false;
    $(".stage").removeClass("spin-active");
    updateStatus();
    showWinner(targetPrize || winningSlot);
  }
  function spin() {
    if (spinning || totalStock() === 0) return;
    getAudioContext();

    const slots = expandedStockPrizes();
    const count = slots.length;
    if (!count) return;

    const segment = 360 / count;
    const chosenSlot = chooseUniformSlot(slots);
    const index = slots.findIndex(s => s.slotId === chosenSlot.slotId);

    spinning = true;
    spinFinished = false;
    updateStatus();
    $(".stage").addClass("spin-active");

    const duration = Number(state.celebration && state.celebration.spinDurationMs) || 10000;
    const pinCount = Math.max(count * 2, 12);
    startSpinSound(duration, pinCount);

    const targetCenter = index * segment + segment / 2;
    const target = (360 - targetCenter) % 360;
    const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
    const deltaToTarget = ((target - normalizedCurrent) % 360 + 360) % 360;
    currentRotation += 360 * 6 + deltaToTarget;

    const wheelEl = document.getElementById("wheel");
    if (wheelEl) {
      wheelEl.style.transition = `transform ${duration}ms cubic-bezier(.08, .72, .12, 1)`;
      void wheelEl.offsetWidth;
      wheelEl.style.transform = `rotate3d(0, 0, 1, ${currentRotation}deg)`;
    }

    $("#wheel").off("transitionend.acaven").on("transitionend.acaven", function (e) {
      if (e.target === wheelEl && (!e.originalEvent || e.originalEvent.propertyName === "transform")) {
        completeSpin(chosenSlot);
      }
    });

    spinFinishTimer = setTimeout(() => completeSpin(chosenSlot), duration + 25);
  }
  function closeWinnerModal() {
    $("#winner-modal").prop("hidden", true);
    if (pendingWinnerSlot) {
      pendingWinnerSlot = null;
      renderWheel();
    }
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
    fillConfigText(); renderWheel(); applyRoute(); preloadPrizeImages();
    $("#spin-button").on("click", spin);
    $(document).on("keydown", e => { if (e.code === "Space" && !$(e.target).is("input,textarea,button")) { e.preventDefault(); spin(); } });
    $("#modal-continue, #close-modal").on("click", closeWinnerModal);
    $("#winner-modal").on("click", e => { if (e.target === e.currentTarget) closeWinnerModal(); });
    $(window).on("hashchange", applyRoute);
    $("#prize-list").on("input change", "input", function () {
      const $row = $(this).closest(".prize-row"), i = Number($row.data("index")), prize = state.prizes[i];
      if (!prize) return;
      if ($(this).hasClass("title-field")) prize.title = $(this).val() || "Premio";
      if ($(this).hasClass("stock-field")) prize.stock = Math.max(0, Math.floor(Number($(this).val()) || 0));
      if ($(this).hasClass("image-field-input")) { prize.image = $(this).val(); $row.find("img").attr("src", prize.image); }
      saveState();
      renderWheel();
    });
    $("#prize-list").on("click", ".delete-prize", function () {
      const i = Number($(this).closest(".prize-row").data("index"));
      state.prizes.splice(i, 1);
      saveState();
      renderMaintenance();
      renderWheel();
      flash("Premio eliminado");
    });
    $("#add-prize").on("click", () => {
      state.prizes.push({ id: "premio-" + Date.now(), title: "Nuevo premio", image: "img/nuevo-premio.png", stock: 1, accent: "#36c7ff" });
      saveState();
      renderMaintenance();
      renderWheel();
      flash("Premio agregado");
    });
    $("#reset-config").on("click", () => {
      if (window.confirm("¿Restaurar todos los valores base?")) {
        state = clone(baseConfig);
        saveState();
        fillConfigText();
        renderMaintenance();
        renderWheel();
        flash("Valores restaurados");
      }
    });
    $("#download-config").on("click", downloadConfig);
    $("#copy-config").on("click", async () => {
      try { await navigator.clipboard.writeText("window.ACAVEN_CONFIG = " + JSON.stringify(state, null, 2) + ";"); flash(state.labels.copied); }
      catch (e) { downloadConfig(); }
    });
  }
  $(init);
})(jQuery);