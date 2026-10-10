import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  )
}

export function TimerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M10 2h4" />
    </Svg>
  )
}

export function TicketIcon(props: IconProps) {
  return (
    <Svg {...props} fill="currentColor" stroke="none">
      <path d="M14.6 2.9a1 1 0 0 1 1.4 0l1.5 1.5a1 1 0 0 1 .1 1.3 1.9 1.9 0 0 0 2.7 2.7 1 1 0 0 1 1.3.1l1.5 1.5a1 1 0 0 1 0 1.4L11.6 22.9a1 1 0 0 1-1.4 0l-1.5-1.5a1 1 0 0 1-.1-1.3 1.9 1.9 0 0 0-2.7-2.7 1 1 0 0 1-1.3-.1L3.1 15.8a1 1 0 0 1 0-1.4Zm-.3 6.8a1 1 0 1 0-1.4 1.4 1 1 0 0 0 1.4-1.4Zm-2.8-2.8a1 1 0 1 0-1.4 1.4 1 1 0 0 0 1.4-1.4Zm5.6 5.6a1 1 0 1 0-1.4 1.4 1 1 0 0 0 1.4-1.4Z" />
    </Svg>
  )
}

export function ChevronLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  )
}

export function ChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  )
}

export function ChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </Svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  )
}

export function PopcornIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 8a2 2 0 0 0 0-4 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0 0 4" />
      <path d="M10 22 9 8M14 22l1-14" />
      <path d="M20 8c.5 0 .9.4.8 1l-2.6 12a1 1 0 0 1-1 .8H6.8a1 1 0 0 1-1-.8L3.2 9c-.1-.6.3-1 .8-1Z" />
    </Svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5M12 3v12" />
    </Svg>
  )
}

export function SeatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 11V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5" />
      <path d="M3 11h18v5H3zM6 16v4M18 16v4" />
    </Svg>
  )
}
