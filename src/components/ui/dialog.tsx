import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Modal built on the native <dialog> element (focus trap + Esc handled by the browser). */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-surface p-0 text-fg backdrop:bg-black/50"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-bg">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
