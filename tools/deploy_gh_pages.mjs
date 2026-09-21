// Deploys the static site to GitHub Pages (interim host while no domain is
// available). Rebuilds the site with GH_PAGES_BASE (astro.config.mjs consumes
// it: base prefix + .gh-pages outDir), then publishes that folder as the
// gh-deployed branch — via a detached index + commit-tree, so neither the
// working tree nor HEAD is ever touched. Safe to re-run after every update.
//
//   node tools/deploy_gh_pages.mjs            # build + publish gh-deployed
//
// Pages source: repo Settings → Pages → "Deploy from a branch" → gh-deployed /(root).
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, ".gh-pages");
const IDX = path.join(ROOT, ".git", "deploy.idx");
const BRANCH = "gh-deployed";
const BASE = "/fduIW/";

const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } })
    ?.toString().trim();
const out = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, env: { ...process.env, ...env } }).toString().trim();

fs.rmSync(OUT, { recursive: true, force: true });
// invoke astro's CLI directly — execFileSync can't spawn "npm" (a .cmd) without a shell on Windows
run("node", ["node_modules/astro/astro.js", "build"], { GH_PAGES_BASE: BASE, MSYS_NO_PATHCONV: "1" });

// .nojekyll: Pages would otherwise Jekyll-filter the _astro/ asset folder away
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// Stage the build output as a branch-root tree, in a throwaway index
const env = { GIT_INDEX_FILE: IDX, MSYS_NO_PATHCONV: "1" };
fs.rmSync(IDX, { force: true });
out("git", ["read-tree", "--empty"], env);
out("git", [`--work-tree=${OUT}`, "add", "-A"], env);
const tree = out("git", ["write-tree"], env);
let parent = null;
try {
  parent = execSync(`git rev-parse -q --verify refs/heads/${BRANCH}`, { cwd: ROOT }).toString().trim() || null;
} catch { /* first deploy: orphan commit */ }
const msg = `Deploy: GitHub Pages static build (base ${BASE})`;
const cmt = out("git",
  parent ? ["commit-tree", tree, "-p", parent, "-m", msg] : ["commit-tree", tree, "-m", msg]);
fs.rmSync(IDX, { force: true });

// moving the branch pointer onto the fresh commit keeps a linear history
out("git", ["update-ref", `refs/heads/${BRANCH}`, cmt]);
run("git", ["push", "-u", "origin", BRANCH]);
console.log(`\ndeployed ${cmt.slice(0, 7)} -> ${BRANCH}; site: https://henrywch.github.io${BASE}`);
