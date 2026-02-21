"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Ban, ShieldCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateUserProStatus, updateUserSuspension } from "@/actions/user-actions"
import { toast } from "sonner"
import { format } from "date-fns"

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  is_pro: boolean
  is_suspended?: boolean
  created_at: string
  last_active_at: string | null
}

export const columns: ColumnDef<Profile>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => row.original.full_name || "N/A",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "N/A",
  },
  {
    accessorKey: "is_pro",
    header: "Plan",
    cell: ({ row }) => (
      <Badge variant={row.original.is_pro ? "default" : "secondary"}>
        {row.original.is_pro ? "PRO" : "Free"}
      </Badge>
    ),
  },
  {
    accessorKey: "is_suspended",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.is_suspended ? "destructive" : "outline"}>
        {row.original.is_suspended ? "Suspended" : "Active"}
      </Badge>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) =>
      format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
  {
    accessorKey: "last_active_at",
    header: "Last Active",
    cell: ({ row }) =>
      row.original.last_active_at
        ? format(new Date(row.original.last_active_at), "MMM d, HH:mm")
        : "Never",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original

      const handleProToggle = async () => {
        const promise = updateUserProStatus(user.id, !user.is_pro)
        toast.promise(promise, {
          loading: "Updating status...",
          success: (res) => {
            if (res.error) throw new Error(res.error)
            return user.is_pro ? "Pro access revoked" : "Pro access granted"
          },
          error: (err) => err.message,
        })
      }

      const handleSuspensionToggle = async () => {
        const promise = updateUserSuspension(user.id, !user.is_suspended)
        toast.promise(promise, {
          loading: "Updating status...",
          success: (res) => {
            if (res.error) throw new Error(res.error)
            return user.is_suspended ? "Account unsuspended" : "Account suspended"
          },
          error: (err) => err.message,
        })
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
              Copy User ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProToggle}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {user.is_pro ? "Revoke Pro Status" : "Grant Pro Status"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSuspensionToggle} className={user.is_suspended ? "text-green-600" : "text-red-600"}>
              <Ban className="mr-2 h-4 w-4" />
              {user.is_suspended ? "Unsuspend Account" : "Suspend Account"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
