import Image from "next/image";
import Link from "next/link";

const logoSrc = encodeURI("/SIVAR MUSIC GROUP WHITE.svg");

type HeaderLogoProps = {
  className?: string;
  hidden?: boolean;
  href?: string;
  imageClassName?: string;
  priority?: boolean;
  sizeClassName?: string;
  sizes?: string;
};

export default function HeaderLogo({
  className = "",
  hidden = false,
  href,
  imageClassName = "",
  priority = false,
  sizeClassName = "w-[148px] sm:w-[186px] md:w-[210px]",
  sizes = "(min-width: 768px) 210px, (min-width: 640px) 186px, 148px",
}: HeaderLogoProps) {
  const baseClassName = [
    "flex items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
    sizeClassName,
    hidden ? "pointer-events-none -translate-y-1 opacity-0" : "translate-y-0 opacity-100",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const logoImage = (
    <Image
      src={logoSrc}
      alt="Sivar Music Group logo"
      width={9629}
      height={5570}
      priority={priority}
      sizes={sizes}
      className={[
        "h-auto w-full object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)]",
        imageClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );

  if (!href) {
    return (
      <div aria-hidden={hidden || undefined} className={baseClassName}>
        {logoImage}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label="Go to Sivar Music Group home"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={baseClassName}
    >
      {logoImage}
    </Link>
  );
}
