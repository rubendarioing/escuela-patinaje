import { useEffect, useRef } from 'react'

// Mueve el foco al abrir el modal y evita que Tab se escape hacia el contenido de atrás
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return
    const container = containerRef.current

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))

    const first = focusableElements[0]
    const last = focusableElements[focusableElements.length - 1]
    first?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusableElements.length === 0) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [active])

  return containerRef
}
