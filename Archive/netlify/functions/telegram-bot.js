/**
 * BulletApex Telegram Bot — Netlify Serverless Function
 * Smart bot: detects language, analyses intent, max 2 messages, redirects to admin
 */

const BOT_TOKEN  = process.env.BOT_TOKEN  || '8695105977:AAGz3mL4-7vQTgXJ8vnPbzM6rbzuhT-_Iso';
const ADMIN_ID   = process.env.ADMIN_CHAT_ID;
const TG_API     = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SITE_URL   = 'https://bulletapex.com';

const RESEND_KEY   = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'contact@bulletapex.com';

// ── Email via Resend ──────────────────────────────────────────────
async function sendEmail(subject, html) {
  if (!RESEND_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'BulletApex Inquiries <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        subject,
        html,
      }),
    });
  } catch (e) { console.warn('Resend error:', e.message); }
}

// ── Telegram helpers ──────────────────────────────────────────────
async function sendMessage(chat_id, text, extra = {}) {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown', ...extra }),
  });
}
async function answerCallback(id) {
  await fetch(`${TG_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id }),
  });
}

// ── Language detection ────────────────────────────────────────────
function detectLang(text) {
  return /[а-яёА-ЯЁіїєІЇЄ]/u.test(text) ? 'ru' : 'en';
}

// ── Intent analysis ───────────────────────────────────────────────
function analyzeIntent(text) {
  const t = text.toLowerCase();
  if (/casino|казино|igaming|игровой|slot|покер|poker|ставк|gambling|букмекер|sportsbook|crm|retention|удержан|платеж|payment/.test(t)) return 'igaming';
  if (/sell|продать|продажа|exit|выход|sale|продаж|acquisition|купить|buy|m.?a/.test(t)) return 'exit';
  if (/valuat|оценк|стоимость|worth|сколько стоит|мультипл|ebitda|multiple/.test(t)) return 'valuation';
  if (/model|модел|план|plan|forecast|прогноз|бизнес.план|финансов/.test(t)) return 'model';
  if (/audit|аудит|profit|прибыль|убыток|loss|margin|маржа|opex|cost|затрат/.test(t)) return 'profitability';
  return 'general';
}

// ── Smart response (max 1 message before contact collection) ──────
function getSmartReply(text, lang) {
  const intent = analyzeIntent(text);

  const replies = {
    ru: {
      igaming: '🎰 *BulletApex · iGaming Advisory*\n\nНезависимый советник для iGaming операторов: финансовые модели, оптимизация P&L, CRM/Retention, M&A, структурирование. 12+ лет в секторе. Работаем только на стороне собственника — без конфликта интересов.',
      exit: '📋 *BulletApex · Выход из бизнеса / M&A*\n\nПомогаем собственникам подготовить бизнес к продаже: оценка, упаковка, поиск покупателей, сопровождение сделки. Owner-side only — мы всегда на вашей стороне.',
      valuation: '📊 *BulletApex · Оценка бизнеса*\n\nНезависимая оценка: нормализованный EBITDA, мультипликаторы, диапазон стоимости, ключевые драйверы. Результат — не для аудиторов, а для принятия решений.',
      model: '📐 *BulletApex · Финансовое моделирование*\n\nСтроим финансовые модели для iGaming и других секторов: GGR→EBITDA, LTV по когортам, бонусная экономика, 3-летний P&L. Investor-ready.',
      profitability: '🔍 *BulletApex · Анализ прибыльности*\n\nДиагностика P&L — где теряется маржа, утечка EBITDA, неэффективные косты. Находим 15–30% потенциала улучшения EBITDA в большинстве операций.',
      general: '📌 *BulletApex — Clarity Without Mercy*\n\nНезависимый стратегический финансовый советник для собственников. Оценка бизнеса, выход / M&A, iGaming Advisory, финансовые модели. Только на стороне клиента.',
    },
    en: {
      igaming: '🎰 *BulletApex · iGaming Advisory*\n\nIndependent advisor for iGaming operators: financial modelling, P&L optimisation, CRM/Retention, M&A, and corporate structuring. 12+ years in the sector. Owner-side only — no conflicts of interest.',
      exit: '📋 *BulletApex · Exit & M&A Advisory*\n\nWe prepare businesses for sale: valuation, deal packaging, buyer identification, and transaction support. Always on the owner\'s side of the table.',
      valuation: '📊 *BulletApex · Business Valuation*\n\nIndependent valuation: normalised EBITDA, multiple selection, defensible value range, key drivers. Built for decisions, not compliance.',
      model: '📐 *BulletApex · Financial Modelling*\n\nWe build financial models for iGaming and other sectors: GGR→EBITDA, cohort LTV, bonus economics, 3-year P&L. Investor-ready output.',
      profitability: '🔍 *BulletApex · Profitability Analysis*\n\nP&L diagnostic — margin leakage, EBITDA gaps, cost inefficiency. We identify 15–30% EBITDA improvement potential in most operations.',
      general: '📌 *BulletApex — Clarity Without Mercy*\n\nIndependent strategic finance advisory for business owners. Business valuation, exit/M&A advisory, iGaming advisory, financial modelling. Owner-side only.',
    },
  };

  return replies[lang][intent];
}

// ── Detect if message looks like contact info ─────────────────────
function looksLikeContact(text) {
  if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text)) return true; // email
  if (/\+[0-9]{7,15}/.test(text)) return true;                                       // +phone
  if (/@[a-zA-Z][a-zA-Z0-9_]{3,}/.test(text)) return true;                          // @telegram
  if (/(?:^|\s)\d{7,}/.test(text)) return true;                                      // bare phone digits
  return false;
}

// ── Contact request (message 2) ───────────────────────────────────
function getContactRequest(lang) {
  if (lang === 'ru') {
    return '💬 Чтобы советник мог связаться с вами напрямую, укажите один из контактов:\n\n📧 Email\n📱 WhatsApp / телефон с кодом страны (+XXX...)\n✈️ Telegram @username\n\n_Просто напишите его в следующем сообщении. Данные строго конфиденциальны._';
  }
  return '💬 To have our advisor reach you directly, please share one of the following in your next message:\n\n📧 Email address\n📱 WhatsApp / Phone with country code (+1...)\n✈️ Telegram @username\n\n_Your details are strictly confidential._';
}

// ── Notify admin ──────────────────────────────────────────────────
async function notifyAdmin(user, originalMsg, contactInfo, lang) {
  if (!ADMIN_ID) return;
  const name    = [user.first_name, user.last_name].filter(Boolean).join(' ');
  const handle  = user.username ? `@${user.username}` : '—';
  const intent  = analyzeIntent(originalMsg);
  const langLabel = lang === 'ru' ? '🇺🇦/🇷🇺 RU/UA' : '🇬🇧 EN';
  const ts      = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv' });

  const text = [
    `🔔 *New Lead via Bot*`,
    ``,
    `👤 *Name:* ${name}`,
    `🆔 *Handle:* ${handle} (ID: ${user.id})`,
    `🌍 *Language:* ${langLabel}`,
    `📋 *Topic:* ${intent}`,
    ``,
    `💬 *Their message:*`,
    originalMsg,
    ``,
    `📞 *Contact provided:*`,
    contactInfo || '— (not provided)',
    ``,
    `⏰ ${ts} (Kyiv)`,
  ].join('\n');

  await sendMessage(ADMIN_ID, text, {
    reply_markup: {
      inline_keyboard: user.username
        ? [[{ text: `💬 Reply to @${user.username}`, url: `https://t.me/${user.username}` }]]
        : [[{ text: `💬 Open chat with user`, url: `tg://user?id=${user.id}` }]],
    },
  });

  // Also send email notification
  await sendEmail(
    `New Bot Lead — ${name} (${intent})`,
    `<div style="font-family:sans-serif;max-width:600px;padding:24px">
      <h2 style="color:#112233">New Lead via Telegram Bot</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c;width:120px">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${name}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Handle</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${handle}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Language</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${langLabel}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Topic</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${intent}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Contact</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${contactInfo || '—'}</td></tr>
      </table>
      <div style="margin-top:16px;padding:16px;background:#f9f7f4;border-left:3px solid #b5924c">
        <p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c;margin:0 0 8px">Message</p>
        <p style="margin:0;line-height:1.7;color:#333">${originalMsg.replace(/\n/g,'<br>')}</p>
      </div>
      <p style="margin-top:16px;font-size:12px;color:#999">Via @bulletapexbot · ${ts} (Kyiv)</p>
    </div>`
  );
}

// ── Confirmation to user ──────────────────────────────────────────
function getConfirmation(lang, isMaxim) {
  if (lang === 'ru') {
    return isMaxim
      ? '✅ Спасибо. Советник получил ваши данные и свяжется с вами напрямую в течение 24 часов.\n\n_BulletApex — Clarity Without Mercy_'
      : '✅ Спасибо. Ваш запрос передан советнику. Ответ в течение 24 часов.\n\n_BulletApex — Clarity Without Mercy_';
  }
  return isMaxim
    ? '✅ Thank you. Our advisor has your details and will contact you directly within 24 hours.\n\n_BulletApex — Clarity Without Mercy_'
    : '✅ Thank you. Your inquiry has been forwarded to our advisor. Expect a response within 24 hours.\n\n_BulletApex — Clarity Without Mercy_';
}

// ── Main menu ─────────────────────────────────────────────────────
const MAIN_MENU_EN = {
  inline_keyboard: [
    [{ text: '🎰 iGaming Advisory', callback_data: 'igaming' }, { text: '📊 Valuation / Exit', callback_data: 'exit' }],
    [{ text: '📐 Financial Modelling', callback_data: 'model' }, { text: '🔍 Profitability Review', callback_data: 'profitability' }],
    [{ text: '📝 Start an Enquiry', callback_data: 'enquiry' }],
    [{ text: '🌐 bulletapex.com', url: SITE_URL }],
  ],
};
const MAIN_MENU_RU = {
  inline_keyboard: [
    [{ text: '🎰 iGaming Advisory', callback_data: 'igaming_ru' }, { text: '📊 Оценка / Продажа', callback_data: 'exit_ru' }],
    [{ text: '📐 Финмодель', callback_data: 'model_ru' }, { text: '🔍 Анализ прибыли', callback_data: 'profitability_ru' }],
    [{ text: '📝 Оставить заявку', callback_data: 'enquiry_ru' }],
    [{ text: '🌐 bulletapex.com', url: SITE_URL }],
  ],
};

// ── Handler ───────────────────────────────────────────────────────
export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'BulletApex Bot ✓' };

  let update;
  try { update = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Bad Request' }; }

  // ── Contact form / widget submission from website ────────────────
  if (update.source === 'contact-form') {
    const ts = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv' });
    if (ADMIN_ID) {
      const lines = ['🔔 *New BulletApex Inquiry (Site Form)*','',
        `👤 *Name:* ${update.name||'—'}`,
        `✉️ *Email:* ${update.email||'—'}`,
        `🏢 *Organisation:* ${update.organisation||'—'}`,
        `📋 *Interest:* ${update.interest||'—'}`,
        '',`💬 *Message:*`,update.message||'—','',`⏰ ${ts} (Kyiv)`,
      ];
      await sendMessage(ADMIN_ID, lines.join('\n'));
    }
    await sendEmail(
      `New Inquiry — ${update.name||'Unknown'} (${update.organisation||'no org'})`,
      `<div style="font-family:sans-serif;max-width:600px;padding:24px">
        <h2 style="color:#112233">New BulletApex Inquiry</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c;width:120px">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${update.name||'—'}</td></tr>
          <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee"><a href="mailto:${update.email}">${update.email||'—'}</a></td></tr>
          <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Organisation</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${update.organisation||'—'}</td></tr>
          <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Interest</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${update.interest||'—'}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#f9f7f4;border-left:3px solid #b5924c">
          <p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c;margin:0 0 8px">Message</p>
          <p style="margin:0;line-height:1.7;color:#333">${(update.message||'—').replace(/\n/g,'<br>')}</p>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#999">Submitted ${ts} (Kyiv) via bulletapex.com</p>
      </div>`
    );
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'OK' };
  }

  if (update.source === 'widget') {
    const lang = detectLang(update.message || '');
    const smartReply = getSmartReply(update.message || '', lang);
    const contact = update.contact || update.email || update.telegram || '—';
    const ts = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv' });

    if (ADMIN_ID) {
      const lines = [
        '🔔 *New Lead via Site Widget*', '',
        `📞 *Contact:* ${contact}`,
        `🌍 *Language:* ${lang === 'ru' ? '🇺🇦/🇷🇺 RU' : '🇬🇧 EN'}`,
        `📋 *Topic:* ${analyzeIntent(update.message || '')}`,
        '', '💬 *Message:*', update.message || '—', '', `⏰ ${ts} (Kyiv)`,
      ];
      await sendMessage(ADMIN_ID, lines.join('\n'));
    }
    await sendEmail(
      `New Widget Lead — ${contact}`,
      `<div style="font-family:sans-serif;max-width:600px;padding:24px">
        <h2 style="color:#112233">New Lead via Site Chat Widget</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c;width:120px">Contact</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${contact}</td></tr>
          <tr><td style="padding:8px 12px;background:#f5f0e8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c">Language</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${lang === 'ru' ? 'RU/UA' : 'EN'}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#f9f7f4;border-left:3px solid #b5924c">
          <p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b5924c;margin:0 0 8px">Message</p>
          <p style="margin:0;line-height:1.7;color:#333">${(update.message||'—').replace(/\n/g,'<br>')}</p>
        </div>
        <p style="margin-top:16px;font-size:12px;color:#999">Via site widget · ${ts} (Kyiv)</p>
      </div>`
    );

    // Return smart reply to display in widget
    const title = lang === 'ru' ? 'Сообщение получено' : 'Message received';
    const replyWithCta = smartReply + (lang === 'ru'
      ? '\n\nПродолжите разговор в Telegram — советник ответит там лично.'
      : '\n\nContinue the conversation on Telegram — our advisor will respond there directly.');
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyWithCta, title }),
    };
  }

  // ── Telegram message handling ────────────────────────────────────
  if (update.message) {
    const msg  = update.message;
    const chat = msg.chat.id;
    const text = (msg.text || '').trim();
    const user = msg.from;
    const lang = detectLang(text);

    // /start or /menu
    if (text === '/start' || text === '/menu') {
      const greeting = lang === 'ru'
        ? `👋 Добро пожаловать в *BulletApex*\n\n_Clarity Without Mercy_\n\nМы — независимый стратегический финансовый советник для собственников бизнеса. iGaming, M&A, оценка, финансовые модели.\n\nЧем могу помочь?`
        : `👋 Welcome to *BulletApex*\n\n_Clarity Without Mercy_\n\nIndependent strategic finance advisory for business owners. iGaming, M&A, valuation, financial modelling.\n\nHow can I help you?`;
      const menu = lang === 'ru' ? MAIN_MENU_RU : MAIN_MENU_EN;
      await sendMessage(ADMIN_ID || chat, lang === 'ru'
        ? `👁 *New visitor:* ${[user.first_name,user.last_name].filter(Boolean).join(' ')} @${user.username||'—'} (${user.id}) · ${lang}`
        : `👁 *New visitor:* ${[user.first_name,user.last_name].filter(Boolean).join(' ')} @${user.username||'—'} (${user.id}) · ${lang}`
      );
      if (ADMIN_ID) await sendMessage(ADMIN_ID, `👁 *New /start:* ${[user.first_name,user.last_name].filter(Boolean).join(' ')} @${user.username||'—'} (${user.id}) · ${lang}`);
      await sendMessage(chat, greeting, { reply_markup: lang === 'ru' ? MAIN_MENU_RU : MAIN_MENU_EN });
      return { statusCode: 200, body: 'OK' };
    }

    // Message 2: user provided contact info (detect by content OR by reply-to-bot)
    const isReplyToBot = !!(msg.reply_to_message && msg.reply_to_message.from?.is_bot);
    const isContactMsg = looksLikeContact(text);

    if (isContactMsg || isReplyToBot) {
      const contactInfo = text;
      const originalContext = msg.reply_to_message?.text || '— (direct message)';
      await notifyAdmin(user, originalContext, contactInfo, lang);
      await sendMessage(chat, getConfirmation(lang, !!ADMIN_ID));
      return { statusCode: 200, body: 'OK' };
    }

    // Message 1: Initial inquiry — smart response + ask for contact
    const smartReply = getSmartReply(text, lang);
    const contactAsk = getContactRequest(lang);

    // Send smart response first
    await sendMessage(chat, smartReply);

    // Then ask for contact — no ForceReply dependency, just plain message
    await sendMessage(chat, contactAsk);

    // Notify admin about incoming inquiry (before contact collected)
    if (ADMIN_ID) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
      const intent = analyzeIntent(text);
      const langLabel = lang === 'ru' ? '🇺🇦/🇷🇺 RU' : '🇬🇧 EN';
      await sendMessage(ADMIN_ID, `📩 *Incoming inquiry (awaiting contact)*\n\n👤 ${name} @${user.username||'—'} (${user.id})\n🌍 ${langLabel} · 📋 ${intent}\n\n💬 _"${text.slice(0,200)}"_`);
    }

    return { statusCode: 200, body: 'OK' };
  }

  // ── Callback buttons ─────────────────────────────────────────────
  if (update.callback_query) {
    const cb   = update.callback_query;
    const chat = cb.message.chat.id;
    const data = cb.data;
    const lang = data.endsWith('_ru') ? 'ru' : 'en';
    const intentKey = data.replace('_ru', '');
    await answerCallback(cb.id);

    if (intentKey === 'enquiry') {
      await sendMessage(chat, getContactRequest(lang), {
        reply_markup: { force_reply: true, input_field_placeholder: lang === 'ru' ? 'Email, WhatsApp или Telegram...' : 'Email, WhatsApp or Telegram...' }
      });
      return { statusCode: 200, body: 'OK' };
    }

    if (['igaming','exit','model','profitability','general'].includes(intentKey)) {
      const user  = cb.from;
      const reply = getSmartReply(intentKey, lang);
      await sendMessage(chat, reply);
      await sendMessage(chat, getContactRequest(lang), {
        reply_markup: { force_reply: true, input_field_placeholder: lang === 'ru' ? 'Email, WhatsApp или Telegram...' : 'Email, WhatsApp or Telegram...' }
      });
      if (ADMIN_ID) {
        const name = [user.first_name,user.last_name].filter(Boolean).join(' ');
        await sendMessage(ADMIN_ID, `📩 *Button tap:* [${data}]\n👤 ${name} @${user.username||'—'} (${user.id})`);
      }
    }
  }

  return { statusCode: 200, body: 'OK' };
}
