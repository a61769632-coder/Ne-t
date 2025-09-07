// Telegram WebApp integration
(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.MainButton.setText('Закрыть');
    tg.MainButton.onClick(() => tg.close());
  }

  // ===== Registration & Test Flow =====
  async function startRegistration(effUid) {
    if (!effUid) { resultEl.textContent = 'Для регистрации нужен UID'; return; }
    // Start
    await fetch('/api/registration/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid) }) });
    // Age confirm screen
    resultEl.innerHTML = `
      <div><b>Проверка возраста</b></div>
      <div style="margin-top:8px">Минимальный возраст: ${MIN_AGE_PLACEHOLDER()} • Максимальный: ${MAX_AGE_PLACEHOLDER()}</div>
      <div class="actions" style="margin-top:10px">
        <button id="age-yes">✅ Да, мне есть 16 лет</button>
        <button id="age-no">❌ Нет, мне меньше 16</button>
      </div>
    `;
    document.getElementById('age-yes').onclick = async () => {
      await fetch('/api/registration/age-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid), confirmed: true }) });
      renderAgeInput(effUid);
    };
    document.getElementById('age-no').onclick = async () => {
      await fetch('/api/registration/age-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid), confirmed: false }) });
      resultEl.innerHTML = '<div>К сожалению, возраст не подходит.</div>';
    };
  }

  function renderAgeInput(effUid) {
    resultEl.innerHTML = `
      <div><b>Шаг 2/5: Укажите ваш возраст</b></div>
      <div class="row" style="margin-top:8px">
        <input id="age-input" type="number" min="${MIN_AGE_PLACEHOLDER()}" max="${MAX_AGE_PLACEHOLDER()}" placeholder="Возраст" style="padding:8px;border-radius:8px;border:1px solid #1f2228;background:#0e0f12;color:#e8e8e8;">
        <button id="age-apply" style="margin-left:8px;">Продолжить</button>
      </div>
      <div id="age-err" class="muted" style="margin-top:6px"></div>
    `;
    document.getElementById('age-apply').onclick = async () => {
      const val = Number(document.getElementById('age-input').value || '');
      const res = await fetch('/api/registration/age-input', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid), age: val }) });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        document.getElementById('age-err').textContent = j.error || 'Ошибка';
        return;
      }
      renderKmYear(effUid);
    };
  }

  function renderKmYear(effUid) {
    resultEl.innerHTML = `
      <div><b>Шаг 3/5: Год вступления в КМ</b></div>
      <div class="row" style="margin-top:8px">
        <input id="km-input" type="number" placeholder="Например: 2023" style="padding:8px;border-radius:8px;border:1px solid #1f2228;background:#0e0f12;color:#e8e8e8;">
        <button id="km-apply" style="margin-left:8px;">Продолжить</button>
      </div>
      <div id="km-err" class="muted" style="margin-top:6px"></div>
    `;
    document.getElementById('km-apply').onclick = async () => {
      const val = Number(document.getElementById('km-input').value || '');
      const res = await fetch('/api/registration/km-year', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid), km_year: val }) });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        document.getElementById('km-err').textContent = j.error || 'Ошибка';
        return;
      }
      renderCasteSelection(effUid);
    };
  }

  async function renderCasteSelection(effUid) {
    const list = await fetch('/api/castes').then(r=>r.json()).catch(()=>null);
    if (!list?.ok) { resultEl.textContent = 'Не удалось загрузить касты'; return; }
    const castes = list.castes || [];
    const rows = castes.map(c => `
      <div class="card" style="margin:8px 0">
        <div><b>${c.name}</b></div>
        <div class="muted">${c.description}</div>
        <div style="margin-top:6px">Возраст: ${c.min_age}-${c.max_age} • Вопросов: ${c.test_questions}</div>
        <div style="margin-top:8px"><button class="select-caste" data-id="${c.id}">✅ Выбрать</button></div>
      </div>
    `).join('');
    resultEl.innerHTML = `<div><b>Шаг 4/5: Выбор касты</b></div>${rows}`;
    resultEl.querySelectorAll('.select-caste').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.getAttribute('data-id');
        const res = await fetch('/api/registration/select-caste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid), caste_id: cid }) });
        if (!res.ok) {
          const j = await res.json().catch(()=>({}));
          resultEl.innerHTML = `<div>Ошибка выбора касты: ${j.error || ''}</div>`;
          return;
        }
        renderTestIntro(effUid, cid);
      });
    });
  }

  async function renderTestIntro(effUid, casteId) {
    resultEl.innerHTML = `
      <div><b>Шаг 5/5: Тест — ${casteId}</b></div>
      <div style="margin-top:8px">Открытые вопросы. Отвечайте развёрнуто.</div>
      <div class="actions" style="margin-top:10px">
        <button id="start-test">🚀 Начать тест</button>
      </div>
    `;
    document.getElementById('start-test').onclick = async () => {
      await fetch('/api/test/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid) }) });
      renderQuestion(effUid);
    };
  }

  async function renderQuestion(effUid) {
    const q = await fetch(`/api/test/question?uid=${encodeURIComponent(effUid)}`).then(r=>r.json()).catch(()=>null);
    if (!q?.ok || q.done) { return renderFinish(effUid); }
    const bar = '🟩'.repeat(q.index) + '⬜'.repeat(Math.max(0, q.total - q.index));
    resultEl.innerHTML = `
      <div><b>Вопрос ${q.index + 1} из ${q.total}</b> | ${q.progress}%</div>
      <div>${bar}</div>
      <div style="margin-top:8px"><b>${q.question}</b></div>
      <div class="row" style="margin-top:8px">
        <textarea id="ans" rows="4" style="width:100%;padding:8px;border-radius:8px;border:1px solid #1f2228;background:#0e0f12;color:#e8e8e8;"></textarea>
      </div>
      <div class="actions" style="margin-top:8px"><button id="send-answer">➡️ Далее</button></div>
    `;
    document.getElementById('send-answer').onclick = async () => {
      const val = String(document.getElementById('ans').value || '').trim();
      const res = await fetch('/api/test/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid), answer: val }) });
      if (!res.ok) { resultEl.innerHTML += '<div class="muted">Ошибка сохранения ответа</div>'; return; }
      renderQuestion(effUid);
    };
  }

  async function renderFinish(effUid) {
    await fetch('/api/test/finish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: Number(effUid) }) });
    resultEl.innerHTML = `
      <div>Тест завершён. Ваша заявка отправлена на проверку администраторам. Статус: pending.</div>
    `;
  }

  // Helpers to display configured age without hardcoding
  function MIN_AGE_PLACEHOLDER(){ return 16; }
  function MAX_AGE_PLACEHOLDER(){ return 25; }

  const userInfoEl = document.getElementById('user-info');
  const resultEl = document.getElementById('result');
  const menuEl = document.getElementById('menu');
  const btnStatus = document.getElementById('btn-status');
  const btnSend = document.getElementById('btn-send');

  // Warn if opened from file:// where API calls won't work
  const isFileProto = location.protocol === 'file:';
  if (isFileProto) {
    const warn = document.createElement('div');
    warn.className = 'muted';
    warn.style.marginTop = '8px';
    warn.innerHTML = 'Внимание: страница открыта как file://. API недоступно. Запустите сервер: <code>python webapp_server.py</code> и откройте <a href="http://127.0.0.1:8080/" target="_blank">http://127.0.0.1:8080/</a>.';
    userInfoEl.appendChild(warn);
  }

  const initDataUnsafe = tg?.initDataUnsafe || {};
  const user = initDataUnsafe?.user;
  // Fallback: allow passing uid via URL for local dev (e.g., http://127.0.0.1:8080/?uid=123)
  const urlUid = (() => {
    try { return new URLSearchParams(location.search).get('uid'); } catch { return null; }
  })();
  const uid = user?.id || (urlUid ? Number(urlUid) : null);

  // Render user block
  if (user) {
    userInfoEl.innerHTML = `
      <div class="row">
        <div class="avatar">${user?.first_name?.[0] || 'U'}</div>
        <div class="info">
          <div><b>Имя:</b> ${user.first_name || ''} ${user.last_name || ''}</div>
          <div><b>username:</b> @${user.username || '—'}</div>
          <div><b>ID:</b> ${user.id}</div>
          <div><b>Язык:</b> ${user.language_code || '—'}</div>
        </div>
      </div>
    `;
  } else {
    const hint = urlUid
      ? `<p class="muted">Dev-режим: используем UID из URL: <b>${urlUid}</b>. Откройте через кнопку в Telegram для полного функционала.</p>`
      : '<p>Не удалось получить данные пользователя из Telegram WebApp. Откройте через кнопку бота или добавьте параметр <code>?uid=TELEGRAM_ID</code> в адресную строку для локальной отладки.</p>';
    userInfoEl.innerHTML = hint;
    // Show dev UID input controls
    try {
      const box = document.getElementById('dev-uid-box');
      const input = document.getElementById('dev-uid-input');
      const apply = document.getElementById('dev-uid-apply');
      if (box && input && apply) {
        box.style.display = 'flex';
        if (urlUid) input.value = urlUid;
        apply.addEventListener('click', () => {
          const val = Number(input.value || '');
          if (!val) { alert('Введите корректный Telegram ID'); return; }
          const sp = new URLSearchParams(location.search);
          sp.set('uid', String(val));
          const newUrl = location.pathname + '?' + sp.toString();
          history.replaceState({}, '', newUrl);
          // Re-run loading with new UID
          loadMenuAndStatus(String(val));
        });
      }
    } catch {}
  }

  // Load menu and status from backend (mirrors bot)
  async function loadMenuAndStatus(overrideUid) {
    try {
      const effUid = overrideUid || uid;
      const qs = effUid ? `?uid=${encodeURIComponent(effUid)}` : '';
      const [statusRes, menuRes] = await Promise.all([
        fetch(`/api/status${qs}`).then(r => r.json()).catch((e) => { console.warn('status failed', e); return null; }),
        fetch(`/api/menu${qs}`).then(r => r.json()).catch((e) => { console.warn('menu failed', e); return null; }),
      ]);

      if (statusRes?.ok) {
        const lines = [];
        lines.push(`<div><b>Статус:</b> ${statusRes.status || '—'}</div>`);
        if (statusRes.caste_name) lines.push(`<div><b>Каста:</b> ${statusRes.caste_name}</div>`);
        if (statusRes.registered_at) lines.push(`<div><b>С момента регистрации:</b> ${statusRes.registered_at.slice(0,10)}</div>`);
        const box = document.createElement('div');
        box.className = 'muted';
        box.innerHTML = lines.join('');
        userInfoEl.appendChild(box);
      }

      if (menuRes?.ok && Array.isArray(menuRes.menu)) {
        menuEl.innerHTML = '';
        menuRes.menu.forEach(row => {
          const rowEl = document.createElement('div');
          rowEl.className = 'menu-row';
          row.forEach(text => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = 'menu-btn';
            btn.addEventListener('click', () => handleMenuClick(text));
            rowEl.appendChild(btn);
          });
          menuEl.appendChild(rowEl);
        });
      } else if (!menuRes && !statusRes) {
        menuEl.innerHTML = '<div class="muted">API недоступно. Убедитесь, что запущен сервер: <code>python webapp_server.py</code> и вы открыли страницу по http://127.0.0.1:8080/</div>';
      }
    } catch (err) {
      console.error('loadMenuAndStatus failed', err);
      menuEl.innerHTML = '<div class="muted">Ошибка загрузки меню. Проверьте, что сервер запущен.</div>';
    }
  }

  async function handleMenuClick(text) {
    try {
      const effUid = uid || new URLSearchParams(location.search).get('uid');
      const qs = effUid ? `?uid=${encodeURIComponent(effUid)}` : '';
      // Map menu actions
      if (text.includes('Мой профиль') || text.includes('Мой статус')) {
        const data = await fetch(`/api/status${qs}`).then(r => r.json());
        if (data?.ok) {
          resultEl.innerHTML = `
            <div><b>Статус:</b> ${data.status || '—'}</div>
            <div><b>Каста:</b> ${data.caste_name || '—'}</div>
            <div><b>ID:</b> ${data.user_id || '—'}</div>
            <div><b>username:</b> @${data.username || '—'}</div>
          `;
        } else {
          resultEl.textContent = 'Не удалось получить статус';
        }
        return;
      }
      if (text.includes('Статистика клана')) {
        const data = await fetch('/api/clan-stats').then(r => r.json());
        if (data?.ok) {
          const top = (data.top_castes || []).map(x => `• ${x.name}: ${x.count}`).join('<br>') || 'нет данных';
          resultEl.innerHTML = `
            <div><b>Всего пользователей:</b> ${data.total}</div>
            <div><b>На проверке:</b> ${data.pending}</div>
            <div><b>Верифицированных:</b> ${data.verified}</div>
            <div style="margin-top:6px"><b>Топ каст:</b><br>${top}</div>
          `;
        } else {
          resultEl.textContent = 'Не удалось получить статистику клана';
        }
        return;
      }
      if (text.includes('Ресурсы касты')) {
        const data = await fetch(`/api/resources${qs}`).then(r => r.json());
        if (data?.ok) {
          const lines = (data.items || []).map(x => `• ${x}`).join('<br>');
          resultEl.innerHTML = `
            <div><b>Каста:</b> ${data.caste_name}</div>
            <div style="margin-top:6px">${lines}</div>
          `;
        } else {
          resultEl.textContent = 'Не удалось получить ресурсы';
        }
        return;
      }
      if (text.includes('Реферальная система') || text.includes('Реферал')) {
        const data = await fetch(`/api/referrals${qs}`).then(r => r.json());
        if (data?.ok) {
          resultEl.innerHTML = `
            <div><b>Ссылка:</b> <a href="${data.link}" target="_blank">${data.link}</a></div>
            <div><b>Приглашено:</b> ${data.invited_count}</div>
            <div><b>Бонус (ref):</b> ${data.bonus_days} дн.</div>
            <div><b>Бонус (мой):</b> ${data.my_bonus_days} дн.</div>
          `;
        } else {
          resultEl.textContent = 'Не удалось получить данные рефералок';
        }
        return;
      }
      if (text.includes('Информация') || text.includes('Помощь')) {
        resultEl.innerHTML = `
          <div><b>FAQ:</b> используйте разделы бота. В Web App добавим позже полные FAQ/ADM панели.</div>
        `;
        return;
      }
      if (text.includes('Администрация')) {
        resultEl.innerHTML = `
          <div>Экран администрации будет добавлен (просмотр заявок, approve/decline).</n>`;
        return;
      }
      if (text.includes('Вступить в клан')) {
        await startRegistration(effUid);
        return;
      }
      // Fallback: notify bot
      const payload = { action: 'menu_click', label: text, user_id: effUid, time: new Date().toISOString() };
      if (tg) tg.sendData(JSON.stringify(payload));
    } catch (e) {
      resultEl.textContent = 'Ошибка обработки действия меню';
    }
  }

  btnStatus?.addEventListener('click', () => {
    fetch('/health').then(r => r.json()).then(data => {
      resultEl.textContent = 'Статус сервера: ' + JSON.stringify(data);
    }).catch(err => {
      resultEl.textContent = 'Ошибка: ' + String(err);
    });
  });

  btnSend?.addEventListener('click', () => {
    const payload = {
      action: 'webapp_demo',
      time: new Date().toISOString(),
      user_id: uid,
    };
    if (tg) {
      tg.sendData(JSON.stringify(payload));
      tg.close();
    } else {
      alert('Telegram WebApp API недоступно');
    }
  });

  loadMenuAndStatus();
})();
