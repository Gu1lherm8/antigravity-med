import pg from 'pg';
const { Client } = pg;

const config = {
  host: 'db.vpjdztxwvjvlhvcakkky.supabase.co',
  user: 'postgres',
  password: '11Setenbro',
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

const sql1 = `ALTER TABLE attempts ADD COLUMN IF NOT EXISTS student_answer TEXT;`;
const sql2 = `NOTIFY pgrst, 'reload schema';`;

async function repair() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log("Conectado ao banco de dados...");
    await client.query(sql1);
    await client.query(sql2);
    console.log("Coluna adicionada e cache atualizado!");
  } catch (err) {
    console.error("Erro na alteração:", err.message);
  } finally {
    await client.end();
  }
}

repair();
