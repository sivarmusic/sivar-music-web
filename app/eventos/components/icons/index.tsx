// Iconos del sistema "Rótulo de medianoche" (trazo currentColor, 24x24).
// Generados a partir de assets/icons/sprite del paquete de diseño.
import type { SVGProps } from 'react'

const PATHS = {
  'home': (<><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5M10 20v-5.5h4V20" /></>),
  'search': (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></>),
  'calendar': (<><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  'clock': (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  'map-pin': (<><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>),
  'ticket': (<><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4Z" /><path d="M14.5 6.5v1.5M14.5 11v2M14.5 16v1.5" /></>),
  'user': (<><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>),
  'users': (<><circle cx="9" cy="8.5" r="3.3" /><path d="M2.8 19.5c.9-3 3.2-4.7 6.2-4.7s5.3 1.7 6.2 4.7" /><path d="M15.5 5.6a3.3 3.3 0 0 1 0 5.8M17.2 14.9c2 .5 3.4 2 4 4.6" /></>),
  'minus': (<><path d="M5 12h14" /></>),
  'plus': (<><path d="M12 5v14M5 12h14" /></>),
  'copy': (<><rect x="8.5" y="8.5" width="12" height="12" rx="1.5" /><path d="M15.5 8.5V5A1.5 1.5 0 0 0 14 3.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" /></>),
  'check': (<><path d="m4.5 12.5 5 5 10-11" /></>),
  'check-circle': (<><circle cx="12" cy="12" r="9" /><path d="m7.8 12.3 2.9 2.9 5.5-6" /></>),
  'x': (<><path d="M6 6l12 12M18 6 6 18" /></>),
  'x-circle': (<><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>),
  'alert-triangle': (<><path d="M10.3 4.2 2.6 17.6A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-2.9L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17h.01" /></>),
  'alert-circle': (<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></>),
  'info': (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  'hourglass': (<><path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 4.5 4.5 5.5 4.5 8.5s-4.5 4-4.5 8.5M16.5 3.5c0 4.5-4.5 5.5-4.5 8.5s4.5 4 4.5 8.5" /></>),
  'upload': (<><path d="M12 15.5V4M7 8.5l5-5 5 5" /><path d="M4 15v3.5A2 2 0 0 0 6 20.5h12a2 2 0 0 0 2-2V15" /></>),
  'download': (<><path d="M12 4v11.5M7 10.5l5 5 5-5" /><path d="M4 15v3.5A2 2 0 0 0 6 20.5h12a2 2 0 0 0 2-2V15" /></>),
  'file': (<><path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8Z" /><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" /></>),
  'image': (<><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><circle cx="9" cy="10" r="1.8" /><path d="m20.5 16-5-5-8.5 8.5" /></>),
  'bank': (<><path d="M3.5 9 12 4l8.5 5M5 9v8.5M9.5 9v8.5M14.5 9v8.5M19 9v8.5M3.5 20.5h17" /></>),
  'arrow-left': (<><path d="M19 12H5M11 6l-6 6 6 6" /></>),
  'arrow-right': (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
  'chevron-down': (<><path d="m6 9 6 6 6-6" /></>),
  'chevron-right': (<><path d="m9 6 6 6-6 6" /></>),
  'chevron-left': (<><path d="m15 6-6 6 6 6" /></>),
  'mail': (<><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>),
  'phone': (<><path d="M6.6 3.5h2.6l1.4 4-2 1.4a11 11 0 0 0 6.5 6.5l1.4-2 4 1.4v2.6a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.6 5.6a2 2 0 0 1 2-2.1Z" /></>),
  'whatsapp': (<><path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6Z" /><path d="M9.2 8.6c.2-.5.6-.6 1-.6l.8 1.8-.6.9a5 5 0 0 0 2.5 2.5l.9-.6 1.8.8c0 .4-.1.8-.6 1-1.6.9-6.6-2.1-5.8-5.8Z" /></>),
  'lock': (<><rect x="4.5" y="10.5" width="15" height="10" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>),
  'eye': (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>),
  'eye-off': (<><path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-2.6 3.4M6.5 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" /></>),
  'qr': (<><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><path d="M13.5 13.5h3v3M20.5 13.5v.01M17 20.5h3.5V17M13.5 17v3.5" /></>),
  'camera': (<><path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5L9 4.5h6L16.5 7H19a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5Z" /><circle cx="12" cy="13" r="3.6" /></>),
  'scan': (<><path d="M3.5 8V5A1.5 1.5 0 0 1 5 3.5h3M16 3.5h3A1.5 1.5 0 0 1 20.5 5v3M20.5 16v3a1.5 1.5 0 0 1-1.5 1.5h-3M8 20.5H5A1.5 1.5 0 0 1 3.5 19v-3M3.5 12h17" /></>),
  'flashlight': (<><path d="M8 3.5h8v4l-2 3v10h-4v-10l-2-3Z" /><path d="M12 13v2" /></>),
  'bar-chart': (<><path d="M4 20.5h16M7 20.5v-6M12 20.5V5M17 20.5v-10" /></>),
  'gift': (<><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8.5h14V12M12 8v12.5M12 8C10.5 4 6.5 4.5 7.6 7c.4.9 2.4 1 4.4 1Zm0 0c1.5-4 5.5-3.5 4.4-1-.4.9-2.4 1-4.4 1Z" /></>),
  'log-out': (<><path d="M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5M9.5 16.5 4.5 12l5-4.5M4.5 12h11" /></>),
  'menu': (<><path d="M4 7h16M4 12h16M4 17h10" /></>),
  'sliders': (<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>),
  'globe': (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.8 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.8-3.8-9S9.4 5.6 12 3Z" /></>),
  'refresh': (<><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6l1.7-2.1M20 20v-4.5h-4.5" /></>),
  'eye-slash-ticket': (<><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4Z" /><path d="M4 4l16 16" /></>),
  'music': (<><path d="M9 18V5.5l11-2V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>),
  'mic': (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3.5" /></>),
  'external': (<><path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>),
  'edit': (<><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z" /><path d="m13.5 6.5 4 4" /></>),
  'trash': (<><path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13.5h10L18 7" /></>),
  'search-x': (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4M9 9l4 4M13 9l-4 4" /></>),
  'instagram': (<><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.2 6.8h.01" /></>),
  'spotify': (<><circle cx="12" cy="12" r="9" /><path d="M7 9.5c3.5-1 7.5-.6 10.5 1M7.6 12.6c2.8-.7 6-.4 8.4 1M8.3 15.5c2.2-.5 4.4-.3 6.3.8" /></>),
  'youtube': (<><path d="M21 8.2a2.6 2.6 0 0 0-1.8-1.9C17.6 5.9 12 5.9 12 5.9s-5.6 0-7.2.4A2.6 2.6 0 0 0 3 8.2 27 27 0 0 0 2.6 12 27 27 0 0 0 3 15.8a2.6 2.6 0 0 0 1.8 1.9c1.6.4 7.2.4 7.2.4s5.6 0 7.2-.4a2.6 2.6 0 0 0 1.8-1.9 27 27 0 0 0 .4-3.8 27 27 0 0 0-.4-3.8Z" /><path d="m10.2 9.6 4.2 2.4-4.2 2.4Z" /></>),
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** sm 16 · (default) 20 · lg 24 · xl 40 */
  size?: 'sm' | 'lg' | 'xl'
}

export function Icon({ name, size, className, ...rest }: IconProps) {
  const cls = ['ev-icon', size ? `ev-icon--${size}` : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" focusable="false" {...rest}>
      {PATHS[name]}
    </svg>
  )
}
