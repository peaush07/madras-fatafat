const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global Shared System Database State
let resultsDatabase = [
    {
        date: "2026-05-28",
        results: [
            { baji: 1, number: "136", single: "0" },
            { baji: 2, number: "260", single: "8" },
            { baji: 3, number: "", single: "" },
            { baji: 4, number: "", single: "" },
            { baji: 5, number: "", single: "" },
            { baji: 6, number: "", single: "" },
            { baji: 7, number: "", single: "" },
            { baji: 8, number: "", single: "" },
            { baji: 9, number: "", single: "" },
            { baji: 10, number: "", single: "" },
            { baji: 11, number: "", single: "" },
            { baji: 12, number: "", single: "" }
        ]
    }
];

let environmentConfig = {
    gameStatus: "ON",
    tickerText: "Welcome to Madras Fatafat! Play responsibly. Real-time scheduled automated release of 12 complete Baji slots daily.",
    appDownloadLink: "https://github.com",
    adsText: "Download the Madras Fatafat official application to access lightning-fast updates, expert advice, and advanced metrics instantly.",
    adminPasswordHash: "iambadasgood", // NEW UPDATED PASSWORD
    recoveryAnswer: "chennai"
};

// Middleware to protect admin routes
function verifyAdminToken(req, res, next) {
    const { password } = req.body;
    if (password === environmentConfig.adminPasswordHash) {
        next();
    } else {
        res.status(401).json({ error: "Access Denied: Invalid Administrative Credentials." });
    }
}

// PUBLIC ENDPOINT: Fetch state information
app.get('/api/state', (req, res) => {
    res.json({ resultsDatabase, environmentConfig });
});

// SECURE ADMIN ENDPOINTS
app.post('/api/admin/save-slot', verifyAdminToken, (req, res) => {
    const { dateKey, bajiId, pannaValue, singleValue } = req.body;
    
    let dayRecord = resultsDatabase.find(r => r.date === dateKey);
    if (!dayRecord) {
        dayRecord = {
            date: dateKey,
            results: Array.from({ length: 12 }, (_, i) => ({ baji: i + 1, number: "", single: "" }))
        };
        resultsDatabase.push(dayRecord);
    }

    const targetIndex = dayRecord.results.findIndex(s => s.baji === parseInt(bajiId));
    if (targetIndex !== -1) {
        dayRecord.results[targetIndex].number = pannaValue;
        dayRecord.results[targetIndex].single = singleValue;
    }

    resultsDatabase.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, resultsDatabase });
});

app.post('/api/admin/save-global', verifyAdminToken, (req, res) => {
    const { gameStatus, tickerText, appDownloadLink, adsText } = req.body;
    environmentConfig.gameStatus = gameStatus;
    environmentConfig.tickerText = tickerText;
    environmentConfig.appDownloadLink = appDownloadLink;
    environmentConfig.adsText = adsText;
    res.json({ success: true, environmentConfig });
});

app.post('/api/admin/purge-day', verifyAdminToken, (req, res) => {
    const { dateKey } = req.body;
    resultsDatabase = resultsDatabase.filter(r => r.date !== dateKey);
    res.json({ success: true, resultsDatabase });
});

app.post('/api/auth/recover', (req, res) => {
    const { answer } = req.body;
    if (answer && answer.trim().toLowerCase() === environmentConfig.recoveryAnswer.toLowerCase()) {
        environmentConfig.adminPasswordHash = "iambadasgood";
        res.json({ success: true, defaultPassword: "iambadasgood" });
    } else {
        res.status(403).json({ error: "Identity challenge failed." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Madras Fatafat Engine running on port ${PORT}`));
