import Link from "next/link";

type LoginCardProps = {
  href: string;
  title: string;
  description: string;
  icon: "organizer" | "brand";
};

function OrganizerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BrandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

export function LoginCard({ href, title, description, icon }: LoginCardProps) {
  const Icon = icon === "organizer" ? OrganizerIcon : BrandIcon;

  return (
    <Link
      href={href}
      className="group flex w-full items-start gap-4 rounded-2xl border border-nude-300/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brown-500/30 hover:bg-white hover:shadow-md hover:shadow-brown-500/5"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-nude-100 text-brown-600 transition-colors duration-300 group-hover:bg-brown-500/10 group-hover:text-brown-700">
        <Icon />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-brown-800">{title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-brown-500/40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brown-500"
            aria-hidden
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-brown-600/75">
          {description}
        </p>
        <span className="mt-3 inline-block text-xs font-medium uppercase tracking-wider text-brown-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Sign in
        </span>
      </div>
    </Link>
  );
}
