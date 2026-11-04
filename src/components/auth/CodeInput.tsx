import { Input } from '@/components/ui/input'

/** Numeric one-time code from the email (6–10 digits). */
export function CodeInput({
  value,
  onChange,
  id = 'code',
}: {
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={10}
      placeholder="Code from email"
      className="text-center text-xl tracking-[0.3em] placeholder:tracking-normal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
    />
  )
}
