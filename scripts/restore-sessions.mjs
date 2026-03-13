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

  // 1. 读取当前的索引（如果不存在则创建一个空的）
  let index = {};
  if (fs.existsSync(INDEX_FILE)) {
    try {
      index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
    } catch {
      index = {};
    }
  }

  // 2. 扫描目录下的所有文件
  const files = fs.readdirSync(SESSIONS_DIR);
  let restoredCount = 0;

  for (const file of files) {
    if (file.includes(".jsonl.reset.")) {
      const oldPath = path.join(SESSIONS_DIR, file);
      // 提取原始 UUID (假设格式是 uuid.jsonl.reset.timestamp)
      const sessionId = file.split(".")[0];
      const newPath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);

      console.log(`Restoring ${file} -> ${sessionId}.jsonl`);

      // 3. 重命名文件
      if (!fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
      }

      // 4. 构建索引条目（最简模式，系统启动后会自动补充细节）
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

  // 5. 写回索引文件
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`\n✅ Done! Restored ${restoredCount} sessions.`);
  console.log("Please restart your OpenClaw Gateway now.");
}

restore().catch(console.error);
