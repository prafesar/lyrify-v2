import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Set COOP and COEP headers required for SQLite WASM inside the web worker
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    next();
  });

  // Lazy-load Gemini AI on the server as recommended by security/crash guidelines
  let aiInstance: GoogleGenAI | null = null;
  function getAiInstance() {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.");
      }
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  // API Route for Gemini content generation proxy
  app.post("/api/gemini/generate-content", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const ai = getAiInstance();

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      console.log("[server] Got response from Gemini. Model:", model);

      // Extract the text getter explicitly so it serializes over JSON
      let text = "";
      try {
        text = response.text || "";
        console.log("[server] response.text length:", text.length, "Preview:", text.substring(0, 100));
      } catch (err) {
        console.warn("[server] Could not retrieve text getter from response:", err);
      }

      if (!text) {
        // Fallback: try to extract from candidates structure manually
        try {
          const part = response.candidates?.[0]?.content?.parts?.[0];
          if (part && typeof part.text === "string") {
            text = part.text;
            console.log("[server] Fallback: extracted text structure manually. Length:", text.length);
          }
        } catch (err) {
          console.warn("[server] Fallback text extraction failed:", err);
        }
      }

      const serialized = JSON.parse(JSON.stringify(response));

      res.json({
        ...serialized,
        text,
      });
    } catch (error: any) {
      console.error("[server] Gemini API error:", error);
      
      let statusCode = 500;
      if (typeof error.status === "number") {
        statusCode = error.status;
      } else if (typeof error.statusCode === "number") {
        statusCode = error.statusCode;
      } else if (typeof error.code === "number") {
        statusCode = error.code;
      } else if (error.status === "UNAVAILABLE" || error.message?.includes("UNAVAILABLE") || error.message?.includes("high demand")) {
        statusCode = 503;
      } else if (error.status === "INVALID_ARGUMENT" || error.message?.includes("INVALID_ARGUMENT")) {
        statusCode = 400;
      } else if (error.status === "PERMISSION_DENIED" || error.message?.includes("PERMISSION_DENIED")) {
        statusCode = 403;
      } else if (error.status === "NOT_FOUND" || error.message?.includes("NOT_FOUND")) {
        statusCode = 404;
      } else if (error.status === "RESOURCE_EXHAUSTED" || error.message?.includes("RESOURCE_EXHAUSTED")) {
        statusCode = 429;
      }

      res.status(statusCode).json({
        error: error.message || "An error occurred during Gemini API generation"
      });
    }
  });

  // API Route for Gemini content generation streaming proxy
  app.post("/api/gemini/generate-content-stream", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const ai = getAiInstance();

      // Set headers for standard chunked stream transfer
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }
      res.end();
    } catch (error: any) {
      console.error("[server] Gemini API stream error:", error);
      res.status(500).write(JSON.stringify({ error: error.message || "Streaming failed" }));
      res.end();
    }
  });

  let viteInstance: any = null;

  if (process.env.NODE_ENV !== "production") {
    viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  // Handle the /intro landing page explicitly
  app.get('/intro', async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== "production") {
        if (viteInstance) {
          const fs = await import('fs');
          let html = fs.readFileSync(path.resolve(process.cwd(), 'intro.html'), 'utf-8');
          html = await viteInstance.transformIndexHtml(req.originalUrl || req.url, html);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } else {
          res.sendFile(path.resolve(process.cwd(), 'intro.html'));
        }
      } else {
        res.sendFile(path.join(process.cwd(), 'dist', 'intro.html'));
      }
    } catch (e) {
      next(e);
    }
  });

  // Vite middleware or static serving for normal application
  if (process.env.NODE_ENV !== "production") {
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
