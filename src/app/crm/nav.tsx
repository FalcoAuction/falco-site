"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "./icons"

type Item = { href: string; label: string; icon: string; count?: number | null }

export function Nav({ groups }: { groups: { label?: string; items: Item[] }[] }) {
  const path = usePathname()
  const active = (href: string) => (href === "/crm" ? path === "/crm" : path === href || path.startsWith(href + "/"))
  return (
    <nav className="crm-nav" aria-label="CRM">
      {groups.map((g, i) => (
        <div key={i} style={{ display: "contents" }}>
          {g.label ? <div className="crm-nav-label">{g.label}</div> : null}
          {g.items.map((it) => (
            <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}>
              <Icon name={it.icon} />
              <span>{it.label}</span>
              {it.count != null ? <span className="count">{it.count.toLocaleString("en-US")}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
