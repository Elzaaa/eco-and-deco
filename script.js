(() => {
  const cfg = window.SITE_CONFIG || {};

  /* ---------- Подстановка контактов из config.js ---------- */
  const links = {
    instagram: cfg.instagram ? `https://www.instagram.com/${cfg.instagram}/` : null,
    telegram: cfg.telegram && !cfg.telegram.startsWith("ВАШ") ? `https://t.me/${cfg.telegram}` : null,
    whatsapp: cfg.whatsapp ? `https://wa.me/${cfg.whatsapp}` : null,
    phone: cfg.phoneDial ? `tel:${cfg.phoneDial}` : null,
    email: cfg.email ? `mailto:${cfg.email}` : null,
  };
  document.querySelectorAll("[data-link]").forEach((a) => {
    const href = links[a.dataset.link];
    if (href) a.href = href;
    else a.closest(".social")?.remove() ?? (a.style.display = "none");
  });
  document.querySelectorAll('[data-text="phone"]').forEach((el) => {
    if (cfg.phoneDisplay) el.textContent = cfg.phoneDisplay;
  });
  Object.entries(cfg.stats || {}).forEach(([k, v]) => {
    const el = document.querySelector(`[data-stat="${k}"]`);
    if (el) el.textContent = v;
  });
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Шапка: тень при скролле, мобильное меню ---------- */
  const nav = document.getElementById("nav");
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("navLinks");
  const onScroll = () => nav.classList.toggle("nav--scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      burger.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- Появление блоков при прокрутке ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-visible"), io.unobserve(e.target))),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.setProperty("--delay", `${(i % 4) * 70}ms`);
    io.observe(el);
  });

  /* ---------- Форма заявки ---------- */
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.name = data.name.trim();
    data.contact = data.contact.trim();
    data.message = (data.message || "").trim();

    if (!data.name || !data.contact) {
      show("Пожалуйста, заполните имя и контакт.", "error");
      return;
    }

    // Нет сервера — открываем Telegram с готовым текстом
    if (!cfg.workerUrl) {
      const text = `Здравствуйте! Меня зовут ${data.name}. ${data.message || "Хочу обсудить декор."} Мой контакт: ${data.contact}`;
      if (links.telegram) {
        window.open(`${links.telegram}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        show("Открываю Telegram — отправьте сообщение там.", "ok");
      } else if (links.email) {
        location.href = `${links.email}?subject=${encodeURIComponent("Заявка с сайта")}&body=${encodeURIComponent(text)}`;
      } else {
        show("Контакты пока не настроены.", "error");
      }
      return;
    }

    form.classList.add("is-sending");
    show("", "");
    try {
      const res = await fetch(`${cfg.workerUrl.replace(/\/$/, "")}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, page: location.href }),
      });
      if (!res.ok) throw new Error(await res.text());
      form.reset();
      show("Спасибо! Заявка отправлена, я скоро свяжусь с вами.", "ok");
    } catch (err) {
      console.error(err);
      show("Не удалось отправить. Напишите мне напрямую в Telegram или WhatsApp.", "error");
    } finally {
      form.classList.remove("is-sending");
    }
  });

  function show(msg, type) {
    status.textContent = msg;
    status.className = "form__status" + (type ? ` form__status--${type}` : "");
  }
})();

/* ============================================================
   Интерактив: до/после, квиз, мудборд, калькулятор
   ============================================================ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Подставить текст в форму заявки и проскроллить к ней */
  function prefill(text) {
    const ta = $('#contactForm textarea[name="message"]');
    if (ta) ta.value = text;
    $("#contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $('#contactForm input[name="name"]')?.focus({ preventScroll: true }), 700);
  }

  /* ---------- До / после ---------- */
  $$("[data-compare]").forEach((box) => {
    const range = $(".ba__range", box);
    const set = (v) => {
      v = Math.min(99, Math.max(1, +v));
      box.style.setProperty("--pos", v + "%");
      box.style.setProperty("--pos-num", v);
    };
    range.addEventListener("input", () => set(range.value));
    set(range.value);
  });

  /* ---------- Квиз ---------- */
  const STYLES = {
    warm: {
      title: "Тёплый минимализм",
      text: "Вам близки спокойствие и порядок, но без холода. Немного вещей, каждая — со смыслом, тёплые нейтральные цвета и много света.",
      palette: ["#f3eee4", "#e7d9c3", "#c9a98a", "#8fa98f", "#1f2622"],
      tips: ["Уберите 30 % предметов с открытых поверхностей — станет легче дышать", "Один крупный акцент вместо пяти мелких: ваза, картина или кресло", "Тёплый свет 2700K в лампах — он меняет комнату сильнее, чем мебель"],
    },
    boho: {
      title: "Эко-бохо",
      text: "Вы любите фактуры, живое и несовершенное: плетёные вещи, сухоцветы, керамику ручной работы. Дом — как путешествие.",
      palette: ["#efe6d8", "#d9b98a", "#c97b5a", "#7d8b5a", "#5c4634"],
      tips: ["Соберите «полку историй» из привезённых и подаренных вещей", "Текстиль слоями: ковёр, плед, подушки разных фактур в одной гамме", "Сухоцветы и ветки в больших напольных вазах"],
    },
    scandi: {
      title: "Скандинавский уют",
      text: "Светло, просто и функционально. Белые стены, дерево, мягкий текстиль и обязательно свечи зимой — hygge по-настоящему.",
      palette: ["#f7f5f0", "#e3ded5", "#b9c7b2", "#8a6a4e", "#3b4a6b"],
      tips: ["Светлое дерево и белый — база, цвет добавляем текстилем", "Уютный угол для чтения: кресло, торшер, плед", "Растения с крупными листьями: монстера, фикус"],
    },
    japandi: {
      title: "Джапанди",
      text: "Тишина, ремесло и природа. Низкая мебель, приглушённые землистые тона, керамика, камень и ничего лишнего.",
      palette: ["#ece7dc", "#c99b7f", "#3f5a4b", "#4a4d4f", "#1f2622"],
      tips: ["Пустота — тоже декор: оставьте стене свободное место", "Один предмет ручной работы на видном месте", "Низкий свет: напольные и настольные лампы вместо верхнего"],
    },
  };
  const QUESTIONS = [
    { q: "Как вы хотите чувствовать себя дома?", a: [
      ["Спокойно и собранно", "порядок и тишина", "#e7d9c3", "warm"],
      ["Свободно и расслабленно", "как на даче у моря", "#d9b98a", "boho"],
      ["Светло и бодро", "утро, кофе, окно", "#e3ded5", "scandi"],
      ["Сосредоточенно", "как в чайной комнате", "#c99b7f", "japandi"],
    ]},
    { q: "Какая палитра вам ближе?", a: [
      ["Бежевый, молочный, песок", "", "linear-gradient(135deg,#f3eee4,#e7d9c3,#c9a98a)", "warm"],
      ["Терракота, охра, оливка", "", "linear-gradient(135deg,#c97b5a,#d2a24c,#7d8b5a)", "boho"],
      ["Белый, серый, светлое дерево", "", "linear-gradient(135deg,#f7f5f0,#e3ded5,#d9c7b2)", "scandi"],
      ["Глина, графит, тёмная зелень", "", "linear-gradient(135deg,#c99b7f,#4a4d4f,#3f5a4b)", "japandi"],
    ]},
    { q: "Что бы вы поставили на пустую полку?", a: [
      ["Одну красивую вазу", "и больше ничего", "#f3eee4", "warm"],
      ["Ракушки, книги, свечи, керамику", "всё, что дорого", "#efd9cd", "boho"],
      ["Фото в рамках и растение", "", "#d6e0d2", "scandi"],
      ["Камень, ветку и чашу", "", "#d8cfc2", "japandi"],
    ]},
    { q: "Какой текстиль вам приятнее?", a: [
      ["Плотный хлопок, ровный и гладкий", "", "#f1ebe0", "warm"],
      ["Макраме, плетение, бахрома", "", "#d9b98a", "boho"],
      ["Мягкая шерсть и вязаные пледы", "", "#e3ded5", "scandi"],
      ["Грубый лён натурального цвета", "", "#e6dcc8", "japandi"],
    ]},
    { q: "Идеальный вечер дома — это…", a: [
      ["Порядок, тишина, книга", "", "#e7d9c3", "warm"],
      ["Друзья, подушки на полу, музыка", "", "#efd9cd", "boho"],
      ["Свечи, какао, сериал под пледом", "", "#d6e0d2", "scandi"],
      ["Чай, медленный ужин, мягкий свет", "", "#c99b7f", "japandi"],
    ]},
  ];

  const quiz = {
    intro: $("#quizIntro"), body: $("#quizBody"), result: $("#quizResult"),
    bar: $("#quizBar"), counter: $("#quizCounter"), question: $("#quizQuestion"), options: $("#quizOptions"),
    step: 0, answers: [],
  };
  if (quiz.intro) {
    const render = () => {
      const { q, a } = QUESTIONS[quiz.step];
      quiz.bar.style.width = `${(quiz.step / QUESTIONS.length) * 100}%`;
      quiz.counter.textContent = `Вопрос ${quiz.step + 1} из ${QUESTIONS.length}`;
      quiz.question.textContent = q;
      quiz.options.innerHTML = a.map(([t, s, sw, key], i) =>
        `<button type="button" class="quiz__opt" data-key="${key}" data-i="${i}"><i style="--sw:${sw}"></i><span><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span></button>`
      ).join("");
      $("#quizBack").style.visibility = quiz.step ? "visible" : "hidden";
    };
    const finish = () => {
      const score = {};
      quiz.answers.forEach((k) => (score[k] = (score[k] || 0) + 1));
      const key = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
      const st = STYLES[key];
      quiz.resultKey = key;
      $("#resultTitle").textContent = st.title;
      $("#resultText").textContent = st.text;
      $("#resultPalette").innerHTML = st.palette.map((c) => `<span style="background:${c}"></span>`).join("");
      $("#resultTips").innerHTML = st.tips.map((t) => `<li>${t}</li>`).join("");
      quiz.body.hidden = true; quiz.result.hidden = false;
    };
    $("#quizStart").addEventListener("click", () => { quiz.intro.hidden = true; quiz.body.hidden = false; quiz.step = 0; quiz.answers = []; render(); });
    quiz.options.addEventListener("click", (e) => {
      const btn = e.target.closest(".quiz__opt"); if (!btn) return;
      quiz.answers[quiz.step] = btn.dataset.key;
      quiz.step++;
      quiz.step < QUESTIONS.length ? render() : finish();
    });
    $("#quizBack").addEventListener("click", () => { if (quiz.step) { quiz.step--; render(); } });
    $("#quizRestart").addEventListener("click", () => { quiz.result.hidden = true; quiz.body.hidden = false; quiz.step = 0; quiz.answers = []; render(); });
    $("#quizSend").addEventListener("click", () => {
      const st = STYLES[quiz.resultKey];
      prefill(`Результат квиза на сайте: «${st.title}». Хочу обсудить, с чего начать.`);
    });
  }

  /* ---------- Мудборд ---------- */
  const board = $("#board");
  if (board) {
    const state = { wall: "Тёплый белый", wallC: "#f3eee4", accent: "Терракота", accentC: "#c97b5a", material: "Светлое дерево", materialTex: "wood-light", textile: "Лён", textileTex: "linen", plants: "Сухоцветы", plantsIcon: "🌾", room: "Гостиная" };
    const nameFor = () => {
      const dark = ["Глубокий зелёный", "Графит"].includes(state.wall);
      const warm = ["Песочный", "Глина", "Пыльная роза"].includes(state.wall);
      if (state.material === "Ротанг" || state.plants === "Сухоцветы") return dark ? "Тёмное бохо" : "Эко-бохо";
      if (state.material === "Камень" || state.material === "Керамика") return dark ? "Джапанди" : "Ваби-саби";
      if (dark) return state.textile === "Бархат" ? "Глубокий уют" : "Лесной кабинет";
      if (warm) return "Тёплый минимализм";
      return state.material === "Тёмное дерево" ? "Современная классика" : "Скандинавский уют";
    };
    const luminance = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
    const render = () => {
      const wall = $("#boardWall");
      wall.style.background = state.wallC;
      wall.style.color = luminance(state.wallC) < 0.5 ? "#fff" : "var(--ink)";
      $("#boardTitle").textContent = nameFor();
      $("#boardSub").textContent = `${state.room} · стены «${state.wall}»`;
      $("#boardAccent").style.background = state.accentC;
      const m = $("#boardMaterial"); m.className = `board__material tex tex--${state.materialTex}`; m.firstElementChild.textContent = state.material;
      const t = $("#boardTextile"); t.className = `board__textile tex tex--${state.textileTex}`; t.firstElementChild.textContent = state.textile;
      $("#boardPlant i").textContent = state.plantsIcon; $("#boardPlant span").textContent = state.plants;
      $("#boardDesc").textContent = `${state.room}: стены «${state.wall.toLowerCase()}», акцент — ${state.accent.toLowerCase()}, ${state.material.toLowerCase()}, текстиль — ${state.textile.toLowerCase()}, зелень — ${state.plants.toLowerCase()}.`;
    };
    $$(".mood__group").forEach((group) => {
      const key = group.dataset.group;
      group.addEventListener("click", (e) => {
        const btn = e.target.closest("button"); if (!btn) return;
        $$("button", group).forEach((b) => b.classList.toggle("is-active", b === btn));
        apply(key, btn); render();
      });
    });
    function apply(key, btn) {
      state[key] = btn.dataset.value;
      if (btn.classList.contains("swatch")) state[key + "C"] = getComputedStyle(btn).getPropertyValue("--c").trim();
      if (btn.dataset.tex) state[key + "Tex"] = btn.dataset.tex;
      if (btn.dataset.icon) state[key + "Icon"] = btn.dataset.icon;
    }
    $("#moodShuffle").addEventListener("click", () => {
      $$(".mood__group").forEach((group) => {
        const btns = $$("button", group); const btn = btns[Math.floor(Math.random() * btns.length)];
        btns.forEach((b) => b.classList.toggle("is-active", b === btn)); apply(group.dataset.group, btn);
      });
      render();
    });
    $("#moodSend").addEventListener("click", () => prefill(`Мудборд с сайта — «${nameFor()}». ${$("#boardDesc").textContent} Хочу обсудить.`));
    render();
  }

  /* ---------- Пакеты и калькулятор ---------- */
  $$("[data-package]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); prefill(`Интересует пакет «${a.dataset.package}».`); }));

  const calc = { type: $("#calcType"), rooms: $("#calcRooms"), area: $("#calcArea"), buy: $("#calcBuy"), sum: $("#calcSum"), note: $("#calcNote") };
  if (calc.type) {
    // Базовые ставки — примерные, поменяйте под себя
    const RATES = { consult: 4000, room: 18000, home: 55000, event: 25000 };
    const fmt = (n) => Math.round(n / 500) * 500;
    const money = (n) => n.toLocaleString("ru-RU") + " ₽";
    const update = () => {
      const t = calc.type.value, rooms = +calc.rooms.value, area = +calc.area.value;
      $("#calcRoomsVal").textContent = rooms; $("#calcAreaVal").textContent = area;
      $("#calcRoomsField").style.display = t === "home" ? "" : "none";
      $("#calcAreaField").style.display = t === "room" || t === "event" ? "" : "none";
      calc.buy.parentElement.style.display = t === "consult" ? "none" : "";
      let v;
      if (t === "consult") v = RATES.consult;
      else if (t === "room") v = RATES.room * (0.7 + area / 40);
      else if (t === "home") v = RATES.home + Math.max(0, rooms - 3) * RATES.room * 0.8;
      else v = RATES.event * (0.6 + area / 40);
      if (t !== "consult" && calc.buy.checked) v *= 1.1;
      calc.sum.textContent = (t === "consult" ? "" : "от ") + money(fmt(v));
      calc.note.textContent = t === "consult"
        ? "Фиксированная цена. Список покупок и запись созвона включены."
        : t === "event" ? "Материалы и аренда считаются отдельно, зависят от площадки."
        : `Бюджет на сам декор и текстиль считается отдельно, обычно от 30 000 ₽ на комнату.`;
    };
    ["change", "input"].forEach((ev) => [calc.type, calc.rooms, calc.area, calc.buy].forEach((el) => el.addEventListener(ev, update)));
    $("#calcSend").addEventListener("click", () => prefill(`Расчёт на сайте: ${calc.type.selectedOptions[0].textContent.toLowerCase()}, ориентир ${calc.sum.textContent}. Хочу уточнить стоимость.`));
    update();
  }
})();
