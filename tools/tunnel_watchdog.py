# -*- coding: utf-8 -*-
"""Watch the localhost.run tunnel log; keep /tmp/lhr_url.txt + URL_STATUS current."""
import re, time, os, sys, urllib.request

import tempfile
T = tempfile.gettempdir() + os.sep
LOG = T + "lhr3.raw.log"
URL_FILE = T + "lhr_url.txt"
STATUS = T + "lhr_status.txt"

ANSI = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]|\x1b[][()][0-9;]*")
URL_RE = re.compile(r"https://[a-z0-9]+\.lhr\.life")

current = ""
while True:
    try:
        if os.path.exists(LOG):
            text = ANSI.sub("", open(LOG, encoding="utf-8", errors="replace").read())
            urls = URL_RE.findall(text)
            if urls and urls[-1] != current:
                current = urls[-1]
                with open(URL_FILE, "w", encoding="utf-8") as f:
                    f.write(current + "\n")
                print("new tunnel url:", current, flush=True)
        if current:
            try:
                code = urllib.request.urlopen(current + "/designs/", timeout=10).getcode()
            except Exception as e:
                code = "ERR %s" % e
            with open(STATUS, "w", encoding="utf-8") as f:
                f.write("%s -> %s\n" % (current, code))
    except Exception as e:
        print("watchdog error:", e, flush=True)
    time.sleep(10)
