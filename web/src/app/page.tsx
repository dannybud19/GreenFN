import { Dashboard } from "@/components/Dashboard";
import { buildInitial } from "@/lib/initial.server";

export default async function Home() {
  const initial = await buildInitial();
  return <Dashboard initial={initial!} />;
}
