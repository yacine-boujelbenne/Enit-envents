const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const mysql = require("mysql2/promise");

const app = express();


const { OpenAI } = require('openai');
require('dotenv').config();


// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configuration de Multer
const upload = multer({ dest: 'uploads/' });

// Configuration de la base de données
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'enit_event_db'
};

let pool;

async function initDB() {
    try {
        // Create pool
        pool = mysql.createPool(dbConfig);

        // Create table if not exists
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS enit_events (
                id BIGINT PRIMARY KEY,
                titre VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                lieu VARCHAR(255),
                categorie VARCHAR(50),
                description TEXT,
                adresse VARCHAR(255),
                lat VARCHAR(255),
                lng VARCHAR(255),
                affiche VARCHAR(255),
                fiche VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.query(createTableQuery);
        console.log(" Base de données MySQL prête");
    } catch (err) {
        console.error(" Erreur MySQL Détails:", err);
        console.log(" Assurez-vous que XAMPP/MySQL est lancé et que la base 'enit_event_db' existe.");
    }
}

initDB();

app.get('/events', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM enit_events ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/events', upload.fields([
    { name: 'affiche', maxCount: 1 },
    { name: 'fiche', maxCount: 1 }
]), async (req, res) => {
    try {
        const newEvent = {
            id: Date.now(),
            titre: req.body.titre,
            date: req.body.date,
            lieu: req.body.lieu,
            categorie: req.body.categorie || 'forum',
            description: req.body.description,
            adresse: req.body.adresse || '',
            lat: req.body.lat || null,
            lng: req.body.lng || null,
            affiche: req.files?.affiche ? req.files.affiche[0].filename : null,
            fiche: req.files?.fiche ? req.files.fiche[0].filename : null
        };

        const query = `
            INSERT INTO enit_events 
            (id, titre, date, lieu, categorie, description, adresse, lat, lng, affiche, fiche) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            newEvent.id, newEvent.titre, newEvent.date, newEvent.lieu,
            newEvent.categorie, newEvent.description, newEvent.adresse,
            newEvent.lat, newEvent.lng, newEvent.affiche, newEvent.fiche
        ];

        await pool.query(query, values);
        console.log('✅ Événement enregistré en BDD:', newEvent.titre);
        res.status(201).json(newEvent);
    } catch (err) {
        console.error("Erreur insertion:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/events/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM enit_events WHERE id = ?", [req.params.id]);
        res.json({ message: 'Supprimé' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// ... existing code ...

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get an available model
async function getGenerativeModel() {
    try {
        // Try standard models in order
        const candidates = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro"];
        for (const name of candidates) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                // Light check
                await model.generateContent("Test"); 
                console.log(`✅ Using Model: ${name}`);
                return model;
            } catch (e) {
                // Continue to next candidate
            }
        }
        // If specific ones fail, try standard 'gemini-pro' as last resort without check
        return genAI.getGenerativeModel({ model: "gemini-pro" });
    } catch (e) {
        return genAI.getGenerativeModel({ model: "gemini-pro" });
    }
}

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    try {
        // Fetch events for context
        const [rows] = await pool.query("SELECT * FROM enit_events");
        const eventsContext = rows.map(e => 
            `- ${e.titre} (${e.date}) à ${e.lieu}: ${e.description}`
        ).join('\n');

        const systemPrompt = `Tu es un assistant virtuel pour l'ENIT (Ecole Nationale d'Ingénieurs de Tunis).
        Voici la liste des événements à venir :
        ${eventsContext}
        
        Réponds aux questions des utilisateurs sur ces événements de manière courtoise et informative.
        Si la réponse n'est pas dans la liste, dis que tu ne sais pas.`;

        // Get working model
        const model = await getGenerativeModel();
        
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "Compris. Je suis prêt." }],
                },
            ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = await response.text();

        res.json({ response: text });

    } catch (error) {
        console.error("Gemini Error:", error);

        // FALLBACK LOGIC (Offline Mode)
        try {
            console.log("⚠️ Switching to Offline Fallback");
            const [rows] = await pool.query("SELECT * FROM enit_events");
            const lowerMsg = message.toLowerCase();
            
            const matches = rows.filter(e => 
                e.titre.toLowerCase().includes(lowerMsg) || 
                e.description?.toLowerCase().includes(lowerMsg) ||
                e.categorie?.toLowerCase().includes(lowerMsg)
            );

            if (matches.length > 0) {
                const responseText = "⚠️ **Mode Hors-Ligne (Erreur IA)**\n\nVoici les événements trouvés :\n\n" + 
                    matches.map(e => `🔹 **${e.titre}**\n📅 ${e.date} | 📍 ${e.lieu}\n📝 ${e.description}`).join('\n\n');
                res.json({ response: responseText });
            } else {
                res.json({ response: "⚠️ **Mode Hors-Ligne**\n\nJe ne peux pas joindre l'IA pour le moment et aucun événement ne correspond à votre recherche." });
            }
        } catch (dbError) {
            res.status(500).json({ error: "Service indisponible." });
        }
    }
});

app.listen(3000, () => console.log('✅ Serveur sur port 3000'));
