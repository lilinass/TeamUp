import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { initDB } from "./connexionBDD.js";

const app = express();
const port = 8080;

const connection = await initDB();


// ===============================
// ROLES + PERMISSIONS
// ===============================
const ALLOWED_ROLES = ["OWNER", "PRESIDENT", "SECRETAIRE", "TRESORIER", "MEMBRE"];

const ROLE_PERMISSIONS = {
  OWNER: {
    canCreateEvent: true,
    canEditEvent: true,
    canDeleteEvent: true,
    canCreateNews: true,
    canInviteMember: true,
    canApproveMember: true,
    canEditMemberRole: true,
  },
  PRESIDENT: {
    canCreateEvent: true,
    canEditEvent: true,
    canDeleteEvent: true,
    canCreateNews: true,
    canInviteMember: true,
    canApproveMember: true,
    canEditMemberRole: true,
  },
  SECRETAIRE: {
    canCreateEvent: true,
    canEditEvent: true,
    canDeleteEvent: false,
    canCreateNews: true,
    canInviteMember: true,
    canApproveMember: false,
    canEditMemberRole: false,
  },
  TRESORIER: {
    canCreateEvent: true,
    canEditEvent: true,
    canDeleteEvent: false,
    canCreateNews: true,
    canInviteMember: false,
    canApproveMember: false,
    canEditMemberRole: false,
  },
  MEMBRE: {
    canCreateEvent: false,
    canEditEvent: false,
    canDeleteEvent: false,
    canCreateNews: false,
    canInviteMember: false,
    canApproveMember: false,
    canEditMemberRole: false,
  },
};

function normalizeRole(role) {
  const r = (role || "").toUpperCase().trim();
  return ALLOWED_ROLES.includes(r) ? r : "MEMBRE";
}

async function getRoleInAssociation(id_association, id_membre) {
  const [rows] = await connection.execute(
    `SELECT role FROM membre_asso
     WHERE id_association = ? AND id_membre = ?
     LIMIT 1`,
    [Number(id_association), Number(id_membre)]
  );
  if (!rows.length) return null;
  return normalizeRole(rows[0].role);
}

async function getPermissions(id_association, id_membre) {
  const role = await getRoleInAssociation(id_association, id_membre);
  if (!role) return { role: null, permissions: ROLE_PERMISSIONS.MEMBRE };
  return { role, permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.MEMBRE };
}


// Pour pouvoir utiliser __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir le dossier Front en statique
app.use(cors());
// Permet de lire req.body

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get("/recherche_association", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/recherche_association.html"));
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

app.get("/api/associations/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await connection.execute(
      "SELECT * FROM association WHERE id_association = ?",
      [id]
    );

    res.json(rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ===============================
//  ROUTES ASSOCIATION
// ===============================

// Récupérer le conseil du club
app.get("/api/associations/:id/conseil", async (req, res) => {
  const id = req.params.id;

  const [rows] = await connection.execute(
    `SELECT m.id_membre, m.nom_membre, m.prenom_membre, ma.role, ma.conseil_asso
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

  const [rows] = await connection.execute(
    `SELECT m.id_membre, m.nom_membre, m.prenom_membre, ma.role
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

// Événements d'une association
app.get("/api/associations/:id/events", async (req, res) => {
  const id = req.params.id;

  const [rows] = await connection.execute(
    `SELECT * FROM evenement
     WHERE id_association = ?
     ORDER BY date_debut_event ASC`,
    [id]
  );

  res.json(rows);
});

// Création d'un événement (ADMIN)
app.post("/api/evenements", async (req, res) => {
  const {
    id_association,
    id_auteur,
    titre_evenement,
    type_evenement,
    description_evenement,
    lieu_event,
    date_debut_event,
    date_fin_event,
  } = req.body;

  // logs utiles
  console.log("📩 /api/evenements body =", req.body);

  if (
    !id_association ||
    !id_auteur ||
    !titre_evenement ||
    !type_evenement ||
    !date_debut_event
  ) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }
  // Sécurité : seul un rôle autorisé peut créer un event
  const { permissions } = await getPermissions(id_association, id_auteur);
  if (!permissions.canCreateEvent) {
    return res.status(403).json({ message: "Droits insuffisants pour créer un événement." });
  }

  try {
    await connection.beginTransaction();
 
    // 1) INSERT evenement
    const [evRes] = await connection.execute(
      `INSERT INTO evenement
     (id_association, titre_evenement, type_evenement, description_evenement, lieu_event, date_debut_event, date_fin_event)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(id_association),
        titre_evenement,
        type_evenement,
        description_evenement || "",
        lieu_event || "",
        date_debut_event,
        date_fin_event || null,
      ]
    );

    const id_evenement = evRes.insertId;

    // 2) INSERT actualite liée
    await connection.execute(
      `INSERT INTO actualite
     (id_association, id_auteur, type_actualite, titre, contenu, date_publication, statut, id_evenement, event_date, image_principale)
     VALUES (?, ?, 'Evenement', ?, ?, NOW(), 'Approuve', ?, ?, NULL)`,
      [
        Number(id_association),
        Number(id_auteur),
        titre_evenement,
        description_evenement || "",
        id_evenement,
        date_debut_event,
      ]
    );

    await connection.commit();

    // on renvoie l'event créé (affichage direct)
    return res.status(201).json({
      success: true,
      id_evenement,
      event: {
        id_evenement,
        id_association: Number(id_association),
        titre_evenement,
        type_evenement,
        description_evenement: description_evenement || "",
        lieu_event: lieu_event || "",
        date_debut_event,
        date_fin_event: date_fin_event || null,
      },
    });


  } catch (err) {
    await connection.rollback();
    console.error("!! Erreur création event:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }

});

//
// Permissions d'un membre dans une association
//
app.get("/api/associations/:id/permissions/:id_membre", async (req, res) => {
  const { id, id_membre } = req.params;

  try {
    const data = await getPermissions(id, id_membre);
    return res.json({
      role: data.role,               
      ...data.permissions             
    });
    const [rows] = await connection.execute(
      `SELECT role FROM membre_asso
       WHERE id_association = ? AND id_membre = ?
       LIMIT 1`,
      [id, id_membre]
    );

    if (!rows.length) return res.json({ isAdmin: false });

    const rawRole = rows[0].role || "";
    const role = rawRole.toLowerCase();

    const isAdmin =
      role.includes("président") ||
      role.includes("president") ||
      role.includes("secr") ||
      role.includes("trésorier") ||
      role.includes("tresorier") ||
      role.includes("admin");

    return res.json({ isAdmin, role: rawRole });
  } catch (err) {
    console.error("Erreur permissions:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});


// Changer le rôle d'un membre dans l'association
app.put("/api/associations/:id_association/membres/:id_membre/role", async (req, res) => {
  const { id_association, id_membre } = req.params;
  const { role, id_membre_actor } = req.body; // celui qui fait l'action (connecté)

  if (!id_membre_actor) {
    return res.status(400).json({ message: "id_membre_actor manquant." });
  }

  const newRole = normalizeRole(role);

  try {
    // 1) vérifier droits de l'acteur
    const actor = await getPermissions(id_association, id_membre_actor);
    if (!actor.permissions.canEditMemberRole) {
      return res.status(403).json({ message: "Droits insuffisants pour modifier les rôles." });
    }

    // 2) vérifier que le membre cible existe dans l'asso
    const targetRole = await getRoleInAssociation(id_association, id_membre);
    if (!targetRole) {
      return res.status(404).json({ message: "Membre non trouvé dans cette association." });
    }

    // 3) empêcher de retirer le dernier OWNER
    if (targetRole === "OWNER" && newRole !== "OWNER") {
      const [owners] = await connection.execute(
        `SELECT COUNT(*) AS c FROM membre_asso
         WHERE id_association = ? AND UPPER(role) = 'OWNER'`,
        [Number(id_association)]
      );
      if ((owners[0]?.c || 0) <= 1) {
        return res.status(400).json({ message: "Impossible : il doit rester au moins un OWNER." });
      }
    }

    // 4) update
    await connection.execute(
      `UPDATE membre_asso SET role = ?
       WHERE id_association = ? AND id_membre = ?`,
      [newRole, Number(id_association), Number(id_membre)]
    );

    return res.json({ message: "Rôle mis à jour", role: newRole });

  } catch (err) {
    console.error("Erreur update role:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});


//----------------------
//Route invite
//-------------------

app.post("/api/associations/:id_association/invite", async (req, res) => {
  const { id_association } = req.params;
  const { email, role, id_membre_actor } = req.body;

  if (!id_membre_actor || !email) {
    return res.status(400).json({ message: "Champs manquants (id_membre_actor, email)." });
  }

  try {
    // 1) Vérifier droits de celui qui invite
    const actor = await getPermissions(id_association, id_membre_actor);
    if (!actor.permissions.canInviteMember) {
      return res.status(403).json({ message: "Droits insuffisants pour inviter des membres." });
    }

    // 2) Vérifier que le compte existe
    const [users] = await connection.execute(
      `SELECT id_membre FROM membre WHERE mail_membre = ? LIMIT 1`,
      [email.trim()]
    );

    if (!users.length) {
      return res.status(404).json({
        message: "Ce mail n'a pas encore de compte. La personne doit s'inscrire avant d'être ajoutée."
      });
    }

    const id_membre_invite = users[0].id_membre;

    // 1 membre = 1 asso : si déjà dans une asso → refus
    const [alreadyInOne] = await connection.execute(
      `SELECT id_association FROM membre_asso WHERE id_membre = ? LIMIT 1`,
      [Number(id_membre_invite)]
    );

    if (alreadyInOne.length > 0) {
      return res.status(409).json({
        message: "Ce membre appartient déjà à une association. Il doit d'abord quitter son association actuelle."
      });
    }

    // 3) Vérifier qu'il n'est pas déjà dans cette asso 
    const [exists] = await connection.execute(
      `SELECT id_membre_asso FROM membre_asso
       WHERE id_association = ? AND id_membre = ?
       LIMIT 1`,
      [Number(id_association), Number(id_membre_invite)]
    );

    if (exists.length) {
      return res.status(409).json({ message: "Ce membre est déjà dans l'association." });
    }

    const invitedRole = normalizeRole(role || "MEMBRE");

    await connection.execute(
      `INSERT INTO membre_asso (role, date_adhesion, id_association, id_membre, conseil_asso)
       VALUES (?, CURDATE(), ?, ?, 0)`,
      [invitedRole, Number(id_association), Number(id_membre_invite)]
    );

    return res.json({
      message: "Membre ajouté à l'association.",
      id_membre: id_membre_invite,
      role: invitedRole
    });

  } catch (err) {
    console.error("Erreur invite:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});




// ===============================
//  ROUTES ACTUALITÉS
// ===============================

// Récupérer actualités d'une association
app.get("/api/associations/:id/news", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await connection.execute(
      `SELECT *
       FROM actualite
       WHERE id_association = ?
         AND statut = 'Approuve'
       ORDER BY COALESCE(date_publication, date_creation) DESC`,
      [id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erreur news:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/api/news", async (req, res) => {
  const { id_association, id_auteur, titre, contenu, image_principale } =
    req.body;

  if (!id_association || !id_auteur || !titre || !contenu) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  // Sécurité : seul un rôle autorisé peut créer une actu
  const { permissions } = await getPermissions(id_association, id_auteur);
  if (!permissions.canCreateNews) {
    return res.status(403).json({ message: "Droits insuffisants pour créer une actualité." });
  }

  try {
    const [result] = await connection.execute(
      `INSERT INTO actualite
       (id_association, id_auteur, type_actualite, titre, contenu, image_principale, statut, date_creation, date_publication)
       VALUES (?, ?, 'Article', ?, ?, ?, 'Approuve', NOW(), NOW())`,
      [
        Number(id_association),
        Number(id_auteur),
        titre,
        contenu,
        image_principale || null,
      ]
    );

    return res.status(201).json({ success: true, id_actualite: result.insertId });
  } catch (err) {
    console.error("Erreur création actu:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});


// Admin valide une actu
app.patch("/api/news/:id/approve", async (req, res) => {
  const id = req.params.id;

  await connection.execute(
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

  await connection.execute(
    `UPDATE actualite SET statut = 'Refuse' WHERE id_actualite = ?`,
    [id]
  );

  res.json({ success: true });
});

//POST INSCRIPTION MEMBRE

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
    id_membre,
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

  console.log("📩 /api/association body =", req.body);

  if (!id_membre) {
    return res.status(400).json({ message: "id_membre manquant (créateur)." });
  }

  if (
    !nom ||
    !type_structure ||
    !sport ||
    !adresse ||
    !date_creation ||
    !code_postal ||
    !ville ||
    !pays
  ) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  const couleur_1 = "#000000";
  const couleur_2 = "#000000";


  const [already] = await connection.execute(
    `SELECT id_association FROM membre_asso WHERE id_membre = ? LIMIT 1`,
    [Number(id_membre)]
  );

  if (already.length > 0) {
    return res.status(409).json({
      message: "Vous êtes déjà membre d'une association. Quittez-la avant d'en créer une autre."
    });
  }

  try {
    await connection.beginTransaction();

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
        couleur_2,
      ]
    );

    const idAssociation = result.insertId;
    const idMembre = req.body.id_membre; 
    if (!idMembre) {
      return res.status(400).json({ message: "Utilisateur non identifié" });
    }


    await connection.execute(
      `INSERT INTO membre_asso (role, date_adhesion, id_association, id_membre, conseil_asso)
   VALUES (?, CURDATE(), ?, ?, ?)`,
      ["OWNER", idAssociation, idMembre, 0]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Informations enregistrées",
      id_association: idAssociation
    });


  } catch (err) {
    await connection.rollback();
    console.error(" Erreur création asso/lien membre_asso:", err);
    return res.status(500).json({ message: "Erreur serveur" });
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
      return res
        .status(404)
        .json({ message: "Aucun compte trouvé avec cet email." });
    }

    const user = rows[0];

    if (user.password_membre !== password) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    // récupérer l'association du membre (si existe)
    const [assoRows] = await connection.execute(
      "SELECT id_association FROM membre_asso WHERE id_membre = ? LIMIT 1",
      [user.id_membre]
    );

    const id_association = assoRows.length ? assoRows[0].id_association : null;

    return res.status(200).json({
      message: "Connexion réussie",
      id_membre: user.id_membre,
      nom: user.nom_membre,
      prenom: user.prenom_membre,
      id_association,
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

app.get("/api/association/search", async (req, res) => {
  const nom = req.query.nom?.trim();

  if (!nom) {
    return res.json([]);
  }

  try {
    const [rows] = await connection.execute(
      `SELECT 
         id_association,
         nom,
         sport,
         ville,
         type_structure
       FROM association
       WHERE LOWER(nom) LIKE LOWER(?)`,
      [`%${nom}%`]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erreur recherche association :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
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
       JOIN association a ON ma.id_association = a.id_association
       WHERE ma.id_membre = ?
   LIMIT 1`,
      [id]
    );

    res.json(rows[0] || {});
  } catch (err) {
    console.error("Erreur SQL association du membre :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

//-----------Convocation des membres -----------//
app.post("/api/evenements/:id_evenement/convocations", async (req, res) => {
  const { id_evenement } = req.params;
  const { id_association, id_membre_actor, membres } = req.body;

  if (!id_association || !id_membre_actor || !Array.isArray(membres) || membres.length === 0) {
    return res.status(400).json({ message: "Champs manquants (id_association, id_membre_actor, membres[])." });
  }

  const { permissions } = await getPermissions(id_association, id_membre_actor);
  if (!permissions.canCreateEvent) {
    return res.status(403).json({ message: "Droits insuffisants." });
  }

  try {
    await connection.beginTransaction();

    // vérifier que l'event appartient à l'asso
    const [ev] = await connection.execute(
      `SELECT id_association FROM evenement WHERE id_evenement = ? LIMIT 1`,
      [Number(id_evenement)]
    );

    if (!ev.length || Number(ev[0].id_association) !== Number(id_association)) {
      await connection.rollback();
      return res.status(404).json({ message: "Événement introuvable pour cette association." });
    }

    // ids uniques
    const ids = [...new Set(membres.map(Number))].filter(Boolean);

    // vérifier que les membres appartiennent à l'asso
    const [valid] = await connection.execute(
      `SELECT id_membre FROM membre_asso
       WHERE id_association = ? AND id_membre IN (${ids.map(() => "?").join(",")})`,
      [Number(id_association), ...ids]
    );

    const validSet = new Set(valid.map(r => Number(r.id_membre)));

    for (const id_membre of ids) {
      if (!validSet.has(id_membre)) continue;

      await connection.execute(
        `INSERT INTO participation (id_evenement, id_membre, presence)
         VALUES (?, ?, 'EN_ATTENTE')
         ON DUPLICATE KEY UPDATE presence = presence`,
        [Number(id_evenement), id_membre]
      );
    }

    await connection.commit();
    return res.json({ success: true });

  } catch (err) {
    await connection.rollback();
    console.error("!! convocations error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

//
app.get("/api/membre/:id_membre/invitations", async (req, res) => {
  const { id_membre } = req.params;

  const [rows] = await connection.execute(
    `SELECT 
        e.id_evenement,
        e.titre_evenement,
        e.date_debut_event,
        a.nom AS nom_association,
        p.presence
     FROM participation p
     JOIN evenement e ON p.id_evenement = e.id_evenement
     JOIN association a ON e.id_association = a.id_association
     WHERE p.id_membre = ?
     ORDER BY e.date_debut_event ASC`,
    [Number(id_membre)]
  );

  res.json(rows);
});


//-----Voir les participants d'un evenement--------
app.get("/api/evenements/:id_evenement/participants", async (req, res) => {
  const { id_evenement } = req.params;

  const [rows] = await connection.execute(
    `SELECT 
        m.id_membre,
        m.prenom_membre,
        m.nom_membre,
        p.presence
     FROM participation p
     JOIN membre m ON m.id_membre = p.id_membre
     WHERE p.id_evenement = ?
     ORDER BY m.prenom_membre`,
    [Number(id_evenement)]
  );

  res.json(rows);
});
const PRESENCE_STATES = ["PRESENT", "ABSENT", "PEUT_ETRE"];
//Routes

app.patch("/api/evenements/:id_evenement/presence", async (req, res) => {
  const { id_evenement } = req.params;
  const { id_membre, presence } = req.body;

  if (!id_membre || !PRESENCE_STATES.includes(presence)) {
    return res.status(400).json({ message: "Statut invalide." });
  }

  const [r] = await connection.execute(
    `UPDATE participation
     SET presence = ?
     WHERE id_evenement = ? AND id_membre = ?`,
    [presence, Number(id_evenement), Number(id_membre)]
  );

  if (r.affectedRows === 0) {
    return res.status(404).json({ message: "Convocation introuvable." });
  }

  res.json({ success: true });
});





app.get("/events_page", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/events_page.html"));
});

app.get("/membre", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/membre.html"));
});

app.use(express.static(path.join(__dirname, "../Front")));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
