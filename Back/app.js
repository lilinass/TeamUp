import cors from "cors";
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
app.use(cors());
// Page d'accueil

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/index.html"));
});

app.get("/inscription", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/inscription_personnelle.html"));
});
app.get("/connexion", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/login.html"));
});
app.get("/inscription_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/inscription_association.html"));
});

app.get("/design_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/design.association.html"));
});

app.get("/success_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/success.association.html"));
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
     WHERE ma.id_association = ?`,
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




// Route d'inscription membre
// Route d'inscription membre
app.post("/api/inscription", async (req, res) => {
  const { nom, prenom, email, password, birthday } = req.body;

  if (!nom || !prenom || !email || !password || !birthday) {
    return res.status(400).json({ message: "Champs manquants." });
  }

  try {
    // Vérification si email existe déjà
    const [existingUser] = await connection.execute(
      "SELECT id_membre FROM membre WHERE mail_membre = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Utilisateur déjà existant" });
    }

    // Calcul de l’âge
    const age = new Date().getFullYear() - new Date(birthday).getFullYear();

    const [result] = await connection.execute(
      `INSERT INTO membre (nom_membre, prenom_membre, mail_membre, password_membre, date_naissance, age)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, password, birthday, age]
    );

    // Réponse OK → le frontend fera la redirection
    return res.status(201).json({
      message: "Utilisateur créé",
      id: result.insertId,
    });

  } catch (err) {
    console.error("Erreur SQL :", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/api/association", async (req, res) => {
  const {
    nom,
    type_structure,
    sport,
    adresse,
    adresse_2,
    description,
    date_creation,
    code_postal,
    ville,
    pays,
    image
    
  } = req.body;

  // Couleurs par défaut à modifier à l'étape design
  const couleur_1 = "#000000";
  const couleur_2 = "#000000";

  // Vérification des champs obligatoires
  if (!nom || !type_structure || !sport || !adresse || !date_creation || !code_postal || !ville || !pays) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  try {
    const [result] = await connection.execute(
      `INSERT INTO association 
      (nom, type_structure, sport, adresse, adresse_2, description, date_creation, image, code_postal, ville, pays, couleur_1, couleur_2)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nom,
        type_structure,
        sport,
        adresse,
        adresse_2 || "",
        description || "",
        date_creation,
        image || "",
        code_postal,
        ville,
        pays,
        couleur_1,
        couleur_2
      ]
    );

    const idAssociation = result.insertId;
const idMembre = req.body.id_membre; // à envoyer depuis le front

await connection.execute(
  `
 
    INSERT INTO membre_asso (
    role,
    date_adhesion,
    id_association,
    id_membre,
    conseil_asso
  )
  VALUES (?, CURDATE(), ?, ?, ?)
  `,
  [
    "membre",
    idAssociation,
    idMembre,
    "membre"
  ]
);

    res.status(201).json({
      message: "Informations enregistrées",
      id_association: result.insertId
    });

  } catch (err) {
    console.error("Erreur SQL :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/api/association/design/:id", async (req, res) => {
  const { couleur_1, couleur_2, image } = req.body;
  const id = req.params.id;

  if (!couleur_1 || !couleur_2) {
    return res.status(400).json({ message: "Couleurs manquantes." });
  }

  try {
    await connection.execute(
      `UPDATE association 
       SET couleur_1 = ?, couleur_2 = ?, image = ?
       WHERE id_association = ?`,
      [couleur_1, couleur_2, image || "", id]
    );

    return res.status(200).json({ message: "Design mis à jour." });

  } catch (err) {
    console.error("Erreur SQL :", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Route de connexion
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
      return res.status(404).json({ message: "Aucun compte trouvé avec cet email." });
    }

    const user = rows[0];

    if (user.password_membre !== password) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    return res.status(200).json({
      message: "Connexion réussie",
      id_membre: user.id_membre,
      nom: user.nom_membre,
      prenom: user.prenom_membre
    });

  } catch (err) {
    console.error("Erreur SQL :", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

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

app.put("/api/membre/:id", async (req, res) => {
  const id = req.params.id;
  const { nom, prenom, email, birthday } = req.body;

  try {
    // recalcul de l’âge si la date change
    let age = null;
    if (birthday) {
      age = new Date().getFullYear() - new Date(birthday).getFullYear();
    }

    const [result] = await connection.execute(
      `UPDATE membre SET 
        nom_membre = ?, 
        prenom_membre = ?, 
        mail_membre = ?, 
        date_naissance = ?, 
        age = ?
       WHERE id_membre = ?`,
      [nom, prenom, email, birthday, age, id]
    );

    res.json({ message: "Profil mis à jour", result });

  } catch (err) {
    console.error("Erreur SQL lors du PUT membre :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.get("/api/membre/:id/equipes", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await connection.execute(
      `SELECT 
          e.nom_equipe, 
          a.role_activite AS role
       FROM membre_activite a
       JOIN equipe e ON a.id_equipe = e.id_equipe
       JOIN membre_asso ma ON ma.id_membre_asso = a.id_membre_asso
       WHERE ma.id_membre = ?`,
      [id]
    );

    res.json(rows);

  } catch (error) {
    console.error("Erreur SQL GET équipes :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


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

app.get("/home_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/home_association.html"));
});

// Association du membre
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
    console.error("Erreur SQL association du membre :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/events_page", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/events_page.html"));
});

app.get("/membre", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/membre.html"));
});

app.use(express.static(path.join(__dirname, "../Front")));