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

  // Initialize Gemini AI on the server with recommended options
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for Gemini content generation proxy
  app.post("/api/gemini/generate-content", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        console.error("[server] GEMINI_API_KEY is not defined in environment variables!");
        return res.status(500).json({ error: "GEMINI_API_KEY is missing. Please configure it in Settings > Secrets." });
      }

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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
