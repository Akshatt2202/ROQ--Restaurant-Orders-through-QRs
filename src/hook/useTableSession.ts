"use client"

import React from "react"
import { useAppDispatch } from "@/hook/redux"
import { syncCartToCheckOut } from "@/store/reducer/checkout"
import { ApiResponse } from "@/utils/api"
import { TABLE_SESSION } from "@/utils/APIConstant"
import { getApi, postApi } from "@/utils/common"
import { TableSessionState } from "@/types/tableSession"

/** How often the other phones at the table are checked for changes. */
const POLL_MS = 3000

/**
 * Joins the table session for a scanned QR and keeps this device in step with
 * everyone else sitting there.
 *
 * Polling is deliberate: it is correct, cheap at one table's scale, and needs
 * no socket infrastructure. Only version numbers travel every 3s - the cart is
 * refetched only when the version actually moves. Swapping this for SSE over
 * Redis pub/sub later is a change to this hook alone.
 */
export function useTableSession(merchantId: string, table?: string) {
  const dispatch = useAppDispatch()
  const [session, setSession] = React.useState<TableSessionState | null>(null)
  const cartVersionRef = React.useRef<number>(-1)
  const hasSessionRef = React.useRef(false)

  const applyState = React.useCallback(
    (next: TableSessionState | null) => {
      setSession(next)
      hasSessionRef.current = Boolean(next)

      if (!next) {
        cartVersionRef.current = -1
        return
      }

      if (cartVersionRef.current !== next.cartVersion) {
        const isFirst = cartVersionRef.current === -1
        cartVersionRef.current = next.cartVersion

        // Skip the first sync - the page already loads the cart on mount.
        if (!isFirst) dispatch(syncCartToCheckOut({ dispatch }))
      }
    },
    [dispatch]
  )

  React.useEffect(() => {
    if (!merchantId) return

    let cancelled = false

    const join = async () => {
      if (!table) return null

      const res = await postApi<ApiResponse<TableSessionState>>({
        url: TABLE_SESSION,
        values: { merchantId, tableName: table },
      })

      return res?.success ? res.data ?? null : null
    }

    const refresh = async () => {
      const res = await getApi<ApiResponse<TableSessionState>>({ url: TABLE_SESSION })
      let next = res?.success ? res.data ?? null : null

      // No live session but we know the table: the previous one was paid for or
      // the cookie expired, so open the next one rather than going quiet.
      if (!next && table) next = await join()

      if (!cancelled) applyState(next)
    }

    refresh()

    const interval = setInterval(() => {
      // A customer on a plain link has no table to watch - don't poll for one.
      if (!table && !hasSessionRef.current) return
      refresh()
    }, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [merchantId, table, applyState])

  return session
}
