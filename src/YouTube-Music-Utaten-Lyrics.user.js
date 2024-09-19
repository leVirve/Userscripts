// ==UserScript==
// @name                YouTube Music Utaten Lyrics
// @name:zh-TW          YouTube 音樂顯示 Utaten 歌詞
// @icon                https://music.youtube.com/img/favicon_144.png
// @namespace           https://github.com/leVirve
// @version             1.3
// @description         Add Japanese lyrics subtitles to YouTube Music from Utaten
// @description:zh-TW   在 YouTube 音樂中顯示 Utaten 的日文歌詞字幕。
// @author              Salas (leVirve)
// @match               https://music.youtube.com/*
// @grant               GM_xmlhttpRequest
// @connect             utaten.com
// @license             MIT
// @homepageURL         https://github.com/leVirve/Userscripts
// ==/UserScript==

(function () {
    'use strict';

    let lastSongTitle = '';

    // Initialize the script
    function initScript() {
        console.log('Initializing script');
        createLyricsInterface();
        observeSongChanges();
    }

    // Observe song changes
    function observeSongChanges() {
        const observer = new MutationObserver(() => {
            const currentSong = getCurrentSong();
            if (currentSong && currentSong.title !== lastSongTitle) {
                lastSongTitle = currentSong.title;
                displayCurrentSong(currentSong);
            }
        });

        // Start observing the body for changes
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Function to display the current song
    function displayCurrentSong(song) {
        const inputField = document.querySelector('#lyrics-container input[type="text"]');
        const storedUrl = localStorage.getItem(`utatenUrl_${song.artist}-${song.title}`);
        console.log('Query local storage for', `${song.artist}-${song.title}`)
        inputField.value = storedUrl || '';
        clearLyrics();
    }

    // Initial call
    initScript();
})();

// Create the lyrics interface
function createLyricsInterface() {
    console.log('Creating lyrics interface');
    if (document.getElementById('lyrics-container')) {
        console.log('Lyrics container already exists, exiting');
        return;
    }

    const container = document.createElement('div');
    container.id = 'lyrics-container';

    // Load saved position and size
    const savedPosition = JSON.parse(localStorage.getItem('lyricsPosition')) || { top: '64px', left: 'auto', right: '10px', bottom: 'auto' };
    const savedSize = JSON.parse(localStorage.getItem('lyricsSize')) || { width: '300px', height: '400px' };

    container.style.cssText = `
        position: fixed;
        top: ${savedPosition.top};
        left: ${savedPosition.left};
        right: ${savedPosition.right};
        bottom: ${savedPosition.bottom};
        width: ${savedSize.width};
        height: ${savedSize.height};
        background-color: rgba(28, 28, 28, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 9999;
        overflow-y: auto;
        font-family: 'Roboto', 'Noto Sans JP', sans-serif;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
        resize: both;
        overflow: auto;
    `;

    const header = createHeader();
    const input = createInput();
    const buttonContainer = createButtonContainer();
    const lyricsDisplay = createLyricsDisplay();

    container.insertBefore(header, container.firstChild);
    container.appendChild(input);
    container.appendChild(buttonContainer);
    container.appendChild(lyricsDisplay);

    document.body.appendChild(container);

    // Initialize draggable and resizable functionalities
    initializeDraggable(container, header);
    initializeResizable(container);
    initializeWindowResizeListener(container);

    console.log('Lyrics interface created and added to the page');

    buttonContainer.querySelector('.fetch-lyrics').addEventListener('click', () => fetchAndDisplayLyrics(input.value));
    buttonContainer.querySelector('.clear-lyrics').addEventListener('click', () => clearLyrics());
}

// Create header element
function createHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
        cursor: move;
        background-color: rgba(60, 60, 60, 0.5);
        padding: 10px;
        margin: -15px -15px 10px -15px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
    `;
    header.textContent = 'Utaten 歌詞';
    return header;
}

// Create input element
function createInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter Utaten URL';
    input.style.cssText = `
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border: none;
        border-radius: 4px;
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 14px;
        box-sizing: border-box;
    `;
    return input;
}

// Create button container
function createButtonContainer() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginBottom = '15px';

    const fetchButton = createButton('Fetch Lyrics', '#4285f4', 'fetch-lyrics');
    const clearButton = createButton('Clear', '#ea4335', 'clear-lyrics');

    buttonContainer.appendChild(fetchButton);
    buttonContainer.appendChild(clearButton);
    return buttonContainer;
}

// Create lyrics display
function createLyricsDisplay() {
    const lyricsDisplay = document.createElement('div');
    lyricsDisplay.id = 'lyrics-display';
    lyricsDisplay.style.cssText = `
        line-height: 1.8;
        font-size: 16px;
    `;
    return lyricsDisplay;
}

// Initialize draggable functionality
function initializeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.right = 'auto';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;

        // Save position and size
        const position = {
            top: element.style.top,
            left: element.style.left,
            right: element.style.right,
            bottom: element.style.bottom
        };
        localStorage.setItem('lyricsPosition', JSON.stringify(position));
    }
}

// Initialize resizable functionality
function initializeResizable(element) {
    let resizeObserver = new ResizeObserver(() => {
        const size = {
            width: element.style.width,
            height: element.style.height
        };
        localStorage.setItem('lyricsSize', JSON.stringify(size));
    });
    resizeObserver.observe(element);
}

// Initialize window resize listener
function initializeWindowResizeListener(element) {
    window.addEventListener('resize', () => {
        const rect = element.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (rect.right > windowWidth) {
            element.style.left = 'auto';
            element.style.right = '10px';
        }
        if (rect.bottom > windowHeight) {
            element.style.top = 'auto';
            element.style.bottom = '10px';
        }
        if (rect.left < 0) {
            element.style.left = '10px';
            element.style.right = 'auto';
        }
        if (rect.top < 0) {
            element.style.top = '10px';
            element.style.bottom = 'auto';
        }

        // Save position and size
        const position = {
            top: element.style.top,
            left: element.style.left,
            right: element.style.right,
            bottom: element.style.bottom
        };
        localStorage.setItem('lyricsPosition', JSON.stringify(position));
    });
}

// Additional functions
function createButton(text, bgColor, className) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = className;
    button.style.cssText = `
        width: 48%;
        padding: 8px;
        border: none;
        border-radius: 4px;
        background-color: ${bgColor};
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.3s;
    `;
    return button;
}

// Function to get the current song
function getCurrentSong() {
    const titleElement = document.querySelector('ytmusic-player-bar yt-formatted-string.title');

    if (titleElement?.getAttribute('title')) {
        const title = titleElement.getAttribute('title').trim();
        const subtitleElement = document.querySelector('ytmusic-player-bar yt-formatted-string.complex-string');
        const subtitleLinks = subtitleElement?.querySelectorAll('a');

        const artist = subtitleLinks[0]?.textContent.trim();
        const album = subtitleLinks[1]?.textContent.trim();
        const year = subtitleLinks[2]?.textContent.trim();

        return { title, artist, album, year };
    } else {
        console.log('Current song not found');
        return null;
    }
}

function fetchAndDisplayLyrics(url) {
    console.log('Fetching lyrics from:', url);
    if (!url.startsWith('https://utaten.com')) {
        alert('Please enter a valid Utaten URL');
        return;
    }

    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
            console.log('Response received:', response.status);
            if (response.status === 200) {
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(response.responseText, 'text/html');
                const lyricsElement = htmlDoc.querySelector('.hiragana');
                if (lyricsElement) {
                    console.log('Lyrics element found');
                    displayLyrics(lyricsElement);

                    const currentSong = getCurrentSong();
                    if (currentSong) {
                        localStorage.setItem(`utatenUrl_${currentSong.artist}-${currentSong.title}`, url);
                    }
                } else {
                    console.log('Lyrics element not found');
                    displayLyrics('Lyrics not found on the page.');
                }
            } else {
                console.log('Failed to fetch lyrics');
                displayLyrics('Failed to fetch lyrics. Please try again.');
            }
        },
        onerror: function (error) {
            console.error('Error fetching lyrics:', error);
            displayLyrics('Error fetching lyrics: ' + error);
        }
    });
}

function displayLyrics(lyricsElement) {
    const lyricsDisplay = document.getElementById('lyrics-display');
    if (!lyricsDisplay) {
        console.error('Lyrics display element not found');
        return;
    }
    lyricsDisplay.innerHTML = '';

    if (typeof lyricsElement === 'string') {
        lyricsDisplay.textContent = lyricsElement;
        return;
    }

    console.log('Displaying lyrics');

    const lines = lyricsElement.innerHTML.split('<br>');

    lines.forEach((line, index) => {
        console.log(`Processing line ${index}:`, line);
        const lineDiv = document.createElement('div');
        lineDiv.style.marginBottom = '10px';

        const tempElement = document.createElement('div');
        tempElement.innerHTML = line;

        tempElement.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                lineDiv.appendChild(document.createTextNode(node.textContent));
            } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('ruby')) {
                const ruby = document.createElement('ruby');
                const rbElement = node.querySelector('.rb');
                const rtElement = node.querySelector('.rt');

                if (rbElement) {
                    ruby.appendChild(document.createTextNode(rbElement.textContent));
                }
                if (rtElement) {
                    const rt = document.createElement('rt');
                    rt.textContent = rtElement.textContent;
                    rt.style.fontSize = '0.6em';
                    ruby.appendChild(rt);
                }

                lineDiv.appendChild(ruby);
            }
        });

        lyricsDisplay.appendChild(lineDiv);
    });

    console.log('Lyrics displayed');
}

function clearLyrics() {
    console.log('Clearing lyrics');
    const lyricsDisplay = document.getElementById('lyrics-display');
    if (lyricsDisplay) {
        lyricsDisplay.innerHTML = '';
        console.log('Lyrics cleared');
    } else {
        console.log('Lyrics display element not found');
    }
}