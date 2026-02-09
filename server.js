const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const mysql = require("mysql2/promise");

const app = express();


// Middlewares
require('dotenv').config();


// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configuration de Multer
const upload = multer({ dest: 'uploads/' });

// Admin list (Hardcoded by email)
const ADMIN_EMAILS = ['admin@enit.tn', 'yacine@enit.tn'];

// Configuration de la base de données
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'enit_event_db',
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
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

        const createUsersTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.query(createUsersTableQuery);

        const createParticipationTableQuery = `
            CREATE TABLE IF NOT EXISTS participation (
                user_email VARCHAR(255),
                event_id BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_email, event_id),
                FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
                FOREIGN KEY (event_id) REFERENCES enit_events(id) ON DELETE CASCADE
            )
        `;
        await pool.query(createParticipationTableQuery);
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
    console.log("[EVENT] Received new event request:", req.body);
    console.log("[EVENT] Received files:", req.files ? Object.keys(req.files) : "none");
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

// End of event endpoints


const bcrypt = require('bcrypt');
const session = require('express-session');

// Add session middleware after other middlewares
app.use(session({
    secret: 'bouja',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// SIGN UP
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
        );
        res.status(201).json({ message: "Compte créé !" });
    } catch (error) {
        res.status(500).json({ error: "Email ou pseudo déjà utilisé." });
    }
});

// SIGN IN
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.status(401).json({ error: "Utilisateur non trouvé" });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Mot de passe incorrect" });

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;
        const normalizedEmail = user.email.trim().toLowerCase();
        const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail);
        console.log(`[AUTH] Login success: ${user.email} -> isAdmin: ${isAdmin}`);
        console.log(`[AUTH] Compared against: ${JSON.stringify(ADMIN_EMAILS)}`);
        res.json({ username: user.username, isAdmin });
    } catch (error) {
        console.error("[AUTH] Login error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get('/debug-users', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, username, email FROM users");
        res.json({ admins: ADMIN_EMAILS, users: rows });
    } catch (e) { res.status(500).send(e.message); }
});

// GET CURRENT USER / SESSION
app.get('/me', (req, res) => {
    if (req.session.userId) {
        const email = req.session.email || "";
        const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
        console.log(`[Session] User: ${req.session.username}, Email: ${email}, isAdmin: ${isAdmin}`);
        res.json({ 
            loggedIn: true, 
            username: req.session.username,
            isAdmin
        });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Déconnecté" });
});

app.post('/participate', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Veuillez vous connecter" });

    const { eventId } = req.body;
    const email = req.session.email;

    try {
        await pool.query(
            "INSERT INTO participation (user_email, event_id) VALUES (?, ?)",
            [email, eventId]
        );
        res.json({ message: "Participation enregistrée !" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: "Vous participez déjà à cet événement" });
        } else {
            console.error("[PARTICIPATE] Error:", error);
            res.status(500).json({ error: "Erreur lors de l'enregistrement" });
        }
    }
});

app.listen(3000, () => console.log('✅ Serveur sur port 3000'));
