import type { Metadata } from "next";
import Link from "next/link";

// This public handoff page changes as the downloadable kit evolves. Keeping it
// dynamic prevents a year-long immutable CloudFront response from hiding a new
// release after deployment.
export const dynamic="force-dynamic";
export const revalidate=0;

export const metadata:Metadata={
  title:"Create Your Own Executive Dashboard",
  description:"Download a ready-made executive dashboard and customize it with your own Excel or CSV data.",
};

const tables=["Clients","Venues","Events & calendar","Vendor master","Vendor pricing","Vendor schedules","Budget lines","Budget summary","Teams & members","Assignments","RFQs","Quote comparison","Reputation","Market intelligence","Ticket pricing","Sponsors","Wedding events"];

export default function PromptResourcesPage(){
  return <main className="kit-page">
    <header className="kit-nav"><Link href="/" className="kit-brand">Event<em>bot</em><span>Bring your own data</span></Link><a href="#downloads" className="kit-nav-link">Download files ↓</a></header>

    <section className="kit-hero"><div className="kit-hero-copy"><div className="kit-eyebrow">BRING YOUR OWN DATA · HTML KIT</div><h1>Create your dashboard with your data.</h1><p>Download a finished dashboard and a short mapping prompt. Attach both with your own Excel or CSV files, and Claude only needs to customize the data—not build the product from zero.</p><a className="kit-primary" href="#downloads">Download the ready-made kit</a></div><div className="kit-hero-visual"><div className="kit-window"><div className="kit-window-bar"><i/><i/><i/><span>YOUR EXECUTIVE OVERVIEW</span></div><div className="kit-kpis"><div><span>Revenue</span><b>Your data</b><small>Calculated from source</small></div><div><span>Operations</span><b>Adaptive</b><small>Available modules only</small></div><div><span>Coverage</span><b>Visible</b><small>No invented values</small></div></div><div className="kit-chart"><div><i style={{height:"48%"}}/><em style={{height:"62%"}}/></div><div><i style={{height:"72%"}}/><em style={{height:"85%"}}/></div><div><i style={{height:"54%"}}/><em style={{height:"68%"}}/></div><div><i style={{height:"82%"}}/><em style={{height:"93%"}}/></div><div><i style={{height:"64%"}}/><em style={{height:"76%"}}/></div></div></div></div></section>

    <section className="kit-how"><div className="kit-eyebrow">HOW IT WORKS</div><h2>Your dashboard in one focused AI task.</h2><div className="kit-steps"><article><span>01</span><h3>Download two files</h3><p>Get the finished HTML starter and the lightweight “use my data” Markdown prompt.</p></article><article><span>02</span><h3>Add your own data</h3><p>Attach your Excel workbook or CSV files. Sheet names and columns do not need to match Eventbot.</p></article><article><span>03</span><h3>Upload all to Claude</h3><p>Use a new chat and attach the HTML, Markdown prompt and your data in the same message.</p></article><article><span>04</span><h3>Download your HTML</h3><p>Claude maps available fields and returns one responsive, offline dashboard containing your real data.</p></article></div></section>

    <section className="kit-downloads" id="downloads"><div className="kit-download-intro"><div className="kit-eyebrow">YOUR ESSENTIAL DOWNLOADS</div><h2>Start with the finished product.</h2><p>The first two files are all a CEO needs. Sample data and the full product specification are optional resources for demonstrations and advanced rebuilding.</p></div><div className="kit-file-grid">
      <article className="featured"><div className="kit-file-top"><span className="kit-file-icon">HTML</span><span>Ready-made · Offline</span></div><h3>Dashboard starter</h3><p>A complete responsive dashboard with embedded demonstration data, interactions, CEO/Manager views and no installation requirement.</p><ul><li>Customize instead of rebuilding</li><li>Works directly in a browser</li><li>Desktop, tablet and mobile</li><li>No API key required</li></ul><a href="/api/resources/starter" download>Download HTML starter <span>↓</span></a></article>
      <article className="featured"><div className="kit-file-top"><span className="kit-file-icon">MD</span><span>Short · Free-plan friendly</span></div><h3>Use my data prompt</h3><p>A focused instruction telling Claude how to inspect arbitrary files, map unfamiliar columns and safely customize the starter.</p><ul><li>Works with Excel or CSV</li><li>Handles missing sections</li><li>Never invents unavailable values</li><li>Requests one final HTML file</li></ul><a href="/api/resources/mapping" download>Download mapping prompt <span>↓</span></a></article>
      <article><div className="kit-file-top"><span className="kit-file-icon">XLSX</span><span>42 KB · Optional demo</span></div><h3>Populated sample data</h3><p>Use this only to demonstrate the workflow when an organisation is not ready to share its own information.</p><ul><li>19 connected data tables</li><li>Indian currency and dates</li><li>No private client information</li><li>Replaceable with their workbook</li></ul><a href="/api/resources/data" download>Download sample workbook <span>↓</span></a></article>
      <article><div className="kit-file-top"><span className="kit-file-icon">MD+</span><span>Advanced · Full rebuild</span></div><h3>Full product specification</h3><p>The detailed design and analytics brief for paid plans or coding assistants capable of rebuilding the dashboard from scratch.</p><ul><li>CEO and Operations views</li><li>Complete design system</li><li>All analytics modules</li><li>Optional for customization</li></ul><a href="/api/resources/prompt" download>Download full specification <span>↓</span></a></article>
    </div></section>

    <section className="kit-paste"><div><div className="kit-eyebrow">PASTE THIS WITH THE FILES</div><h2>Keep the request small and direct.</h2></div><div className="kit-code"><span>CLAUDE INSTRUCTION</span><p>“Customize the attached HTML dashboard using my attached Excel/CSV data and follow the attached Markdown mapping instructions. Do not rebuild from scratch. Preserve the design and interactions, map columns by meaning, hide unsupported insights instead of inventing values, and return one downloadable self-contained file named my_executive_dashboard.html.”</p></div></section>

    <section className="kit-data"><div><div className="kit-eyebrow">OPTIONAL DEMONSTRATION DATA</div><h2>One workbook.<br/>The whole agency.</h2><p>The sample shows what a fully connected agency dashboard can contain. Recipients can replace it with any subset of their own data.</p></div><div className="kit-tags">{tables.map((table,index)=><span key={table}><b>{String(index+1).padStart(2,"0")}</b>{table}</span>)}</div></section>

    <section className="kit-note"><div><span>Flexible by design</span><h2>Their data does not need to look exactly like ours.</h2></div><p>The mapping prompt profiles differently named or incomplete Excel/CSV files and adapts the dashboard to what is genuinely available. Missing information is never treated as zero. For sensitive client data, use an approved AI account and remove confidential or personally identifiable fields before uploading.</p></section>
    <footer className="kit-footer"><div className="kit-brand">Event<em>bot</em></div><p>Executive intelligence and operational control—adapted to your organisation.</p><a href="#downloads">Download your kit ↑</a></footer>
  </main>;
}
