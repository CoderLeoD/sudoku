export function Icon({ name, size = 20 }) {
  const paths = {
    undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2" />,
    redo: <path d="m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h2" />,
    erase: <><path d="m7 21-4-4L15 5l4 4L7 21Z" /><path d="m11 9 4 4M7 21h13" /></>,
    pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    bulb: <><path d="M9 18h6M10 22h4" /><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-1 .8-1.5 1.8-1.5 3.5h-4c0-1.7-.5-2.7-1.5-3.5Z" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <path d="m7 4 13 8-13 8Z" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a9 9 0 1 0 1 7" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    trophy: <><path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0Z" /><path d="M6 6H3v1a4 4 0 0 0 4 4M18 6h3v1a4 4 0 0 1-4 4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
