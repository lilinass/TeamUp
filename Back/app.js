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
app.get("/inscription_personnelle", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/inscription_personnelle.html"));
});
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
