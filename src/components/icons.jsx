// Iconos de trazo simple (16px por defecto). Heredan el color del texto.
function Svg({ size = 16, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon" {...rest}>
      {children}
    </svg>
  )
}

export const PlusIcon = (p) => <Svg {...p}><path d="M8 3.5v9M3.5 8h9" /></Svg>
export const CloseIcon = (p) => <Svg {...p}><path d="M4 4l8 8M12 4l-8 8" /></Svg>
export const ChevronIcon = (p) => <Svg {...p}><path d="M6 4l4 4-4 4" /></Svg>
export const ArrowUpIcon = (p) => <Svg {...p}><path d="M8 12.5v-9M4.5 7L8 3.5 11.5 7" /></Svg>
export const ArrowDownIcon = (p) => <Svg {...p}><path d="M8 3.5v9M4.5 9L8 12.5 11.5 9" /></Svg>
export const CalendarIcon = (p) => <Svg {...p}><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></Svg>
export const RepoIcon = (p) => <Svg {...p}><path d="M3.5 12.5v-9a1.5 1.5 0 011.5-1.5h7.5v10H5a1.5 1.5 0 00-1.5 1.5zm0 0A1.5 1.5 0 005 14h7.5" /></Svg>
export const BranchIcon = (p) => <Svg {...p}><circle cx="4.5" cy="3.5" r="1.5" /><circle cx="4.5" cy="12.5" r="1.5" /><circle cx="11.5" cy="5" r="1.5" /><path d="M4.5 5v6M11.5 6.5c0 3-7 2-7 4.5" /></Svg>
export const FileIcon = (p) => <Svg {...p}><path d="M9 1.5H4.5A1.5 1.5 0 003 3v10a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 13V5.5L9 1.5z" /><path d="M9 1.5v4h4" /></Svg>
export const ExternalIcon = (p) => <Svg {...p}><path d="M9.5 2.5h4v4M13.5 2.5L7.5 8.5M12 9.5v3a1 1 0 01-1 1H3.5a1 1 0 01-1-1V5a1 1 0 011-1h3" /></Svg>
export const SunIcon = (p) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
  </Svg>
)
export const MoonIcon = (p) => <Svg {...p}><path d="M13.5 9.5A5.5 5.5 0 016.5 2.5a5.5 5.5 0 107 7z" /></Svg>
export const LinkIcon = (p) => <Svg {...p}><path d="M6.5 9.5a3 3 0 004.2 0l2-2a3 3 0 00-4.2-4.2l-.8.8M9.5 6.5a3 3 0 00-4.2 0l-2 2a3 3 0 004.2 4.2l.8-.8" /></Svg>
export const EditIcon = (p) => <Svg {...p}><path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5z" /></Svg>
export const BellIcon = (p) => <Svg {...p}><path d="M4 11.5V7a4 4 0 018 0v4.5l1 1H3l1-1zM6.5 13.5a1.5 1.5 0 003 0" /></Svg>
export const EyeIcon = (p) => <Svg {...p}><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></Svg>
export const TrashIcon = (p) => <Svg {...p}><path d="M3.5 4.5h9M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M12 4.5l-.6 8.3a1.5 1.5 0 01-1.5 1.4H6.1a1.5 1.5 0 01-1.5-1.4L4 4.5" /></Svg>

// Navegación lateral
export const MenuIcon = (p) => <Svg {...p}><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></Svg>
export const BoardIcon = (p) => <Svg {...p}><rect x="2" y="2.5" width="12" height="11" rx="1.5" /><path d="M6 2.5v11M10 2.5v11" /></Svg>
export const ListIcon = (p) => <Svg {...p}><path d="M5.5 4h8M5.5 8h8M5.5 12h8" /><circle cx="2.75" cy="4" r=".6" /><circle cx="2.75" cy="8" r=".6" /><circle cx="2.75" cy="12" r=".6" /></Svg>
export const TreeIcon = (p) => <Svg {...p}><rect x="2" y="2" width="5" height="3.5" rx="1" /><rect x="8.5" y="6.5" width="5.5" height="3" rx="1" /><rect x="8.5" y="11" width="5.5" height="3" rx="1" /><path d="M4.5 5.5v7h4M4.5 8h4" /></Svg>
export const CheckIcon = (p) => <Svg {...p}><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M5.5 8l2 2 3.5-4" /></Svg>
export const SprintIcon = (p) => <Svg {...p}><path d="M13 8a5 5 0 11-1.5-3.55M13 2.5v2.5h-2.5" /></Svg>
export const ChartIcon = (p) => <Svg {...p}><path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" /></Svg>
export const HistoryIcon = (p) => <Svg {...p}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></Svg>
export const TeamIcon = (p) => <Svg {...p}><circle cx="6" cy="5.5" r="2.25" /><path d="M2 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" /><circle cx="11.25" cy="6" r="1.75" /><path d="M11 9.5c1.7 0 3 1 3 3" /></Svg>
