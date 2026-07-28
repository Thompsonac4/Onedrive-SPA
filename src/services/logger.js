import { authService } from "@/auth/authService.js";
import { graphConfig } from "@/auth/msal-config.jsx";

/**
 * Lightweight, low-usage logger (Option B).
 * ----------------------------------------
 * - Buffers log entries in memory
 * - Flushes them to ONE file in the drive (per signed-in user) via Graph
 * - Batched: flushes at most every FLUSH_INTERVAL_MS, plus when the tab hides
 *   → keeps Graph request counts tiny (roughly one PUT per interval)
 * - Bounded: the file is trimmed to MAX_FILE_CHARS so it can't grow forever
 *
 * No Azure resources are used (no App Insights) and Graph delegated calls are
 * not billed, so this adds negligible cost/usage.
 *
 * Usage:
 *   import { logger } from "./logger.js";
 *   logger.info("user picked jobsite", name);
 *   logger.warn("graph slow", ms);
 *   logger.error("upload failed", err);
 */

const MAX_FILE_CHARS = 256 * 1024; // ~256 KB cap; oldest lines are trimmed
const FLUSH_INTERVAL_MS = 120000; // flush at most once every 2 minutes

function safeStringify(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

class Logger {
  constructor() {
    this.buffer = [];
    this.fileContent = null; // cached file text (read once, then reused)
    this.loaded = false;
    this.flushing = false;
    this.timer = null;
  }

  /** Per-user file so multiple users never overwrite each other's logs. */
  #fileName() {
    const account = authService.getAccount?.();
    const who = (account?.username || "anonymous").replace(/[^a-zA-Z0-9._-]/g, "_");
    return `applog-${who}.txt`;
  }

  #contentUrl() {
    return `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/root:/${this.#fileName()}:/content`;
  }

  #format(level, args) {
    const msg = args.map(safeStringify).join(" ");
    return `${new Date().toISOString()} [${level}] ${msg}`;
  }

  info(...args) {
    this.#push("INFO", args);
  }
  warn(...args) {
    this.#push("WARN", args);
  }
  error(...args) {
    this.#push("ERROR", args);
  }
  log(...args) {
    this.#push("INFO", args);
  }

  #push(level, args) {
    this.buffer.push(this.#format(level, args));
    // Mirror to console so local dev still sees it immediately
    const fn = console[level.toLowerCase()] || console.log;
    fn("[log]", ...args);
    this.#ensureTimer();
  }

  #ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  /** Writes buffered lines to the drive. Safe to call often; it no-ops when idle. */
  async flush() {
    if (this.flushing || this.buffer.length === 0) return;
    if (!authService.isAuthenticated?.()) return; // need a token to write

    this.flushing = true;
    const pending = this.buffer;
    this.buffer = [];

    try {
      const token = await authService.getAccessToken();
      if (!token) {
        // Redirect/login in progress — keep entries for next flush
        this.buffer = pending.concat(this.buffer);
        return;
      }

      // Read the existing file once so we append instead of overwrite
      if (!this.loaded) {
        this.fileContent = await this.#readExisting(token);
        this.loaded = true;
      }

      let content = (this.fileContent || "") + pending.join("\n") + "\n";
      if (content.length > MAX_FILE_CHARS) {
        content = content.slice(content.length - MAX_FILE_CHARS);
      }

      const res = await fetch(this.#contentUrl(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
        body: content,
      });

      if (!res.ok) throw new Error(`log PUT ${res.status}`);
      this.fileContent = content;
    } catch (err) {
      console.error("[logger] flush failed:", err);
      this.buffer = pending.concat(this.buffer); // retry next flush
    } finally {
      this.flushing = false;
    }
  }

  async #readExisting(token) {
    try {
      const res = await fetch(this.#contentUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return ""; // 404 = first run, nothing yet
      return await res.text();
    } catch {
      return "";
    }
  }
}

export const logger = new Logger();

// Flush the last entries when the tab is hidden/closed (best-effort).
// visibilitychange is more reliable than beforeunload on mobile.
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      logger.flush();
    }
  });
  window.addEventListener("beforeunload", () => {
    logger.flush();
  });
}
