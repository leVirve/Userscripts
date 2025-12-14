// ==UserScript==
// @name              Threads 媒體下載器
// @name:en           Threads Media Downloader
// @namespace         https://github.com/leVirve
// @version           2.3.0
// @description       從 Threads 貼文下載圖片和影片
// @description:en    Download images and videos from Threads posts
// @author            Salas (leVirve)
// @license           MIT
// @icon              https://static.cdninstagram.com/rsrc.php/ye/r/lEu8iVizmNW.ico
// @homepage          https://github.com/leVirve/Userscripts
// @match             https://www.threads.net/*
// @match             https://www.threads.com/*
// @run-at            document-end
// @grant             GM.xmlHttpRequest
// @connect           cdninstagram.com
// @updateURL         https://github.com/leVirve/Userscripts/raw/main/scripts/threads-media-downloader.user.js
// @downloadURL       https://github.com/leVirve/Userscripts/raw/main/scripts/threads-media-downloader.user.js
// ==/UserScript==

(function () {
  "use strict";

  const DOWNLOAD_ICON_PATHS = [
    "M9 2.5V10.5M5.5 7L9 10.5L12.5 7",
    "M3 13.5V14.5C3 15.3284 3.67157 16 4.5 16H13.5C14.3284 16 15 15.3284 15 14.5V13.5",
  ];

  const processedPosts = new WeakSet();

  function injectStyles() {
    if (document.getElementById("threads-downloader-css")) return;

    const style = document.createElement("style");
    style.id = "threads-downloader-css";
    style.textContent = `
      .threads-download-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .threads-download-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 50%;
        cursor: pointer;
        transition: background-color 0.2s ease;
        position: relative;
      }
      .threads-download-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
      @media (prefers-color-scheme: dark) {
        .threads-download-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
      .threads-download-btn svg {
        width: 20px;
        height: 20px;
        display: block;
      }
      .threads-download-btn svg path {
        stroke: rgb(115, 115, 115);
      }
      @media (prefers-color-scheme: dark) {
        .threads-download-btn svg path {
          stroke: rgb(168, 168, 168);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createDownloadIconSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 18 18");
    svg.setAttribute("aria-label", "下載");
    svg.setAttribute("role", "img");

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = "下載";
    svg.appendChild(title);

    DOWNLOAD_ICON_PATHS.forEach((pathData) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      path.setAttribute("stroke-width", "1.25");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("fill", "none");
      svg.appendChild(path);
    });

    return svg;
  }

  function hasMedia(postContainer) {
    const mediaSelector =
      'img[src*="cdninstagram.com"]:not([width="36"]):not([height="36"]), ' +
      'img[src*="fbcdn.net"]:not([width="36"]):not([height="36"]), ' +
      "video";
    return postContainer.querySelector(mediaSelector) !== null;
  }

  function getMediaFromPost(postContainer) {
    const mediaList = [];
    const imageSelector =
      'img[src*="cdninstagram.com"]:not([width="36"]):not([height="36"]), ' +
      'img[src*="fbcdn.net"]:not([width="36"]):not([height="36"])';

    postContainer.querySelectorAll(imageSelector).forEach((img) => {
      mediaList.push({ url: img.src, ext: "jpg" });
    });

    postContainer.querySelectorAll("video").forEach((video) => {
      const src = video.src || video.querySelector("source")?.src;
      if (src) mediaList.push({ url: src, ext: "mp4" });
    });

    // Deduplicate by URL
    const seen = new Set();
    return mediaList.filter((media) => {
      if (seen.has(media.url)) return false;
      seen.add(media.url);
      return true;
    });
  }

  function getUsername(postContainer) {
    const link = postContainer.querySelector('a[href*="/@"]');
    return link ? link.getAttribute("href").split("/@")[1].replace(/\//g, "") : "unknown";
  }

  function getTimestamp(postContainer) {
    const timeEl = postContainer.querySelector("time");
    const iso = timeEl?.getAttribute("datetime");

    if (!iso) {
      return new Date().toISOString().replace(/[:.]/g, "-");
    }

    try {
      return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0].replace("T", "_");
    } catch {
      return iso.replace(/[-:]/g, "");
    }
  }

  function downloadFile(url, filename) {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => console.error("[ThreadsDownloader] Download failed:", err));
  }

  function handleDownload(postContainer) {
    const mediaItems = getMediaFromPost(postContainer);

    if (mediaItems.length === 0) {
      alert("No media found to download in this post.");
      return;
    }

    const username = getUsername(postContainer);
    const timestamp = getTimestamp(postContainer);

    mediaItems.forEach((media, index) => {
      const filename = `Threads_${username}_${timestamp}_${index + 1}.${media.ext}`;
      downloadFile(media.url, filename);
    });
  }

  function injectButton(postContainer) {
    if (!hasMedia(postContainer)) return;

    // Find the overflow menu button
    const overflowBtn = Array.from(postContainer.querySelectorAll('[role="button"]')).find((btn) => {
      const title = btn.querySelector("svg title");
      return title?.textContent === "更多";
    });

    if (!overflowBtn) return;

    const buttonContainer = overflowBtn.closest("div.xkqq1k2");
    if (!buttonContainer || buttonContainer.parentElement.querySelector(".threads-download-btn")) return;

    // Create download button
    const downloadWrapper = document.createElement("div");
    downloadWrapper.className = "threads-download-wrapper";

    const downloadBtn = document.createElement("div");
    downloadBtn.className = "threads-download-btn";
    downloadBtn.setAttribute("role", "button");
    downloadBtn.setAttribute("tabindex", "0");
    downloadBtn.title = "下載媒體";

    downloadBtn.appendChild(createDownloadIconSVG());
    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDownload(postContainer);
    });

    downloadWrapper.appendChild(downloadBtn);
    buttonContainer.parentElement.insertBefore(downloadWrapper, buttonContainer);
  }

  function scanPosts() {
    const posts = document.querySelectorAll('[data-pressable-container="true"]');
    posts.forEach((post) => {
      if (!processedPosts.has(post)) {
        injectButton(post);
        processedPosts.add(post);
      }
    });
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.addedNodes.length > 0)) {
      scanPosts();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  injectStyles();
  scanPosts();

})();
