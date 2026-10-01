// Preserve the local ANTS service session when the homepage is the first page opened.
const tokenMatch = /(?:^#|[#&?])token=([A-Za-z0-9_-]+)/.exec(window.location.hash);
if (tokenMatch) {
  sessionStorage.setItem('ants.dashboard.token', tokenMatch[1]);
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

const blocks = document.querySelectorAll('[data-department]');
const cards = document.querySelectorAll('.department[data-department]');

function focusDepartment(name) {
  blocks.forEach((block) => block.classList.toggle('is-focused', block.dataset.department === name));
}

cards.forEach((card) => {
  card.addEventListener('mouseenter', () => focusDepartment(card.dataset.department));
  card.addEventListener('mouseleave', () => focusDepartment(''));

  // The local ANTS service expects its one-session token in the fragment.
  // Carry it into the integrated account route during this prototype.
  if (card.dataset.department === 'account') {
    card.addEventListener('click', (event) => {
      const token = sessionStorage.getItem('ants.dashboard.token');
      if (!token) return;
      event.preventDefault();
      window.location.href = `/my-antseed/#token=${encodeURIComponent(token)}`;
    });
  }
});

blocks.forEach((block) => {
  block.addEventListener('focus', () => focusDepartment(block.dataset.department));
  block.addEventListener('blur', () => focusDepartment(''));
  block.addEventListener('click', () => {
    const href = block.dataset.href;
    if (!href) return;
    if (block.dataset.department === 'account') {
      const token = sessionStorage.getItem('ants.dashboard.token');
      window.location.href = token ? `/my-antseed/#token=${encodeURIComponent(token)}` : href;
      return;
    }
    window.location.href = href;
  });
  block.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      block.click();
    }
  });
});
