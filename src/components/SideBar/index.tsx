"use client"

import {
  LayoutDashboard,
  Utensils,
  QrCode,
  ShoppingBag,
  BarChart3,
  CreditCard,
  Settings,
  Home,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAppSelector } from "@/hook/redux"
import Link from "next/link"



export default function AppSidebar() {
  const merchantId = useAppSelector(state => state.merchant).merchant?._id
  const uid = useAppSelector(state => state.merchant).merchant?.uid
  const coreItems = [
  {
    title: "Dashboard",
    url: `/dashboard/${merchantId}?uid=${uid}`,
    icon: LayoutDashboard,
  },
  {
    title: "Menu",
    url: "/menu",
    icon: Utensils,
  },
  {
    title: "QR Codes",
    url: `/qr/${merchantId}`,
    icon: QrCode,
  },
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
]

const businessItems = [
  {
    title: "Orders",
    url: `/dashboard/${merchantId}/order`,
    icon: ShoppingBag,
  },
]
  return (
    <Sidebar collapsible="icon" className="pt-16">
      <SidebarContent>

        {/* CORE */}
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* BUSINESS */}
        <SidebarGroup>
          <SidebarGroupLabel>Business</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
