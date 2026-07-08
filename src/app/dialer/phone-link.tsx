"use client"

/** Tap-to-call element that is safe to render INSIDE another link.
 *
 *  The dialer queue wraps each row in a <Link> (an <a>); nesting a
 *  real <a href="tel:..."> inside it is invalid HTML — React 19 logs
 *  hydration errors on every row and browsers may split the DOM.
 *  Render a button-like span instead and fire the tel: URL manually,
 *  swallowing the event so the row navigation doesn't also trigger.
 */
export function PhoneLink({
  number,
  display,
  className,
}: {
  number: string
  display: string
  className?: string
}) {
  const tel = `tel:${number.replace(/\D/g, "")}`
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        window.location.href = tel
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          e.stopPropagation()
          window.location.href = tel
        }
      }}
      className={`cursor-pointer ${className ?? ""}`}
    >
      {display}
    </span>
  )
}
