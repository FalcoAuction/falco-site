"use client"

export function PhoneLink({
  number,
  display,
  className,
}: {
  number: string
  display: string
  className?: string
}) {
  return (
    <a
      href={`tel:${number.replace(/\D/g, "")}`}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {display}
    </a>
  )
}
