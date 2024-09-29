// ==UserScript==
// @name            聚財網融資融券前200名股票表格
// @icon            https://stock.wearn.com/favicon.ico
// @namespace       https://github.com/leVirve/
// @version         0.5
// @description     顯示聚財網融資增加前200名與融券增加前200名的表格，並突出顯示相同的股票名稱。
// @author          Salas (leVirve)
// @match           https://stock.wearn.com/cadd.asp
// @match           https://stock.wearn.com/dadd.asp
// @grant           GM_xmlhttpRequest
// @grant           GM_addStyle
// @license         MIT
// @homepageURL     https://github.com/leVirve/Userscripts
// ==/UserScript==

(function () {
    'use strict';

    // Create a container for the combined tables
    const container = document.createElement('div');
    container.id = 'combined-tables';
    document.querySelector('div.stocktablewrap').append(container);

    // Append the current table
    const currentTable = document.querySelector('table');
    container.appendChild(currentTable);

    // Function to fetch and display the table from the other page
    function fetchTable(url) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            responseType: 'arraybuffer',
            onload: function (response) {
                try {
                    const html = new TextDecoder('big5').decode(new Uint8Array(response.response));
                    const table = new DOMParser().parseFromString(html, 'text/html').querySelector('table');
                    if (table) {
                        container.appendChild(table);
                        highlightMatchingStocks(currentTable, table);
                    } else {
                        console.error('Table not found in the response.');
                    }
                } catch (error) {
                    console.error('Error parsing response:', error);
                }
            },
            onerror: () => console.error('Failed to fetch the table.')
        });
    }

    // Function to highlight matching stocks
    function highlightMatchingStocks(table1, table2) {
        const stocks1 = Array.from(table1.querySelectorAll('tr')).slice(3, 203).map(row => row.cells[1]?.textContent.trim());
        const rows2 = table2.querySelectorAll('tr');

        rows2.forEach(row => {
            const stockName = row.cells[1]?.textContent.trim();
            if (stocks1.includes(stockName)) {
                row.style.backgroundColor = '#d1e7dd';
                const matchingRow = Array.from(table1.querySelectorAll('tr')).slice(3, 203).find(r => r.cells[1]?.textContent.trim() === stockName);
                if (matchingRow) {
                    matchingRow.style.backgroundColor = '#d1e7dd';
                }
            }
        });
    }

    // Fetch the table from the other page
    fetchTable(window.location.href.includes('cadd.asp') ? 'https://stock.wearn.com/dadd.asp' : 'https://stock.wearn.com/cadd.asp');

    // Add styles for the combined tables
    GM_addStyle(`
        #combined-tables {
            display: flex; /* Use flexbox to display tables side by side */
            margin: 20px;
            padding: 10px;
        }
        #combined-tables table {
            width: 50%; /* Set each table to take half the width */
            border-collapse: collapse;
            margin-right: 10px; /* Add some space between tables */
        }
        #combined-tables table:last-child {
            margin-right: 0; /* Remove margin from the last table */
        }
        #combined-tables th, #combined-tables td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        /* Sticky header styles */
        tr.top th, tr.topth th {
            background-color: #eee; /* Sticky header background color */
        }
        /* Highlighted rows */
        tr.highlight {
            background-color: #d1e7dd; /* Soft green highlight color */
        }
    `);
})();
