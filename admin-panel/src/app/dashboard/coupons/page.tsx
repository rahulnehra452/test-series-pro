import { requireAdminRole } from "@/lib/auth/admin"
import { getCoupons } from "@/actions/advanced-actions"
import { getAffiliates, getReferrals, getFlashSales, getBundleDeals } from "@/actions/marketing-actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { MarketingHub } from "./MarketingHub"

export default async function CouponsPage() {
  await requireAdminRole(["super_admin"])

  const [coupons, affiliates, referrals, flashSales, bundleDeals, seriesData] = await Promise.all([
    getCoupons(),
    getAffiliates(),
    getReferrals(),
    getFlashSales(),
    getBundleDeals(),
    createAdminClient().from('test_series').select('id, title').order('title'),
  ])

  return (
    <MarketingHub
      coupons={coupons.data || []}
      affiliates={affiliates.data || []}
      referrals={referrals.data || []}
      flashSales={flashSales.data || []}
      bundleDeals={bundleDeals.data || []}
      series={seriesData.data || []}
    />
  )
}
