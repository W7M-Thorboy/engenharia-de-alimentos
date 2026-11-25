(function () {
  if (window.PORTAL_AI_TUTOR) return;

  const KEY_STORAGE = 'portal_ai_gemini_key_v1';
  const MODEL_STORAGE = 'portal_ai_gemini_model_v1';
  const DEFAULT_MODEL = 'gemini-2.5-flash';

  const CSS_TEXT = `
    #pai-fab {
      position: fixed;
      right: 1.25rem;
      bottom: 4.5rem;
      z-index: 45;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.58rem 0.95rem;
      border-radius: 5px;
      background: #1c1f1d;
      color: #f6f4ef;
      border: 1px solid #a67c37;
      box-shadow: 0 4px 14px rgba(20, 18, 15, 0.22);
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: transform 0.15s ease, background-color 0.15s ease;
    }
    #pai-fab:hover {
      background: #2b302d;
      transform: translateY(-1px);
    }
    .dark #pai-fab {
      background: #26231f;
      color: #f0ece4;
      border-color: #c9a259;
    }
    #pai-fab .pai-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #c9a259;
      display: inline-block;
    }
    #pai-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 430px;
      max-width: 100vw;
      z-index: 60;
      display: flex;
      flex-direction: column;
      background: #faf8f4;
      color: #1b1917;
      border-left: 1px solid #dfd9cc;
      box-shadow: -8px 0 28px rgba(20, 18, 15, 0.18);
      font-family: 'Times New Roman', Times, Georgia, serif;
      transform: translateX(100%);
      transition: transform 0.22s ease;
    }
    #pai-panel.open {
      transform: translateX(0);
    }
    .dark #pai-panel {
      background: #161412;
      color: #f0ece4;
      border-left-color: #2e2a25;
    }
    .pai-header {
      padding: 0.9rem 1.1rem;
      background: #1c1f1d;
      color: #f6f4ef;
      border-bottom: 2px solid #a67c37;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .pai-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0;
    }
    .pai-ctx-label {
      font-size: 0.74rem;
      color: #d6c5a3;
      margin-top: 0.15rem;
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pai-icon-btn {
      background: rgba(246, 244, 239, 0.1);
      color: #f6f4ef;
      border: 1px solid rgba(246, 244, 239, 0.22);
      border-radius: 4px;
      padding: 0.28rem 0.55rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .pai-icon-btn:hover {
      background: rgba(246, 244, 239, 0.22);
    }
    .pai-settings {
      padding: 0.9rem 1.1rem;
      background: #efece4;
      border-bottom: 1px solid #dfd9cc;
      font-size: 0.85rem;
    }
    .dark .pai-settings {
      background: #211e1b;
      border-bottom-color: #2e2a25;
    }
    .pai-settings input,
    .pai-settings select {
      width: 100%;
      padding: 0.45rem 0.6rem;
      margin-top: 0.25rem;
      margin-bottom: 0.55rem;
      border: 1px solid #cfc8ba;
      border-radius: 4px;
      background: #ffffff;
      color: #1b1917;
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 0.86rem;
    }
    .dark .pai-settings input,
    .dark .pai-settings select {
      background: #141210;
      color: #f0ece4;
      border-color: #3a352f;
    }
    .pai-quick {
      padding: 0.65rem 0.9rem;
      border-bottom: 1px solid #dfd9cc;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      background: #f6f4ef;
    }
    .dark .pai-quick {
      background: #1b1917;
      border-bottom-color: #2e2a25;
    }
    .pai-chip {
      padding: 0.28rem 0.6rem;
      border-radius: 4px;
      border: 1px solid #cfc8ba;
      background: #ffffff;
      color: #1b1917;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
    }
    .pai-chip:hover {
      background: #efece4;
      border-color: #a67c37;
    }
    .dark .pai-chip {
      background: #23201d;
      color: #e6dfd3;
      border-color: #3a352f;
    }
    .dark .pai-chip:hover {
      background: #2e2a25;
      border-color: #c9a259;
    }
    .pai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .pai-msg {
      padding: 0.75rem 0.9rem;
      border-radius: 5px;
      font-size: 0.92rem;
      line-height: 1.58;
      word-break: break-word;
    }
    .pai-msg.user {
      align-self: flex-end;
      max-width: 88%;
      background: #1c1f1d;
      color: #f6f4ef;
      border: 1px solid #2f3330;
    }
    .dark .pai-msg.user {
      background: #2d2924;
      border-color: #463f37;
    }
    .pai-msg.model {
      align-self: flex-start;
      max-width: 96%;
      background: #ffffff;
      color: #1b1917;
      border: 1px solid #dfd9cc;
      border-left: 3px solid #a67c37;
    }
    .dark .pai-msg.model {
      background: #1e1c19;
      color: #f0ece4;
      border-color: #2e2a25;
      border-left-color: #c9a259;
    }
    .pai-msg.err {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .dark .pai-msg.err {
      background: rgba(153, 27, 27, 0.22);
      color: #fecaca;
      border-color: rgba(239, 68, 68, 0.45);
    }
    .pai-msg ul {
      margin: 0.4rem 0 0.4rem 1.15rem;
      list-style: disc;
    }
    .pai-msg p {
      margin: 0 0 0.45rem 0;
    }
    .pai-msg p:last-child {
      margin-bottom: 0;
    }
    .pai-msg code {
      background: rgba(166, 124, 55, 0.14);
      padding: 0.05rem 0.3rem;
      border-radius: 3px;
      font-size: 0.86rem;
    }
    .katex {
      font-size: 1.04em;
    }
    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0.35rem 0;
      margin: 0.45rem 0;
    }
    .pai-form {
      padding: 0.75rem 0.9rem;
      border-top: 1px solid #dfd9cc;
      background: #f6f4ef;
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
    }
    .dark .pai-form {
      background: #1b1917;
      border-top-color: #2e2a25;
    }
    .pai-form textarea {
      flex: 1;
      resize: none;
      min-height: 42px;
      max-height: 120px;
      padding: 0.5rem 0.65rem;
      border: 1px solid #cfc8ba;
      border-radius: 4px;
      background: #ffffff;
      color: #1b1917;
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 0.92rem;
      line-height: 1.4;
    }
    .dark .pai-form textarea {
      background: #121110;
      color: #f0ece4;
      border-color: #3a352f;
    }
    .pai-send-btn {
      padding: 0.55rem 0.95rem;
      border-radius: 4px;
      border: 1px solid #1c1f1d;
      background: #1c1f1d;
      color: #f6f4ef;
      font-weight: 700;
      font-size: 0.86rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .pai-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .dark .pai-send-btn {
      background: #d6c5a3;
      color: #161412;
      border-color: #d6c5a3;
    }
    @media print {
      #pai-fab, #pai-panel { display: none !important; }
    }
  `;

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMarkdown(md) {
    let html = escHtml(md || '');
    // Protege blocos LaTeX ($$...$$, \[...\], \(...\), $...$) contra formatacao * / _ de markdown
    const mathStash = [];
    function stash(match) {
      const idx = mathStash.length;
      mathStash.push(match);
      return '@@MATH_' + idx + '@@';
    }
    // Protege moeda brasileira R$ antes de capturar $...$
    html = html.replace(/R\$/g, 'R&#36;');
    html = html.replace(/\$\$[\s\S]+?\$\$/g, stash);
    html = html.replace(/\\\[[\s\S]+?\\\]/g, stash);
    html = html.replace(/\\\([\s\S]+?\\\)/g, stash);
    html = html.replace(/\$(?!\s)([^$\n]+?)(?!\s)\$/g, stash);

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    const lines = html.split('\n');
    let out = '';
    let inList = false;
    lines.forEach(line => {
      const m = line.match(/^\s*[-*•]\s+(.*)$/);
      if (m) {
        if (!inList) { out += '<ul>'; inList = true; }
        out += '<li>' + m[1] + '</li>';
      } else {
        if (inList) { out += '</ul>'; inList = false; }
        const t = line.trim();
        if (t) out += '<p>' + t + '</p>';
      }
    });
    if (inList) out += '</ul>';
    out = out.replace(/@@MATH_(\d+)@@/g, function (_, i) {
      return mathStash[Number(i)] || '';
    });
    return out || '<p></p>';
  }

  function renderPortalMath(rootEl) {
    if (!rootEl || typeof window.renderMathInElement !== 'function') return;
    try {
      // Se o container tiver valores em R$, usa apenas delimitadores explicitos ($$, \[...\], \(...\))
      // para nunca confundir dois "R$" na mesma frase com uma formula LaTeX.
      const hasBrl = /R\$\s*\d/.test(rootEl.textContent || '');
      const delimiters = hasBrl
        ? [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
          ]
        : [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ];
      window.renderMathInElement(rootEl, {
        delimiters: delimiters,
        throwOnError: false,
        strict: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'svg']
      });
    } catch (e) {}
  }
  window.renderPortalMath = renderPortalMath;

  function getApiKey() {
    try { return (localStorage.getItem(KEY_STORAGE) || '').trim(); } catch (e) { return ''; }
  }

  function setApiKey(k) {
    try {
      if (k) localStorage.setItem(KEY_STORAGE, k.trim());
      else localStorage.removeItem(KEY_STORAGE);
    } catch (e) {}
  }

  function getModel() {
    try { return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL; } catch (e) { return DEFAULT_MODEL; }
  }

  function setModel(m) {
    try { localStorage.setItem(MODEL_STORAGE, m); } catch (e) {}
  }

  function extractPageContext() {
    const main = document.getElementById('main-content');
    const hash = window.location.hash || '(Início do Portal)';
    let heading = 'Portal de Estudos · Engenharia de Alimentos';
    let bodyText = '';
    let draftTexts = [];

    if (main) {
      const h = main.querySelector('h1, h2');
      if (h && h.textContent) heading = h.textContent.trim().replace(/\s+/g, ' ').slice(0, 120);
      bodyText = (main.innerText || main.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 4200);
      const tas = main.querySelectorAll('textarea');
      tas.forEach((ta, i) => {
        const val = (ta.value || '').trim();
        if (val) draftTexts.push('Rascunho ' + (i + 1) + ': ' + val);
      });
    }

    return {
      hash,
      heading,
      bodyText,
      drafts: draftTexts.join('\n\n')
    };
  }

  let historyMsgs = [];
  let isOpen = false;
  let showSettings = false;
  let isBusy = false;

  function ensureMounted() {
    if (typeof document === 'undefined' || !document.body) return;
    if (document.getElementById('pai-fab')) return;

    const style = document.createElement('style');
    style.id = 'pai-styles';
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);

    const fab = document.createElement('button');
    fab.id = 'pai-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Abrir Tutor IA');
    fab.innerHTML = '<span class="pai-dot"></span><span>Tutor IA</span>';
    document.body.appendChild(fab);

    const panel = document.createElement('aside');
    panel.id = 'pai-panel';
    panel.setAttribute('aria-label', 'Tutor IA de Engenharia de Alimentos');
    document.body.appendChild(panel);

    fab.addEventListener('click', function () {
      isOpen = !isOpen;
      if (isOpen && !getApiKey()) showSettings = true;
      renderPanel();
    });

    panel.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-pai-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-pai-act');
      if (act === 'close') {
        isOpen = false;
        renderPanel();
      } else if (act === 'toggle-settings') {
        showSettings = !showSettings;
        renderPanel();
      } else if (act === 'clear') {
        historyMsgs = [];
        renderPanel();
      } else if (act === 'save-key') {
        const inp = panel.querySelector('#pai-key-input');
        const sel = panel.querySelector('#pai-model-select');
        if (inp) setApiKey(inp.value);
        if (sel) setModel(sel.value);
        showSettings = false;
        renderPanel();
      } else if (act === 'remove-key') {
        setApiKey('');
        renderPanel();
      } else if (act === 'quick') {
        const promptType = btn.getAttribute('data-pai-prompt');
        runQuickAction(promptType);
      }
    });

    panel.addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'pai-chat-form') {
        e.preventDefault();
        const ta = panel.querySelector('#pai-user-input');
        if (!ta) return;
        const text = ta.value.trim();
        if (!text || isBusy) return;
        ta.value = '';
        sendToGemini(text);
      }
    });

    panel.addEventListener('keydown', function (e) {
      if (e.target && e.target.id === 'pai-user-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const form = panel.querySelector('#pai-chat-form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    renderPanel();
  }

  function runQuickAction(type) {
    if (isBusy) return;
    const ctx = extractPageContext();
    if (type === 'explain') {
      sendToGemini('Explique de forma clara e objetiva o conteúdo desta tela atual, destacando os conceitos-chave, fórmulas/reações e o que mais costuma cair em prova.');
    } else if (type === 'questions') {
      sendToGemini('Gere 2 questões inéditas de múltipla escolha (nível prova de graduação, com pegadinhas sutis e 5 alternativas parelhas A–E) baseadas no conteúdo desta tela. Coloque o gabarito comentado ao final.');
    } else if (type === 'grade') {
      if (!ctx.drafts) {
        historyMsgs.push({
          role: 'model',
          text: 'Não encontrei nenhum rascunho preenchido nesta tela. Abra um simulado dissertativo (ou cole sua resposta aqui no chat) que eu corrijo e dou nota de 0 a 10!'
        });
        renderPanel();
        return;
      }
      sendToGemini('Avalie e corrija meu(s) rascunho(s) dissertativo(s) preenchido(s) nesta tela. Dê uma nota de 0 a 10, aponte o que acertei, o que faltou mencionar e como deixar a resposta completa para gabaritar.\n\n' + ctx.drafts);
    } else if (type === 'hint') {
      sendToGemini('Sem revelar diretamente a letra da resposta correta, me dê uma dica de raciocínio passo a passo para resolver a questão que está aberta agora na tela.');
    }
  }

  async function sendToGemini(userText) {
    const apiKey = getApiKey();
    if (!apiKey) {
      showSettings = true;
      historyMsgs.push({
        role: 'err',
        text: 'Cole primeiro a sua Gemini API Key gratuita (Google AI Studio) nas configurações acima para ativar o Tutor IA.'
      });
      renderPanel();
      return;
    }

    const ctx = extractPageContext();
    historyMsgs.push({ role: 'user', text: userText });
    isBusy = true;
    renderPanel();

    const systemPrompt =
      'Você é o Tutor Acadêmico de Engenharia de Alimentos (UNESP–IBILCE). Responda sempre em Português do Brasil, com rigor técnico de graduação, clareza didática e objetividade. ' +
      'Conecte química, fisiologia, fenômenos de transporte, qualidade e decisões industriais sempre que pertinente. ' +
      'Para fórmulas matemáticas, equações de transporte, reações e parâmetros (como pKa, aw, ΔP, frações, integrais), use LaTeX limpo entre $...$ (inline) ou $$...$$ (destaque).\n\n' +
      'CONTEXTO ATUAL DA TELA DO ALUNO:\n' +
      'Rota: ' + ctx.hash + '\n' +
      'Título: ' + ctx.heading + '\n' +
      'Conteúdo visível (trecho): ' + ctx.bodyText +
      (ctx.drafts ? '\n\nRASCUNHOS DO ALUNO NA TELA:\n' + ctx.drafts : '');

    const contents = historyMsgs
      .filter(m => m.role === 'user' || m.role === 'model')
      .slice(-10)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

    const model = getModel();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 1400
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = (data && data.error && data.error.message) ? data.error.message : ('HTTP ' + res.status);
        throw new Error(msg);
      }

      const reply = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts)
        ? data.candidates[0].content.parts.map(p => p.text || '').join('\n').trim()
        : '';

      if (!reply) throw new Error('Resposta vazia do modelo.');
      historyMsgs.push({ role: 'model', text: reply });
    } catch (err) {
      historyMsgs.push({
        role: 'err',
        text: 'Erro ao consultar Gemini (' + model + '): ' + String(err.message || err) + '. Verifique sua API Key ou tente outro modelo nas configurações (⚙).'
      });
    } finally {
      isBusy = false;
      renderPanel();
    }
  }

  function renderPanel() {
    const panel = document.getElementById('pai-panel');
    if (!panel) return;
    panel.classList.toggle('open', isOpen);
    if (!isOpen) return;

    const ctx = extractPageContext();
    const hasKey = !!getApiKey();
    const model = getModel();

    const settingsHtml = showSettings ? `
      <div class="pai-settings">
        <div style="font-weight:700;margin-bottom:0.35rem;">Configuração da Gemini API (Local)</div>
        <div style="font-size:0.78rem;opacity:0.85;margin-bottom:0.5rem;">
          Sua chave fica salva <strong>somente no navegador (localStorage)</strong> e nunca é enviada ao GitHub.
          Gere grátis em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="text-decoration:underline;font-weight:700;">Google AI Studio</a>.
        </div>
        <label style="font-size:0.78rem;font-weight:700;">Gemini API Key</label>
        <input id="pai-key-input" type="password" placeholder="AIza..." value="${escHtml(getApiKey())}" autocomplete="off" />
        <label style="font-size:0.78rem;font-weight:700;">Modelo</label>
        <select id="pai-model-select">
          <option value="gemini-2.5-flash" ${model === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash (Padrão · Rápido)</option>
          <option value="gemini-3.5-flash" ${model === 'gemini-3.5-flash' ? 'selected' : ''}>gemini-3.5-flash (Avançado)</option>
          <option value="gemini-3.5-flash-lite" ${model === 'gemini-3.5-flash-lite' ? 'selected' : ''}>gemini-3.5-flash-lite (Ultrarrápido)</option>
        </select>
        <div style="display:flex;gap:0.45rem;margin-top:0.25rem;">
          <button type="button" class="pai-send-btn" data-pai-act="save-key">Salvar Chave</button>
          ${hasKey ? '<button type="button" class="pai-chip" data-pai-act="remove-key">Remover Chave</button>' : ''}
        </div>
      </div>
    ` : '';

    const msgsHtml = historyMsgs.length ? historyMsgs.map(m => `
      <div class="pai-msg ${m.role}">
        ${m.role === 'user' ? escHtml(m.text).replace(/\n/g, '<br>') : renderMarkdown(m.text)}
      </div>
    `).join('') : `
      <div class="pai-msg model">
        <p><strong>Olá! Sou o Tutor IA do Portal.</strong></p>
        <p>Eu leio automaticamente a aula ou o simulado que está aberto na tela (<em>${escHtml(ctx.heading)}</em>).</p>
        <p>Use os atalhos acima para <strong>explicar o tópico</strong>, <strong>gerar questões nível prova</strong>, <strong>pedir dica sem spoiler</strong> ou <strong>corrigir seu rascunho</strong> — ou digite qualquer dúvida abaixo.</p>
      </div>
    `;

    const loadingHtml = isBusy ? '<div class="pai-msg model" style="opacity:0.75;"><em>Analisando o conteúdo da tela e elaborando resposta...</em></div>' : '';

    panel.innerHTML = `
      <div class="pai-header">
        <div style="min-width:0;">
          <h3 class="pai-title">Tutor IA · Engenharia de Alimentos</h3>
          <div class="pai-ctx-label" title="${escHtml(ctx.heading)}">Contexto: ${escHtml(ctx.heading)}</div>
        </div>
        <div style="display:flex;gap:0.3rem;flex-shrink:0;">
          <button type="button" class="pai-icon-btn" data-pai-act="toggle-settings" title="Configurar API Key">⚙ ${hasKey ? 'API' : 'Chave'}</button>
          <button type="button" class="pai-icon-btn" data-pai-act="clear" title="Limpar conversa">Limpar</button>
          <button type="button" class="pai-icon-btn" data-pai-act="close" title="Fechar">✕</button>
        </div>
      </div>
      ${settingsHtml}
      <div class="pai-quick">
        <button type="button" class="pai-chip" data-pai-act="quick" data-pai-prompt="explain">Explicar esta tela</button>
        <button type="button" class="pai-chip" data-pai-act="quick" data-pai-prompt="questions">Gerar 2 questões prova</button>
        <button type="button" class="pai-chip" data-pai-act="quick" data-pai-prompt="hint">Dica sem spoiler</button>
        <button type="button" class="pai-chip" data-pai-act="quick" data-pai-prompt="grade">Corrigir rascunho</button>
      </div>
      <div class="pai-messages" id="pai-msg-list">
        ${msgsHtml}
        ${loadingHtml}
      </div>
      <form class="pai-form" id="pai-chat-form">
        <textarea id="pai-user-input" rows="2" placeholder="Tire uma dúvida sobre esta aula, fórmula ou questão..."></textarea>
        <button type="submit" class="pai-send-btn" ${isBusy ? 'disabled' : ''}>Enviar</button>
      </form>
    `;

    const list = panel.querySelector('#pai-msg-list');
    if (list) {
      renderPortalMath(list);
      list.scrollTop = list.scrollHeight;
    }
  }

  let mathSweepTimer = null;
  function scheduleMainMath() {
    if (mathSweepTimer) clearTimeout(mathSweepTimer);
    mathSweepTimer = setTimeout(function () {
      mathSweepTimer = null;
      const main = document.getElementById('main-content');
      if (main) renderPortalMath(main);
    }, 120);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function () {
      scheduleMainMath();
    });
    window.addEventListener('load', function () {
      scheduleMainMath();
    });
  }

  window.PORTAL_AI_TUTOR = {
    init: ensureMounted,
    open: function () { isOpen = true; renderPanel(); },
    close: function () { isOpen = false; renderPanel(); }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureMounted);
    } else {
      ensureMounted();
    }
  }
})();
