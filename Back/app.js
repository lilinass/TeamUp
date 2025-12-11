import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 8080;

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
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//page une fois connectée

