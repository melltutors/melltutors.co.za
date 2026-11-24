(() => {
  const switcher = document.querySelector('[data-subject-switch]');
  if (!switcher) return;

  const tabs = [...switcher.querySelectorAll('[role="tab"]')];
  const panel = document.querySelector('#premium-subject-schedule');
  const subjectCopy = [...document.querySelectorAll('[data-subject-content]')];

  const activate = (subject, focus = false) => {
    tabs.forEach(tab => {
      const selected = tab.dataset.subjectTab === subject;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (focus && selected) tab.focus();
    });
    subjectCopy.forEach(copy => {
      copy.hidden = copy.dataset.subjectContent !== subject;
    });
    const activeTab = tabs.find(tab => tab.dataset.subjectTab === subject);
    if (panel && activeTab) panel.setAttribute('aria-labelledby', activeTab.id);
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

  activate('mathematics-i');
})();
