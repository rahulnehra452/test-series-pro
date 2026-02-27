import { getSubscriptionStats } from "@/actions/user-actions"
import { getSubscriptionEvents } from "@/actions/subscription-actions"
import { SubscriptionsClient } from "./SubscriptionsClient"

export default async function SubscriptionsPage() {
  const [stats, eventsRes] = await Promise.all([
    getSubscriptionStats(),
    getSubscriptionEvents(50)
  ])

  if (stats.error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Subscriptions</h2>
        <p className="text-sm text-red-500">Error: {stats.error}</p>
      </div>
    )
  }

  const events = eventsRes.data || []

  return <SubscriptionsClient stats={stats} events={events} />
}
