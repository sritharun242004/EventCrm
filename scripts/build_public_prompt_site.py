#!/usr/bin/env python3
"""Build the public, serverless Eventbot prompt-kit site."""

from html import escape
from pathlib import Path
from shutil import copy2, copytree, rmtree

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public_prompt_site"
DOWNLOADS = OUT / "downloads"
prompt = (ROOT / "ceo_dashboard_starter" / "CLAUDE_DATA_MAPPING_PROMPT.md").read_text()

if OUT.exists():
    rmtree(OUT)
DOWNLOADS.mkdir(parents=True)

assets = {
    ROOT / "ceo_dashboard_starter" / "CXO_MINIMAL_DASHBOARD.html": "MY_EXECUTIVE_DASHBOARD_STARTER.html",
    ROOT / "ceo_dashboard_starter" / "CLAUDE_DATA_MAPPING_PROMPT.md": "CUSTOMIZE_DASHBOARD_WITH_MY_DATA.md",
    ROOT / "eventbot_dashboard_mock_data.zip": "EVENTBOT_DASHBOARD_CSV_TABLES.zip",
    ROOT / "eventbot_dashboard_all_data.xlsx": "EVENTBOT_DASHBOARD_MOCK_DATA.xlsx",
}
for source, name in assets.items():
    copy2(source, DOWNLOADS / name)

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Eventbot · Build Your Executive Dashboard</title><meta name="description" content="Copy the prompt, add your data, and create a responsive executive dashboard."><style>
:root{{--ink:#111827;--red:#be2026;--paper:#f5f2ec;--muted:#667080;--rule:#d7d2c8}}*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 Arial,sans-serif}}header{{height:76px;padding:0 clamp(22px,6vw,90px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--rule)}}.brand{{font:500 27px Georgia,serif}}.brand em{{color:var(--red)}}header a{{color:var(--ink);font:700 10px ui-monospace,monospace;letter-spacing:.12em;text-decoration:none;text-transform:uppercase}}main{{max-width:1440px;margin:auto;padding:72px clamp(22px,7vw,100px)}}.hero{{display:grid;grid-template-columns:.75fr 1.25fr;gap:7vw;align-items:center;margin-bottom:72px}}.eyebrow{{color:var(--red);font:700 10px ui-monospace,monospace;letter-spacing:.17em;text-transform:uppercase}}h1{{font:500 clamp(50px,6vw,86px)/.96 Georgia,serif;letter-spacing:-.055em;margin:16px 0 24px}}.hero p,.intro{{color:var(--muted);font-size:17px}}.steps{{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--rule);background:white}}.steps div{{padding:26px;border-right:1px solid var(--rule)}}.steps div:last-child{{border:0}}.steps b{{display:block;color:var(--red);font:700 10px ui-monospace,monospace;margin-bottom:18px}}.steps strong{{display:block;font:500 22px Georgia,serif;margin-bottom:8px}}.card{{background:white;border:1px solid var(--rule);border-radius:14px;padding:34px;margin:0 0 34px}}.card-head{{display:flex;align-items:end;justify-content:space-between;gap:24px}}h2{{font:500 clamp(32px,4vw,52px)/1.04 Georgia,serif;letter-spacing:-.04em;margin:12px 0 0}}.actions{{display:flex;flex-wrap:wrap;gap:10px}}.actions a,.copy{{display:inline-flex;border:1px solid var(--ink);padding:11px 15px;color:var(--ink);background:transparent;text-decoration:none;font:700 10px ui-monospace,monospace;letter-spacing:.05em;text-transform:uppercase;cursor:pointer}}.actions a.primary{{background:var(--ink);color:white}}.doc{{margin-top:24px;background:#181a19;color:#e6e2da;border-radius:12px;overflow:hidden}}.toolbar{{height:58px;padding:0 14px 0 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #3a3d3a;color:#aaa;font:700 9px ui-monospace,monospace;letter-spacing:.08em}}.copy{{color:white;border-color:#555;background:#2c2f2d;border-radius:7px}}.copy.ok{{background:#28705a}}pre{{max-height:680px;overflow:auto;margin:0;padding:28px 30px;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.72 ui-monospace,monospace}}.privacy{{padding:24px;border-left:3px solid var(--red);background:#eee9e0;color:var(--muted)}}footer{{padding:35px clamp(22px,6vw,90px);background:var(--ink);color:#b8c0cc;display:flex;justify-content:space-between}}@media(max-width:850px){{.hero{{grid-template-columns:1fr}}.steps{{grid-template-columns:1fr}}.steps div{{border-right:0;border-bottom:1px solid var(--rule)}}.card-head{{display:block}}.actions{{margin-top:22px}}}}@media(max-width:520px){{main{{padding-top:48px}}h1{{font-size:50px}}.card{{padding:20px 16px}}.actions{{display:grid;grid-template-columns:1fr 1fr}}.actions a{{justify-content:center;text-align:center;padding:10px 7px;font-size:8px}}pre{{padding:18px;font-size:11px}}.toolbar span{{max-width:165px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}footer{{display:block}}}}
</style></head><body><header><div class="brand">Event<em>bot</em></div><a href="#prompt">View & copy prompt ↓</a></header><main><section class="hero"><div><div class="eyebrow">MINIMAL CXO DASHBOARD KIT</div><h1>Your data.<br>One clear page.</h1><p>Give Claude or ChatGPT your own Excel or CSV files and receive one responsive, offline executive dashboard—without a server.</p></div><div class="steps"><div><b>01</b><strong>Download HTML</strong><span>Use the ready-made executive dashboard as the visual shell.</span></div><div><b>02</b><strong>Copy the prompt</strong><span>Paste the complete instructions into a new AI conversation.</span></div><div><b>03</b><strong>Attach your data</strong><span>Add your Excel or CSV files and request the final HTML.</span></div></div></section><section class="card" id="prompt"><div class="card-head"><div><div class="eyebrow">COPY-READY MARKDOWN PROMPT</div><h2>Read it, copy it, use it.</h2></div><div class="actions"><a class="primary" href="/downloads/MY_EXECUTIVE_DASHBOARD_STARTER.html" download>Download HTML</a><a href="/downloads/CUSTOMIZE_DASHBOARD_WITH_MY_DATA.md" download>Download MD</a><a href="/downloads/EVENTBOT_DASHBOARD_CSV_TABLES.zip" download>Sample CSVs</a><a href="/downloads/EVENTBOT_DASHBOARD_MOCK_DATA.xlsx" download>Sample Excel</a></div></div><p class="intro">Copy the complete prompt below into Claude or ChatGPT, then attach the downloaded HTML and your organisation's Excel or CSV files.</p><div class="doc"><div class="toolbar"><span>CUSTOMIZE_DASHBOARD_WITH_MY_DATA.md</span><button class="copy" id="copy">Copy prompt</button></div><pre id="promptText">{escape(prompt)}</pre></div></section><div class="privacy"><strong>Before uploading company data:</strong> remove confidential personal information or use an AI account approved by your organisation. Missing values are shown as “Not available”—never invented as zero.</div></main><footer><span>Eventbot · Executive dashboard starter</span><span>No server required</span></footer><script>
const b=document.getElementById('copy'),t=document.getElementById('promptText');b.onclick=async()=>{{try{{await navigator.clipboard.writeText(t.textContent)}}catch{{const x=document.createElement('textarea');x.value=t.textContent;document.body.appendChild(x);x.select();document.execCommand('copy');x.remove()}}b.textContent='Copied ✓';b.classList.add('ok');setTimeout(()=>{{b.textContent='Copy prompt';b.classList.remove('ok')}},2200)}};
</script></body></html>'''

(OUT / "index.html").write_text(html)
(OUT / "CNAME").write_text("event.thebotcompany.in\n")
(OUT / ".nojekyll").write_text("")
for path in (OUT / "prompt", OUT / "propmt"):
    path.mkdir()
    copy2(OUT / "index.html", path / "index.html")
print(OUT)
