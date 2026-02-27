import { getAuditLogs } from "@/actions/user-actions"
import { AuditLogClient } from "./AuditLogClient"

export default async function AuditLogPage() {
  const { data, error } = await getAuditLogs({ limit: 200 })

  return <AuditLogClient logs={data} error={error} />
}
