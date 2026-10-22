import type { ReactNode } from 'react'

// Original line icons drawn for this project (24×24 grid, stroked).
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const PencilIcon = () => (
  <Icon>
    <path d="M4 20l1-4L16 5l3 3L8 19z" />
    <path d="M14 7l3 3" />
  </Icon>
)

export const BrushIcon = () => (
  <Icon>
    <path d="M20 4c-3 1-8 6-10 9l1.5 1.5C14 12.5 19 7 20 4z" />
    <path d="M9 14c-2 0-4 1.5-4 4 0 1-1 2-2 2 2 1 6 1 7-1.5.6-1.5.5-3-1-4.5z" />
  </Icon>
)

export const EraserIcon = () => (
  <Icon>
    <path d="M8 20l-4-4 10-10 6 6-8 8z" />
    <path d="M9 11l6 6" />
    <path d="M12 20h8" />
  </Icon>
)

export const UndoIcon = () => (
  <Icon>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 010 10h-3" />
  </Icon>
)

export const RedoIcon = () => (
  <Icon>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9a5 5 0 000 10h3" />
  </Icon>
)

export const ClearIcon = () => (
  <Icon>
    <path d="M5 7h14" />
    <path d="M10 7V5h4v2" />
    <path d="M7 7l1 13h8l1-13" />
  </Icon>
)

export const SaveIcon = () => (
  <Icon>
    <path d="M12 4v11" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 20h14" />
  </Icon>
)
