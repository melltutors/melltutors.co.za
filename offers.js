(() => {
  const switcher = document.querySelector('[data-subject-switch]');
  if (!switcher) return;

  const tabs = [...switcher.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[data-subject-panel]')];
  const subjectCopy = [...document.querySelectorAll('[data-subject-content]')];

  const activate = (subject, focus = false) => {
    tabs.forEach(tab => {
      const selected = tab.dataset.subjectTab === subject;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (focus && selected) tab.focus();
    });
    panels.forEach(panel => {
      panel.hidden = panel.dataset.subjectPanel !== subject;
    });
    subjectCopy.forEach(copy => {
      copy.hidden = copy.dataset.subjectContent !== subject;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.subjectTab));
    tab.addEventListener('keydown', event => {
      const nextIndex = event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      activate(tabs[nextIndex].dataset.subjectTab, true);
    });
  });

  activate('mathematics');
})();
