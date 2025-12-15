import mysql from "mysql2/promise";
let connection;
async function initDB() {
  try {
    connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "koordybdd",
    });
    console.log("Connexion établie");
    return connection;
  } catch (err) {
    console.error("Erreur connexion SQL:", err);
    process.exit(1);
  }
}
export { initDB };
