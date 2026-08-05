import React from "react";

export function Card({
  title,
  sub,
  link,
  children,
  className,
  style,
}: {
  title?: string;
  sub?: string;
  link?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={"card" + (className ? " " + className : "")} style={style}>
      {(title || sub || link) && (
        <div className="card-head">
          {title ? <h3>{title}</h3> : <span />}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {sub ? <span className="sub">{sub}</span> : null}
            {link ? (
              <a className="link" href={link.href}>
                {link.label}
              </a>
            ) : null}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
