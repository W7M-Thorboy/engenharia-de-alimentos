(function () {
  if (window.PORTAL_MCQ_ENGINE) return;

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];
  const STORAGE_PREFIX = 'portal_mcq_v1_';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripHtml(s) {
    return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  function getExamsMap() {
    return window.PORTAL_MCQ_EXAMS || {};
  }

  function getExam(examId) {
    return getExamsMap()[examId] || null;
  }

  function loadSaved(examId) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + examId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState(examId, st) {
    try {
      localStorage.setItem(STORAGE_PREFIX + examId, JSON.stringify({
        mode: st.mode,
        order: st.order,
        answers: st.answers,
        revealed: st.revealed,
        flagged: st.flagged,
        elapsedSec: st.elapsedSec,
        finished: st.finished,
        currentPos: st.currentPos
      }));
    } catch (e) {}
  }

  function getProgress(examId) {
    const exam = getExam(examId);
    if (!exam) return { done: 0, total: 0, hits: 0, finished: false };
    const total = exam.questions.length;
    const saved = loadSaved(examId);
    if (!saved || !saved.answers) return { done: 0, total, hits: 0, finished: false };
    let done = 0;
    let hits = 0;
    exam.questions.forEach(q => {
      const ans = saved.answers[String(q.id)];
      if (ans !== undefined && ans !== null) {
        done++;
        if (Number(ans) === Number(q.correct)) hits++;
      }
    });
    return { done, total, hits, finished: !!saved.finished };
  }

  function getSearchDocs(examId) {
    const exam = getExam(examId);
    if (!exam) return [];
    return exam.questions.map(q => ({
      examId: exam.id,
      subject: exam.subject,
      subjectLabel: exam.subjectLabel,
      examTitle: exam.shortTitle,
      qId: q.id,
      topicLabel: q.topicLabel,
      text: stripHtml([q.topicLabel, q.stem, q.hint, q.explanation, q.trap].filter(Boolean).join(' · '))
    }));
  }

  let activeCleanup = null;

  function unmount() {
    if (typeof activeCleanup === 'function') {
      try { activeCleanup(); } catch (e) {}
      activeCleanup = null;
    }
  }

  function mount(hostEl, examId, initialQuestionId, onProgress) {
    unmount();
    const exam = getExam(examId);
    if (!hostEl || !exam) return;

    const qById = {};
    exam.questions.forEach(q => { qById[q.id] = q; });
    const defaultOrder = exam.questions.map(q => q.id);

    const saved = loadSaved(examId);
    const st = {
      mode: (saved && (saved.mode === 'study' || saved.mode === 'exam')) ? saved.mode : 'study',
      order: (saved && Array.isArray(saved.order) && saved.order.length === defaultOrder.length) ? saved.order.slice() : defaultOrder.slice(),
      answers: (saved && saved.answers && typeof saved.answers === 'object') ? Object.assign({}, saved.answers) : {},
      revealed: (saved && saved.revealed && typeof saved.revealed === 'object') ? Object.assign({}, saved.revealed) : {},
      flagged: (saved && saved.flagged && typeof saved.flagged === 'object') ? Object.assign({}, saved.flagged) : {},
      elapsedSec: (saved && typeof saved.elapsedSec === 'number') ? saved.elapsedSec : 0,
      finished: !!(saved && saved.finished),
      currentPos: (saved && typeof saved.currentPos === 'number') ? saved.currentPos : 0,
      topicFilter: 'all',
      reviewFilter: 'all',
      showHint: false,
      timerPaused: false
    };

    if (initialQuestionId) {
      const idx = st.order.indexOf(Number(initialQuestionId));
      if (idx >= 0) {
        st.currentPos = idx;
        st.finished = false;
      }
    }

    function filteredOrder() {
      if (st.topicFilter === 'all') return st.order;
      return st.order.filter(id => qById[id] && qById[id].topic === st.topicFilter);
    }

    function currentQ() {
      const list = filteredOrder();
      if (!list.length) return null;
      if (st.currentPos >= list.length) st.currentPos = 0;
      if (st.currentPos < 0) st.currentPos = 0;
      return qById[list[st.currentPos]] || null;
    }

    function notifyProgress() {
      saveState(examId, st);
      if (typeof onProgress === 'function') {
        onProgress(getProgress(examId));
      }
    }

    function countStats() {
      let answered = 0;
      let correct = 0;
      let flaggedCount = 0;
      exam.questions.forEach(q => {
        const k = String(q.id);
        if (st.flagged[k]) flaggedCount++;
        if (st.answers[k] !== undefined && st.answers[k] !== null) {
          answered++;
          if (Number(st.answers[k]) === Number(q.correct)) correct++;
        }
      });
      return { answered, correct, flaggedCount, total: exam.questions.length };
    }

    function renderResults(stats) {
      const nota = stats.total ? ((stats.correct / stats.total) * 10).toFixed(1) : '0.0';
      const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;

      const topicKeys = Object.keys(exam.topics || {});
      const topicRows = topicKeys.map(tk => {
        const qs = exam.questions.filter(q => q.topic === tk);
        const hits = qs.filter(q => st.answers[String(q.id)] !== undefined && Number(st.answers[String(q.id)]) === Number(q.correct)).length;
        const p = qs.length ? Math.round((hits / qs.length) * 100) : 0;
        return `
          <div style="margin-bottom:0.65rem;">
            <div style="display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:0.2rem;">
              <span><strong>${escHtml(exam.topics[tk].name)}</strong></span>
              <span>${hits}/${qs.length} (${p}%)</span>
            </div>
            <div class="pmcq-progress-track" style="height:7px;border-radius:3px;overflow:hidden;">
              <div class="pmcq-progress-fill" style="width:${p}%;background:${p >= 70 ? '#15803d' : (p >= 50 ? '#d97706' : '#b91c1c')};"></div>
            </div>
          </div>
        `;
      }).join('');

      const reviewList = st.order.map(id => qById[id]).filter(q => {
        const k = String(q.id);
        const ans = st.answers[k];
        const isOk = ans !== undefined && Number(ans) === Number(q.correct);
        if (st.reviewFilter === 'wrong') return !isOk;
        if (st.reviewFilter === 'flagged') return !!st.flagged[k];
        return true;
      });

      const reviewHtml = reviewList.length ? reviewList.map((q, idx) => {
        const k = String(q.id);
        const ans = st.answers[k];
        const isOk = ans !== undefined && Number(ans) === Number(q.correct);
        const userTxt = ans !== undefined ? (LETTERS[ans] + ') ' + q.options[ans]) : 'Não respondida';
        const corrTxt = LETTERS[q.correct] + ') ' + q.options[q.correct];
        return `
          <div class="pmcq-review-item ${isOk ? 'ok' : 'err'}">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:0.4rem;margin-bottom:0.45rem;font-size:0.8rem;">
              <span><strong>Questão ${q.id}</strong> · ${escHtml(q.topicLabel)}</span>
              <span style="font-weight:700;color:${isOk ? '#15803d' : '#b91c1c'};">${isOk ? 'Acertou' : 'Errou / Em branco'}${st.flagged[k] ? ' · Marcada' : ''}</span>
            </div>
            <div style="margin-bottom:0.55rem;line-height:1.55;">${q.stem}</div>
            <div style="font-size:0.88rem;margin-bottom:0.3rem;"><strong>Sua resposta:</strong> ${userTxt}</div>
            ${!isOk ? `<div style="font-size:0.88rem;margin-bottom:0.45rem;color:#15803d;"><strong>Gabarito:</strong> ${corrTxt}</div>` : ''}
            <div style="font-size:0.88rem;line-height:1.55;opacity:0.92;">${q.explanation}</div>
            ${q.trap ? `<div class="pmcq-trap"><strong>Pegadinha clássica:</strong> ${q.trap}</div>` : ''}
          </div>
        `;
      }).join('') : `<p style="font-size:0.9rem;opacity:0.75;">Nenhuma questão corresponde a este filtro.</p>`;

      return `
        <div class="pmcq-results">
          <div class="pmcq-stat-grid">
            <div class="pmcq-stat-card">
              <div class="pmcq-stat-val">${nota}</div>
              <div class="pmcq-stat-lbl">Nota (0–10)</div>
            </div>
            <div class="pmcq-stat-card">
              <div class="pmcq-stat-val">${stats.correct}/${stats.total}</div>
              <div class="pmcq-stat-lbl">Acertos (${pct}%)</div>
            </div>
            <div class="pmcq-stat-card">
              <div class="pmcq-stat-val">${stats.answered}/${stats.total}</div>
              <div class="pmcq-stat-lbl">Respondidas</div>
            </div>
            <div class="pmcq-stat-card">
              <div class="pmcq-stat-val">${fmtTime(st.elapsedSec)}</div>
              <div class="pmcq-stat-lbl">Tempo</div>
            </div>
          </div>

          <div class="pmcq-side-box" style="margin-bottom:1.1rem;">
            <div class="pmcq-side-title">Desempenho por Bloco Temático</div>
            ${topicRows}
          </div>

          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.6rem;margin-bottom:1rem;">
            <div class="pmcq-btn-group">
              <button type="button" class="pmcq-btn pmcq-btn-primary" data-pmcq-act="restart-std">Refazer (Ordem Padrão)</button>
              <button type="button" class="pmcq-btn" data-pmcq-act="restart-shuf">Refazer (Embaralhado)</button>
              <button type="button" class="pmcq-btn" data-pmcq-act="back-to-exam">Voltar às Questões</button>
            </div>
            <div class="pmcq-btn-group">
              <button type="button" class="pmcq-chip ${st.reviewFilter === 'all' ? 'active' : ''}" data-pmcq-rfilter="all">Todas (${stats.total})</button>
              <button type="button" class="pmcq-chip ${st.reviewFilter === 'wrong' ? 'active' : ''}" data-pmcq-rfilter="wrong">Erros (${stats.total - stats.correct})</button>
              <button type="button" class="pmcq-chip ${st.reviewFilter === 'flagged' ? 'active' : ''}" data-pmcq-rfilter="flagged">Marcadas (${stats.flaggedCount})</button>
            </div>
          </div>

          <div>
            <div class="pmcq-side-title" style="margin-bottom:0.7rem;">Gabarito Comentado</div>
            ${reviewHtml}
          </div>
        </div>
      `;
    }

    function render() {
      const stats = countStats();
      const pctDone = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0;
      const list = filteredOrder();
      const q = currentQ();

      const topicFilterBtns = [
        `<button type="button" class="pmcq-chip ${st.topicFilter === 'all' ? 'active' : ''}" data-pmcq-topic="all">Todos os Blocos (${stats.total})</button>`
      ].concat(Object.keys(exam.topics || {}).map(tk => {
        const cnt = exam.questions.filter(item => item.topic === tk).length;
        return `<button type="button" class="pmcq-chip ${st.topicFilter === tk ? 'active' : ''}" data-pmcq-topic="${escHtml(tk)}">${escHtml(exam.topics[tk].name)} (${cnt})</button>`;
      })).join('');

      let mainBodyHtml = '';
      if (st.finished) {
        mainBodyHtml = renderResults(stats);
      } else if (q) {
        const k = String(q.id);
        const ans = st.answers[k];
        const isRev = !!st.revealed[k];
        const isFlagged = !!st.flagged[k];
        const isCorrect = ans !== undefined && Number(ans) === Number(q.correct);

        const optionsHtml = q.options.map((optText, i) => {
          let cls = 'pmcq-opt';
          if (isRev) {
            if (i === Number(q.correct)) cls += ' correct';
            else if (ans !== undefined && Number(ans) === i) cls += ' wrong';
          } else if (ans !== undefined && Number(ans) === i) {
            cls += ' selected';
          }
          return `
            <button type="button" class="${cls}" data-pmcq-opt="${i}" ${isRev ? 'disabled' : ''}>
              <span class="pmcq-opt-letter">${LETTERS[i]}</span>
              <span>${optText}</span>
            </button>
          `;
        }).join('');

        const feedbackHtml = isRev ? `
          <div class="pmcq-feedback ${isCorrect ? 'ok' : 'err'}">
            <div style="font-weight:700;margin-bottom:0.35rem;">
              ${isCorrect ? 'Resposta correta!' : ('Incorreta — Gabarito: alternativa ' + LETTERS[q.correct])}
            </div>
            <div>${q.explanation}</div>
            ${q.trap ? `<div class="pmcq-trap"><strong>Pegadinha clássica:</strong> ${q.trap}</div>` : ''}
          </div>
        ` : '';

        const mapBtns = list.map((qid, pos) => {
          const mk = String(qid);
          const mAns = st.answers[mk];
          const mRev = !!st.revealed[mk];
          let cls = 'pmcq-map-btn';
          if (pos === st.currentPos) cls += ' current';
          if (st.flagged[mk]) cls += ' flagged';
          if (mRev && mAns !== undefined) {
            cls += (Number(mAns) === Number(qById[qid].correct)) ? ' correct' : ' wrong';
          } else if (mAns !== undefined) {
            cls += ' answered';
          }
          return `<button type="button" class="${cls}" data-pmcq-jump="${pos}" title="Questão ${qid}">${qid}</button>`;
        }).join('');

        const checklistHtml = (exam.checklist || []).map(item => `<li>${item}</li>`).join('');

        mainBodyHtml = `
          <div class="pmcq-filters">${topicFilterBtns}</div>
          <div class="pmcq-body">
            <div>
              <div class="pmcq-q-card">
                <div class="pmcq-q-meta">
                  <div class="pmcq-q-badge">
                    <span class="pmcq-q-num">Questão ${q.id}</span>
                    <span>${escHtml(q.topicLabel)}</span>
                    <span style="opacity:0.65;">(${st.currentPos + 1} de ${list.length})</span>
                  </div>
                  <div class="pmcq-btn-group">
                    <button type="button" class="pmcq-btn" data-pmcq-act="hint">${st.showHint ? 'Ocultar Dica' : 'Dica (H)'}</button>
                    <button type="button" class="pmcq-btn ${isFlagged ? 'pmcq-btn-active' : ''}" data-pmcq-act="flag">${isFlagged ? 'Marcada p/ Revisão' : 'Marcar p/ Revisão'}</button>
                  </div>
                </div>

                <div class="pmcq-stem">${q.stem}</div>

                ${st.showHint && q.hint ? `<div class="pmcq-hint-box"><strong>Dica:</strong> ${q.hint}</div>` : ''}

                <div class="pmcq-options">${optionsHtml}</div>

                ${feedbackHtml}

                <div class="pmcq-q-footer">
                  <button type="button" class="pmcq-btn" data-pmcq-act="prev" ${st.currentPos <= 0 ? 'disabled' : ''}>← Anterior</button>
                  <div class="pmcq-btn-group">
                    ${st.mode === 'study' && !isRev ? `<button type="button" class="pmcq-btn pmcq-btn-accent" data-pmcq-act="verify" ${ans === undefined ? 'disabled' : ''}>Verificar Resposta</button>` : ''}
                    ${st.currentPos < list.length - 1
                      ? `<button type="button" class="pmcq-btn pmcq-btn-primary" data-pmcq-act="next">Próxima →</button>`
                      : `<button type="button" class="pmcq-btn pmcq-btn-primary" data-pmcq-act="finish">Finalizar e Corrigir</button>`}
                  </div>
                </div>
              </div>
              <div style="margin-top:0.55rem;font-size:0.78rem;opacity:0.72;">
                Atalhos: teclas <strong>A–E</strong> (ou 1–5) escolhem alternativa · <strong>← / →</strong> navegam · <strong>H</strong> exibe dica.
              </div>
            </div>

            <aside>
              <div class="pmcq-side-box">
                <div class="pmcq-side-title">Mapa de Questões</div>
                <div class="pmcq-map-grid">${mapBtns}</div>
                <div style="margin-top:0.75rem;display:flex;justify-content:space-between;font-size:0.78rem;opacity:0.8;">
                  <span>Respondidas: <strong>${stats.answered}/${stats.total}</strong></span>
                  <span>Revisão: <strong>${stats.flaggedCount}</strong></span>
                </div>
                <button type="button" class="pmcq-btn pmcq-btn-primary" style="width:100%;justify-content:center;margin-top:0.75rem;" data-pmcq-act="finish">Finalizar Simulado</button>
              </div>
              ${checklistHtml ? `
                <div class="pmcq-side-box">
                  <div class="pmcq-side-title">Pontos-Chave de Prova</div>
                  <ul class="pmcq-checklist">${checklistHtml}</ul>
                </div>
              ` : ''}
            </aside>
          </div>
        `;
      }

      hostEl.innerHTML = `
        <div class="pmcq-root" style="--pmcq-accent:${escHtml(exam.accent || '#a67c37')};">
          <div class="pmcq-shell">
            <div class="pmcq-banner">
              <div class="pmcq-kicker">${escHtml(exam.semester)} · Múltipla Escolha (${stats.total} Questões)</div>
              <h2 class="pmcq-title">${escHtml(exam.title)}</h2>
              <p class="pmcq-subtitle">${escHtml(exam.subtitle)}</p>
            </div>
            <div class="pmcq-toolbar">
              <div class="pmcq-btn-group">
                <button type="button" class="pmcq-btn ${st.mode === 'study' ? 'pmcq-btn-active' : ''}" data-pmcq-mode="study">Modo Estudo</button>
                <button type="button" class="pmcq-btn ${st.mode === 'exam' ? 'pmcq-btn-active' : ''}" data-pmcq-mode="exam">Modo Prova</button>
              </div>
              <div class="pmcq-btn-group">
                <span style="font-size:0.86rem;font-weight:700;padding:0 0.4rem;" id="pmcq-timer-val">⏱ ${fmtTime(st.elapsedSec)}</span>
                <button type="button" class="pmcq-btn" data-pmcq-act="toggle-timer">${st.timerPaused ? 'Retomar' : 'Pausar'}</button>
                <button type="button" class="pmcq-btn" data-pmcq-act="restart-std">Reiniciar</button>
              </div>
            </div>
            <div class="pmcq-progress-track">
              <div class="pmcq-progress-fill" style="width:${pctDone}%;"></div>
            </div>
            ${mainBodyHtml}
          </div>
        </div>
      `;
    }

    function resetExam(shuffle) {
      const ord = defaultOrder.slice();
      if (shuffle) {
        for (let i = ord.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = ord[i]; ord[i] = ord[j]; ord[j] = tmp;
        }
      }
      st.order = ord;
      st.answers = {};
      st.revealed = {};
      st.flagged = {};
      st.elapsedSec = 0;
      st.finished = false;
      st.currentPos = 0;
      st.topicFilter = 'all';
      st.reviewFilter = 'all';
      st.showHint = false;
      st.timerPaused = false;
      notifyProgress();
      render();
    }

    function handleClick(e) {
      const modeBtn = e.target.closest('[data-pmcq-mode]');
      if (modeBtn) {
        st.mode = modeBtn.getAttribute('data-pmcq-mode');
        notifyProgress();
        render();
        return;
      }
      const topicBtn = e.target.closest('[data-pmcq-topic]');
      if (topicBtn) {
        st.topicFilter = topicBtn.getAttribute('data-pmcq-topic');
        st.currentPos = 0;
        st.showHint = false;
        render();
        return;
      }
      const rfBtn = e.target.closest('[data-pmcq-rfilter]');
      if (rfBtn) {
        st.reviewFilter = rfBtn.getAttribute('data-pmcq-rfilter');
        render();
        return;
      }
      const jumpBtn = e.target.closest('[data-pmcq-jump]');
      if (jumpBtn) {
        st.currentPos = Number(jumpBtn.getAttribute('data-pmcq-jump')) || 0;
        st.showHint = false;
        notifyProgress();
        render();
        return;
      }
      const optBtn = e.target.closest('[data-pmcq-opt]');
      if (optBtn && !optBtn.disabled) {
        const q = currentQ();
        if (!q) return;
        const idx = Number(optBtn.getAttribute('data-pmcq-opt'));
        st.answers[String(q.id)] = idx;
        if (st.mode === 'study') {
          st.revealed[String(q.id)] = true;
        }
        notifyProgress();
        render();
        return;
      }
      const actBtn = e.target.closest('[data-pmcq-act]');
      if (!actBtn) return;
      const act = actBtn.getAttribute('data-pmcq-act');
      const q = currentQ();
      const list = filteredOrder();
      if (act === 'hint') {
        st.showHint = !st.showHint;
        render();
      } else if (act === 'flag' && q) {
        const k = String(q.id);
        st.flagged[k] = !st.flagged[k];
        notifyProgress();
        render();
      } else if (act === 'verify' && q) {
        if (st.answers[String(q.id)] !== undefined) {
          st.revealed[String(q.id)] = true;
          notifyProgress();
          render();
        }
      } else if (act === 'prev') {
        if (st.currentPos > 0) {
          st.currentPos--;
          st.showHint = false;
          notifyProgress();
          render();
        }
      } else if (act === 'next') {
        if (st.currentPos < list.length - 1) {
          st.currentPos++;
          st.showHint = false;
          notifyProgress();
          render();
        }
      } else if (act === 'finish') {
        exam.questions.forEach(item => { st.revealed[String(item.id)] = true; });
        st.finished = true;
        notifyProgress();
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (act === 'back-to-exam') {
        st.finished = false;
        render();
      } else if (act === 'toggle-timer') {
        st.timerPaused = !st.timerPaused;
        render();
      } else if (act === 'restart-std') {
        resetExam(false);
      } else if (act === 'restart-shuf') {
        resetExam(true);
      }
    }

    function handleKeydown(e) {
      if (st.finished) return;
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const key = e.key;
      const list = filteredOrder();
      const q = currentQ();
      if (!q) return;
      const k = String(q.id);
      if (key === 'ArrowRight' && st.currentPos < list.length - 1) {
        st.currentPos++;
        st.showHint = false;
        notifyProgress();
        render();
      } else if (key === 'ArrowLeft' && st.currentPos > 0) {
        st.currentPos--;
        st.showHint = false;
        notifyProgress();
        render();
      } else if (key === 'h' || key === 'H') {
        st.showHint = !st.showHint;
        render();
      } else if (!st.revealed[k]) {
        const up = key.toUpperCase();
        let optIdx = LETTERS.indexOf(up);
        if (optIdx < 0 && key >= '1' && key <= '5') optIdx = Number(key) - 1;
        if (optIdx >= 0 && optIdx < q.options.length) {
          st.answers[k] = optIdx;
          if (st.mode === 'study') st.revealed[k] = true;
          notifyProgress();
          render();
        }
      }
    }

    hostEl.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    const timerId = setInterval(() => {
      if (!st.timerPaused && !st.finished) {
        st.elapsedSec++;
        const el = hostEl.querySelector('#pmcq-timer-val');
        if (el) el.textContent = '⏱ ' + fmtTime(st.elapsedSec);
        if (st.elapsedSec % 10 === 0) saveState(examId, st);
      }
    }, 1000);

    render();

    activeCleanup = function () {
      clearInterval(timerId);
      hostEl.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  }

  /* Gancho automático para o portal modular publicado no GitHub Pages */
  let modularAttached = false;
  let activeModularExamId = null;
  let isInjectingModular = false;
  let injectTimerId = null;
  let modularObserver = null;

  function ensureCssInjected() {
    if (document.getElementById('pmcq-injected-css')) return;
    if (window.PORTAL_MCQ_CSS_TEXT) {
      const style = document.createElement('style');
      style.id = 'pmcq-injected-css';
      style.textContent = window.PORTAL_MCQ_CSS_TEXT;
      document.head.appendChild(style);
    }
  }

  function scheduleInjectModularButtons() {
    if (injectTimerId) return;
    injectTimerId = setTimeout(function () {
      injectTimerId = null;
      injectModularButtons();
    }, 50);
  }

  function injectModularButtons() {
    if (isInjectingModular) return;
    isInjectingModular = true;
    if (modularObserver) {
      try { modularObserver.disconnect(); } catch (e) {}
    }
    try {
      const exams = getExamsMap();
      const sidebars = document.querySelectorAll('#sidebar-content-desktop, #sidebar-content-mobile');
      sidebars.forEach(nav => {
        if (!nav) return;

        const specs = [
          { examId: 'organica_t12', findAnchor: n => n.querySelector('[data-nav-screen="organica-sim34"]'), position: 'beforebegin' },
          { examId: 'ft1_p1', findAnchor: n => { const els = n.querySelectorAll('[data-open-ft1]'); return els.length ? els[els.length - 1] : null; }, position: 'afterend' },
          { examId: 'frutas_geral', findAnchor: n => { const els = n.querySelectorAll('[data-open-lec]'); return els.length ? els[els.length - 1] : n.querySelector('[data-nav-screen="frutas-home"]'); }, position: 'afterend' },
          { examId: 'gcq_ferramentas', findAnchor: n => { const els = n.querySelectorAll('[data-open-gcq]'); return els.length ? els[els.length - 1] : n.querySelector('[data-nav-screen="gcq-home"]'); }, position: 'afterend' }
        ];

        specs.forEach(sp => {
          const ex = exams[sp.examId];
          if (!ex) return;
          const prog = getProgress(sp.examId);
          const countTxt = prog.done + '/' + prog.total;
          const isAct = activeModularExamId === sp.examId;
          const targetCls = 'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm transition ' +
            (isAct
              ? 'bg-slate-900 text-white dark:bg-stone-200 dark:text-stone-950 font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800');

          const existing = nav.querySelector('[data-open-mcq="' + sp.examId + '"]');
          if (existing) {
            const badge = existing.querySelector('.pmcq-sb-count');
            if (badge && badge.textContent !== countTxt) badge.textContent = countTxt;
            if (existing.className !== targetCls) existing.className = targetCls;
            return;
          }
          const anchor = sp.findAnchor(nav);
          if (!anchor) return;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('data-open-mcq', sp.examId);
          btn.className = targetCls;
          btn.innerHTML =
            '<div class="flex items-center gap-2.5 min-w-0">' +
              '<span class="w-2 h-2 rounded-full shrink-0" style="background:' + escHtml(ex.accent || '#a67c37') + '"></span>' +
              '<span class="truncate">' + escHtml(ex.shortTitle) + '</span>' +
            '</div>' +
            '<span class="pmcq-sb-count text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">' +
            countTxt + '</span>';
          anchor.insertAdjacentElement(sp.position, btn);
        });
      });

      // Injeta CTA editorial nos painéis iniciais quando renderizados no portal modular
      const main = document.getElementById('main-content');
      if (main && !main.querySelector('#pmcq-modular-host') && !main.querySelector('.pmcq-home-strip')) {
        const homeChecks = [
          { test: n => !!n.querySelector('[data-nav-screen="organica-sim34"]') && !n.querySelector('[data-nav-screen="frutas-home"]'), examId: 'organica_t12' },
          { test: n => !!n.querySelector('#ft1-stage'), examId: 'ft1_p1' },
          { test: n => !!n.querySelector('[data-open-lec]') && !n.querySelector('[data-nav-screen="organica-home"]'), examId: 'frutas_geral' },
          { test: n => !!n.querySelector('[data-open-gcq]') && !n.querySelector('[data-nav-screen="organica-home"]'), examId: 'gcq_ferramentas' }
        ];
        const hit = homeChecks.find(h => exams[h.examId] && h.test(main));
        if (hit) {
          const ex = exams[hit.examId];
          const p = getProgress(hit.examId);
          const strip = document.createElement('div');
          strip.className = 'pmcq-home-strip mb-4 flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900';
          strip.innerHTML =
            '<div>' +
              '<div class="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Simulado de Múltipla Escolha (' + p.total + ' Questões)</div>' +
              '<div class="text-base font-bold text-stone-900 dark:text-stone-100">' + escHtml(ex.title) + '</div>' +
              '<div class="text-xs text-stone-600 dark:text-stone-400">Modo Estudo e Modo Prova · Cronômetro · Gabarito Comentado (' + p.done + '/' + p.total + ' respondidas)</div>' +
            '</div>' +
            '<button type="button" data-open-mcq="' + ex.id + '" class="px-4 py-2 rounded-lg text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-200 dark:text-stone-950 transition">Abrir Simulado →</button>';
          const firstSection = main.querySelector('section') || main.firstElementChild;
          if (firstSection) firstSection.insertAdjacentElement('afterend', strip);
        } else if (main.querySelector('[data-nav-screen="organica-home"]') && main.querySelector('[data-nav-screen="frutas-home"]')) {
          const strip = document.createElement('section');
          strip.className = 'pmcq-home-strip mb-6 p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900';
          const cards = ['organica_t12', 'ft1_p1', 'frutas_geral', 'gcq_ferramentas'].map(id => {
            const ex = exams[id];
            if (!ex) return '';
            const p = getProgress(id);
            return '<button type="button" data-open-mcq="' + id + '" class="text-left p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition bg-stone-50/70 dark:bg-stone-800/60">' +
              '<div class="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">' + escHtml(ex.subjectLabel) + ' · ' + p.done + '/' + p.total + '</div>' +
              '<div class="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">' + escHtml(ex.shortTitle) + '</div>' +
            '</button>';
          }).join('');
          strip.innerHTML =
            '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
              '<div>' +
                '<div class="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Avaliações Objetivas</div>' +
                '<h3 class="text-base font-bold text-stone-900 dark:text-stone-100">Simulados de Múltipla Escolha por Disciplina</h3>' +
              '</div>' +
              '<span class="text-xs text-stone-500 dark:text-stone-400">75 novas questões + 20 de Orgânica T3/T4</span>' +
            '</div>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">' + cards + '</div>';
          const firstSection = main.querySelector('section');
          if (firstSection) firstSection.insertAdjacentElement('afterend', strip);
        }
      }
    } finally {
      isInjectingModular = false;
      if (modularObserver) {
        const targets = [
          document.getElementById('sidebar-content-desktop'),
          document.getElementById('sidebar-content-mobile'),
          document.getElementById('main-content')
        ].filter(Boolean);
        targets.forEach(t => {
          try { modularObserver.observe(t, { childList: true }); } catch (e) {}
        });
      }
    }
  }

  function openModularExam(examId) {
    const exam = getExam(examId);
    const main = document.getElementById('main-content');
    if (!exam || !main) return;
    ensureCssInjected();
    activeModularExamId = examId;
    if (window.location.hash !== '#mcq/' + examId) {
      try { history.replaceState(null, '', '#mcq/' + examId); } catch (e) {}
    }
    const backAttr = exam.homeScreen === 'ft1'
      ? 'data-open-ft1="teoria"'
      : 'data-nav-screen="' + escHtml(exam.homeScreen) + '"';
    main.innerHTML =
      '<div class="fade-in max-w-6xl mx-auto">' +
        '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
          '<button type="button" ' + backAttr + ' class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition">← ' + escHtml(exam.homeLabel) + '</button>' +
          '<span class="text-xs font-semibold text-stone-500 dark:text-stone-400">' + escHtml(exam.semester) + '</span>' +
        '</div>' +
        '<div id="pmcq-modular-host"></div>' +
      '</div>';
    const host = document.getElementById('pmcq-modular-host');
    mount(host, examId, null, function () {
      injectModularButtons();
    });
    const drawer = document.getElementById('mobile-drawer');
    if (drawer && !drawer.classList.contains('hidden')) drawer.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    injectModularButtons();
  }

  function attachModularHooks() {
    if (modularAttached) return;
    modularAttached = true;
    ensureCssInjected();

    document.addEventListener('click', function (e) {
      const mcqBtn = e.target.closest('[data-open-mcq]');
      if (mcqBtn) {
        e.preventDefault();
        e.stopPropagation();
        openModularExam(mcqBtn.getAttribute('data-open-mcq'));
        return;
      }
      const otherNav = e.target.closest('[data-nav-screen], [data-open-qo], [data-open-ft1], [data-open-lec], [data-open-gcq]');
      if (otherNav && activeModularExamId) {
        activeModularExamId = null;
        unmount();
      }
    }, true);

    if (typeof MutationObserver !== 'undefined') {
      modularObserver = new MutationObserver(function () {
        scheduleInjectModularButtons();
      });
    }

    injectModularButtons();

    if (window.location.hash && window.location.hash.indexOf('#mcq/') === 0) {
      const id = window.location.hash.slice(5).split('/')[0];
      if (getExam(id)) setTimeout(function () { openModularExam(id); }, 60);
    }
  }

  window.PORTAL_MCQ_ENGINE = {
    getExams: getExamsMap,
    getExam: getExam,
    getProgress: getProgress,
    getSearchDocs: getSearchDocs,
    mount: mount,
    unmount: unmount,
    attachModularHooks: attachModularHooks
  };
})();
