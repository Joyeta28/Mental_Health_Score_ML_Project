const API_BASE = "https://mental-health-score-ml-project-1-60i2.onrender.com";
const PREDICT_URL = `${API_BASE}/predict`;
const MAX_SCORE = 10;

const form = document.getElementById("predictForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const againBtn = document.getElementById("againBtn");
const retryBtn = document.getElementById("retryBtn");
const resultCard = document.getElementById("resultCard");
const scoreValue = document.getElementById("scoreValue");
const scoreBadge = document.getElementById("scoreBadge");
const scoreInsight = document.getElementById("scoreInsight");
const miniStats = document.getElementById("miniStats");
const gBar = document.getElementById("gBar");
const gStop1 = document.getElementById("gStop1");
const gStop2 = document.getElementById("gStop2");
const errorTitle = document.getElementById("errorTitle");
const errorMsg = document.getElementById("errorMsg");
const loadingMsg = document.getElementById("loadingMsg");
const apiStatus = document.getElementById("apiStatus");
const apiStatusText = document.getElementById("apiStatusText");

const CIRC = 2 * Math.PI * 84;

const sliders = [
  { id: "avg_daily_usage_hours", out: "o-usage" },
  { id: "study_hours", out: "o-study" },
  { id: "sleep_hours_per_night", out: "o-sleep" },
  { id: "physical_activity_hours", out: "o-act" },
];

function setState(state) {
  resultCard.dataset.state = state;
}

function fillRange(range) {
  const min = +range.min, max = +range.max;
  const pct = ((+range.value - min) / (max - min)) * 100;
  range.style.setProperty("--p", `${pct}%`);
}

sliders.forEach(({ id, out }) => {
  const num = document.getElementById(id);
  const range = document.getElementById(`${id}_range`);
  const label = document.getElementById(out);

  const sync = (value) => {
    const v = value === "" ? 0 : Math.min(+value, +range.max);
    range.value = v;
    fillRange(range);
    label.textContent = `${value === "" ? 0 : value} h`;
  };

  range.addEventListener("input", () => {
    num.value = range.value;
    sync(range.value);
    clearError(num);
  });

  num.addEventListener("input", () => sync(num.value));
  fillRange(range);
});

const rules = {
  age: { min: 10, max: 100, int: true, label: "Age" },
  country: { text: true, label: "Country" },
  academic_level: { select: true, label: "Academic level" },
  most_used_platform: { select: true, label: "Platform" },
  purpose_of_use: { select: true, label: "Purpose" },
  avg_daily_usage_hours: { min: 0, max: 24, label: "Daily usage" },
  daily_unlocks: { min: 0, int: true, label: "Unlocks" },
  study_hours: { min: 0, max: 24, label: "Study hours" },
  physical_activity_hours: { min: 0, max: 2, label: "Physical activity" },
  sleep_hours_per_night: { min: 0, max: 24, label: "Sleep hours" },
};

function fieldWrap(el) {
  return el.closest(".field");
}

function showError(el, msg) {
  const wrap = fieldWrap(el);
  wrap.classList.add("invalid");
  wrap.querySelector(".error").textContent = msg;
}

function clearError(el) {
  const wrap = fieldWrap(el);
  wrap.classList.remove("invalid");
  wrap.querySelector(".error").textContent = "";
}

function validate() {
  let firstBad = null;

  const fail = (el, msg) => {
    showError(el, msg);
    firstBad = firstBad || el;
  };

  for (const [name, r] of Object.entries(rules)) {
    const el = form.elements[name];
    const val = el.value.trim();

    clearError(el);

    if (val === "") {
      fail(el, `${r.label} is required.`);
      continue;
    }

    if (r.text || r.select) continue;

    const n = Number(val);

    if (Number.isNaN(n)) {
      fail(el, "Enter a valid number.");
      continue;
    }

    if (r.int && !Number.isInteger(n)) {
      fail(el, "Must be a whole number.");
      continue;
    }

    if (r.min !== undefined && n < r.min) {
      fail(el, `Must be at least ${r.min}.`);
      continue;
    }

    if (r.max !== undefined && n > r.max) {
      fail(el, `Must be at most ${r.max}.`);
      continue;
    }
  }

  const stressChecked = form.querySelector('input[name="stress_level"]:checked');
  const stressEl = document.getElementById("s-low");

  clearError(stressEl);

  if (!stressChecked) {
    fail(stressEl, "Please select a stress level.");
  }

  return firstBad;
}

form.addEventListener("input", (e) => {
  if (e.target.name && e.target.type !== "range") {
    clearError(e.target);
  }
});

form.addEventListener("change", (e) => {
  if (e.target.name) {
    clearError(e.target);
  }
});

function buildPayload() {
  const f = form.elements;

  return {
    age: parseInt(f.age.value, 10),
    gender: form.querySelector('input[name="gender"]:checked').value,
    country: f.country.value.trim(),
    academic_level: f.academic_level.value,
    most_used_platform: f.most_used_platform.value,
    purpose_of_use: f.purpose_of_use.value,
    avg_daily_usage_hours: parseFloat(f.avg_daily_usage_hours.value),
    daily_unlocks: parseInt(f.daily_unlocks.value, 10),
    study_hours: parseFloat(f.study_hours.value),
    physical_activity_hours: parseFloat(f.physical_activity_hours.value),
    sleep_hours_per_night: parseFloat(f.sleep_hours_per_night.value),
    stress_level: form.querySelector('input[name="stress_level"]:checked').value,
  };
}

function interpret(score) {
  const s = score / MAX_SCORE;

  if (s >= 0.8) {
    return {
      label: "Excellent",
      color: "#10b981",
      c1: "#10b981",
      c2: "#22d3ee",
      text: "The model predicts a very healthy mental wellbeing profile. Keep up the balanced habits."
    };
  }

  if (s >= 0.6) {
    return {
      label: "Good",
      color: "#22c55e",
      c1: "#6366f1",
      c2: "#22d3ee",
      text: "Wellbeing looks generally positive. Small tweaks to sleep or screen time could help further."
    };
  }

  if (s >= 0.4) {
    return {
      label: "Moderate",
      color: "#f59e0b",
      c1: "#f59e0b",
      c2: "#fbbf24",
      text: "There are some signs of strain. Reducing screen time and improving sleep may make a difference."
    };
  }

  return {
    label: "Needs attention",
    color: "#ef4444",
    c1: "#ef4444",
    c2: "#f97316",
    text: "The model flags a lower wellbeing score. Consider healthier routines and talking with someone you trust or a professional."
  };
}

function animateNumber(el, to, duration = 1400) {
  const start = performance.now();

  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);

    el.textContent = (to * eased).toFixed(2);

    if (t < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
}

function showResult(score, payload) {
  const info = interpret(score);
  const pct = Math.max(0, Math.min(score / MAX_SCORE, 1));

  gStop1.setAttribute("stop-color", info.c1);
  gStop2.setAttribute("stop-color", info.c2);

  scoreBadge.textContent = info.label;
  scoreBadge.style.setProperty("--badge-color", info.color);
  scoreInsight.textContent = info.text;

  miniStats.innerHTML = `
    <div><b>${payload.avg_daily_usage_hours}h</b><span>Screen time</span></div>
    <div><b>${payload.sleep_hours_per_night}h</b><span>Sleep</span></div>
    <div><b>${payload.stress_level}</b><span>Stress</span></div>`;

  gBar.style.transition = "none";
  gBar.style.strokeDashoffset = CIRC;
  scoreValue.textContent = "0.00";

  setState("result");

  requestAnimationFrame(() => requestAnimationFrame(() => {
    gBar.style.transition = "";
    gBar.style.strokeDashoffset = CIRC * (1 - pct);
    animateNumber(scoreValue, score);
  }));

  if (window.matchMedia("(max-width: 960px)").matches) {
    resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

const loadingMessages = [
  "Sending data to the model",
  "Encoding student features",
  "Running the prediction",
];

let msgTimer;

function startLoading() {
  setState("loading");
  submitBtn.disabled = true;
  submitBtn.querySelector(".btn-label").textContent = "Predicting…";

  let i = 0;
  loadingMsg.textContent = loadingMessages[0];

  msgTimer = setInterval(() => {
    i = (i + 1) % loadingMessages.length;
    loadingMsg.textContent = loadingMessages[i];
  }, 1100);
}

function stopLoading() {
  clearInterval(msgTimer);
  submitBtn.disabled = false;
  submitBtn.querySelector(".btn-label").textContent = "Predict score";
}

function formatApiError(detail) {
  if (Array.isArray(detail)) {
    return detail
      .map((d) => `${(d.loc || []).slice(1).join(".") || "input"}: ${d.msg}`)
      .join("\n");
  }

  return typeof detail === "string"
    ? detail
    : "The server rejected the request.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const bad = validate();

  if (bad) {
    bad.scrollIntoView({ behavior: "smooth", block: "center" });

    if (bad.focus) {
      bad.focus({ preventScroll: true });
    }

    return;
  }

  const payload = buildPayload();

  startLoading();

  const started = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(PREDICT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let data = null;

    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      throw Object.assign(new Error("api"), {
        kind: "api",
        status: res.status,
        detail: data && data.detail,
      });
    }

    if (!data || typeof data.predicted_mental_health_score !== "number") {
      throw Object.assign(new Error("shape"), { kind: "shape" });
    }

    const elapsed = performance.now() - started;

    if (elapsed < 900) {
      await new Promise((r) => setTimeout(r, 900 - elapsed));
    }

    stopLoading();
    showResult(data.predicted_mental_health_score, payload);
    setApiStatus(true);

  } catch (err) {
    stopLoading();

    if (err.kind === "api") {
      showErrorCard(
        err.status === 422 ? "Invalid input" : `Server error (${err.status})`,
        formatApiError(err.detail)
      );

    } else if (err.kind === "shape") {
      showErrorCard(
        "Unexpected response",
        "The API replied, but the response didn't contain a predicted score."
      );

    } else if (err.name === "AbortError") {
      showErrorCard(
        "Request timed out",
        "The model took too long to respond. Please try again."
      );

    } else {
      setApiStatus(false);

      showErrorCard(
        "Can't reach the API",
        `Make sure your FastAPI server is running at ${API_BASE} and try again.`
      );
    }
  }
});

function showErrorCard(title, message) {
  errorTitle.textContent = title;
  errorMsg.textContent = message;
  errorMsg.style.whiteSpace = "pre-line";

  setState("error");
}

function resetAll() {
  form.reset();

  sliders.forEach(({ id, out }) => {
    document.getElementById(`${id}_range`).value = 0;
    fillRange(document.getElementById(`${id}_range`));
    document.getElementById(out).textContent = "0 h";
  });

  form.querySelectorAll(".field.invalid").forEach((f) => {
    f.classList.remove("invalid");
  });

  setState("idle");
}

resetBtn.addEventListener("click", resetAll);

againBtn.addEventListener("click", () => {
  resetAll();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

retryBtn.addEventListener("click", () => {
  setState("idle");
  form.requestSubmit();
});

function setApiStatus(online) {
  apiStatus.classList.toggle("online", online);
  apiStatus.classList.toggle("offline", !online);
  apiStatusText.textContent = online ? "API online" : "API offline";
}

async function checkApi() {
  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    setApiStatus(res.ok);
  } catch {
    setApiStatus(false);
  }
}

checkApi();
setInterval(checkApi, 15000);