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
