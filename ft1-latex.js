(function () {
  if (window.FT1_LATEX_UPGRADE) return;

  function htmlToLatex(el) {
    // Clona para converter <span class="frac">, <span class="vbar">, <span class="gdot">, <sub>, <sup>
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.frac').forEach(fr => {
      const kids = fr.children;
      if (kids.length >= 2) {
        const num = kids[0].textContent.trim();
        const den = kids[1].textContent.trim();
        fr.replaceWith('\\frac{' + num + '}{' + den + '}');
      }
    });
    clone.querySelectorAll('.vbar').forEach(v => {
      v.replaceWith('\\bar{' + v.textContent.trim() + '}');
    });
    clone.querySelectorAll('.gdot').forEach(g => {
      g.replaceWith('\\dot{\\gamma}');
    });
    clone.querySelectorAll('sub').forEach(sub => {
      const t = sub.textContent.trim();
      const wrapped = /^[a-zA-Z]{2,}$|máx|ef|ent|sai|med|hid/.test(t) ? '\\text{' + t + '}' : t;
      sub.replaceWith('_{' + wrapped + '}');
    });
    clone.querySelectorAll('sup').forEach(sup => {
      sup.replaceWith('^{' + sup.textContent.trim() + '}');
    });

    let s = (clone.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return null;

    // Se for texto descritivo longo (ex.: "Acúmulo = Ent. - Sai.") ou mistura texto comum em português, preserva texto com \text{}
    if (/Acúmulo|pessoas\/ano|escoa se|quando/i.test(s)) {
      return null;
    }

    // Substitui simbolos Unicode por comandos LaTeX limpos
    s = s
      .replace(/−/g, ' - ')
      .replace(/·/g, ' \\cdot ')
      .replace(/×/g, ' \\times ')
      .replace(/±/g, ' \\pm ')
      .replace(/≤/g, ' \\le ')
      .replace(/≥/g, ' \\ge ')
      .replace(/≠/g, ' \\neq ')
      .replace(/≈/g, ' \\approx ')
      .replace(/→/g, ' \\to ')
      .replace(/⇒/g, ' \\Rightarrow ')
      .replace(/∞/g, ' \\infty ')
      .replace(/∂/g, ' \\partial ')
      .replace(/∫/g, ' \\int ')
      .replace(/Δ/g, ' \\Delta ')
      .replace(/τ/g, ' \\tau ')
      .replace(/μ/g, ' \\mu ')
      .replace(/ν/g, ' \\nu ')
      .replace(/η/g, ' \\eta ')
      .replace(/ρ/g, ' \\rho ')
      .replace(/δ/g, ' \\delta ')
      .replace(/β/g, ' \\beta ')
      .replace(/ξ/g, ' \\xi ')
      .replace(/γ/g, ' \\gamma ')
      .replace(/π/g, ' \\pi ')
      .replace(/²/g, '^{2}')
      .replace(/³/g, '^{3}')
      .replace(/⁴/g, '^{4}')
      .replace(/\bcos\b/g, '\\cos')
      .replace(/\bsen\b/g, '\\operatorname{sen}')
      .replace(/\bln\b/g, '\\ln')
      .replace(/\|/g, ' \\quad|\\quad ');

    return s;
  }

  function upgradeFt1Stage() {
    const stage = document.getElementById('ft1-stage');
    if (!stage || typeof window.katex === 'undefined') return;

    // 1. Converte blocos .math-block / .formula-box (display mode)
    stage.querySelectorAll('.math-block, .formula-box').forEach(el => {
      if (el.getAttribute('data-katex-done') === '1') return;
      if (el.querySelector('input, select, button')) return;
      const tex = htmlToLatex(el);
      if (!tex) return;
      try {
        window.katex.render(tex, el, { displayMode: true, throwOnError: false, strict: false });
        el.setAttribute('data-katex-done', '1');
      } catch (e) {}
    });

    // 2. Converte spans .math-inline (inline mode)
    stage.querySelectorAll('.math-inline').forEach(el => {
      if (el.getAttribute('data-katex-done') === '1') return;
      if (el.querySelector('input, select, button')) return;
      const tex = htmlToLatex(el);
      if (!tex) return;
      try {
        window.katex.render(tex, el, { displayMode: false, throwOnError: false, strict: false });
        el.setAttribute('data-katex-done', '1');
      } catch (e) {}
    });

    // 3. Tambem roda renderPortalMath para quaisquer $...$ explicitos
    if (typeof window.renderPortalMath === 'function') {
      window.renderPortalMath(stage);
    }
  }

  let sweepTimer = null;
  function scheduleUpgrade() {
    if (sweepTimer) clearTimeout(sweepTimer);
    sweepTimer = setTimeout(function () {
      sweepTimer = null;
      upgradeFt1Stage();
    }, 100);
  }

  window.FT1_LATEX_UPGRADE = { run: upgradeFt1Stage };

  if (typeof document !== 'undefined') {
    document.addEventListener('click', scheduleUpgrade);
    window.addEventListener('load', scheduleUpgrade);
    setTimeout(scheduleUpgrade, 400);
    setTimeout(scheduleUpgrade, 1200);
  }
})();
