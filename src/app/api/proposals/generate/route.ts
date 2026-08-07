import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

function extractJson(text:string) {
  const clean=text.replace(/```json|```/g,"").trim(); const start=clean.indexOf("{"); const end=clean.lastIndexOf("}");
  if(start<0||end<=start) throw new Error("The AI response did not contain complete JSON");
  return JSON.parse(clean.slice(start,end+1));
}

async function generateWithOpenAI(prompt:string, key:string) {
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"content-type":"application/json","authorization":`Bearer ${key}`},
    body:JSON.stringify({
      model:process.env.OPENAI_MODEL||"gpt-5.6-sol",
      instructions:"Return only the requested valid JSON object. Do not use markdown fences or add commentary.",
      input:prompt,
      max_output_tokens:4000,
      reasoning:{effort:"low"},
      store:false,
    }),
  });
  const data=await response.json();
  if(!response.ok) throw new Error(data?.error?.message||"OpenAI request failed");
  const text=typeof data.output_text==="string"
    ? data.output_text
    : (data.output||[]).flatMap((item:{content?:Array<{type:string;text?:string}>})=>item.content||[]).filter((item:{type:string})=>item.type==="output_text").map((item:{text?:string})=>item.text||"").join("\n");
  return extractJson(text);
}

async function generateWithClaude(prompt:string, key:string) {
  const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||"claude-sonnet-4-20250514",max_tokens:3000,temperature:.35,messages:[{role:"user",content:prompt}]})});
  const data=await response.json();
  if(!response.ok) throw new Error(data?.error?.message||"Claude request failed");
  const text=(data.content||[]).filter((block:{type:string})=>block.type==="text").map((block:{text:string})=>block.text).join("\n");
  return extractJson(text);
}

export async function POST(request:Request) {
  if(!await getSessionUser()) return NextResponse.json({error:"Unauthorized"},{status:401});
  const openAIKey=process.env.OPENAI_API_KEY;
  const anthropicKey=process.env.ANTHROPIC_API_KEY;
  if(!openAIKey&&!anthropicKey) return NextResponse.json({error:"No AI provider is configured"},{status:503});
  const {brief,caseStudies,rateItems}=await request.json();
  if(typeof brief!=="string"||brief.trim().length<30) return NextResponse.json({error:"A meaningful client brief is required"},{status:400});
  const prompt=`You are the commercial director of a premium Indian event management agency writing for a CEO or senior decision-maker. Turn the client enquiry into a confident, concise, boardroom-ready proposal. Lead with business outcomes, quantified scale and delivery assurance. Avoid generic hype, weak language and invented achievements. Use past events only as factual proof. Use supplied rate items where relevant and preserve meaningful budget headroom for venue, upgrades and contingency. Return ONLY valid compact JSON with keys: client, company, title, eventType, city, date, attendees (number), budget (number INR), objective (a confident 35-55 word executive outcome statement), concept (a distinctive 45-70 word creative idea), scope (exactly 5 outcome-led strings), lines (6-10 objects with name, quantity, unit, rate), proofIds (up to 3 numeric IDs selected for relevance), nextSteps (a decisive 45-65 word approval and mobilization statement).\n\nCLIENT ENQUIRY:\n${brief}\n\nPAST EVENTS:\n${JSON.stringify(caseStudies)}\n\nRATE ITEMS:\n${JSON.stringify(rateItems)}`;
  try {
    const proposal=openAIKey?await generateWithOpenAI(prompt,openAIKey):await generateWithClaude(prompt,anthropicKey!);
    return NextResponse.json(proposal);
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Proposal generation failed"},{status:500}); }
}
