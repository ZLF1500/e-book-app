"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Key } from "lucide-react"

interface GoogleSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoogleSetupModal({ open, onOpenChange }: GoogleSetupModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border-border space-y-4">
        <DialogHeader className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="font-heading text-lg font-bold text-foreground">
              Integrasi Google OAuth
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Endpoint sistem backend Google OAuth telah terhubung secara resmi.
            </DialogDescription>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
