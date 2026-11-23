(() => {
  "use strict";

  // ────────────── data prep ──────────────
  const CAT = {
    vocab: { label: "文字・語彙", en: "Vocabulary", color: "#3b7be8" },
    grammar: { label: "文法", en: "Grammar", color: "#c2408f" },
    reading: { label: "読解", en: "Reading", color: "#17a07c" },
    listening: { label: "聴解", en: "Listening", color: "#e07b17" },
  };
  const MONTH = { 7: "July", 12: "December" };

  // Warning for questions whose key digit is probably wrong (see `disputed` in data/exams.js).
  const disputeHtml = (q) => q.disputed ? `<div class="dispute">⚠ Uncertain key. The key marks <b>${q.answer}</b> as correct, but I think <b>${q.disputed}</b> is right. Not settled yet, so don't trust either digit blindly.</div>` : "";

  // Expand compact answer strings into question objects.
  for (const ex of window.EXAMS) {
    ex.title = `${ex.year}年${ex.month}月`;
    ex.titleEn = `${MONTH[ex.month] || ex.month} ${ex.year}`;
    ex.questions = [];
    ex.parts.forEach((part, pi) => {
      let n = 1;
      part.groups = part.mondai.map(([m, ans, cat, flags = ""]) => {
        if (!part.continuous) n = 1;
        const qs = [...ans].map((ch) => {
          const q = {
            id: `${pi}-${m}-${n}`, part: pi, mondai: m, num: n, cat,
            answer: ch === "?" ? null : Number(ch),
            unofficial: flags.includes("u"),
            ...(ex.disputed && ex.disputed[`${pi}-${m}-${n}`] ? { disputed: ex.disputed[`${pi}-${m}-${n}`] } : {}),
          };
          n++;
          ex.questions.push(q);
          return q;
        });
        return { m, cat, unofficial: flags.includes("u"), qs };
      });
      part.qs = part.groups.flatMap((g) => g.qs);
    });
    ex.graded = ex.questions.filter((q) => q.answer != null);
    // attach transcribed text (data/questions/<id>.js) when available
    const bank = (window.QBANK || {})[ex.id];
    ex.passages = bank ? bank.passages : {};
    ex.hasText = !!bank;
    for (const q of ex.questions) {
      const t = bank && bank.questions[q.id];
      if (t) { q.text = t; q.type = t.type; }
    }
  }
  const QTYPES = window.QTYPES || {};
  const typeLabel = (t) => (QTYPES[t] ? QTYPES[t] : { ja: t || "", en: "" });
  const getMode = () => store.get("jlpt:mode", "text");
  const examById = (id) => window.EXAMS.find((e) => e.id === id);

  // ────────────── storage ──────────────
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const stateKey = (id) => `jlpt:attempt:${id}`;
  const histKey = (id) => `jlpt:history:${id}`;
  const freshState = () => ({ answers: {}, elapsed: {}, submitted: false, startedAt: Date.now() });
  const loadState = (id) => store.get(stateKey(id), null);
  const saveState = (id, s) => store.set(stateKey(id), s);

  // ────────────── scoring ──────────────
  function score(ex, answers) {
    const res = { correct: 0, wrong: 0, skipped: 0, total: ex.graded.length, byCat: {}, byPart: [] };
    ex.parts.forEach((p, i) => (res.byPart[i] = { correct: 0, total: 0 }));
    for (const q of ex.graded) {
      const a = answers[q.id];
      const c = (res.byCat[q.cat] ||= { correct: 0, total: 0 });
      c.total++; res.byPart[q.part].total++;
      if (a == null) res.skipped++;
      else if (a === q.answer) { res.correct++; c.correct++; res.byPart[q.part].correct++; }
      else res.wrong++;
    }
    res.pct = res.total ? Math.round((res.correct / res.total) * 1000) / 10 : 0;
    return res;
  }
  // ────────────── JLPT scaled score (estimate) ──────────────
  // Official structure for N2 and N3: three scoring sections of 0–60 each (180 total).
  // A pass needs the overall pass mark AND at least 19 in every section.
  // The real exam uses equated scaling that isn't published, so this is an estimate:
  // each section = 60 × (weighted points earned ÷ weighted points available), with the
  // per-type weights commonly used by prep schools for these papers.
  const JLPT_RULES = { N2: { pass: 90, min: 19 }, N3: { pass: 95, min: 19 } };
  const JLPT_SECTIONS = [
    { key: "lang", ja: "言語知識（文字・語彙・文法）", en: "Language knowledge", cats: ["vocab", "grammar"] },
    { key: "read", ja: "読解", en: "Reading", cats: ["reading"] },
    { key: "listen", ja: "聴解", en: "Listening", cats: ["listening"] },
  ];
  const TYPE_WEIGHT = {
    kanji_reading: 1, orthography: 1, word_formation: 1, context: 1, paraphrase: 1, usage: 2,
    grammar_form: 1, sentence_order: 2, text_grammar: 2,
    short_passage: 2, mid_passage: 2, long_passage: 3, integrated_reading: 3, thematic_reading: 3, info_retrieval: 3,
    task_listening: 2, point_listening: 2, summary_listening: 2, utterance: 1, quick_response: 1, integrated_listening: 3,
  };
  function jlptScore(ex, answers) {
    const rule = JLPT_RULES[ex.level];
    const sections = JLPT_SECTIONS.map((s) => {
      let got = 0, max = 0, n = 0;
      for (const q of ex.graded) {
        if (!s.cats.includes(q.cat)) continue;
        const w = TYPE_WEIGHT[q.type] || 1;
        max += w; n++;
        if (answers[q.id] === q.answer) got += w;
      }
      const score = max ? Math.round((60 * got) / max) : null;
      return { ...s, score, graded: n > 0, passedMin: score != null && score >= rule.min };
    });
    const complete = sections.every((s) => s.graded);
    const total = sections.reduce((a, s) => a + (s.score || 0), 0);
    const failedSections = sections.filter((s) => s.graded && !s.passedMin);
    const passed = complete ? total >= rule.pass && !failedSections.length : null;
    return { sections, total, complete, passed, pass: rule.pass, min: rule.min, failedSections };
  }

  const qState = (q, answers) => {
    const a = answers[q.id];
    if (q.answer == null) return "nk";
    if (a == null) return "sk";
    return a === q.answer ? "ok" : "ng";
  };

  // ────────────── helpers ──────────────
  const $app = document.getElementById("app");
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = (s) => {
    s = Math.max(0, Math.floor(s));
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return (hh ? hh + ":" + String(mm).padStart(2, "0") : mm) + ":" + String(ss).padStart(2, "0");
  };
  const pageSrc = (ex, i) => `exams/${ex.id}/p${String(i).padStart(2, "0")}.jpg`;
  const pctColor = (p) => (p >= 80 ? "var(--good)" : p >= 55 ? "var(--accent)" : p >= 40 ? "var(--warn)" : "var(--bad)");
  const qLabel = (ex, q) => {
    const p = ex.parts[q.part];
    return p.continuous ? `${q.num}` : `${q.mondai}-${q.num}`;
  };

  // theme
  const applyTheme = () => {
    const t = store.get("jlpt:theme", null);
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  };
  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    store.set("jlpt:theme", cur === "dark" ? "light" : "dark");
    applyTheme();
  };
  applyTheme();

  const topbar = () => `
    <header class="topbar">
      <a class="brand" href="#/"><span class="brand-mark jp">試</span><span>JLPT Practice</span></a>
      <span class="spacer"></span>
      <button class="icon-btn" data-act="theme" title="Toggle theme" aria-label="Toggle theme">◐</button>
    </header>`;

  // ────────────── router ──────────────
  let cleanup = null;
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    window.scrollTo(0, 0);
    if (parts[0] === "exam" && examById(parts[1])) {
      const ex = examById(parts[1]);
      if (parts[2] === "results") return renderResults(ex);
      if (parts[2] === "review") return renderTest(ex, { review: true, focus: parts[3] });
      return renderTest(ex, {});
    }
    if (parts[0] === "drill" && (parts[1] === "N2" || parts[1] === "N3") && (QTYPES[parts[2]] || parts[2] === "mistakes")) return renderDrill(parts[1], parts[2]);
    const level = parts[0] === "N3" ? "N3" : parts[0] === "N2" ? "N2" : store.get("jlpt:level", "N2");
    const view = parts[0] ? (parts[1] === "types" ? "types" : "tests") : store.get("jlpt:homeview", "tests");
    renderHome(level, view);
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act='theme']");
    if (t) toggleTheme();
  });

  // ────────────── modal ──────────────
  function confirmModal({ title, body, ok = "OK", cancel = "Cancel", danger = false }) {
    return new Promise((resolve) => {
      const node = h(`<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3><p>${body}</p>
        <div class="actions-row"><button class="btn ghost" data-r="0">${esc(cancel)}</button>
        <button class="btn ${danger ? "danger" : ""}" data-r="1">${esc(ok)}</button></div></div></div>`);
      const back = node.firstElementChild;
      document.body.appendChild(back);
      const done = (v) => { back.remove(); document.removeEventListener("keydown", onKey); resolve(v); };
      const onKey = (e) => { if (e.key === "Escape") done(false); if (e.key === "Enter") done(true); };
      document.addEventListener("keydown", onKey);
      back.addEventListener("click", (e) => {
        if (e.target === back) return done(false);
        const b = e.target.closest("[data-r]"); if (b) done(b.dataset.r === "1");
      });
      back.querySelector("[data-r='1']").focus();
    });
  }

  // ────────────── home ──────────────
  function renderHome(level, view = "tests") {
    store.set("jlpt:level", level);
    store.set("jlpt:homeview", view);
    document.title = `JLPT ${level} Practice`;
    if (view === "types") return renderTypes(level);
    const exams = window.EXAMS.filter((e) => e.level === level);
    const cards = exams.map((ex) => {
      const st = loadState(ex.id);
      const hist = store.get(histKey(ex.id), []);
      const last = hist[hist.length - 1];
      const best = hist.reduce((m, x) => Math.max(m, x.pct), 0);
      const answered = st ? Object.keys(st.answers).length : 0;
      const inProgress = st && !st.submitted && answered > 0;
      const warn = ex.notes.length ? `<span class="chip warn" title="${esc(ex.notes.join(" "))}">⚠ ${ex.questions.some((q) => q.answer == null) ? "Listening not graded" : ex.questions.some((q) => q.unofficial) ? "Some answers unofficial" : "No listening booklet"}</span>` : "";
      const scoreBlock = last
        ? `<div class="score-line"><div class="pct" style="color:${pctColor(last.pct)}">${last.pct}%</div>
            <div class="mini-bar"><i style="width:${last.pct}%;background:${pctColor(last.pct)}"></i></div>
            <div class="lbl">last<br>best ${best}%</div>
            ${last.jlpt ? `<div class="jl-mini"><b>${last.jlpt.total}</b><span>/180</span>${last.jlpt.passed == null ? "" : last.jlpt.passed ? '<span class="jl-badge pass sm">Pass</span>' : '<span class="jl-badge fail sm">Fail</span>'}</div>` : ""}</div>`
        : `<div class="score-line"><div class="lbl">Not attempted yet</div></div>`;
      const primary = inProgress
        ? `<a class="btn" href="#/exam/${ex.id}">Continue (${answered}/${ex.questions.length})</a>`
        : st && st.submitted
          ? `<a class="btn" href="#/exam/${ex.id}/results">View results</a>`
          : `<a class="btn" href="#/exam/${ex.id}">Start test</a>`;
      const secondary = st && st.submitted ? `<button class="btn ghost" data-retake="${ex.id}">Retake</button>` : "";
      return `<article class="exam-card">
        <div class="exam-card-head"><div><h3 class="jp">${ex.title}</h3><div class="sub">${ex.titleEn} · ${ex.pages} pages</div></div>
        <span class="level-badge">${ex.level}</span></div>
        <div class="exam-meta">
          ${ex.parts.map((p) => `<span class="chip jp">${esc(p.short)} ${p.qs.length}問</span>`).join("")}
          ${warn}
        </div>
        ${scoreBlock}
        <div class="exam-actions">${primary}${secondary}</div>
      </article>`;
    }).join("");
    $app.innerHTML = `${topbar()}
      <main class="home">
        <section class="hero">
          <h1>Past exam practice</h1>
          <p>Work through real past JLPT papers. Read the original booklet, fill in the answer sheet, and get your score when you hand it in. Then go back and review every question. Your progress saves in this browser.</p>
        </section>
        ${homeTabs(level, "tests")}
        <section class="exam-grid">${cards}</section>
      </main>`;
    $app.querySelectorAll("[data-retake]").forEach((b) => b.addEventListener("click", async () => {
      const ok = await confirmModal({ title: "Retake this test?", body: "This clears your current answers. Past scores stay in your history.", ok: "Retake", danger: true });
      if (!ok) return;
      saveState(b.dataset.retake, freshState());
      location.hash = `#/exam/${b.dataset.retake}`;
    }));
  }

  // ────────────── practice by question type ──────────────
  function homeTabs(level, view) {
    const sub = view === "types" ? "/types" : "";
    return `<div class="home-tabs">
      <div class="level-tabs" role="tablist">
        ${["N2", "N3"].map((l) => `<a role="tab" class="${l === level ? "active" : ""}" href="#/${l}${sub}">${l}</a>`).join("")}
      </div>
      <div class="view-tabs" role="tablist">
        <a role="tab" class="${view === "tests" ? "active" : ""}" href="#/${level}">Full tests</a>
        <a role="tab" class="${view === "types" ? "active" : ""}" href="#/${level}/types">By question type</a>
      </div>
    </div>`;
  }

  // Questions that can be drilled on their own: graded, transcribed, not listening
  // (listening needs the whole recording), and not a placeholder for missing source text.
  function drillPool(level, type) {
    return window.EXAMS.filter((e) => e.level === level).flatMap((ex) => ex.questions
      .filter((q) => q.type === type && q.answer != null && q.text && q.cat !== "listening"
        && !(q.text.prompt || "").includes("掲載されていません")
        && !(q.text.passage && JSON.stringify(ex.passages[q.text.passage] || "").includes("掲載されていません"))
        && !q.text.choices.every((c) => /^\d$/.test(c)))
      .map((q) => ({ ex, q, uid: `${ex.id}|${q.id}` })));
  }
  const drillKey = (level, type) => `jlpt:drill:${level}:${type}`;
  const drillStats = (level, type) => store.get(drillKey(level, type), { sessions: [], missed: [] });

  // "My mistakes": every drillable question you got wrong, either in a submitted full test or in a
  // by-type drill, minus the ones you have since answered correctly in the mistakes drill.
  const MISTAKES = { ja: "間違い復習", en: "My mistakes", cat: "mistakes" };
  const fixedKey = (level) => `jlpt:mistakes:${level}`;
  const fixedSet = (level) => new Set(store.get(fixedKey(level), []));
  function mistakesPool(level) {
    const types = Object.keys(QTYPES).filter((t) => QTYPES[t].cat !== "listening");
    const all = new Map();
    for (const t of types) for (const it of drillPool(level, t)) all.set(it.uid, it);
    const wrong = new Set();
    for (const t of types) drillStats(level, t).missed.forEach((u) => wrong.add(u));
    for (const ex of window.EXAMS.filter((e) => e.level === level)) {
      const st = loadState(ex.id);
      if (!st || !st.submitted) continue;
      for (const q of ex.questions) {
        const a = st.answers[q.id];
        if (q.answer != null && a != null && a !== q.answer) wrong.add(`${ex.id}|${q.id}`);
      }
    }
    const fixed = fixedSet(level);
    return [...wrong].filter((u) => all.has(u) && !fixed.has(u)).map((u) => all.get(u));
  }

  function renderTypes(level) {
    const types = Object.keys(QTYPES).filter((t) => QTYPES[t].cat !== "listening");
    const groups = ["vocab", "grammar", "reading"].map((cat) => {
      const rows = types.filter((t) => QTYPES[t].cat === cat).map((t) => {
        const pool = drillPool(level, t);
        if (!pool.length) return "";
        const s = drillStats(level, t);
        const last = s.sessions[s.sessions.length - 1];
        const lastPct = last ? Math.round((last.c / last.n) * 100) : null;
        const exams = new Set(pool.map((p) => p.ex.id)).size;
        return `<a class="type-card" href="#/drill/${level}/${t}">
          <div class="tc-top"><b class="jp">${esc(QTYPES[t].ja)}</b><span class="muted">${esc(QTYPES[t].en)}</span></div>
          <div class="tc-meta"><span class="chip">${pool.length} questions</span><span class="chip">${exams} exams</span>${s.missed.length ? `<span class="chip warn">${s.missed.length} to review</span>` : ""}</div>
          ${last ? `<div class="tc-score"><div class="mini-bar"><i style="width:${lastPct}%;background:${pctColor(lastPct)}"></i></div><span style="color:${pctColor(lastPct)}">${lastPct}%</span><span class="muted">last</span></div>` : `<div class="tc-score muted">Not practised yet</div>`}
        </a>`;
      }).join("");
      return rows ? `<section class="type-group"><h2 class="jp"><span class="cat ${cat}">${CAT[cat].label}</span> ${CAT[cat].en}</h2><div class="type-grid">${rows}</div></section>` : "";
    }).join("");
    const mp = mistakesPool(level);
    const mCard = mp.length ? `<section class="type-group"><div class="type-grid"><a class="type-card mistakes" href="#/drill/${level}/mistakes">
          <div class="tc-top"><b class="jp">${MISTAKES.ja}</b><span class="muted">${MISTAKES.en}</span></div>
          <div class="tc-meta"><span class="chip warn">${mp.length} to review</span><span class="chip">${new Set(mp.map((p) => p.q.type)).size} question types</span></div>
          <div class="muted small-hint">Everything you got wrong in tests and drills. Answer one correctly and it leaves the list.</div></a></div></section>` : "";
    $app.innerHTML = `${topbar()}
      <main class="home">
        <section class="hero">
          <h1>Practice by question type</h1>
          <p>Drill one kind of question at a time, pulled from every ${level} paper. You see whether you're right as soon as you answer. Listening isn't included here because those questions need the full recording; practise them in the full tests.</p>
        </section>
        ${homeTabs(level, "types")}
        ${mCard}
        ${groups}
      </main>`;
  }

  // highlight the blank a text-grammar question is about and bring it into view
  function markBlank(q) {
    const b = [...$app.querySelectorAll(".passage .blank")].find((x) => x.textContent.trim() === String(q.num));
    if (b) { b.classList.add("cur"); b.scrollIntoView({ block: "center" }); }
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function passageBlocks(ex, pid) {
    const p = ex.passages[pid]; if (!p) return "";
    return p.blocks.map((b) => b.h ? `<h4 class="jp">${b.h}</h4>` : b.img ? `<img class="p-img" src="${pageSrc(ex, b.img)}" alt="Booklet page ${b.img}" />` : `<p class="jp">${b.p}</p>`).join("");
  }

  function renderDrill(level, type) {
    const mistakesMode = type === "mistakes";
    const tl = mistakesMode ? MISTAKES : QTYPES[type];
    const pool = mistakesMode ? mistakesPool(level) : drillPool(level, type);
    document.title = `${tl.ja} · ${level} practice`;
    let stats = drillStats(level, type);
    let phase = "setup", items = [], i = 0, picks = {}, count = store.get("jlpt:drillcount", 10), onlyMissed = false;

    const shell = (inner) => `${topbar()}<main class="drill">${inner}</main>`;
    const back = `<a class="link-btn" href="#/${level}/types">← All question types</a>`;

    function setup() {
      phase = "setup";
      stats = drillStats(level, type);
      const missed = mistakesMode ? [] : pool.filter((p) => stats.missed.includes(p.uid));
      const hist = stats.sessions.slice(-5).reverse().map((s) => { const p = Math.round((s.c / s.n) * 100); return `<li><span>${new Date(s.date).toLocaleDateString()}</span><b style="color:${pctColor(p)}">${p}%</b><span class="muted">${s.c}/${s.n}</span></li>`; }).join("");
      $app.innerHTML = shell(`
        <section class="card drill-setup">
          ${back}
          <div class="ds-head">${mistakesMode ? "" : `<span class="cat ${tl.cat} jp">${CAT[tl.cat].label}</span>`}<span class="level-badge">${level}</span></div>
          <h1 class="jp">${esc(tl.ja)}</h1>
          <p class="muted">${esc(tl.en)} · ${pool.length} questions from ${new Set(pool.map((p) => p.ex.id)).size} past papers${mistakesMode ? ". A question leaves this list when you answer it correctly." : ""}</p>
          <div class="ds-row"><span class="ds-label">Questions</span>
            <div class="seg">${[10, 20, 0].map((n) => `<button class="${count === n ? "active" : ""}" data-count="${n}">${n || `All ${pool.length}`}</button>`).join("")}</div></div>
          ${missed.length ? `<label class="ds-check"><input type="checkbox" data-missed ${onlyMissed ? "checked" : ""}/> Only questions I got wrong before <span class="chip warn">${missed.length}</span></label>` : ""}
          <button class="btn big" data-start>Start practice</button>
          ${hist ? `<div class="ds-hist"><h3>Recent sessions</h3><ul>${hist}</ul></div>` : ""}
        </section>`);
      $app.querySelectorAll("[data-count]").forEach((b) => b.addEventListener("click", () => { count = Number(b.dataset.count); store.set("jlpt:drillcount", count); setup(); }));
      const mc = $app.querySelector("[data-missed]"); if (mc) mc.addEventListener("change", () => { onlyMissed = mc.checked; });
      $app.querySelector("[data-start]").addEventListener("click", () => start(onlyMissed ? missed : pool));
    }

    function start(from) {
      items = shuffle(from);
      if (count && !onlyMissed) items = items.slice(0, count);
      i = 0; picks = {}; phase = "q"; question();
    }

    function question() {
      const { ex, q } = items[i], t = q.text, a = picks[i];
      const answered = a != null;
      const done = Object.keys(picks).length, right = items.filter((it, k) => picks[k] === it.q.answer).length;
      const choices = t.choices.map((c, k) => {
        const n = k + 1, cls = ["choice"];
        if (answered) { if (n === q.answer) cls.push("correct"); else if (a === n) cls.push("wrong"); }
        return `<button class="${cls.join(" ")}" data-c="${n}" ${answered ? "disabled" : ""}><span class="c-num">${n}</span><span class="c-text jp">${c}</span>${answered && q.disputed === n ? `<span class="c-tag sug">Suggested</span>` : ""}</button>`;
      }).join("");
      const passage = t.passage ? `<section class="passage">${passageBlocks(ex, t.passage)}</section>` : "";
      const isUsage = q.type === "usage";
      const src = `${ex.level} ${ex.title} · 問題${q.mondai} · Q${q.num}`;
      const feedback = answered ? `<div class="r-info ${a === q.answer ? "ok" : "ng"}">${a === q.answer ? "Correct!" : `Not quite. The correct answer is <b>${q.answer}</b>.`}${q.unofficial ? " <span class='flag'>† Unofficial key</span>" : ""}</div>${disputeHtml(q)}` : "";
      $app.innerHTML = shell(`
        <div class="drill-bar">
          <a class="icon-btn" href="#/${level}/types" aria-label="Quit">✕</a>
          <div class="drill-progress"><i style="width:${(done / items.length) * 100}%"></i></div>
          <span class="drill-count">${i + 1} / ${items.length}</span>
          <span class="drill-right">✓ ${right}</span>
        </div>
        <div class="q-layout ${passage ? "with-passage" : ""}">
          ${passage}
          <section class="q-card">
            <div class="q-meta"><span class="cat ${q.cat} jp">${CAT[q.cat].label}</span><span class="q-type jp">${esc(QTYPES[q.type].ja)}<small>${esc(QTYPES[q.type].en)}</small></span><span class="spacer"></span><span class="q-count">${esc(src)}</span></div>
            ${t.prompt ? `<div class="q-prompt jp ${isUsage ? "usage" : ""}" style="margin-top:14px">${t.prompt}</div>` : `<div class="q-prompt" style="margin-top:14px">Fill blank <span class="blank cur">${q.num}</span> in the text.</div>`}
            ${isUsage ? '<p class="muted small-hint">Choose the sentence where the word is used correctly.</p>' : ""}
            <div class="choices">${choices}</div>
            ${feedback}
            ${answered && t.explain ? `<details class="explain" open><summary>Explanation</summary><div class="explain-body jp">${t.explain}</div></details>` : ""}
            <div class="q-foot"><span class="muted kbd-hint">${answered ? "<kbd>Enter</kbd> next" : "<kbd>1</kbd>–<kbd>4</kbd> answer"}</span>
              ${answered ? `<button class="btn" data-next>${i === items.length - 1 ? "See results" : "Next →"}</button>` : ""}</div>
          </section>
        </div>`);
      window.scrollTo(0, 0);
      markBlank(q);
    }

    function pick(n) {
      if (phase !== "q" || picks[i] != null || n > items[i].q.text.choices.length) return;
      picks[i] = n;
      // keep a running list of questions to review
      const qt = items[i].q.type, s = drillStats(level, qt), uid = items[i].uid;
      const set = new Set(s.missed);
      if (n === items[i].q.answer) set.delete(uid); else set.add(uid);
      s.missed = [...set]; store.set(drillKey(level, qt), s);
      if (mistakesMode) {
        const fx = fixedSet(level);
        if (n === items[i].q.answer) fx.add(uid); else fx.delete(uid);
        store.set(fixedKey(level), [...fx]);
      }
      question();
    }
    function next() {
      if (phase !== "q" || picks[i] == null) return;
      if (i < items.length - 1) { i++; question(); } else summary();
    }

    function summary() {
      phase = "done";
      const c = items.filter((it, k) => picks[k] === it.q.answer).length, n = items.length, p = Math.round((c / n) * 100);
      const s = drillStats(level, type); s.sessions.push({ date: Date.now(), c, n }); store.set(drillKey(level, type), s);
      const wrong = items.map((it, k) => ({ ...it, k })).filter((it) => picks[it.k] !== it.q.answer);
      const strip = (h) => h.replace(/<[^>]+>/g, "");
      const list = items.map((it, k) => {
        const ok = picks[k] === it.q.answer, t = it.q.text;
        const prompt = strip(t.prompt || "") || `Blank ${it.q.num} in the passage`;
        return `<li class="${ok ? "ok" : "ng"}"><span class="ds-mark">${ok ? "✓" : "✗"}</span>
          <div><div class="jp ds-prompt">${esc(prompt.length > 70 ? prompt.slice(0, 70) + "…" : prompt)}</div>
          <div class="muted ds-ans jp">${ok ? `${esc(strip(t.choices[it.q.answer - 1]))}` : `You: ${esc(strip(t.choices[picks[k] - 1] || "—"))} · Correct: <b>${esc(strip(t.choices[it.q.answer - 1]))}</b>`}</div>
          <div class="muted ds-src">${it.ex.level} ${it.ex.title} · 問題${it.q.mondai} Q${it.q.num}</div></div></li>`;
      }).join("");
      $app.innerHTML = shell(`
        <section class="card drill-setup">
          ${back}
          <h1 class="jp">${esc(tl.ja)} <span class="muted" style="font-size:16px;font-weight:500">${esc(tl.en)}</span></h1>
          <div class="ds-score"><b style="color:${pctColor(p)}">${p}%</b><span>${c} of ${n} correct</span></div>
          <div class="actions-row">
            ${wrong.length ? `<button class="btn" data-retry>Retry the ${wrong.length} I missed</button>` : ""}
            <button class="btn ${wrong.length ? "ghost" : ""}" data-again>New set</button>
            <a class="btn ghost" href="#/${level}/types">All question types</a>
          </div>
          <ul class="ds-list">${list}</ul>
        </section>`);
      const r = $app.querySelector("[data-retry]");
      if (r) r.addEventListener("click", () => { onlyMissed = true; start(wrong.map(({ ex, q, uid }) => ({ ex, q, uid }))); onlyMissed = false; });
      $app.querySelector("[data-again]").addEventListener("click", () => { onlyMissed = false; setup(); });
      window.scrollTo(0, 0);
    }

    const onClick = (e) => {
      const c = e.target.closest(".choice"); if (c && !c.disabled) return pick(Number(c.dataset.c));
      if (e.target.closest("[data-next]")) next();
    };
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.matches?.("input")) return;
      if (/^[1-4]$/.test(e.key)) pick(Number(e.key));
      else if (e.key === "Enter" || e.key === "ArrowRight") { if (phase === "q") { e.preventDefault(); next(); } }
    };
    $app.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    cleanup = () => { $app.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
    if (!pool.length) { $app.innerHTML = shell(`<section class="card drill-setup">${back}<p>No questions of this type yet.</p></section>`); return; }
    setup();
  }

  // ────────────── shared test helpers ──────────────
  async function handIn(ex, st) {
    const unanswered = ex.questions.filter((q) => st.answers[q.id] == null).length;
    const ok = await confirmModal({
      title: "Hand in your answers?",
      body: unanswered ? `You still have <b>${unanswered}</b> unanswered question${unanswered > 1 ? "s" : ""}. They count as incorrect.` : "Every question is answered. You'll see your score next.",
      ok: "Hand in",
    });
    if (!ok) return;
    st.submitted = true; st.submittedAt = Date.now(); saveState(ex.id, st);
    { // a question you get wrong again in a test is back on the "My mistakes" list
      const fx = fixedSet(ex.level); let ch = false;
      for (const q of ex.questions) if (q.answer != null && st.answers[q.id] != null && st.answers[q.id] !== q.answer && fx.delete(`${ex.id}|${q.id}`)) ch = true;
      if (ch) store.set(fixedKey(ex.level), [...fx]);
    }
    const r = score(ex, st.answers);
    const hist = store.get(histKey(ex.id), []);
    const j = jlptScore(ex, st.answers);
    hist.push({ date: st.submittedAt, pct: r.pct, correct: r.correct, total: r.total, seconds: Object.values(st.elapsed).reduce((a, b) => a + b, 0), byCat: r.byCat,
      jlpt: { total: j.total, passed: j.passed, sections: j.sections.map((s) => s.score) } });
    store.set(histKey(ex.id), hist);
    location.hash = `#/exam/${ex.id}/results`;
  }
  const modeToggle = (mode) => `<button class="icon-btn mode-btn" data-mode="${mode === "text" ? "booklet" : "text"}" title="Switch view">${mode === "text" ? "📄 Booklet view" : "📝 Text view"}</button>`;
  function bindModeToggle() {
    const b = $app.querySelector("[data-mode]");
    if (b) b.addEventListener("click", () => { store.set("jlpt:mode", b.dataset.mode); route(); });
  }

  // ────────────── test / review ──────────────
  function renderTest(ex, opts) {
    const { review = false } = opts;
    let st = loadState(ex.id);
    if (!st) { st = freshState(); saveState(ex.id, st); }
    if (st.submitted && !review) { location.replace(`#/exam/${ex.id}/results`); return; }
    if (review && !st.submitted) { location.replace(`#/exam/${ex.id}`); return; }
    if (ex.hasText && getMode() === "text") return renderText(ex, st, opts);
    return renderBooklet(ex, st, opts);
  }

  function renderBooklet(ex, st, { review = false, focus = null }) {

    document.title = `${ex.level} ${ex.title} · ${review ? "Review" : "Test"}`;
    let partIdx = 0;
    if (focus) partIdx = Number(focus.split("-")[0]) || 0;
    else partIdx = store.get(`jlpt:part:${ex.id}`, 0);
    if (!ex.parts[partIdx]) partIdx = 0;
    let filter = "all";
    let zoom = store.get("jlpt:zoom", 100);
    let mobileView = "sheet";

    $app.innerHTML = `
      <div class="test ${review ? "review" : ""}">
        <div class="test-bar">
          <a class="icon-btn" href="#/${ex.level}" title="Back to tests" aria-label="Back">←</a>
          <div class="test-title jp">${ex.level} ${ex.title}<small>${review ? "Review" : "Practice test"}</small></div>
          <div class="part-tabs" role="tablist"></div>
          <span class="spacer"></span>
          ${review ? "" : `<span class="timer" title="Time spent on this section"></span>`}
          <span class="answered"></span>
          ${review
            ? `<a class="btn secondary small" href="#/exam/${ex.id}/results">Results</a>`
            : `<button class="btn small" data-submit>Hand in</button>`}
          ${ex.hasText ? modeToggle("booklet") : ""}
          <button class="icon-btn" data-act="theme" title="Toggle theme" aria-label="Toggle theme">◐</button>
        </div>
        <div class="test-body" data-view="${mobileView}">
          <section class="booklet" aria-label="Question booklet">
            <div class="booklet-tools">
              <span>Page</span><input type="number" min="1" max="${ex.pages}" value="1" data-pg aria-label="Go to page" /><span>/ ${ex.pages}</span>
              <span class="spacer"></span>
              <button class="icon-btn" data-zoom="-10" aria-label="Zoom out">−</button>
              <span data-zoomval style="min-width:42px;text-align:center">${zoom}%</span>
              <button class="icon-btn" data-zoom="10" aria-label="Zoom in">+</button>
            </div>
            <div class="pages" style="--zoom:${zoom}">
              ${Array.from({ length: ex.pages }, (_, i) => `<div class="page" data-page="${i + 1}"><span class="pno">${i + 1}</span><img src="${pageSrc(ex, i + 1)}" alt="Page ${i + 1}" /></div>`).join("")}
            </div>
          </section>
          <aside class="sheet" aria-label="Answer sheet">
            <div class="sheet-head"></div>
            <div class="sheet-body"></div>
          </aside>
        </div>
        <nav class="mobile-switch">
          <button data-mv="booklet">Booklet</button><button data-mv="sheet" class="active">Answer sheet</button>
        </nav>
      </div>`;

    const $tabs = $app.querySelector(".part-tabs");
    const $sheetHead = $app.querySelector(".sheet-head");
    const $sheetBody = $app.querySelector(".sheet-body");
    const $answered = $app.querySelector(".answered");
    const $timer = $app.querySelector(".timer");
    const $pages = $app.querySelector(".pages");
    const $pg = $app.querySelector("[data-pg]");
    const $body = $app.querySelector(".test-body");

    const save = () => saveState(ex.id, st);

    // tabs
    function drawTabs() {
      $tabs.innerHTML = ex.parts.map((p, i) => {
        const done = p.qs.filter((q) => st.answers[q.id] != null).length;
        let extra = `${done}/${p.qs.length}`;
        if (review) {
          const r = score(ex, st.answers).byPart[i];
          extra = r.total ? `${r.correct}/${r.total}` : "not graded";
        }
        return `<button role="tab" class="jp ${i === partIdx ? "active" : ""}" data-part="${i}">${esc(p.short)}<span class="count">${extra}</span></button>`;
      }).join("");
    }
    function drawAnswered() {
      const n = Object.keys(st.answers).filter((k) => st.answers[k] != null).length;
      $answered.textContent = review ? `${score(ex, st.answers).pct}% correct` : `${n} / ${ex.questions.length} answered`;
    }

    // sheet
    let audioEl = null;
    function drawSheet() {
      const part = ex.parts[partIdx];
      const notes = ex.notes.length && (part.listening || part.groups.some((g) => g.unofficial) || partIdx === 0)
        ? `<div class="notes">${ex.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : "";
      const audio = part.listening ? `
        <div class="audio-box">
          <div class="lbl"><span>🎧 Listening audio</span>
            <span class="rates">${[0.75, 1, 1.25].map((r) => `<button data-rate="${r}" class="${r === 1 ? "active" : ""}">${r}×</button>`).join("")}</span></div>
          <audio controls preload="metadata" src="audio/${ex.id}.mp3"></audio>
        </div>` : "";
      const filters = review ? `<div class="filter-row">
          ${[["all", "All"], ["ng", "Incorrect"], ["sk", "Unanswered"], ["ok", "Correct"]].map(([k, l]) => `<button data-filter="${k}" class="${filter === k ? "active" : ""}">${l}</button>`).join("")}
        </div>` : "";
      $sheetHead.innerHTML = `<h2 class="jp">${esc(part.name)} <span class="chip">${part.minutes}分</span></h2>${audio}${notes}${filters}`;
      audioEl = $sheetHead.querySelector("audio");
      if (audioEl) {
        const posKey = `jlpt:audiopos:${ex.id}`;
        audioEl.addEventListener("loadedmetadata", () => { const t = store.get(posKey, 0); if (t) audioEl.currentTime = t; }, { once: true });
        audioEl.addEventListener("timeupdate", () => store.set(posKey, audioEl.currentTime));
        $sheetHead.querySelectorAll("[data-rate]").forEach((b) => b.addEventListener("click", () => {
          audioEl.playbackRate = Number(b.dataset.rate);
          $sheetHead.querySelectorAll("[data-rate]").forEach((x) => x.classList.toggle("active", x === b));
        }));
      }
      $sheetHead.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { filter = b.dataset.filter; drawSheet(); }));

      $sheetBody.innerHTML = part.groups.map((g) => {
        const rows = g.qs.filter((q) => !review || filter === "all" || qState(q, st.answers) === filter).map((q) => {
          const a = st.answers[q.id];
          const s = qState(q, st.answers);
          const bubbles = [1, 2, 3, 4].map((c) => {
            const cls = ["bubble"];
            if (a === c) cls.push("sel");
            if (review) {
              if (q.answer == null) { if (a === c) cls.push("nokey"); }
              else if (c === q.answer) cls.push("correct");
              else if (a === c) cls.push("wrong");
            }
            return `<button class="${cls.join(" ")}" data-q="${q.id}" data-c="${c}" aria-label="Question ${qLabel(ex, q)}, choice ${c}" aria-pressed="${a === c}">${c}</button>`;
          }).join("");
          const status = review ? `<span class="q-status ${s === "ok" ? "ok" : s === "ng" ? "ng" : "sk"}" title="${{ ok: "Correct", ng: "Incorrect", sk: "Unanswered", nk: "No answer key" }[s]}">${{ ok: "✓", ng: "✗", sk: "–", nk: "·" }[s]}</span>` : "";
          return `<div class="q ${focus === q.id ? "focus" : ""}" id="q-${q.id}"><span class="qn">${part.continuous ? q.num : q.num + "番"}${q.unofficial ? '<span class="dagger" title="Unofficial answer">†</span>' : ""}</span><div class="bubbles">${bubbles}</div>${status}</div>`;
        }).join("");
        if (!rows) return "";
        return `<div class="mondai"><div class="mondai-head"><b class="jp">問題 ${g.m}</b><span class="cat ${g.cat} jp">${CAT[g.cat].label}</span>${g.unofficial ? '<span class="flag">† unofficial key</span>' : ""}${g.qs[0].answer == null ? '<span class="flag">no key, not graded</span>' : ""}</div>${rows}</div>`;
      }).join("") || `<p style="color:var(--muted);padding:16px 6px">Nothing to show for this filter.</p>`;
    }

    // interactions
    $tabs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-part]"); if (!b) return;
      partIdx = Number(b.dataset.part); store.set(`jlpt:part:${ex.id}`, partIdx);
      if (audioEl) audioEl.pause();
      drawTabs(); drawSheet(); $sheetBody.scrollTop = 0;
      // keep the booklet in step with the section
      const lp = ex.listeningPage, cur = Number($pg.value) || 1;
      if (lp) {
        if (ex.parts[partIdx].listening && cur < lp) goPage(lp);
        else if (!ex.parts[partIdx].listening && cur >= lp) goPage(1);
      }
    });
    $sheetBody.addEventListener("click", (e) => {
      if (review) return;
      const b = e.target.closest(".bubble"); if (!b) return;
      const id = b.dataset.q, c = Number(b.dataset.c);
      st.answers[id] = st.answers[id] === c ? null : c;
      if (st.answers[id] == null) delete st.answers[id];
      save();
      b.parentElement.querySelectorAll(".bubble").forEach((x) => {
        const on = st.answers[id] === Number(x.dataset.c);
        x.classList.toggle("sel", on); x.setAttribute("aria-pressed", on);
      });
      drawTabs(); drawAnswered();
    });
    $app.querySelectorAll("[data-mv]").forEach((b) => b.addEventListener("click", () => {
      mobileView = b.dataset.mv; $body.dataset.view = mobileView;
      $app.querySelectorAll("[data-mv]").forEach((x) => x.classList.toggle("active", x === b));
    }));

    // booklet: zoom + page tracking
    $app.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
      zoom = Math.min(200, Math.max(50, zoom + Number(b.dataset.zoom)));
      store.set("jlpt:zoom", zoom);
      $pages.style.setProperty("--zoom", zoom);
      $app.querySelector("[data-zoomval]").textContent = zoom + "%";
    }));
    const pageKey = `jlpt:page:${ex.id}`;
    const goPage = (n, smooth = true) => {
      const el = $pages.querySelector(`[data-page="${n}"]`);
      if (!el) return;
      const jump = (s) => $pages.scrollTo({ top: el.offsetTop - $pages.offsetTop - 12, behavior: s ? "smooth" : "auto" });
      // pages above may still be loading (unknown height), so re-align once they have
      const pending = [...$pages.querySelectorAll("img")].slice(0, n).filter((i) => !i.complete);
      jump(smooth && !pending.length);
      if (pending.length) Promise.all(pending.map((i) => new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); }))).then(() => jump(false));
    };
    $pg.addEventListener("change", () => goPage(Math.min(ex.pages, Math.max(1, Number($pg.value) || 1))));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) {
        const n = Number(en.target.dataset.page);
        if (document.activeElement !== $pg) $pg.value = n;
        store.set(pageKey, n);
      }
    }, { root: $pages, rootMargin: "-45% 0px -45% 0px" });
    $pages.querySelectorAll(".page").forEach((p) => io.observe(p));
    const savedPage = store.get(pageKey, 1);
    if (savedPage > 1) goPage(savedPage, false);

    // timer (per part)
    let tick = null;
    if (!review) {
      const drawTimer = () => {
        const part = ex.parts[partIdx];
        const sec = st.elapsed[part.key] || 0;
        $timer.innerHTML = `⏱ ${fmtTime(sec)} <span class="lim">/ ${part.minutes}:00</span>`;
        $timer.classList.toggle("over", sec > part.minutes * 60);
      };
      tick = setInterval(() => {
        if (document.hidden) return;
        const k = ex.parts[partIdx].key;
        st.elapsed[k] = (st.elapsed[k] || 0) + 1;
        if (st.elapsed[k] % 5 === 0) save();
        drawTimer();
      }, 1000);
      drawTimer();
      $tabs.addEventListener("click", drawTimer);

      $app.querySelector("[data-submit]").addEventListener("click", () => handIn(ex, st));
    }

    drawTabs(); drawAnswered(); drawSheet(); bindModeToggle();
    if (focus) {
      requestAnimationFrame(() => { const el = document.getElementById(`q-${focus}`); if (el) el.scrollIntoView({ block: "center" }); });
      const fq = ex.questions.find((q) => q.id === focus);
      const fp = fq && fq.text && (fq.text.image || (fq.text.passage && ex.passages[fq.text.passage].page) || fq.text.page);
      if (fp) goPage(fp, false);
    }

    // keyboard: 1-4 answers the first unanswered question in the current part
    const onKey = (e) => {
      if (review || e.target.matches?.("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!/^[1-4]$/.test(e.key)) return;
      const q = ex.parts[partIdx].qs.find((x) => st.answers[x.id] == null); if (!q) return;
      const b = $sheetBody.querySelector(`.bubble[data-q="${q.id}"][data-c="${e.key}"]`);
      if (b) { b.click(); b.closest(".q").scrollIntoView({ block: "nearest" }); }
    };
    document.addEventListener("keydown", onKey);

    cleanup = () => { if (tick) clearInterval(tick); save(); io.disconnect(); document.removeEventListener("keydown", onKey); if (audioEl) audioEl.pause(); };
  }

  // ────────────── text (Bunpro-style) mode ──────────────
  function renderText(ex, st, { review = false, focus = null }) {
    document.title = `${ex.level} ${ex.title} · ${review ? "Review" : "Test"}`;
    const posKey = `jlpt:tpos:${ex.id}`;
    const all = ex.questions;
    let idx = 0;
    if (focus) idx = Math.max(0, all.findIndex((q) => q.id === focus));
    else idx = Math.min(all.length - 1, store.get(posKey, 0));
    let filter = "all";
    let showPic = false;

    $app.innerHTML = `
      <div class="test tmode ${review ? "review" : ""}">
        <div class="test-bar">
          <a class="icon-btn" href="#/${ex.level}" title="Back to tests" aria-label="Back">←</a>
          <div class="test-title jp">${ex.level} ${ex.title}<small>${review ? "Review" : "Practice test"}</small></div>
          <div class="part-tabs" role="tablist"></div>
          <span class="spacer"></span>
          ${review ? "" : `<span class="timer" title="Time spent on this section"></span>`}
          <span class="answered"></span>
          ${review ? `<a class="btn secondary small" href="#/exam/${ex.id}/results">Results</a>` : `<button class="btn small" data-submit>Hand in</button>`}
          ${modeToggle("text")}
          <button class="icon-btn" data-act="theme" title="Toggle theme" aria-label="Toggle theme">◐</button>
        </div>
        <div class="t-body">
          <main class="t-main"></main>
          <aside class="t-side"></aside>
        </div>
      </div>`;
    const $tabs = $app.querySelector(".part-tabs");
    const $main = $app.querySelector(".t-main");
    const $side = $app.querySelector(".t-side");
    const $answered = $app.querySelector(".answered");
    const $timer = $app.querySelector(".timer");
    const save = () => saveState(ex.id, st);
    const cur = () => all[idx];
    const partOf = (q) => ex.parts[q.part];

    function drawTabs() {
      const pi = cur().part;
      $tabs.innerHTML = ex.parts.map((p, i) => {
        let extra = `${p.qs.filter((q) => st.answers[q.id] != null).length}/${p.qs.length}`;
        if (review) { const r = score(ex, st.answers).byPart[i]; extra = r.total ? `${r.correct}/${r.total}` : "not graded"; }
        return `<button role="tab" class="jp ${i === pi ? "active" : ""}" data-part="${i}">${esc(p.short)}<span class="count">${extra}</span></button>`;
      }).join("");
      const n = Object.keys(st.answers).length;
      $answered.textContent = review ? `${score(ex, st.answers).pct}% correct` : `${n} / ${all.length} answered`;
    }

    // side panel: audio (listening) + question navigator
    let audioEl = null;
    function drawSide() {
      const part = partOf(cur());
      const prevAudio = audioEl;
      const keepAudio = part.listening && prevAudio && $side.contains(prevAudio);
      const audioHtml = part.listening ? `<div class="audio-box" data-audio>
          <div class="lbl"><span>🎧 Listening audio</span>
          <span class="rates">${[0.75, 1, 1.25].map((r) => `<button data-rate="${r}" class="${(prevAudio ? prevAudio.playbackRate : 1) === r ? "active" : ""}">${r}×</button>`).join("")}</span></div>
        </div>` : "";
      const filters = review ? `<div class="filter-row">${[["all", "All"], ["ng", "Incorrect"], ["sk", "Unanswered"], ["ok", "Correct"]].map(([k, l]) => `<button data-filter="${k}" class="${filter === k ? "active" : ""}">${l}</button>`).join("")}</div>` : "";
      const nav = part.groups.map((g) => {
        const cells = g.qs.map((q) => {
          const s = qState(q, st.answers);
          const cls = ["nav-cell"];
          if (q === cur()) cls.push("cur");
          if (review) cls.push(s); else if (st.answers[q.id] != null) cls.push("done");
          const hide = review && filter !== "all" && s !== filter;
          return hide ? "" : `<button class="${cls.join(" ")}" data-goto="${q.id}">${part.continuous ? q.num : q.num}</button>`;
        }).join("");
        const tl = typeLabel(g.qs[0].type);
        return cells ? `<div class="nav-group"><div class="nav-head"><b class="jp">問題 ${g.m}</b><span class="jp">${esc(tl.ja)}</span></div><div class="nav-cells">${cells}</div></div>` : "";
      }).join("");
      $side.innerHTML = `${audioHtml}<div class="nav-card"><div class="nav-title jp">${esc(part.name)} <span class="chip">${part.minutes}分</span></div>${filters}${nav || '<p class="muted">Nothing for this filter.</p>'}</div>
        ${ex.notes.length ? `<div class="notes">${ex.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : ""}
        <p class="kbd-hint">Keys: <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>←</kbd> <kbd>→</kbd> move</p>`;
      if (part.listening) {
        const box = $side.querySelector("[data-audio]");
        if (keepAudio) box.appendChild(prevAudio);
        else {
          audioEl = document.createElement("audio");
          audioEl.controls = true; audioEl.preload = "metadata"; audioEl.src = `audio/${ex.id}.mp3`;
          const ak = `jlpt:audiopos:${ex.id}`;
          audioEl.addEventListener("loadedmetadata", () => { const t = store.get(ak, 0); if (t) audioEl.currentTime = t; }, { once: true });
          audioEl.addEventListener("timeupdate", () => store.set(ak, audioEl.currentTime));
          box.appendChild(audioEl);
        }
        box.querySelectorAll("[data-rate]").forEach((b) => b.addEventListener("click", () => {
          audioEl.playbackRate = Number(b.dataset.rate);
          box.querySelectorAll("[data-rate]").forEach((x) => x.classList.toggle("active", x === b));
        }));
      } else if (audioEl) { audioEl.pause(); audioEl = null; }
      $side.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { filter = b.dataset.filter; drawSide(); }));
      const c = $side.querySelector(".nav-cell.cur"); if (c) c.scrollIntoView({ block: "nearest" });
    }

    function passageHtml(pid) {
      const p = ex.passages[pid]; if (!p) return "";
      return p.blocks.map((b) => b.h ? `<h4 class="jp">${b.h}</h4>` : b.img ? `<img class="p-img" src="${pageSrc(ex, b.img)}" alt="Booklet page ${b.img}" />` : `<p class="jp">${b.p}</p>`).join("");
    }

    function drawMain() {
      const q = cur(), part = partOf(q), t = q.text || {}, a = st.answers[q.id];
      const tl = typeLabel(q.type);
      const posInPart = part.qs.indexOf(q) + 1;
      const label = part.continuous ? `Question ${q.num}` : `問題${q.mondai} · ${q.num}番`;
      const choices = (t.choices || ["1", "2", "3", "4"]).map((c, i) => {
        const n = i + 1, cls = ["choice"];
        if (a === n) cls.push("sel");
        if (review && q.answer != null) { if (n === q.answer) cls.push("correct"); else if (a === n) cls.push("wrong"); }
        const tag = review && q.answer != null ? (n === q.answer ? `<span class="c-tag ok">${a === n ? "Your answer ✓" : "Correct answer"}</span>` : a === n ? `<span class="c-tag ng">Your answer</span>` : "") : "";
        const plain = /^[1-4]$/.test(c) || /^\d$/.test(c);
        return `<button class="${cls.join(" ")}" data-c="${n}" ${review ? "disabled" : ""}><span class="c-num">${n}</span><span class="c-text jp">${plain ? `<span class="muted">Choice ${n}</span>` : c}</span>${tag}${review && q.disputed === n ? `<span class="c-tag sug">Suggested</span>` : ""}</button>`;
      }).join("");
      const isUsage = q.type === "usage";
      const promptHtml = t.prompt ? `<div class="q-prompt jp ${isUsage ? "usage" : ""}">${t.prompt}</div>` : "";
      const listeningNote = part.listening && !t.prompt && !t.image ? `<p class="muted q-listen">Listen to 問題${q.mondai}・${q.num}番 in the audio, then choose the answer.${part.listening && (t.choices || []).every((c) => /^\d$/.test(c)) ? " The choices are only read aloud." : ""}</p>` : "";
      const pic = t.image ? `<div class="q-pic"><button class="btn ghost small" data-pic>${showPic ? "Hide" : "Show"} picture (booklet p.${t.image})</button>${showPic ? `<img src="${pageSrc(ex, t.image)}" alt="Booklet page ${t.image}" />` : ""}</div>` : "";
      const passage = t.passage ? `<section class="passage">${passageHtml(t.passage)}</section>` : "";
      const reviewInfo = review ? `<div class="r-info ${qState(q, st.answers)}">${q.answer == null ? "No answer key for this question." : a == null ? `Not answered. The correct answer is <b>${q.answer}</b>.` : a === q.answer ? "Correct!" : `You chose <b>${a}</b>. The correct answer is <b>${q.answer}</b>.`}${q.unofficial ? " <span class='flag'>† Unofficial key</span>" : ""}</div>${disputeHtml(q)}` : "";
      const pageRef = t.page || t.image || (t.passage && ex.passages[t.passage] && ex.passages[t.passage].page);
      $main.innerHTML = `
        <div class="q-layout ${passage ? "with-passage" : ""}">
          ${passage}
          <section class="q-card">
            <div class="q-meta">
              <span class="cat ${q.cat} jp">${CAT[q.cat].label}</span>
              <span class="q-type jp" title="${esc(tl.en)}">${esc(tl.ja)}<small>${esc(tl.en)}</small></span>
              <span class="spacer"></span>
              <span class="q-count">${posInPart} / ${part.qs.length}</span>
            </div>
            <h3 class="q-label">${label}${q.unofficial ? '<span class="dagger" title="Unofficial answer">†</span>' : ""}</h3>
            ${promptHtml}${listeningNote}${pic}
            ${isUsage ? '<p class="muted small-hint">Choose the sentence where the word is used correctly.</p>' : ""}
            <div class="choices">${choices}</div>
            ${reviewInfo}
            ${review && t.explain ? `<details class="explain" open><summary>Explanation</summary><div class="explain-body jp">${t.explain}</div></details>` : ""}
            <div class="q-foot">
              <button class="btn ghost" data-step="-1" ${idx === 0 ? "disabled" : ""}>← Previous</button>
              ${pageRef ? `<button class="link-btn" data-booklet="${pageRef}">See on booklet p.${pageRef}</button>` : "<span></span>"}
              ${idx === all.length - 1 ? (review ? `<a class="btn" href="#/exam/${ex.id}/results">Results</a>` : `<button class="btn" data-finish>Hand in</button>`) : `<button class="btn" data-step="1">Next →</button>`}
            </div>
          </section>
        </div>`;
      $main.scrollTop = 0;
      $app.querySelector(".t-body").scrollTop = 0; // the scroller on narrow screens
      if (!t.prompt && t.passage) markBlank(q);
    }

    function go(i) {
      if (i < 0 || i >= all.length) return;
      idx = i; showPic = false; store.set(posKey, idx);
      drawMain(); drawTabs(); drawSide();
      if (!review && $timer) drawTimer();
    }
    function answer(n) {
      if (review) return;
      const q = cur();
      if (st.answers[q.id] === n) delete st.answers[q.id]; else st.answers[q.id] = n;
      save(); drawMain(); drawTabs(); drawSide();
    }

    $main.addEventListener("click", (e) => {
      const c = e.target.closest(".choice"); if (c && !c.disabled) return answer(Number(c.dataset.c));
      const s = e.target.closest("[data-step]"); if (s) return go(idx + Number(s.dataset.step));
      if (e.target.closest("[data-pic]")) { showPic = !showPic; return drawMain(); }
      if (e.target.closest("[data-finish]")) return handIn(ex, st);
      const b = e.target.closest("[data-booklet]");
      if (b) { store.set("jlpt:mode", "booklet"); store.set(`jlpt:page:${ex.id}`, Number(b.dataset.booklet)); store.set(`jlpt:part:${ex.id}`, cur().part); route(); }
    });
    $side.addEventListener("click", (e) => {
      const g = e.target.closest("[data-goto]"); if (g) go(all.findIndex((q) => q.id === g.dataset.goto));
    });
    $tabs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-part]"); if (!b) return;
      const p = ex.parts[Number(b.dataset.part)];
      const target = p.qs.find((q) => st.answers[q.id] == null) || p.qs[0];
      go(all.indexOf(target));
    });

    let tick = null;
    function drawTimer() {
      const part = partOf(cur()), sec = st.elapsed[part.key] || 0;
      $timer.innerHTML = `⏱ ${fmtTime(sec)} <span class="lim">/ ${part.minutes}:00</span>`;
      $timer.classList.toggle("over", sec > part.minutes * 60);
    }
    if (!review) {
      tick = setInterval(() => {
        if (document.hidden) return;
        const k = partOf(cur()).key;
        st.elapsed[k] = (st.elapsed[k] || 0) + 1;
        if (st.elapsed[k] % 5 === 0) save();
        drawTimer();
      }, 1000);
      $app.querySelector("[data-submit]").addEventListener("click", () => handIn(ex, st));
    }

    const onKey = (e) => {
      if (e.target.matches?.("input, textarea") || e.metaKey || e.ctrlKey || e.altKey || document.querySelector(".modal-back")) return;
      if (/^[1-4]$/.test(e.key)) { const n = Number(e.key); if (n <= (cur().text?.choices?.length || 4)) answer(n); }
      else if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
    };
    document.addEventListener("keydown", onKey);

    drawTabs(); drawMain(); drawSide(); bindModeToggle();
    if (!review) drawTimer();
    cleanup = () => { if (tick) clearInterval(tick); save(); document.removeEventListener("keydown", onKey); if (audioEl) audioEl.pause(); };
  }

  // ────────────── export mistakes for an AI tutor ──────────────
  // Turn stored question HTML into plain text an AI can read: underlines become 【 】,
  // numbered blanks become （48）, line breaks stay line breaks.
  function toPlain(html) {
    return String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<u>(.*?)<\/u>/gi, "【$1】")
      .replace(/<span class="blank[^"]*">(\d+)<\/span>/gi, "（$1）")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      .trim();
  }
  function passagePlain(ex, pid) {
    const p = ex.passages[pid]; if (!p) return "";
    return p.blocks.map((b) => b.h ? `■ ${toPlain(b.h)}` : b.img ? `[The original has a table or poster here (booklet page ${b.img}); it isn't included as text.]` : toPlain(b.p)).join("\n");
  }
  const sectionName = (ex, q) => ex.parts[q.part].name;

  function buildExport(ex, st, items, { passages, lang }) {
    const tl = (q) => typeLabel(q.type);
    const out = [];
    out.push(`# JLPT ${ex.level} practice: questions I got wrong`);
    out.push("");
    out.push(`I'm studying for the JLPT ${ex.level} and took the ${ex.titleEn} (${ex.title}) past paper. Below are questions I got wrong or skipped.`);
    out.push("");
    out.push(`For each question, please:`);
    out.push(`1. Explain why the correct answer is right, and what the key word or grammar point means.`);
    out.push(`2. Explain why my answer is wrong (if I gave one), and how to tell the two apart.`);
    out.push(`3. Give 2–3 natural example sentences using the correct word or grammar, with readings in hiragana and ${lang} translations.`);
    out.push(`4. Point out any pattern in my mistakes and suggest what to review.`);
    out.push("");
    out.push(`Please answer in ${lang}. In the questions, 【 】 marks the underlined part and （n） marks a numbered blank.`);
    const shown = new Set();
    items.forEach(({ q }, i) => {
      const t = q.text || {}, a = st.answers[q.id];
      const ch = (n) => (t.choices && t.choices[n - 1] != null ? toPlain(t.choices[n - 1]) : String(n));
      const onlyNums = (t.choices || []).every((c) => /^\d$/.test(c));
      out.push("");
      out.push("---");
      out.push("");
      out.push(`## ${i + 1}. ${sectionName(ex, q)} · 問題${q.mondai} · Q${q.num}`);
      out.push(`Type: ${tl(q).ja} (${tl(q).en})`);
      if (passages && t.passage && !shown.has(t.passage)) {
        shown.add(t.passage);
        out.push("");
        out.push("Passage:");
        out.push(passagePlain(ex, t.passage).split("\n").map((l) => `> ${l}`).join("\n"));
      } else if (t.passage && shown.has(t.passage)) {
        out.push(`(Uses the same passage as above.)`);
      }
      out.push("");
      if (q.cat === "listening") out.push(`This is a listening question; the audio isn't included.${onlyNums ? " The choices were only read aloud, so they aren't available as text." : ""}`);
      if (t.prompt) out.push(`Question: ${toPlain(t.prompt)}`);
      else if (t.passage && q.cat === "grammar") out.push(`Question: Which choice fits blank （${q.num}） in the passage?`);
      if (t.image && !t.prompt) out.push(`(This question uses a picture from the booklet, page ${t.image}.)`);
      if (!onlyNums) {
        out.push("Choices:");
        t.choices.forEach((c, k) => out.push(`  ${k + 1}. ${toPlain(c)}`));
      }
      out.push("");
      out.push(`My answer: ${a == null ? "(skipped)" : `${a}. ${onlyNums ? "" : ch(a)}`.trim()}`);
      out.push(`Correct answer: ${q.answer}. ${onlyNums ? "" : ch(q.answer)}`.trim() + (q.unofficial ? "  (unofficial key, worked out by hand)" : ""));
    });
    out.push("");
    return out.join("\n");
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch { return false; }
  }
  function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openExport(ex, st) {
    const wrongs = ex.graded.filter((q) => st.answers[q.id] !== q.answer).map((q) => ({ q, skipped: st.answers[q.id] == null }));
    const prefs = Object.assign({ passages: true, lang: "English" }, store.get("jlpt:exportprefs", {}));
    // preselect everything except listening questions with nothing to send (choices only spoken in the audio)
    const audioOnly = (q) => q.cat === "listening" && !(q.text && q.text.prompt) && (!q.text || q.text.choices.every((c) => /^\d$/.test(c)));
    const sel = new Set(wrongs.filter(({ q }) => !audioOnly(q)).map(({ q }) => q.id));
    let toast = "", manual = "";

    const back = document.createElement("div");
    back.className = "modal-back";
    document.body.appendChild(back);
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);

    const preview = (q) => {
      const t = q.text || {};
      let s = toPlain(t.prompt) || (t.passage && q.cat === "grammar" ? `Blank （${q.num}） in the passage` : q.cat === "listening" ? "Listening question" : "Reading question");
      s = s.replace(/\n/g, " ");
      return s.length > 64 ? s.slice(0, 64) + "…" : s;
    };
    const items = () => wrongs.filter(({ q }) => sel.has(q.id));

    function draw() {
      const prevScroll = back.querySelector(".ex-list")?.scrollTop || 0;
      const groups = ["vocab", "grammar", "reading", "listening"].map((c) => {
        const rows = wrongs.filter(({ q }) => q.cat === c);
        if (!rows.length) return "";
        const allOn = rows.every(({ q }) => sel.has(q.id));
        return `<div class="ex-group"><label class="ex-ghead"><input type="checkbox" data-cat="${c}" ${allOn ? "checked" : ""}/> <span class="cat ${c} jp">${CAT[c].label}</span> <span class="muted">${CAT[c].en} · ${rows.length}</span></label>
          ${rows.map(({ q, skipped }) => {
            const a = st.answers[q.id];
            return `<label class="ex-row ${sel.has(q.id) ? "on" : ""}"><input type="checkbox" data-q="${q.id}" ${sel.has(q.id) ? "checked" : ""}/>
              <span class="ex-num">Q${q.num}</span>
              <span class="ex-text jp">${esc(preview(q))}<small class="muted">${esc(typeLabel(q.type).ja)}</small></span>
              ${audioOnly(q) ? '<span class="ex-audio" title="The choices were only read aloud, so there is little to send">audio only</span>' : ""}
              <span class="ex-ans">${skipped ? '<span class="muted">skipped</span>' : `<s>${a}</s>`} → <b>${q.answer}</b></span></label>`;
          }).join("")}</div>`;
      }).join("");
      const n = sel.size;
      back.innerHTML = `<div class="modal ex-modal" role="dialog" aria-modal="true" aria-label="Export mistakes">
        <div class="ex-head"><div><h3>Ask an AI about your mistakes</h3>
          <p class="muted">Pick the questions to export. You'll get a ready-made prompt to paste into ChatGPT, Claude or any AI tutor, asking for explanations and example sentences.</p></div>
          <button class="icon-btn" data-close aria-label="Close">✕</button></div>
        <div class="ex-tools">
          <button class="btn ghost small" data-all>Select all</button><button class="btn ghost small" data-none>Select none</button>
          <span class="spacer"></span>
          <label class="ex-opt"><input type="checkbox" data-opt="passages" ${prefs.passages ? "checked" : ""}/> Include reading passages</label>
          <label class="ex-opt">Explain in <select data-lang>${["English", "Romanian", "Italian", "Spanish", "French", "German", "Japanese (simple)"].map((l) => `<option ${l === prefs.lang ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        </div>
        <div class="ex-list">${groups}</div>
        ${toast ? `<div class="ex-toast ${toast.includes("class='bad'") ? "bad" : ""}">${toast}</div>` : ""}
        ${manual ? `<textarea class="ex-manual" readonly>${esc(manual)}</textarea>` : ""}
        <div class="ex-foot"><span class="muted">${n} of ${wrongs.length} selected</span><span class="spacer"></span>
          <button class="btn ghost" data-dl ${n ? "" : "disabled"}>⬇ Download .md</button>
          <button class="btn" data-copy ${n ? "" : "disabled"}>Copy for AI</button></div>
      </div>`;
      back.querySelector(".ex-list").scrollTop = prevScroll;
    }
    back.addEventListener("click", async (e) => {
      if (e.target === back || e.target.closest("[data-close]")) return close();
      if (e.target.closest("[data-all]")) { wrongs.forEach(({ q }) => sel.add(q.id)); toast = manual = ""; return draw(); }
      if (e.target.closest("[data-none]")) { sel.clear(); toast = manual = ""; return draw(); }
      const text = () => buildExport(ex, st, items(), prefs);
      if (e.target.closest("[data-copy]")) {
        const txt = text();
        const ok = await copyText(txt);
        if (ok) { toast = `Copied ${sel.size} question${sel.size === 1 ? "" : "s"}. Paste it into your AI chat.`; manual = ""; }
        else { toast = "<span class='bad'>Your browser blocked automatic copying. The text is selected below: press Ctrl/⌘+C.</span>"; manual = txt; }
        draw();
        const ta = back.querySelector(".ex-manual");
        if (ta) { ta.focus(); ta.select(); }
        return;
      }
      if (e.target.closest("[data-dl]")) {
        downloadText(`jlpt-${ex.id}-mistakes.md`, text());
        toast = "Downloaded. You can attach the file or paste its contents into your AI chat."; manual = "";
        return draw();
      }
    });
    back.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.q) { t.checked ? sel.add(t.dataset.q) : sel.delete(t.dataset.q); }
      else if (t.dataset.cat) { wrongs.filter(({ q }) => q.cat === t.dataset.cat).forEach(({ q }) => (t.checked ? sel.add(q.id) : sel.delete(q.id))); }
      else if (t.dataset.opt) { prefs[t.dataset.opt] = t.checked; store.set("jlpt:exportprefs", prefs); }
      else if (t.matches("[data-lang]")) { prefs.lang = t.value; store.set("jlpt:exportprefs", prefs); }
      toast = manual = "";
      draw();
    });
    draw();
  }

  // ────────────── results ──────────────
  function renderResults(ex) {
    const st = loadState(ex.id);
    if (!st || !st.submitted) { location.replace(`#/exam/${ex.id}`); return; }
    document.title = `${ex.level} ${ex.title} · Results`;
    const r = score(ex, st.answers);
    const hist = store.get(histKey(ex.id), []);
    const totalSec = Object.values(st.elapsed).reduce((a, b) => a + b, 0);
    const jv = jlptScore(ex, st.answers);
    const verdict = jv.passed === true
      ? (jv.total >= jv.pass + 30 ? "A comfortable pass. You're solidly at this level." : "A pass. Review the misses below to build a safer margin.")
      : jv.passed === false
        ? (jv.failedSections.length && jv.total >= jv.pass ? "Enough points overall, but one section is under the minimum. Focus there." : jv.total >= jv.pass - 15 ? "Close to a pass. Review the misses below and try again." : "Not a pass yet. The review below shows where to focus.")
        : "Scored without a listening key, so there's no pass/fail verdict for this paper.";
    const R = 74, C = 2 * Math.PI * R;
    const ring = `<div class="ring"><svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r="${R}" fill="none" stroke="var(--border)" stroke-width="14"/>
        <circle cx="85" cy="85" r="${R}" fill="none" stroke="${pctColor(r.pct)}" stroke-width="14" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - r.pct / 100)}"/></svg>
        <div class="val"><div><b>${r.pct}%</b><span>${r.correct} / ${r.total} correct</span></div></div></div>`;

    const byType = new Map();
    for (const q of ex.graded) {
      if (!q.type) continue;
      const t = byType.get(q.type) || { c: 0, n: 0, cat: q.cat };
      t.n++; if (st.answers[q.id] === q.answer) t.c++;
      byType.set(q.type, t);
    }
    const typeRows = [...byType].map(([k, t]) => {
      const p = Math.round((t.c / t.n) * 100), tl = typeLabel(k);
      return `<tr><td><span class="cat ${t.cat} jp">${CAT[t.cat].label}</span></td><td class="jp">${esc(tl.ja)} <span class="muted">${esc(tl.en)}</span></td>
        <td class="tt-bar"><div class="bar"><i style="width:${p}%;background:${CAT[t.cat].color}"></i></div></td><td class="tt-num">${t.c}/${t.n}</td><td class="tt-num"><b>${p}%</b></td></tr>`;
    }).join("");
    const catOrder = ["vocab", "grammar", "reading", "listening"];
    const bds = catOrder.filter((c) => r.byCat[c]).map((c) => {
      const b = r.byCat[c], p = Math.round((b.correct / b.total) * 100);
      return `<div class="bd"><div class="bd-top"><b class="jp">${CAT[c].label} <span style="color:var(--muted);font-weight:500">${CAT[c].en}</span></b><span>${p}%</span></div>
        <div class="bar"><i style="width:${p}%;background:${CAT[c].color}"></i></div><small>${b.correct} of ${b.total} correct</small></div>`;
    }).join("");
    const ungraded = ex.questions.length - ex.graded.length;

    // JLPT scaled score card
    const j = jlptScore(ex, st.answers);
    const badge = j.passed == null
      ? `<span class="jl-badge none">No verdict</span>`
      : j.passed ? `<span class="jl-badge pass">合格 Pass</span>` : `<span class="jl-badge fail">不合格 Fail</span>`;
    const why = j.passed == null
      ? `This paper has no answer key for 聴解, so a pass/fail verdict can't be given. The other sections are scored below.`
      : j.passed
        ? `You're above the pass mark of <b>${j.pass}</b> and above the <b>${j.min}</b>-point minimum in every section.`
        : [
            j.total < j.pass ? `Your total is <b>${j.pass - j.total}</b> point${j.pass - j.total === 1 ? "" : "s"} below the pass mark of <b>${j.pass}</b>.` : `Your total clears the pass mark of <b>${j.pass}</b>`,
            j.failedSections.length ? `${j.total < j.pass ? "Also below" : "but you're below"} the <b>${j.min}</b>-point minimum in ${j.failedSections.map((s) => `<span class="jp">${s.ja}</span>`).join(" and ")}, which fails the exam on its own.` : "",
          ].join(" ");
    const jSecs = j.sections.map((s) => {
      if (!s.graded) return `<div class="jl-sec"><div class="jl-top"><b class="jp">${esc(s.ja)}</b><span class="muted">not graded</span></div><div class="jl-bar"></div><small class="muted">${esc(s.en)}</small></div>`;
      const pct = (s.score / 60) * 100, low = !s.passedMin;
      return `<div class="jl-sec ${low ? "low" : ""}"><div class="jl-top"><b class="jp">${esc(s.ja)}</b><span><b>${s.score}</b><span class="muted"> / 60</span></span></div>
        <div class="jl-bar"><i style="width:${pct}%"></i><em style="left:${(j.min / 60) * 100}%" title="Minimum ${j.min}"></em></div>
        <small class="muted">${esc(s.en)}${low ? ` · <span class="jl-warn">below the ${j.min}-point minimum</span>` : ""}</small></div>`;
    }).join("");
    const jlptCard = `<section class="card jlpt-card">
        <div class="jl-head">
          <div><h2>JLPT score <span class="muted" style="font-weight:500;font-size:13px">estimated</span></h2>
            <div class="jl-total"><b>${j.total}</b><span> / 180</span>${badge}</div></div>
          <div class="jl-mark"><span class="muted">Pass mark</span><b>${j.pass}</b><span class="muted">Section minimum</span><b>${j.min}</b></div>
        </div>
        <div class="jl-scale"><i style="width:${(j.total / 180) * 100}%"></i><em style="left:${(j.pass / 180) * 100}%"><span>${j.pass}</span></em></div>
        <p class="jl-why">${why}</p>
        <div class="jl-secs">${jSecs}</div>
        <p class="progress-note" style="margin:12px 0 0">Real JLPT scores are equated across test dates with a method that isn't published. This estimate scales your weighted points in each section to 60, using the per-question weights prep schools commonly apply to these papers, so treat it as a close guide rather than an official result.</p>
      </section>`;

    const grid = ex.parts.map((p, pi) => `
      <div class="gr-part"><h3 class="jp">${esc(p.name)}</h3>
        ${p.groups.map((g) => `<div class="gr-mondai"><span class="lab jp">問題 ${g.m}</span><div class="cells">
          ${g.qs.map((q) => {
            const s = qState(q, st.answers), a = st.answers[q.id];
            const sub = s === "ng" ? `<small>${a}→${q.answer}</small>` : s === "sk" ? `<small>→${q.answer}</small>` : s === "nk" && a ? `<small>${a}</small>` : "";
            const title = { ok: "Correct", ng: `You chose ${a}, correct is ${q.answer}`, sk: `Unanswered, correct is ${q.answer}`, nk: "No answer key" }[s];
            return `<a class="cell ${s}" href="#/exam/${ex.id}/review/${q.id}" title="${esc(title)}">${p.continuous ? q.num : q.num}${q.unofficial ? "†" : ""}${sub}</a>`;
          }).join("")}</div></div>`).join("")}
      </div>`).join("");

    const histJ = (x) => !x.jlpt ? `<span class="muted">—</span>` : `${x.jlpt.total}/180 ${x.jlpt.passed == null ? "" : x.jlpt.passed ? '<span class="jl-badge pass sm">Pass</span>' : '<span class="jl-badge fail sm">Fail</span>'}`;
    const histRows = hist.slice().reverse().map((x) => `<tr><td>${new Date(x.date).toLocaleString()}</td><td>${histJ(x)}</td><td><b style="color:${pctColor(x.pct)}">${x.pct}%</b></td><td>${x.correct}/${x.total}</td><td>${fmtTime(x.seconds || 0)}</td></tr>`).join("");

    $app.innerHTML = `${topbar()}
      <main class="results">
        <section class="card summary">
          ${ring}
          <div>
            <h1 class="jp">${ex.level} ${ex.title} <span style="color:var(--muted);font-weight:500;font-size:16px">${ex.titleEn}</span></h1>
            <p class="verdict">${verdict}</p>
            <div class="stat-row">
              <div class="stat good"><b>${r.correct}</b><span>Correct</span></div>
              <div class="stat bad"><b>${r.wrong}</b><span>Incorrect</span></div>
              <div class="stat skip"><b>${r.skipped}</b><span>Unanswered</span></div>
              <div class="stat"><b>${fmtTime(totalSec)}</b><span>Time spent</span></div>
            </div>
            ${ungraded ? `<p class="progress-note" style="margin:12px 0 0">${ungraded} questions have no answer key and aren't counted.</p>` : ""}
            ${ex.questions.some((q) => q.unofficial) ? `<p class="progress-note" style="margin:6px 0 0">† Unofficial answer key (solved by hand, not published).</p>` : ""}
            <div class="actions-row" style="margin-top:16px">
              <a class="btn" href="#/exam/${ex.id}/review">Review answers</a>
              ${r.wrong + r.skipped ? `<button class="btn secondary" data-export>✨ Ask AI about my mistakes</button>` : ""}
              <button class="btn ghost" data-retake>Retake test</button>
              <a class="btn ghost" href="#/${ex.level}">All ${ex.level} tests</a>
            </div>
          </div>
        </section>
        ${jlptCard}
        <section class="card"><h2>By section</h2><div class="breakdown">${bds}</div></section>
        ${typeRows ? `<section class="card"><h2>By question type</h2><table class="types-table"><tbody>${typeRows}</tbody></table></section>` : ""}
        <section class="card"><h2>Every question</h2>
          <div class="legend"><span><i style="background:var(--good)"></i>Correct</span><span><i style="background:var(--bad)"></i>Incorrect (yours→correct)</span><span><i style="background:var(--skip)"></i>Unanswered</span><span>Click any question to open it in review.</span></div>
          <div class="grid-review">${grid}</div></section>
        ${hist.length ? `<section class="card"><h2>Attempt history</h2><table class="history"><thead><tr><th>Date</th><th>JLPT</th><th>Score</th><th>Correct</th><th>Time</th></tr></thead><tbody>${histRows}</tbody></table></section>` : ""}
      </main>`;
    const exp = $app.querySelector("[data-export]");
    if (exp) exp.addEventListener("click", () => openExport(ex, st));
    $app.querySelector("[data-retake]").addEventListener("click", async () => {
      const ok = await confirmModal({ title: "Retake this test?", body: "This clears your current answers. Your score stays in the attempt history.", ok: "Retake", danger: true });
      if (!ok) return;
      saveState(ex.id, freshState());
      store.del(`jlpt:audiopos:${ex.id}`);
      location.hash = `#/exam/${ex.id}`;
    });
  }

  route();
})();
