"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileNavLinks({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Small screens: hamburger toggle + collapsible stacked menu */}
      <div className="sm:hidden max-w-6xl mx-auto px-4 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm text-slate-600 font-medium"
          aria-expanded={open}
        >
          <span className="text-lg leading-none">☰</span>
          Menu
        </button>
        {open && (
          <div className="flex flex-col gap-1 mt-2 pb-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-sky-600 py-1"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Larger screens: normal horizontal wrapping row, no hamburger */}
      <div className="hidden sm:flex max-w-6xl mx-auto px-4 py-2 flex-wrap gap-x-4 gap-y-2 text-sm items-center">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap text-slate-600 hover:text-sky-600">
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}
