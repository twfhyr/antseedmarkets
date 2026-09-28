/* Apply the saved theme before paint; no wallet or network access. */
(function () {
  let saved = 'editorial';
  try { saved = localStorage.getItem('antseedmarkets-design-theme') || saved; } catch (_) {}
  const requested = new URLSearchParams(location.search).get('theme');
  if (requested === 'terminal' || requested === 'editorial') {
    saved = requested;
    try { localStorage.setItem('antseedmarkets-design-theme', saved); } catch (_) {}
  }
  document.documentElement.dataset.theme = saved === 'terminal' ? 'terminal' : 'editorial';
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    const wallet = header.querySelector('.wallet');
    const controls = document.createElement('div');
    controls.className = 'header-controls';
    const toggle = document.createElement('div');
    toggle.className = 'theme-toggle';
    toggle.setAttribute('role', 'group');
    toggle.setAttribute('aria-label', 'Visual theme');
    toggle.innerHTML = '<span class="theme-label">Visual theme</span><button type="button" data-theme-choice="editorial" title="Warm editorial design">Editorial</button><button type="button" data-theme-choice="terminal" title="High-contrast trading interface">Terminal</button>';
    header.insertBefore(controls, wallet);
    controls.append(toggle, wallet);
    const announce = document.createElement('span');
    announce.className = 'theme-announcement';
    announce.setAttribute('role', 'status');
    controls.append(announce);
    function update(theme, notify) {
      document.documentElement.dataset.theme = theme;
      toggle.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme)));
      if (notify) announce.textContent = `${theme === 'terminal' ? 'Terminal' : 'Editorial'} theme enabled.`;
    }
    toggle.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      const theme = button.dataset.themeChoice;
      update(theme, true);
      try { localStorage.setItem('antseedmarkets-design-theme', theme); } catch (_) {}
    }));
    update(document.documentElement.dataset.theme, false);
    window.addEventListener('storage', event => {
      if (event.key === 'antseedmarkets-design-theme') update(event.newValue === 'terminal' ? 'terminal' : 'editorial', false);
    });
  });
})();
