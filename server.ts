import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("network_tests.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    latency INTEGER,
    download_speed REAL,
    isp TEXT,
    ip TEXT,
    location TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/history", (req, res) => {
    try {
      const history = db.prepare("SELECT * FROM tests ORDER BY timestamp DESC LIMIT 50").all();
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/tests", (req, res) => {
    const { latency, download_speed, isp, ip, location } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO tests (latency, download_speed, isp, ip, location)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(latency, download_speed, isp, ip, location);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save test" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
