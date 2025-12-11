import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { initDB } from "./connexionBDD.js";

const app = express();
const port = 8080;
const connection = await initDB();

// Pour pouvoir utiliser __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir le dossier Front en statique
app.use(express.static(path.join(__dirname, "../Front")));

// Page d'accueil
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/index.html"));
});

app.get("/inscription", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/inscription_personnelle.html"));
});
app.get("/connexion", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/login.html"));
});
app.get("/Creation_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/inscription_association.html"));
});

app.get("/Formulaire_de_creation", (req, res) => {
  console.log(path.join(__dirname, "../Front/form-association.html"));
  res.sendFile(path.join(__dirname, "../Front/form-association.html"));
});

// ===============================
//  Lancement du serveur
// ===============================

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


// ===============================
//  ROUTES ASSOCIATION
// ===============================

// Récupérer une association
app.get("/api/associations/:id", async (req, res) => {
  const id = req.params.id;

  const [rows] = await db.query(
    "SELECT * FROM association WHERE id_association = ?",
    [id]
  );

  res.json(rows[0] || {});
});

// Récupérer le conseil du club
app.get("/api/associations/:id/conseil", async (req, res) => {
  const id = req.params.id;

  const [rows] = await db.query(
    `SELECT m.id_membre, m.nom, m.prenom, ma.role, ma.conseil_asso
     FROM membre_asso ma
     JOIN membre m ON ma.id_membre = m.id_membre
     WHERE ma.id_association = ? AND ma.conseil_asso = 1`,
    [id]
  );

  res.json(rows);
});

// Récupérer tous les membres d'une association
app.get("/api/associations/:id/membres", async (req, res) => {
  const id = req.params.id;

  const [rows] = await db.query(
    `SELECT m.id_membre, m.nom, m.prenom, ma.role
     FROM membre_asso ma
     JOIN membre m ON ma.id_membre = m.id_membre
     WHERE ma.id_asso = ?`,
    [id]
  );

  res.json(rows);
});

// ===============================
//  ROUTES EVENEMENTS
// ===============================

// Événements d'une association (à venir)
app.get("/api/associations/:id/events", async (req, res) => {
  const id = req.params.id;

  const [rows] = await db.query(
    `SELECT * FROM evenement
     WHERE id_association = ? AND date_debut_event >= NOW()
     ORDER BY date_debut_event ASC`,
    [id]
  );

  res.json(rows);
});

// Création d'un événement (ADMIN)
app.post("/api/evenements", async (req, res) => {
  const {
    id_association,
    titre_evenement,
    type_evenement,
    description_evenement,
    lieu_event,
    date_debut_event,
    date_fin_event
  } = req.body;

  // 1. Insérer l'événement
  const [eventResult] = await db.query(
    `INSERT INTO evenement 
     (id_association, titre_evenement, type_evenement, description_evenement, lieu_event, date_debut_event, date_fin_event)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id_association, titre_evenement, type_evenement, description_evenement, lieu_event, date_debut_event, date_fin_event]
  );

  const eventId = eventResult.insertId;

  // 2. Créer automatiquement une actualité associée
  await db.query(
    `INSERT INTO actualite 
     (id_association, type_actualite, titre, contenu, date_creation, date_publication, statut, id_evenement, event_date)
     VALUES (?, 'Evenement', ?, ?, NOW(), NOW(), 'Approuve', ?, ?)`,
    [id_association, titre, description, eventId, date_debut]
  );

  res.json({ success: true, eventId });
});
// ===============================
//  ROUTES ACTUALITÉS
// ===============================

// Récupérer actualités d'une association
app.get("/api/associations/:id/news", async (req, res) => {
  const id = req.params.id;

  const [rows] = await db.query(
    `SELECT *
     FROM actualite
     WHERE id_association = ?
       AND statut = 'Approuve'
       AND (
            type_actualite = 'Article'
            OR (type_actualite = 'Evenement' AND event_date >= NOW())
           )
     ORDER BY date_publication DESC`,
    [id]
  );

  res.json(rows);
});

// Membre propose une actualité → statut pending
app.post("/api/news", async (req, res) => {
  const { id_association, id_auteur, titre, contenu, image_principale } = req.body;

  await db.query(
    `INSERT INTO actualite 
     (id_association, id_auteur, type_actualite, titre, contenu, image_principale, statut, date_creation)
     VALUES (?, ?, 'Article', ?, ?, ?, 'Pending', NOW())`,
    [id_asso, id_auteur, titre, contenu, image_principale]
  );

  res.json({ success: true });
});

// Admin valide une actu
app.patch("/api/news/:id/approve", async (req, res) => {
  const id = req.params.id;

  await db.query(
    `UPDATE actualite
     SET statut = 'Approuve', date_publication = NOW()
     WHERE id_actualite = ?`,
    [id]
  );

  res.json({ success: true });
});

// Admin refuse une actu
app.patch("/api/news/:id/refuse", async (req, res) => {
  const id = req.params.id;

  await db.query(
    `UPDATE actualite SET statut = 'Refuse' WHERE id_actualite = ?`,
    [id]
  );

  res.json({ success: true });
});


