"use client"
import React from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog"
import SignIn from "./SignIn"
import Singup from "./Singup"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { ApiResponse } from "@/utils/api"
import { useAppDispatch } from "@/hook/redux"
import { setMerchant } from "@/store/reducer/merchant"
import { getApi } from "@/utils/common"
import { SESSION } from "@/utils/APIConstant"
import { IROLE } from "@/types/role"
import { IMerchants } from "@/types/merchant"

function AuthDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [panel, setPanel] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const router = useRouter()
  const dispatch = useAppDispatch();

  const handleChange = () => setPanel((p) => !p)

  /**
   * Effect hook to check if the user already has an active session
   * when the authentication dialog is opened.
   */
  React.useEffect(() => {
    if (!open) return

    const checkSession = async () => {
      setChecking(true)

      try {
        // Fetch session data from the API
        const res = await getApi<ApiResponse<IMerchants>>({
          url: SESSION
        })

        if (res?.success) {
          toast.success(`Welcome back ${res.data.name} 👋`)
          
          // Update the global Redux store with the merchant data
          dispatch(setMerchant(res.data))
          
          onClose() // Close the dialog
          
          // Redirect the user to their dashboard if they are a merchant
          const urlToredirect = res.data.role === IROLE.MERCHANT ? `/dashboard/${res.data._id}?uid=${res.data.uid}` : null
          if (urlToredirect) router.push(urlToredirect)
        }
      } catch {
        // If session check fails (e.g. no active session), silently fail
        // and allow the user to see the login/signup form.
      } finally {
        setChecking(false)
      }
    }

    checkSession()
  }, [open, dispatch, onClose, router])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl bg-[#F8F5F0] px-6 py-8">
        <DialogTitle className="hidden">Authentication</DialogTitle>
        <DialogDescription className="hidden">Login or sign up</DialogDescription>
        {checking ? (
          <p className="text-center text-sm text-zinc-500">
            Checking session...
          </p>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-zinc-900">
                {!panel ? `Get Started with Qr Menu`:"Login to Qr Menu"}
              </h2>
            </div>

            {panel ? (
              <SignIn onChange={handleChange} onClose={onClose} />
            ) : (
              <Singup onChange={handleChange} onClose={onClose} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AuthDialog
