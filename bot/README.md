# eco&deco — сайт-визитка Альбины Шакировой

Современный одностраничный сайт интерьерного декоратора + Telegram-бот для связи.
Хостинг бесплатный: сайт на **GitHub Pages**, бот на **Cloudflare Workers**.

```
web/
├── index.html      — страница
├── styles.css      — стили
├── script.js       — анимации, меню, форма
├── config.js       — ⚙️ ВСЕ КОНТАКТЫ И НАСТРОЙКИ (правьте только его)
├── assets/         — фото и иконки
│   ├── author.jpg          ← фото автора (главный экран)
│   ├── about.jpg           ← фото интерьера (блок «Обо мне»)
│   ├── og.jpg              ← картинка для превью в мессенджерах (1200×630)
│   └── portfolio/01.jpg … 06.jpg  ← работы
└── bot/            — Telegram-бот (Cloudflare Worker)
```

Пока фото не добавлены, на их месте показываются заглушки.

---

## 1. Заполнить контакты

Откройте `config.js` и впишите свои данные:

```js
instagram: "eco.and.deco",
telegram:  "ваш_username",      // или имя бота, например "ecoanddeco_bot"
whatsapp:  "79991234567",       // без «+»
phoneDisplay: "+7 999 123-45-67",
phoneDial: "+79991234567",
email: "hello@example.com",
workerUrl: "",                  // появится после настройки бота (шаг 3)
```

Если какой-то контакт не нужен — оставьте пустую строку `""`, кнопка исчезнет.

## 2. Добавить фото

Положите файлы в `assets/` с именами из схемы выше (формат `.jpg`).
Рекомендуемые размеры: фото автора — вертикальное 4:5 (например 1200×1500),
портфолио — квадрат или вертикаль не меньше 1000 px по короткой стороне.
Подписи к работам меняются в `index.html` в блоке `<figcaption>`.

## 3. Опубликовать на GitHub Pages (бесплатно)

1. Зарегистрируйтесь на <https://github.com> (если ещё нет).
2. Создайте новый репозиторий, например `eco-and-deco` (Public).
3. В терминале, в папке сайта:
   ```bash
   git remote add origin https://github.com/ВАШ_ЛОГИН/eco-and-deco.git
   git branch -M main
   git push -u origin main
   ```
4. На GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   ветка `main`, папка `/ (root)` → **Save**.
5. Через 1–2 минуты сайт откроется по адресу
   `https://ВАШ_ЛОГИН.github.io/eco-and-deco/`.

Хотите адрес без имени репозитория (`ВАШ_ЛОГИН.github.io`)? Назовите репозиторий
`ВАШ_ЛОГИН.github.io`. Свой домен тоже подключается бесплатно в тех же настройках Pages.

Обновление сайта после правок:
```bash
git add -A && git commit -m "Обновление" && git push
```

## 4. Telegram-бот (бесплатно, Cloudflare Workers)

Бот принимает сообщения клиентов и пересылает их вам, вы отвечаете через reply.
Также он принимает заявки с формы на сайте.

### 4.1 Создать бота
1. В Telegram откройте **@BotFather** → `/newbot` → придумайте имя и username (например `ecoanddeco_bot`).
2. Скопируйте **токен** (вида `123456:ABC-DEF...`).
3. Узнайте свой **chat_id**: напишите боту **@userinfobot**, он ответит числом.
4. Напишите своему новому боту `/start` хотя бы один раз (иначе он не сможет вам писать).

### 4.2 Развернуть
Нужен Node.js 18+ (<https://nodejs.org>). Далее:

```bash
cd bot
npm install
npx wrangler login            # откроется браузер, войдите/зарегистрируйтесь в Cloudflare (бесплатно)

npx wrangler secret put BOT_TOKEN       # вставьте токен от BotFather
npx wrangler secret put OWNER_CHAT_ID   # ваш chat_id
npx wrangler secret put WEBHOOK_SECRET  # любая случайная строка, например: openssl rand -hex 16

npx wrangler deploy
```

В конце появится адрес вида `https://eco-and-deco-bot.ВАШ_АККАУНТ.workers.dev`.

### 4.3 Включить webhook (один раз)
Откройте в браузере:
```
https://eco-and-deco-bot.ВАШ_АККАУНТ.workers.dev/setup?secret=ВАШ_WEBHOOK_SECRET
```
Ответ `"ok": true` означает, что бот работает. Напишите ему `/start` и проверьте.

### 4.4 Связать с сайтом
- В `config.js` впишите `workerUrl: "https://eco-and-deco-bot.ВАШ_АККАУНТ.workers.dev"`,
  и в `telegram:` можно указать имя бота — тогда кнопка «Telegram» откроет чат с ним.
- В `bot/wrangler.toml` укажите `SITE_URL` (адрес сайта) и при желании
  `ALLOWED_ORIGIN = "https://ВАШ_ЛОГИН.github.io"`, затем `npx wrangler deploy` ещё раз.
- Закоммитьте и запушьте сайт.

### Как это работает для вас
- Клиент пишет боту → вам приходит его сообщение с пометкой `#client…`.
- Вы делаете **«Ответить»** (reply) на это сообщение → бот отправляет ваш ответ клиенту.
- Заявка с формы сайта приходит отдельным сообщением «Новая заявка с сайта».

Без настроенного бота форма на сайте тоже работает: она открывает Telegram с готовым текстом.

---

## Локальный просмотр

```bash
python3 -m http.server 8000
```
и откройте <http://localhost:8000>.

## Изменить тексты и цвета

- Тексты — в `index.html` (всё по-русски, блоки подписаны комментариями).
- Цвета — переменные в начале `styles.css` (`--green`, `--terra`, `--sage`, `--bg`).
- Шрифты — Cormorant Garamond + Manrope (Google Fonts), меняются в `<head>` и `:root`.
