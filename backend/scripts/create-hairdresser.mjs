import bcrypt from "bcryptjs";
import { pool } from "../src/config/db.js";
const [, , name, email, password] = process.argv;
if (!name || !email || !password) {
  console.log(
    'Uso: node scripts/create-hairdresser.mjs "Nome" email@dominio.com "SenhaForte"',
  );
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
await pool.query(
  "INSERT INTO users(name,email,password_hash,role,email_confirmed) VALUES(?,?,?,'HAIRDRESSER',1)",
  [name, email, hash],
);
console.log("Cabeleireira criada.");
await pool.end();
