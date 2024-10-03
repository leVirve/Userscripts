// ==UserScript==
// @name                Shorten Shopee URL
// @name:zh-TW          縮短蝦皮網址
// @description         Shortens the Shopee desktop URL, making it easier for you to share.
// @description:zh-TW   縮短蝦皮電腦版網址。
// @namespace           https://github.com/leVirve
// @match               https://shopee.tw/*
// @version             1.2
// @icon                https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.wI1aMs.png
// @author              Salas (leVirve)
// @license             MIT
// @homepageURL         https://github.com/leVirve/Userscripts
// ==/UserScript==

(function () {
  'use strict';

  // Extracts shop and product IDs from the URL
  function extractShopAndProductIds(url) {
    const match = url.match(/.*-i\.(\d+)\.(\d+)/);
    return match ? [match[1], match[2]] : [null, null];
  }

  // Redirects to the new product URL if needed
  function redirectToProductPage() {
    const [shopId, productId] = extractShopAndProductIds(location.href);
    if (shopId && productId) {
      const newProductUrl = `https://${location.hostname}/product/${shopId}/${productId}`;
      location.replace(newProductUrl);
    }
  }

  // Initial redirect check
  redirectToProductPage();

  // Observe changes in the DOM to handle dynamic content
  const observer = new MutationObserver(redirectToProductPage);
  observer.observe(document.body, { childList: true, subtree: true });

})();
