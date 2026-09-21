// Member-store crypto: plaintext lives locally only; the repo carries vaults.
//
//   npm run members:open   # decrypt members-store/*.vault -> src/content/members-local/*.json
//   npm run members:lock   # encrypt src/content/members-local/*.json -> members-store/*.vault
//
// Key source order: env MEMBERS_KEY, then tools/.members_key (gitignored).
// AES-256-GCM, scrypt-derived key, per-record random salt+iv.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const STORE = path.join(ROOT, "members-store");
const LOCAL = path.join(ROOT, "src", "content", "members-local");
const KEYFILE = path.join(ROOT, "tools", ".members_key");

function loadKeyMaterial() {
  const k = process.env.MEMBERS_KEY || (fs.existsSync(KEYFILE) ? fs.readFileSync(KEYFILE, "utf8").trim() : "");
  if (!k) {
    console.error("no MEMBERS_KEY: set env MEMBERS_KEY or write tools/.members_key");
    process.exit(2);
  }
  return k;
}

function decryptFile(vaultPath, keyMaterial) {
  const buf = Buffer.from(fs.readFileSync(vaultPath, "utf8").trim(), "base64");
  const salt = buf.subarray(0, 16), iv = buf.subarray(16, 28), tag = buf.subarray(28, 44);
  const data = buf.subarray(44);
  const key = crypto.scryptSync(keyMaterial, salt, 32);
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

function encryptFile(plainPath, keyMaterial) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(keyMaterial, salt, 32);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(fs.readFileSync(plainPath)), c.final()]);
  return Buffer.concat([salt, iv, c.getAuthTag(), data]).toString("base64");
}

const mode = process.argv[2];

if (mode === "decrypt") {
  fs.mkdirSync(LOCAL, { recursive: true });
  const vaults = fs.existsSync(STORE) ? fs.readdirSync(STORE).filter((f) => f.endsWith(".vault")) : [];
  if (!vaults.length) {
    console.log("members-store empty — nothing to decrypt (new clone? get the key + store from the club)");
    process.exit(0);
  }
  const k = loadKeyMaterial();
  for (const v of vaults) {
    const out = path.join(LOCAL, v.replace(/\.vault$/, ""));
    if (fs.existsSync(out)) continue; // local plaintext wins while editing
    fs.writeFileSync(out, decryptFile(path.join(STORE, v), k));
    console.log("opened", path.basename(out));
  }
} else if (mode === "encrypt") {
  fs.mkdirSync(STORE, { recursive: true });
  const k = loadKeyMaterial();
  for (const f of fs.readdirSync(LOCAL).filter((f) => f.endsWith(".json"))) {
    const out = path.join(STORE, f + ".vault");
    fs.writeFileSync(out, encryptFile(path.join(LOCAL, f), k) + "\n");
    console.log("locked", f);
  }
} else {
  console.error("usage: members_crypt.mjs encrypt|decrypt");
  process.exit(2);
}
