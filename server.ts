import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleApiRoute } from './src/server/middleware';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(async (req, res, next) => {
  const handled = await handleApiRoute(req, res);
  if (!handled) {
    next();
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI Insight Engine server running on port ${PORT}`);
});
