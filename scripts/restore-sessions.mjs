import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SESSIONS_DIR = path.join(os.homedir(), ".openclaw", "agents", "main", "sessions");
const INDEX_FILE = path.join(SESSIONS_DIR, "sessions.json");

async function restore() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.error("Session directory not found:", SESSIONS_DIR);
    return;
  }

  // 1. Load the current index (start with empty object if missing or corrupted)
  let index = {};
  if (fs.existsSync(INDEX_FILE)) {
    try {
      index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
    } catch {
      index = {};
    }
  }

  // 2. Scan all files in the sessions directory
  const files = fs.readdirSync(SESSIONS_DIR);
  let restoredCount = 0;

  for (const file of files) {
    if (file.includes(".jsonl.reset.")) {
      const oldPath = path.join(SESSIONS_DIR, file);
      // Extract the original session ID (assumes format: uuid.jsonl.reset.timestamp)
      const sessionId = file.split(".")[0];
      const newPath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);

      console.log(`Restoring ${file} -> ${sessionId}.jsonl`);

      // 3. Rename the archived file back to its original name
      if (!fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
      }

      // 4. Build a minimal index entry (gateway will fill in details on next startup)
      const sessionKey = `agent:main:restored:${sessionId}`;
      if (!index[sessionKey]) {
        index[sessionKey] = {
          sessionId: sessionId,
          updatedAt: Date.now(),
          sessionFile: newPath,
          origin: { provider: "restored", surface: "webchat", chatType: "direct" },
        };
        restoredCount++;
      }
    }
  }

  // 5. Write the updated index back to disk
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`\n✅ Done! Restored ${restoredCount} sessions.`);
  console.log("Please restart your OpenClaw Gateway now.");
}

restore().catch(console.error);
