import 'dotenv/config';
import compression from 'compression';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'archiverse-db.json');
const DB_SCHEMA_VERSION = 10;

function ensureDbDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readWorldsDb(): unknown[] | null {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed?.version !== DB_SCHEMA_VERSION) return null;
    return Array.isArray(parsed?.worlds) ? parsed.worlds : null;
  } catch {
    return null;
  }
}

function writeWorldsDb(worlds: unknown[]): void {
  ensureDbDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(
    tmpFile,
    JSON.stringify({ version: DB_SCHEMA_VERSION, updatedAt: Date.now(), worlds }),
    'utf-8',
  );
  fs.renameSync(tmpFile, DB_FILE);
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(compression({ threshold: 512 }));
  app.use(express.json({ limit: '4mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'archiverse-ai' });
  });

  // Persistent Worlds CRUD
  app.get('/api/worlds', (_req, res) => {
    const worlds = readWorldsDb();
    res.json({ worlds });
  });

  app.put('/api/worlds', (req, res) => {
    const { worlds, version } = req.body ?? {};
    if (!Array.isArray(worlds)) {
      res.status(400).json({ error: 'Invalid payload: worlds array required.' });
      return;
    }
    if (version !== DB_SCHEMA_VERSION) {
      res.status(200).json({ ok: false, ignored: 'stale_client_version' });
      return;
    }
    try {
      writeWorldsDb(worlds);
      res.json({ ok: true, count: worlds.length });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to persist worlds.',
      });
    }
  });

  // AI City Advisor: Analyze city DSA & metrics and return structured recommendations
  app.post('/api/ai/advise', async (req, res) => {
    try {
      const ai = getAiClient();
      const { worldName, era, metrics, resources, dsa, buildingCounts, mlSummary } = req.body ?? {};

      const prompt = `Analyze this simulated 3D parallel-world city in ArchiVerse AI and produce 3 concrete, actionable urban engineering recommendations.
World: ${worldName} (${era})
Metrics: Population=${metrics?.population}, Happiness=${metrics?.happiness}%, EcoIndex=${metrics?.ecoIndex}, Connectivity=${metrics?.connectivityPct}%, IsolatedBuildings=${metrics?.isolatedCount}, Epoch=${metrics?.epoch}
Resources: Credits=${resources?.credits}, EnergyProduced=${resources?.energyProduced}MW, EnergyConsumed=${resources?.energyConsumed}MW
DSA Graph Telemetry: Nodes=${dsa?.graphNodes}, Edges=${dsa?.graphEdges}, Components=${dsa?.connectedComponents}, IsolatedCoords=${JSON.stringify(dsa?.isolatedCoords ?? [])}
Building Mix: ${JSON.stringify(buildingCounts ?? {})}
ML Forecast Summary: ${mlSummary ?? 'N/A'}

Provide practical placement coordinates inside the 16x16 grid (0..15) if relevant.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the ArchiVerse AI City Advisor, an urban systems engineer specializing in graph connectivity, clean energy balance, and parallel-timeline urban planning. Be concise, technical, and grounded in the metrics provided.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: {
                type: Type.STRING,
                description: '2-sentence executive diagnosis of the city state.',
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      description: 'One of: connectivity, zoning, energy, sustainability, strategy',
                    },
                    priority: {
                      type: Type.STRING,
                      description: 'One of: high, medium, low',
                    },
                    summary: { type: Type.STRING },
                    suggestedAction: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI Advisor request failed.';
      res.status(500).json({ error: message });
    }
  });

  // AI Parallel-World Description Generator
  app.post('/api/ai/describe', async (req, res) => {
    try {
      const ai = getAiClient();
      const { worldName, era, parameters, decisionTitle } = req.body ?? {};
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Write a vivid 2-sentence architectural & socio-economic world dossier description for a newly created parallel reality named "${worldName}" in era "${era}", guided by policy "${parameters?.ecoPolicy}" and founding decision "${decisionTitle}".`,
        config: {
          systemInstruction: 'Keep it crisp, imaginative, and under 55 words.',
        },
      });
      res.json({ description: (response.text ?? '').trim() });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'World description failed.',
      });
    }
  });

  // AI Parallel-World Comparison Summary
  app.post('/api/ai/compare', async (req, res) => {
    try {
      const ai = getAiClient();
      const { worldsSummary } = req.body ?? {};
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Compare these parallel worlds/timelines and explain how their urban decisions caused their metrics, connectivity, and ecological outcomes to diverge:\n${JSON.stringify(worldsSummary, null, 2)}`,
        config: {
          systemInstruction:
            'You are the ArchiVerse Timeline Analyst. Provide a clear, structured 3-paragraph comparison highlighting trade-offs in prosperity, connectivity, energy, and sustainability.',
        },
      });
      res.json({ summary: (response.text ?? '').trim() });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Comparison analysis failed.',
      });
    }
  });

  // AI Natural-Language Q&A
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const ai = getAiClient();
      const { question, context } = req.body ?? {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Question is required.' });
        return;
      }
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `City Context:\n${JSON.stringify(context ?? {})}\n\nUser Question: ${question}`,
        config: {
          systemInstruction:
            'You are ArchiVerse AI City Advisor. Answer the user question directly in 2-4 crisp sentences grounded in their active world telemetry, DSA connectivity, and ML trends.',
        },
      });
      res.json({ answer: (response.text ?? '').trim() });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'AI question failed.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ArchiVerse AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
