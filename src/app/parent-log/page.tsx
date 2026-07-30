import { redirect } from "next/navigation";

// Parent Log merged into the Behavior & Contact Log page - redirect anyone
// who still has this URL bookmarked or linked.
export default function ParentLogRedirect() {
  redirect("/behavior");
}
