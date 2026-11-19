(() => {
  const form = document.querySelector('#interest-form');
  if (!form) return;

  const button = form.querySelector('button[type=submit]');
  const status = document.querySelector('#form-status');
  const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
  const api = local ? location.origin : 'https://mell-downloads.melltutors-w.workers.dev';
  const params = new URLSearchParams(location.search);
  const incomingProgramme = (params.get('programme') || '').toLowerCase();
  const incomingCampaign = params.get('campaign');
  const campaign = ['first-year-2027', 'second-year-2027'].includes(incomingCampaign) ? incomingCampaign : 'direct';
  let token = '';
  let busy = false;

  if (['premium', 'apex'].includes(incomingProgramme)) {
    form.elements.namedItem('programme').value = incomingProgramme;
  }
  if (local) {
    const banner = document.createElement('div');
    banner.className = 'preview-banner';
    banner.textContent = 'Private local preview · Use fictional details only. Nothing is sent to MELL’s live database.';
    document.body.prepend(banner);
  }

  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }

  async function loadToken() {
    const response = await fetch(api + '/api/interest/form', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'The form is unavailable. Please contact MELL.');
    token = result.token;
  }

  async function init() {
    button.disabled = true;
    try {
      await loadToken();
      button.textContent = 'Submit application';
      message('');
    } catch (error) {
      button.textContent = 'Retry loading form';
      message(error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  const timeOptions = Array.from(form.querySelectorAll('input[name="times"]'));
  for (const option of timeOptions) {
    option.addEventListener('change', () => {
      if (!option.checked) return;
      for (const other of timeOptions) {
        if (other !== option && (option.value === 'Not sure yet' || other.value === 'Not sure yet')) {
          other.checked = false;
        }
      }
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!token) {
      await init();
      return;
    }

    const data = new FormData(form);
    const modules = data.getAll('modules');
    const times = data.getAll('times');
    if (!modules.length || !times.length) {
      const missing = modules.length ? 'time' : 'subject';
      message('Choose at least one ' + missing + '.', true);
      form.querySelector(modules.length ? 'input[name="times"]' : 'input[name="modules"]').focus();
      return;
    }

    busy = true;
    button.disabled = true;
    button.textContent = 'Submitting…';
    form.setAttribute('aria-busy', 'true');
    message('');

    try {
      const response = await fetch(api + '/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          year: data.get('year'),
          programme: data.get('programme'),
          modules,
          times,
          notes: data.get('notes'),
          website: data.get('website'),
          contactConsent: data.has('contactConsent'),
          marketing: data.has('marketing'),
          campaign,
          application: {
            moduleCodes: data.get('moduleCodes'),
            studyMode: data.get('studyMode'),
            support: data.get('support'),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        if (response.status === 403) {
          token = '';
          await loadToken();
        }
        throw Error(result.error || 'Please try again shortly.');
      }

      form.reset();
      message(result.message);
      button.textContent = 'Application received';
      status.tabIndex = -1;
      status.focus();
    } catch (error) {
      message(error.message === 'Failed to fetch'
        ? 'Could not connect. Your details are still here. Please try again.'
        : error.message, true);
      button.disabled = false;
      button.textContent = token ? 'Submit application' : 'Retry loading form';
    } finally {
      busy = false;
      form.setAttribute('aria-busy', 'false');
    }
  });
  init();
})();
