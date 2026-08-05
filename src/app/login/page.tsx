import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

type Search = Promise<{ returnTo?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  if (await getSessionUser()) redirect("/overview");
  const { returnTo = "/overview" } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-name login-brand">Event<em>bot</em></div>
        <div className="crumb">Producer&apos;s Console</div>
        <h1>Welcome back</h1>
        <p>Sign in to manage events, budgets, vendors, teams, and RFQs.</p>
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}
