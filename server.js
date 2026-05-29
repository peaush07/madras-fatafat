const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION CONFIGURATION ---
const MONGODB_URI = process.env.MONGODB_URI;
let isConnectedToDB = false;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log("Connected to MongoDB Cloud Database successfully! 🎉");
            isConnectedToDB = true;
            initializeConfig();
        })
        .catch(err => console.error("Database connection fault, falling back to memory mode:", err));
} else {
    console.log("Running in backup memory mode. Set MONGODB_URI on Render for permanent storage.");
}

// --- DATABASE SCHEMAS & MODELS ---
const resultSchema = new mongoose.Schema({
    date: { type: String, unique: true, required: true },
    results: [{ baji: Number, number: String, single: String }]
});
const Result = mongoose.model('Result', resultSchema);

const configSchema = new mongoose.Schema({
    key: { type: String, default: "global_config", unique: true },
    gameStatus: String,
    tickerText: String,
    appDownloadLink: String,
    adsText: String,
    adminPasswordHash: String,
    recoveryAnswer: String
});
const Config = mongoose.model('Config', configSchema);

// Memory backups if DB is not linked yet
let memDatabase = [];
let memConfig = {
    gameStatus: "ON",
    tickerText: "Welcome to Madras Fatafat! Play responsibly. Real-time scheduled automated release of 12 complete Baji slots daily.",
    appDownloadLink: "https://github.com",
    adsText: "Download the Madras Fatafat official application to access lightning-fast updates, expert advice, and advanced metrics instantly.",
    adminPasswordHash: "iambadasgood", 
    recoveryAnswer: "chennai"
};

async function initializeConfig() {
    if (!isConnectedToDB) return;
    try {
        let conf = await Config.findOne({ key: "global_config" });
        if (!conf) {
            await Config.create({ ...memConfig });
            console.log("Default configuration keys seeded in cloud ledger.");
        }
    } catch (e) { console.error("Error seeding config:", e); }
}

// --- API ROUTES ---

// FETCH SYSTEM STATE
app.get('/api/state', async (req, res) => {
    try {
        if (isConnectedToDB) {
            const dbResults = await Result.find({}).sort({ date: -1 });
            const dbConfig = await Config.findOne({ key: "global_config" });
            return res.json({ resultsDatabase: dbResults, environmentConfig: dbConfig || memConfig });
        }
        res.json({ resultsDatabase: memDatabase, environmentConfig: memConfig });
    } catch (err) {
        res.json({ resultsDatabase: memDatabase, environmentConfig: memConfig });
    }
});

// SAVE BAJI SLOT
app.post('/api/admin/save-slot', async (req, res) => {
    const { password, dateKey, bajiId, pannaValue, singleValue } = req.body;
    
    const activeConfig = isConnectedToDB ? await Config.findOne({ key: "global_config" }) : memConfig;
    if (password !== activeConfig.adminPasswordHash) {
        return res.status(401).json({ error: "Unauthorized access token." });
    }

    if (isConnectedToDB) {
        try {
            let dayRecord = await Result.findOne({ date: dateKey });
            if (!dayRecord) {
                dayRecord = new Result({
                    date: dateKey,
                    results: Array.from({ length: 12 }, (_, i) => ({ baji: i + 1, number: "", single: "" }))
                });
            }
            const idx = dayRecord.results.findIndex(s => s.baji === parseInt(bajiId));
            if (idx !== -1) {
                dayRecord.results[idx].number = pannaValue;
                dayRecord.results[idx].single = singleValue;
            }
            await dayRecord.save();
            const updatedList = await Result.find({}).sort({ date: -1 });
            return res.json({ success: true, resultsDatabase: updatedList });
        } catch (err) { return res.status(500).json({ error: "Database save error" }); }
    } else {
        let dayRecord = memDatabase.find(r => r.date === dateKey);
        if (!dayRecord) {
            dayRecord = { date: dateKey, results: Array.from({ length: 12 }, (_, i) => ({ baji: i + 1, number: "", single: "" })) };
            memDatabase.push(dayRecord);
        }
        const idx = dayRecord.results.findIndex(s => s.baji === parseInt(bajiId));
        if (idx !== -1) {
            dayRecord.results[idx].number = pannaValue;
            dayRecord.results[idx].single = singleValue;
        }
        memDatabase.sort((a, b) => new Date(b.date) - new Date(a.date));
        return res.json({ success: true, resultsDatabase: memDatabase });
    }
});

// SAVE GLOBAL SYSTEM CONTROLS
app.post('/api/admin/save-global', async (req, res) => {
    const { password, gameStatus, tickerText, appDownloadLink, adsText } = req.body;
    
    const activeConfig = isConnectedToDB ? await Config.findOne({ key: "global_config" }) : memConfig;
    if (password !== activeConfig.adminPasswordHash) {
        return res.status(401).json({ error: "Unauthorized access token." });
    }

    if (isConnectedToDB) {
        const dbConfig = await Config.findOne({ key: "global_config" });
        dbConfig.gameStatus = gameStatus;
        dbConfig.tickerText = tickerText;
        dbConfig.appDownloadLink = appDownloadLink;
        dbConfig.adsText = adsText;
        await dbConfig.save();
        return res.json({ success: true, environmentConfig: dbConfig });
    } else {
        memConfig.gameStatus = gameStatus;
        memConfig.tickerText = tickerText;
        memConfig.appDownloadLink = appDownloadLink;
        memConfig.adsText = adsText;
        return res.json({ success: true, environmentConfig: memConfig });
    }
});

// ACCOUNT RECOVERY
app.post('/api/auth/recover', async (req, res) => {
    const { answer } = req.body;
    const activeConfig = isConnectedToDB ? await Config.findOne({ key: "global_config" }) : memConfig;
    
    if (answer && answer.trim().toLowerCase() === activeConfig.recoveryAnswer.toLowerCase()) {
        if (isConnectedToDB) {
            const dbConfig = await Config.findOne({ key: "global_config" });
            dbConfig.adminPasswordHash = "iambadasgood";
            await dbConfig.save();
        } else {
            memConfig.adminPasswordHash = "iambadasgood";
        }
        res.json({ success: true, defaultPassword: "iambadasgood" });
    } else {
        res.status(403).json({ error: "Identity challenge failed." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Madras Fatafat Engine active on port ${PORT}`));
