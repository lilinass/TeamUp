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
app.use(express.static(path.join(__dirname, "../Front")));
app.use(cors());
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


//POST INSCRIPTION MEMBRE
// Permet de lire req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
