import React from 'react'
import MenuInterface from "@/components/MenuInterface"

async function page({
  params,
  searchParams,
}: {
  params: Promise<{ merchantId: string }>
  searchParams: Promise<{ table?: string | string[] }>
}) {
  const param = await params;
  const query = await searchParams;
  const merchantId = param.merchantId;
  const table = Array.isArray(query?.table) ? query.table[0] : query?.table;

  return (
    <MenuInterface merchantId={merchantId} table={table} />
  )
}

export default page
