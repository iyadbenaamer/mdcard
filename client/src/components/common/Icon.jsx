function Icon({ name, className = "w-6" }) {
  const baseProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "prepaid":
      return (
        <svg {...baseProps}>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19" />
          <path d="M7 15h3" />
        </svg>
      );
    case "pos":
      return (
        <svg {...baseProps}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h3" />
        </svg>
      );
    case "support":
      return (
        <svg {...baseProps}>
          <path d="M4 11a8 8 0 0 1 16 0" />
          <rect x="2.5" y="11" width="4" height="6" rx="1" />
          <rect x="17.5" y="11" width="4" height="6" rx="1" />
          <path d="M12 19v2" />
        </svg>
      );
    case "network":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16" />
          <path d="M12 4a12 12 0 0 1 0 16" />
          <path d="M12 4a12 12 0 0 0 0 16" />
        </svg>
      );
    case "secure":
      return (
        <svg {...baseProps}>
          <path d="M12 3l7 3v5c0 4.5-2.8 7.3-7 10-4.2-2.7-7-5.5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "speed":
      return (
        <svg {...baseProps}>
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      );
    case "location":
      return (
        <svg {...baseProps}>
          <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case "email":
      return (
        <svg {...baseProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 8l9 6 9-6" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...baseProps}>
          <path d="M20 11.5A8 8 0 0 1 7.5 18L4 19l1-3.3A8 8 0 1 1 20 11.5z" />
          <path d="M9.5 10.2c.4 1.6 2.1 3.1 3.7 3.5" />
        </svg>
      );
    case "phone":
      return (
        <svg {...baseProps}>
          <path d="M6 4h3l1.5 4-2 1.6a14.7 14.7 0 0 0 5.9 5.9l1.6-2L20 15v3a2 2 0 0 1-2.2 2A14.9 14.9 0 0 1 4 6.2 2 2 0 0 1 6 4z" />
        </svg>
      );
    default:
      return null;
  }
}

export default Icon;
