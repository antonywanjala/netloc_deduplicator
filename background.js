/**
 * Extracts the exact netloc (authority) from a URL:
 * - Preserves full subdomains (e.g., 'mail.google.com' vs 'docs.google.com')
 * - Preserves non-default ports (e.g., 'localhost:3000' vs 'localhost:8080')
 * - Preserves userinfo if present
 * - Ignores path, query params, hash, and scheme differences
 */
function extractNetloc(urlString) {
  try {
    const url = new URL(urlString);

    // Filter out schemes that lack network locations (e.g., about:blank, data:, chrome:)
    if (!url.host) return null;

    let auth = "";
    if (url.username) {
      auth = `${url.username}${url.password ? `:${url.password}` : ""}@`;
    }

    // url.host returns hostname + optional non-standard port (e.g., 'api.site.com:8080')
    return `${auth}${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

chrome.action.onClicked.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    const seenNetlocs = new Set();
    const tabsToClose = [];

    // Sort to prioritize the active tab so it is never closed over a duplicate
    tabs.sort((a, b) => (a.active ? -1 : (b.active ? 1 : 0)));

    for (const tab of tabs) {
      if (!tab.url) continue;

      const netloc = extractNetloc(tab.url);

      // Skip internal browser pages, local files, or non-HTTP targets without a netloc
      if (!netloc) continue;

      if (seenNetlocs.has(netloc)) {
        tabsToClose.push(tab.id);
      } else {
        seenNetlocs.add(netloc);
      }
    }

    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose);
    }
  } catch (error) {
    console.error("Failed to deduplicate tabs by netloc:", error);
  }
});