/**
 * Telegram-бот eco&deco на Cloudflare Workers (бесплатный тариф).
 *
 * Что умеет:
 *  • /start — приветствие и меню с кнопками (услуги, портфолио, контакты, «написать Альбине»)
 *  • Любое сообщение от клиента пересылается владельцу (OWNER_CHAT_ID)
 *  • Владелец может ответить клиенту: просто ответьте (reply) на пересланное сообщение в чате с ботом
 *  • POST /contact — принимает заявки с формы сайта и присылает их владельцу
 *  • GET  /setup   — один раз регистрирует webhook у Telegram (нужен ?secret=WEBHOOK_SECRET)
 *
 * Секреты (задаются через `wrangler secret put`):
 *  BOT_TOKEN       — токен от @BotFather
 *  OWNER_CHAT_ID   — ваш chat_id (узнать у @userinfobot)
 *  WEBHOOK_SECRET  — любая случайная строка
 *
 * Переменные (в wrangler.toml):
 *  SITE_URL, INSTAGRAM_URL, ALLOWED_ORIGIN
 */

const TEXTS = {
  start: (name) =>
    `Здравствуйте${name ? ", " + name : ""}! 🌿\n\n` +
    `Я бот Альбины Шакировой — интерьерного декоратора.\n` +
    `Расскажите, что хотите изменить в вашем доме, или выберите пункт меню ниже. ` +
    `Альбина увидит сообщение и ответит вам лично.`,
  services:
    `✦ *Чем я могу помочь*\n\n` +
    `*01 Декорирование интерьера* — текстиль, декор, свет, растения для готового ремонта.\n` +
    `*02 Консультация* — онлайн или лично, разбор интерьера и план изменений.\n` +
    `*03 Эко-композиции* — авторские композиции из сухоцветов и природных материалов.\n` +
    `*04 Праздничный декор* — оформление дома, свадеб, фотозон без пластика.\n\n` +
    `Напишите, что вам интересно, и я подскажу по стоимости и срокам.`,
  write:
    `Напишите сообщение прямо сюда — опишите задачу, прикрепите фото комнаты, если есть. ` +
    `Я всё передам Альбине, и она ответит вам в этом чате. 🌱`,
  forwarded: `Спасибо! Сообщение передано Альбине 🌿 Она ответит вам здесь, как только освободится.`,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    // --- Заявка с сайта ---
    if (url.pathname === "/contact" && request.method === "POST") {
      try {
        const body = await request.json();
        const name = clean(body.name, 100);
        const contact = clean(body.contact, 100);
        const message = clean(body.message, 1500);
        if (!name || !contact) return json({ error: "name and contact required" }, 400, cors);

        const text =
          `📩 *Новая заявка с сайта*\n\n` +
          `👤 Имя: ${esc(name)}\n` +
          `📞 Контакт: ${esc(contact)}\n` +
          (message ? `💬 Сообщение:\n${esc(message)}\n` : "") +
          (body.page ? `\n🔗 ${esc(clean(body.page, 200))}` : "");
        await tg(env, "sendMessage", { chat_id: env.OWNER_CHAT_ID, text, parse_mode: "MarkdownV2" });
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: String(e) }, 500, cors);
      }
    }

    // --- Регистрация webhook (один раз) ---
    if (url.pathname === "/setup") {
      if (url.searchParams.get("secret") !== env.WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
      const res = await tg(env, "setWebhook", {
        url: `${url.origin}/webhook`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ["message", "callback_query"],
      });
      await tg(env, "setMyCommands", {
        commands: [
          { command: "start", description: "Начать" },
          { command: "services", description: "Услуги" },
          { command: "contact", description: "Контакты" },
        ],
      });
      return json(res);
    }

    // --- Обновления от Telegram ---
    if (url.pathname === "/webhook" && request.method === "POST") {
      if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET)
        return new Response("forbidden", { status: 403 });
      const update = await request.json();
      try {
        await handleUpdate(update, env);
      } catch (e) {
        console.error(e);
      }
      return new Response("ok");
    }

    return new Response("eco&deco bot is running 🌿", { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};

async function handleUpdate(update, env) {
  if (update.callback_query) {
    const cq = update.callback_query;
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
    await handleCommand(cq.data, cq.message.chat, cq.from, env);
    return;
  }

  const msg = update.message;
  if (!msg) return;
  const chat = msg.chat;
  const isOwner = String(chat.id) === String(env.OWNER_CHAT_ID);

  // Владелец отвечает клиенту: reply на пересланное сообщение
  if (isOwner) {
    const replyTo = msg.reply_to_message;
    const target = replyTo && extractClientId(replyTo);
    if (target) {
      await tg(env, "copyMessage", { chat_id: target, from_chat_id: chat.id, message_id: msg.message_id });
      await tg(env, "sendMessage", { chat_id: chat.id, text: "✅ Отправлено клиенту", reply_to_message_id: msg.message_id });
      return;
    }
    if (msg.text?.startsWith("/")) return handleCommand(msg.text, chat, msg.from, env);
    await tg(env, "sendMessage", {
      chat_id: chat.id,
      text: "Чтобы ответить клиенту, сделайте reply («Ответить») на его сообщение.",
    });
    return;
  }

  // Команды клиента
  if (msg.text?.startsWith("/")) return handleCommand(msg.text, chat, msg.from, env);

  // Обычное сообщение клиента → владельцу
  const who = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();
  const username = msg.from.username ? `@${msg.from.username}` : "без username";
  await tg(env, "sendMessage", {
    chat_id: env.OWNER_CHAT_ID,
    text: `💬 Сообщение от *${esc(who)}* \\(${esc(username)}\\)\n#client${chat.id}\n\n_Ответьте на следующее сообщение, чтобы написать клиенту_`,
    parse_mode: "MarkdownV2",
  });
  await tg(env, "forwardMessage", { chat_id: env.OWNER_CHAT_ID, from_chat_id: chat.id, message_id: msg.message_id });
  await tg(env, "sendMessage", { chat_id: chat.id, text: TEXTS.forwarded });
}

async function handleCommand(cmd, chat, from, env) {
  const c = (cmd || "").split(" ")[0].toLowerCase();
  const menu = {
    inline_keyboard: [
      [{ text: "🌿 Услуги", callback_data: "/services" }, { text: "🖼 Портфолио", url: env.INSTAGRAM_URL }],
      [{ text: "✍️ Написать Альбине", callback_data: "/write" }],
      [{ text: "🌐 Сайт", url: env.SITE_URL }, { text: "📞 Контакты", callback_data: "/contact" }],
    ],
  };
  switch (c) {
    case "/start":
      return tg(env, "sendMessage", { chat_id: chat.id, text: TEXTS.start(from?.first_name), reply_markup: menu });
    case "/services":
      return tg(env, "sendMessage", { chat_id: chat.id, text: TEXTS.services, parse_mode: "Markdown", reply_markup: menu });
    case "/write":
      return tg(env, "sendMessage", { chat_id: chat.id, text: TEXTS.write });
    case "/contact":
      return tg(env, "sendMessage", {
        chat_id: chat.id,
        text: `📍 Связаться со мной:\n\n• Instagram: ${env.INSTAGRAM_URL}\n• Сайт: ${env.SITE_URL}\n• Или просто напишите сюда — отвечу лично.`,
        reply_markup: menu,
      });
    default:
      return tg(env, "sendMessage", { chat_id: chat.id, text: "Не знаю такой команды 🙂 Нажмите /start", reply_markup: menu });
  }
}

/** Находим chat_id клиента в пересланном сообщении */
function extractClientId(replyTo) {
  if (replyTo.forward_from?.id) return replyTo.forward_from.id;
  const m = (replyTo.text || "").match(/#client(-?\d+)/);
  return m ? Number(m[1]) : null;
}

async function tg(env, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

const clean = (s, max) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const esc = (s) => String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

function corsHeaders(env, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "*").split(",").map((s) => s.trim());
  const ok = allowed.includes("*") || allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin || "*" : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
