import { redirect } from "next/navigation"

// /v2 was the staging route while we redesigned. The new design is now live
// at the root, so anything still pointing at /v2 should land on /.
export default function V2Redirect() {
  redirect("/")
}
