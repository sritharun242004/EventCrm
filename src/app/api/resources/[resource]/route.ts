import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const resources = {
  prompt: {
    filename: "EVENTBOT_DASHBOARD_BUILD_PROMPT.md",
    type: "text/markdown; charset=utf-8",
  },
  data: {
    filename: "EVENTBOT_DASHBOARD_MOCK_DATA.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
} as const;

export async function GET(_:Request,{params}:{params:Promise<{resource:string}>}) {
  const {resource}=await params;
  const item=resources[resource as keyof typeof resources];
  if(!item) return NextResponse.json({error:"Resource not found"},{status:404});
  try {
    const data=resource==="prompt"
      ? await readFile(path.join(process.cwd(),"ceo_dashboard_starter","CLAUDE_DASHBOARD_PROMPT.md"))
      : await readFile(path.join(process.cwd(),"eventbot_dashboard_all_data.xlsx"));
    return new NextResponse(data,{headers:{
      "Content-Type":item.type,
      "Content-Disposition":`attachment; filename="${item.filename}"`,
      "Cache-Control":"public, max-age=3600",
    }});
  } catch {
    return NextResponse.json({error:"Resource is temporarily unavailable"},{status:503});
  }
}
