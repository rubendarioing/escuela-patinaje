import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

type NavLinkItem = {
  to: string
  label: string
}

type MobileNavigationProps = {
  links: NavLinkItem[]
}

export function MobileNavigation({ links }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <nav id="mobile-menu" className="absolute inset-x-0 top-full border-b bg-white shadow-md">
          <ul className="flex flex-col gap-1 p-4">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${
                      isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
