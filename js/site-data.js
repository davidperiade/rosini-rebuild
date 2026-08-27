const SITE_DATA_URL = '/api/site-data';

window.rosiniSiteData = window.rosiniSiteData || {};
window.rosiniSiteData.load = window.rosiniSiteData.load || (() => {
  let promise;
  return () => {
    if (promise) return promise;
    promise = (async () => {
      try {
        const response = await fetch(SITE_DATA_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Site data ${response.status}`);
        return await response.json();
      } catch (error) {
        if (window.__ROSINI_CMS__) return window.__ROSINI_CMS__;
        const fallback = await fetch('/site-data.json', { cache: 'no-store' });
        if (!fallback.ok) throw error;
        return fallback.json();
      }
    })();
    return promise;
  };
})();
