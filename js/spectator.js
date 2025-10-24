/* ---------------- SPECTATOR CONSOLE MODULE ---------------- */
/* This module handles the spectator console for logging, filtering, and debugging.
   It captures console.* calls and displays them in a UI panel. */

(function() {
    // Initialize spectator state
    window.__spectator = window.__spectator || { logs: [], max: 5000, filter: 'all' };

    // Helper to format arguments for logging
    function fmtArgs(args) {
        return args.map(a => {
            try {
                if (typeof a === 'object') return JSON.stringify(a);
                return String(a);
            } catch (e) {
                return '[object]';
            }
        }).join(' ');
    }

    // Render logs in the spectator console based on current filter
    function renderLogs() {
        const container = document.getElementById('spectator-console');
        if (!container) return;
        const f = window.__spectator.filter;
        const visible = window.__spectator.logs.filter(l => f === 'all' ? true : l.level === f.toUpperCase());
        container.innerHTML = visible.map(l => {
            const time = `<span class="log-TIME">[${l.time}]</span>`;
            const level = `<span class="log-${l.level}">${l.level}</span>`;
            const text = `<span class="log-${l.level}" style="margin-left:6px;">${l.text}</span>`;
            return `<div class="log-line">${time} ${level} ${text}</div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    }

    // Push a log entry to the spectator console and forward to original console
    function pushLog(level, ...args) {
        const time = new Date().toLocaleTimeString();
        const text = fmtArgs(args);
        window.__spectator.logs.push({ time, level: level.toUpperCase(), text });
        if (window.__spectator.logs.length > window.__spectator.max) window.__spectator.logs.shift();
        renderLogs();
        // Forward to original devtools console
        if (originalConsole[level]) originalConsole[level].apply(console, args);
    }

    // Store original console methods
    const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };

    // Override console methods to capture logs
    console.log = function(...args) { pushLog('log', ...args); };
    console.info = function(...args) { pushLog('info', ...args); };
    console.warn = function(...args) { pushLog('warn', ...args); };
    console.error = function(...args) { pushLog('error', ...args); };

    // Initialize spectator UI on DOM load
    document.addEventListener('DOMContentLoaded', () => {
        const btnAll = document.getElementById('filter-all');
        const btnLog = document.getElementById('filter-log');
        const btnInfo = document.getElementById('filter-info');
        const btnWarn = document.getElementById('filter-warn');
        const btnError = document.getElementById('filter-error');
        const btnClear = document.getElementById('clear-logs');
        const btnDownload = document.getElementById('download-logs');
        const btnCollapse = document.getElementById('collapse-spec');
        const collapsedBtn = document.getElementById('spectator-collapsed');

        // Helper to set active filter button
        function setActive(button) {
            [btnAll, btnLog, btnInfo, btnWarn, btnError].forEach(b => b.classList.remove('active'));
            if (button) button.classList.add('active');
        }

        // Event listeners for filter buttons
        btnAll.addEventListener('click', () => { window.__spectator.filter = 'all'; setActive(btnAll); renderLogs(); });
        btnLog.addEventListener('click', () => { window.__spectator.filter = 'log'; setActive(btnLog); renderLogs(); });
        btnInfo.addEventListener('click', () => { window.__spectator.filter = 'info'; setActive(btnInfo); renderLogs(); });
        btnWarn.addEventListener('click', () => { window.__spectator.filter = 'warn'; setActive(btnWarn); renderLogs(); });
        btnError.addEventListener('click', () => { window.__spectator.filter = 'error'; setActive(btnError); renderLogs(); });

        // Clear logs
        btnClear.addEventListener('click', () => { window.__spectator.logs = []; renderLogs(); });

        // Download logs as text file
        btnDownload.addEventListener('click', () => {
            const text = window.__spectator.logs.map(l => `[${l.time}] ${l.level} ${l.text}`).join('\n');
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiprend-logs-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });

        // Collapse/expand spectator panel
        btnCollapse.addEventListener('click', () => {
            document.getElementById('spectator-panel').style.display = 'none';
            collapsedBtn.style.display = 'block';
        });
        collapsedBtn.addEventListener('click', () => {
            document.getElementById('spectator-panel').style.display = 'flex';
            collapsedBtn.style.display = 'none';
        });

        renderLogs();
    });

    // Global helper to push logs from other modules
    window.spectatorPush = function(level, ...args) {
        if (!['log','info','warn','error'].includes(level)) level = 'log';
        pushLog(level, ...args);
    };
})(); // End spectator module