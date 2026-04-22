import Link from "next/link"
import { getHomeMetrics } from "@/lib/home-metrics"
import { HomeContent } from "./home-content"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const metrics = await getHomeMetrics()
  return <HomeContent metrics={metrics} />
}
