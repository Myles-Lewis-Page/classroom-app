import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roleScope";

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  if (user.role === "teacher") redirect("/dashboard");
  return <>{children}</>;
}
