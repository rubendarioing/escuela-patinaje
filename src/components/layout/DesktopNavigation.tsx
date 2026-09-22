import { NavLink } from 'react-router-dom'

type NavLinkItem = {
  to: string
  label: string
}

type DesktopNavigationProps = {
  links: NavLinkItem[]
}

export function DesktopNavigation({ links }: DesktopNavigationProps) {
  return (
    <nav className="hidden gap-6 sm:flex">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `text-sm font-medium ${isActive ? 'text-sky-700' : 'text-slate-600 hover:text-sky-700'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
