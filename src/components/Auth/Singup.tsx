"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { useDispatch } from "react-redux"
import toast from "react-hot-toast"
import { setMerchant } from "@/store/reducer/merchant"
import { ApiResponse } from "@/utils/api"
import PasswordInput from "./Password"
import { postApi } from "@/utils/common"
import { LOGIN } from "@/utils/APIConstant"
import { IROLE } from "@/types/role"
import { IMerchants } from "@/types/merchant"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

function SignIn({ onChange, onClose }: { onChange: () => void, onClose: () => void }) {
    const router = useRouter()
    const [role, setRole] = React.useState<string>(IROLE.MERCHANT)
    const dispatch = useDispatch()

    const handleRoleChange = (e: string) => setRole(e);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const formData = new FormData(e.currentTarget)

        const payload = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            role: role
        }

        const res = await postApi<ApiResponse<IMerchants>>({
            url: LOGIN,
            values: payload as any
        })

        if (res) {
            if (!res.success) {
                toast.error(res.message || "Signup failed")
                return
            }
            dispatch(setMerchant(res.data))

            toast.success("Account created successfully 🎉")
            onClose();

            const urlToredirect = res.data.role === IROLE.MERCHANT ? `/dashboard/${res.data._id}?uid=${res.data.uid}` : "/consumer"
            if (urlToredirect) router.push(urlToredirect)

        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-zinc-700">
                    Your good name *
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Raj Sharma"
                    required
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                    Email address *
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@restaurant.com"
                    required
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <PasswordInput />
            </div>

            <div>
                <Select required={true} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value={IROLE.MERCHANT}>Merchant</SelectItem>
                            <SelectItem value={IROLE.CONSUMER}>Consumer</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>

            <button
                type="submit"
                className="mt-6 h-12 w-full rounded-lg bg-orange-600 text-sm font-semibold text-white shadow-md transition hover:bg-orange-500 active:scale-[0.98]"
            >
                Create Account
            </button>

            <p className="text-center text-xs text-zinc-500">
                Already have an account?{" "}
                <span onClick={onChange} className="cursor-pointer font-medium text-orange-600 hover:underline">
                    Sign in
                </span>
            </p>
        </form>
    )
}

export default SignIn
