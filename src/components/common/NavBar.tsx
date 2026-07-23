"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import AuthDialog from "@/components/Auth"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/hook/redux"
import { IROLE } from "@/types/role"
import { postApi } from "@/utils/common"
import { LOGOUT } from "@/utils/APIConstant"

function NavBar() {
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const user = useAppSelector(state => state.merchant).merchant

  const links = [
    { name: "Home", href: "/" },
    { name: "About", href: "/#feature" }
  ]

  const handleLogOut = async () => {
    if (typeof window === "undefined") return;
    await postApi({
      url: LOGOUT
    })
    window.location.href = "/"
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-[#A18D6D]">QR</span>Menu
          </Link>

          {/* Desktop Navigation */}
          {/* Conditionally renders links based on whether the user is logged in or not */}
          <nav className="hidden md:flex items-center gap-8">
            {/* Show public links if no user is authenticated */}
            {!user && links.map(link => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                {link.name}
              </Link>
            ))}

            {!user && (
              <button 
                onClick={() => setAuthOpen(true)} 
                className="text-sm font-medium text-white bg-orange-600 px-4 py-2 rounded-full hover:bg-orange-500 transition-colors"
              >
                Login
              </button>
            )}

            {/* Authenticated user links: Show dashboard link only if user is a merchant */}
            {user && user.role === "MERCHANT" &&
              <Link
                href={`/dashboard/${user._id}?uid=${user.uid}`}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Dashboard
              </Link>}

              {user && (
              <Link
                href={`/detail/${user._id}`}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Transactions
              </Link>
              )}

              {user && (
                <button onClick={handleLogOut} className="text-sm cursor-pointer font-medium text-gray-600 hover:text-black transition-colors">
                  LogOut
                </button>
              )}

          </nav>

          <div className="flex items-center gap-4">



            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {/* Expands or collapses based on the 'open' state */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          open ? "max-h-60 border-t" : "max-h-0"
        )}
      >
        <nav className="flex flex-col px-4 py-4 gap-3 bg-white">
          {!user && links.map(link => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-gray-700 hover:text-black"
            >
              {link.name}
            </Link>
          ))}

          {!user && (
            <button 
              onClick={() => { setAuthOpen(true); setOpen(false); }} 
              className="text-sm text-left font-medium text-gray-700 hover:text-black"
            >
              Login
            </button>
          )}
          {user && user.role === IROLE.MERCHANT &&
            <Link
              href={`/dashboard/${user._id}?uid=${user.uid}`}
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              Dashboard
            </Link>}

            {user && (
              <Link
                href={`/detail/${user._id}`}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Transactions
              </Link>
            )}
              {user && (
                <button onClick={handleLogOut} className="text-sm cursor-pointer font-medium text-gray-600 hover:text-black transition-colors">
                  LogOut
                </button>
              )}
              
        </nav>
      </div>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  )
}

export default NavBar
