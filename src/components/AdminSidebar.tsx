import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Users, 
  Eye, 
  Settings,
  BarChart3,
  Bell
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const adminItems = [
  { title: "Admin Panel", url: "/admin", icon: Settings },
  { title: "Operations", url: "/admin/operations", icon: Activity },
  { title: "Compliance", url: "/admin/compliance", icon: Shield },
  { title: "Observability", url: "/admin/observability", icon: Eye },
]

const monitoringItems = [
  { title: "CAPTCHA Assist", url: "/admin/captcha-assist", icon: AlertTriangle },
  { title: "TOS Compliance", url: "/admin/tos-compliance", icon: Bell },
  { title: "Partnerships", url: "/admin/partnerships", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
]

export function AdminSidebar() {
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Monitoring & Automation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitoringItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
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