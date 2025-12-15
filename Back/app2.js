import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { initDB } from "./connexionBDD.js";

const app = express();
const port = 8080;

// Init DB
const connection = await initDB();

// Pour pouvoir utiliser __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ======================================================================
// 🔵 ROUTES FRONT (pages HTML) — doivent toujours être AVANT le static !
// ======================================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/index.html"));
});

app.get("/connexion", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/login.html"));
});

app.get("/inscription", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/inscription_personnelle.html"));
});

app.get("/inscription_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/inscription_association.html"));
});

app.get("/Formulaire_de_creation", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/form-association.html"));
});

app.get("/design_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/design.association.html"));
});

app.get("/success_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/success.association.html"));
});

app.get("/home_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/home_association.html"));
});

app.get("/membre", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/membre.html"));
});

app.get("/events_page", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/events_page.html"));
});


// ======================================================================
// 🔵 ROUTES API — tout ce qui est backend / SQL
// ======================================================================

// Récupérer l'association d'un membre
app.get("/api/membre/:id/association", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await connection.execute(
      `SELECT a.*
       FROM membre_asso ma
       JOIN association a ON ma.id_asso = a.id_association
       WHERE ma.id_membre = ?`,
      [id]
    );

    res.json(rows[0] || {});
  } catch (err) {
    console.error("Erreur SQL association :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Infos membre
app.get("/api/membre/:id", async (req, res) => {
  const id = req.params.id;

  const [info] = await connection.execute(
    `SELECT m.*, ma.role AS role_asso, ma.date_adhesion, e.nom_equipe
     FROM membre m
     LEFT JOIN membre_asso ma ON m.id_membre = ma.id_membre
     LEFT JOIN membre_activite a ON ma.id_membre_asso = a.id_membre_asso
     LEFT JOIN equipe e ON a.id_equipe = e.id_equipe
     WHERE m.id_membre = ?`,
    [id]
  );

  res.json(info[0] || {});
});

// Modifier profil membre
app.put("/api/membre/:id", async (req, res) => {
  const id = req.params.id;
  const { nom, prenom, email, telephone, birthday } = req.body;

  await connection.execute(
    `UPDATE membre SET 
      nom_membre=?, prenom_membre=?, mail_membre=?, telephone_membre=?, date_naissance=?
     WHERE id_membre=?`,
    [nom, prenom, email, telephone, birthday, id]
  );

  res.json({ message: "Profil mis à jour" });
});

// Listes équipes membre
app.get("/api/membre/:id/equipes", async (req, res) => {
  const id = req.params.id;

  const [rows] = await connection.execute(
    `SELECT e.nom_equipe, a.role
     FROM membre_activite a
     JOIN equipe e ON a.id_equipe = e.id_equipe
     JOIN membre_asso ma ON ma.id_membre_asso = a.id_membre_asso
     WHERE ma.id_membre = ?`,
    [id]
  );

  res.json(rows);
});

// Présences
app.get("/api/membre/:id/presences", async (req, res) => {
  const id = req.params.id;

  const [rows] = await connection.execute(
    `SELECT a.nom_activite, p.statut, p.date_presence
     FROM presence p
     JOIN activite a ON p.id_activite = a.id_activite
     WHERE p.id_membre = ?`,
    [id]
  );

  res.json(rows);
});

// Inscription membre
app.post("/api/inscription", async (req, res) => {
  const { nom, prenom, email, password, birthday } = req.body;

  if (!nom || !prenom || !email || !password || !birthday) {
    return res.status(400).json({ message: "Champs manquants." });
  }

  try {
    const [existingUser] = await connection.execute(
      "SELECT id_membre FROM membre WHERE mail_membre = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Utilisateur déjà existant" });
    }

    const age = new Date().getFullYear() - new Date(birthday).getFullYear();

    const [result] = await connection.execute(
      `INSERT INTO membre (nom_membre, prenom_membre, mail_membre, password_membre, date_naissance, age)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, password, birthday, age]
    );

    res.status(201).json({ message: "Utilisateur créé", id: result.insertId });

  } catch (err) {
    console.error("Erreur SQL :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Connexion
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Champs manquants." });
  }

  try {
    const [rows] = await connection.execute(
      "SELECT * FROM membre WHERE mail_membre = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Aucun compte trouvé." });
    }

    const user = rows[0];

    if (user.password_membre !== password) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    res.status(200).json({
      message: "Connexion réussie",
      id_membre: user.id_membre,
      nom: user.nom_membre,
      prenom: user.prenom_membre
    });

  } catch (err) {
    console.error("Erreur SQL :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Création association
app.post("/api/association", async (req, res) => {
  const {
    nom, type_structure, sport, adresse, adresse_2,
    description, date_creation, code_postal, ville, pays, image
  } = req.body;

  if (!nom || !type_structure || !sport || !adresse || !date_creation || !code_postal || !ville || !pays) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  const couleur_1 = "#000000";
  const couleur_2 = "#000000";

  try {
    const [result] = await connection.execute(
      `INSERT INTO association 
      (nom, type_structure, sport, adresse, adresse_2, description, date_creation, image,
       code_postal, ville, pays, couleur_1, couleur_2)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nom, type_structure, sport, adresse, adresse_2 || "", description || "",
        date_creation, image || "", code_postal, ville, pays, couleur_1, couleur_2
      ]
    );

    res.status(201).json({
      message: "Association créée",
      id_association: result.insertId
    });

  } catch (err) {
    console.error("Erreur SQL :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Update design association
app.put("/api/association/design/:id", async (req, res) => {
  const { couleur_1, couleur_2, image } = req.body;
  const id = req.params.id;

  if (!couleur_1 || !couleur_2) {
    return res.status(400).json({ message: "Couleurs manquantes." });
  }

  try {
    await connection.execute(
      `UPDATE association SET couleur_1=?, couleur_2=?, image=? WHERE id_association=?`,
      [couleur_1, couleur_2, image || "", id]
    );

    res.status(200).json({ message: "Design mis à jour." });
  } catch (err) {
    console.error("Erreur SQL :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// ======================================================================
// 🔵 STATIC FILES (toujours à la fin avant listen())
// ======================================================================
app.use(express.static(path.join(__dirname, "../Front")));


// ======================================================================
// 🔵 Lancement du serveur — DOIT ÊTRE TOUT EN BAS
// ======================================================================
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
