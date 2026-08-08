"use client";

import { useState } from "react";

export default function PromptCopyPanel({prompt}:{prompt:string}){
  const [copied,setCopied]=useState(false);

  async function copyPrompt(){
    try{
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),2200);
    }catch{
      const area=document.createElement("textarea");
      area.value=prompt;
      area.style.position="fixed";
      area.style.opacity="0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      setCopied(true);
      window.setTimeout(()=>setCopied(false),2200);
    }
  }

  return <section className="kit-prompt-viewer" id="copy-prompt">
    <div className="kit-prompt-card">
      <div className="kit-prompt-heading">
        <div><div className="kit-eyebrow">COPY-READY MARKDOWN PROMPT</div><h2>Read it, copy it, then attach your data.</h2></div>
        <div className="kit-prompt-actions"><a href="/api/resources/mapping" download>Download MD</a><a href="/api/resources/csv" download>Download sample CSVs</a></div>
      </div>
      <p className="kit-prompt-help">This is the complete instruction file. Copy it into a new Claude or ChatGPT conversation, then attach the minimal HTML and your Excel or CSV files in the same message.</p>
      <div className="kit-prompt-document">
        <div className="kit-prompt-toolbar"><span>CUSTOMIZE_DASHBOARD_WITH_MY_DATA.md</span><button type="button" onClick={copyPrompt} className={copied?"copied":""}>{copied?"Copied ✓":"Copy prompt"}</button></div>
        <pre>{prompt}</pre>
      </div>
    </div>
  </section>;
}
