import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roleScope";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  if (user.role === "principal") redirect("/principal");
  redirect("/dashboard");
}
