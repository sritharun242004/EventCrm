import Link from "next/link";

/**
 * A filter chip that routes to a URL — used on the Events and Market pages
 * for the type / signal filters.
 */
export function ChipLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link className={"chip " + (active ? "on" : "")} href={href}>
      {label}
    </Link>
  );
}
