# -*- coding: utf-8 -*-
"""Assemble the deployable site into dist/.

Whitelist copy: only what the public site needs. Raw sources (assets/label,
assets/source), tooling and the designs/ lab stay in the repo, not on the edge.

Run from the website root:  python tools/build.py
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_works

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

COPY_FILES = ["index.html", "works.html", "members.html", "activities.html"]
COPY_DIRS = ["en", "css", "js", os.path.join("assets", "image")]


def main():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    for f in COPY_FILES:
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DIST, f))
            print("copy", f)

    for d in COPY_DIRS:
        src = os.path.join(ROOT, d)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(DIST, d))
            print("copy", d + "/")

    # regenerate the chapbook pages fresh from assets/label into dist
    build_works.main(out_root=DIST)

    print("dist ready:", DIST)


if __name__ == "__main__":
    sys.exit(main())
