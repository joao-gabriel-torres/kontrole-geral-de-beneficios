/* @ds-bundle: {"format":3,"namespace":"VitalizeDesignSystem_019e1c","components":[],"sourceHashes":{"ui_kits/bosque/BosqueUI.jsx":"d267446d08e0","ui_kits/bosque/TelaAssinatura.jsx":"bdd2c5baeda5","ui_kits/bosque/TelaCancelamento.jsx":"58d85f09f9c8","ui_kits/bosque/TelaComissoes.jsx":"3df8a8f345e1","ui_kits/bosque/TelaCompartilhar.jsx":"afbf085a1000","ui_kits/bosque/TelaContrato.jsx":"74615a499024","ui_kits/bosque/TelaDashboard.jsx":"8b48af399877","ui_kits/bosque/TelaGestaoAVista.jsx":"35e017f87737","ui_kits/bosque/TelaLogin.jsx":"35830235da31","ui_kits/bosque/TelaPagamento.jsx":"e96ca3403cc0","ui_kits/bosque/TelaPerfil.jsx":"13cd8f8e1421","ui_kits/bosque/TelaPipeline.jsx":"e07a206df844","ui_kits/bosque/TelaPlano.jsx":"518627275336","ui_kits/bosque/TelaResultado.jsx":"ad9edbd68755","ui_kits/bosque/TelaSinistro.jsx":"578b89fd27a1","ui_kits/bosque/TelaSupervisor.jsx":"1b342c0e13e8","ui_kits/bosque/ios-frame.jsx":"d67eb3ffe562","ui_kits/crm/ChatPanel.jsx":"1a8dc9adc4de","ui_kits/crm/Dashboard.jsx":"3adbc3c2b107","ui_kits/crm/MeetingCard.jsx":"70a4773ca8cc","ui_kits/crm/Sidebar.jsx":"2e237a0df47e","ui_kits/crm/StatCard.jsx":"dfba760ee6f3","ui_kits/crm/TaskCard.jsx":"d5e053e02e3b","ui_kits/crm/TopBar.jsx":"c3137198567f","ui_kits/crm/VitalizeUI.jsx":"decb55e8e103"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.VitalizeDesignSystem_019e1c = window.VitalizeDesignSystem_019e1c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/bosque/BosqueUI.jsx
try { (() => {
// BosqueUI.jsx — primitives for Vitalize (Bosque whitelabel) mobile prototype
const {
  useState
} = React;
const COLORS = {
  /* AÇÃO — verde vibrante (Stripe / Cash App territory) */
  primary: "#10B981",
  // emerald — botões, FAB, estados ativos, progress
  primaryHover: "#0EA372",
  primaryPress: "#0B8C61",
  primaryTint: "#E7F8F1",
  // surface tint para chips/cards leves
  primaryTintHi: "#D1F1E1",
  /* Marca / ilustração (uso limitado) */
  brandLeaf: "#90D873",
  brandDeep: "#2A5614",
  /* Secundária — laranja Bosque */
  secondary: "#FFA13C",
  secondaryDeep: "#C45F00",
  secondarySoft: "#FFE9D1",
  /* Tipografia / hierarquia — leve, sem preto puro */
  ink: "#1A2118",
  // título principal (suavizado)
  ink2: "#2A3328",
  muted: "#7A8576",
  muted2: "#B0B7AB",
  /* Estrutura */
  line: "#EEF1EA",
  divider: "#E5E8E1",
  surface: "#F7F9F5",
  surfaceAlt: "#FAFBF8",
  bg: "#FFFFFF",
  /* Semânticas */
  success: "#10B981",
  successSoft: "#D1F1E1",
  danger: "#E84A4A",
  dangerSoft: "#FFE1E0",
  warning: "#FFB523",
  warningSoft: "#FFF1D6"
};
function Btn({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  icon,
  iconRight,
  fullWidth,
  style
}) {
  const v = {
    primary: {
      bg: COLORS.primary,
      fg: "#fff"
    },
    secondary: {
      bg: COLORS.secondary,
      fg: "#fff"
    },
    soft: {
      bg: COLORS.primaryTint,
      fg: COLORS.primaryPress
    },
    ghost: {
      bg: "#fff",
      fg: COLORS.ink,
      border: `1px solid ${COLORS.divider}`
    },
    dark: {
      bg: COLORS.ink,
      fg: "#fff"
    },
    danger: {
      bg: COLORS.danger,
      fg: "#fff"
    }
  }[variant];
  const h = size === "lg" ? 52 : size === "md" ? 42 : 34;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      height: h,
      minHeight: h,
      padding: "0 20px",
      borderRadius: 14,
      background: v.bg,
      color: v.fg,
      border: v.border || "none",
      fontFamily: "var(--font-text)",
      fontWeight: 600,
      fontSize: size === "lg" ? 15 : size === "md" ? 13 : 12,
      letterSpacing: "-0.005em",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      cursor: "pointer",
      width: fullWidth ? "100%" : undefined,
      boxShadow: variant === "primary" ? "0 8px 22px rgba(16,185,129,0.32)" : variant === "dark" ? "0 6px 18px rgba(26,33,24,0.18)" : "none",
      transition: "transform 0.08s ease, background 0.15s",
      ...style
    }
  }, icon, children, iconRight);
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  hint
}) {
  const [f, setF] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: COLORS.muted,
      letterSpacing: "0.01em"
    }
  }, label), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 52,
      padding: "0 16px",
      borderRadius: 14,
      background: COLORS.surface,
      border: `1.5px solid ${f ? COLORS.primary : "transparent"}`,
      boxShadow: f ? "0 0 0 4px rgba(16,185,129,0.12)" : "none",
      transition: "all 0.15s"
    }
  }, icon, /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    onChange: e => onChange?.(e.target.value),
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    placeholder: placeholder,
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-text)",
      fontWeight: 500,
      fontSize: 15,
      color: COLORS.ink
    }
  })), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: COLORS.muted2,
      fontWeight: 500
    }
  }, hint));
}
function Card({
  children,
  style,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: "#fff",
      borderRadius: 18,
      padding: 18,
      boxShadow: "0 2px 8px rgba(26,33,24,0.04), 0 12px 28px rgba(26,33,24,0.04)",
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, children);
}
function Pill({
  children,
  tone = "primary",
  style
}) {
  const t = {
    primary: {
      bg: COLORS.primaryTint,
      fg: COLORS.primaryPress
    },
    secondary: {
      bg: COLORS.secondarySoft,
      fg: COLORS.secondaryDeep
    },
    success: {
      bg: COLORS.successSoft,
      fg: "#0B8C61"
    },
    danger: {
      bg: COLORS.dangerSoft,
      fg: "#A8261F"
    },
    warning: {
      bg: COLORS.warningSoft,
      fg: "#A86B00"
    },
    neutral: {
      bg: "#EEF1EA",
      fg: COLORS.muted
    }
  }[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 10px",
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.02em",
      ...style
    }
  }, children);
}
function Avatar({
  name = "U",
  size = 36,
  idx = 0
}) {
  const gradients = ["linear-gradient(135deg,#10B981,#0B8C61)", "linear-gradient(135deg,#FFA13C,#F08A1F)", "linear-gradient(135deg,#E15A93,#B37BE7)", "linear-gradient(135deg,#3D7B1F,#90D873)", "linear-gradient(135deg,#FFB523,#FF8514)"];
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      background: gradients[idx % gradients.length],
      color: "#fff",
      fontWeight: 600,
      fontSize: size * 0.38,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: `0 0 ${size}px`
    }
  }, initials);
}
function Progress({
  value,
  color = COLORS.primary,
  height = 8
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      borderRadius: height / 2,
      background: COLORS.surface,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${Math.min(100, value)}%`,
      height: "100%",
      background: color,
      transition: "width 0.4s"
    }
  }));
}

// Small inline icons (24px, stroke 1.75)
const I = {
  back: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M15 18l-6-6 6-6"
  })),
  fwd: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 18l6-6-6-6"
  })),
  plus: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  })),
  check: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  })),
  user: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 21c0-4 4-7 8-7s8 3 8 7"
  })),
  lock: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "10",
    width: "16",
    height: "11",
    rx: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 10V6a4 4 0 1 1 8 0v4"
  })),
  mail: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "14",
    rx: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m3 7 9 6 9-6"
  })),
  finger: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 11c-2 0-3 2-3 5M9 17c0 1 .3 2 1 3M15 8c-2-2-5-2-7 0M19 12c-2-4-7-5-11-3M5 16c0-3 1-5 3-7"
  })),
  home: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m3 11 9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"
  })),
  funnel: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 4h18l-7 9v6l-4 2v-8z"
  })),
  wallet: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "6",
    width: "18",
    height: "14",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 13h3"
  })),
  bell: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 16V11a6 6 0 0 0-12 0v5l-2 2h16zM10 20a2 2 0 0 0 4 0"
  })),
  search: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  trash: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
  })),
  edit: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 20h4l11-11-4-4L4 16z"
  })),
  share: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
  })),
  pdf: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 3v5h5"
  })),
  copy: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "8",
    width: "13",
    height: "13",
    rx: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"
  })),
  camera: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "13",
    r: "4"
  })),
  qr: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 14h3v3M20 14v3M14 20h3"
  })),
  pix: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m12 3 4 4-2 2-2-2-2 2-2-2zM3 12l4-4 2 2-2 2 2 2-2 2zM21 12l-4-4-2 2 2 2-2 2 2 2zM12 21l4-4-2-2-2 2-2-2-2 2z"
  })),
  whats: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 1-13.6 7.7L3 21l1.4-4.4A9 9 0 1 1 21 12z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 10c1 4 3 5 6 6l1.5-2-2.5-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2.5z"
  })),
  link: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1"
  })),
  pen: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 19l3-1L19 7l-3-3L5 15zM14 6l3 3"
  })),
  bolt: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 2 4 14h6l-1 8 9-12h-6z"
  })),
  trophy: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 14h6v2H9zM8 20h8"
  })),
  team: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "8",
    r: "3.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "17",
    cy: "9",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 20c0-3 3-5 6-5s6 2 6 5M15 19c1-2 3-3 5-3"
  })),
  chart: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 20V10M10 20V4M16 20v-6M22 20H2"
  })),
  cog: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 12a7 7 0 0 0-.1-1.4l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.4-1.4L13.7 3h-3.4l-.5 2.3a7 7 0 0 0-2.4 1.4l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .5 0 1 .1 1.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.4 1.4l.5 2.3h3.4l.5-2.3a7 7 0 0 0 2.4-1.4l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.4z"
  })),
  shield: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"
  })),
  heart: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"
  })),
  doc: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 3v5h5M9 13h6M9 17h4"
  })),
  filter: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 5h18M6 12h12M10 19h4"
  })),
  warn: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3 2 21h20zM12 10v5M12 18.5v.5"
  })),
  tv: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "13",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 21h8M12 18v3"
  })),
  clock: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 2"
  }))
};
function BosqueLogo({
  size = 1,
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10 * size
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/bosque-icon.png",
    width: 42 * size,
    height: 40 * size,
    style: {
      borderRadius: 10 * size,
      objectFit: "cover"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontWeight: 600,
      fontSize: 22 * size,
      letterSpacing: "-0.02em",
      color: dark ? "#fff" : COLORS.ink
    }
  }, "Bosque"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9 * size,
      fontWeight: 600,
      color: dark ? "rgba(255,255,255,0.7)" : COLORS.muted2,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      marginTop: 3
    }
  }, "by Vitalize")));
}
function ScreenShell({
  title,
  onBack,
  right,
  children,
  bg = COLORS.bg,
  scroll = true,
  footer
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: bg
    }
  }, (title || onBack) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "12px 18px 12px",
      gap: 12,
      background: bg,
      zIndex: 1
    }
  }, onBack && /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      width: 38,
      height: 38,
      borderRadius: 12,
      border: `1px solid ${COLORS.divider}`,
      background: "#fff",
      color: COLORS.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer"
    }
  }, I.back), title && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontWeight: 600,
      fontSize: 17,
      color: COLORS.ink,
      letterSpacing: "-0.01em"
    }
  }, title), right), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: scroll ? "auto" : "hidden",
      padding: "0 18px 24px"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 18px 18px",
      background: bg,
      borderTop: `1px solid ${COLORS.divider}`
    }
  }, footer));
}
Object.assign(window, {
  COLORS,
  Btn,
  Field,
  Card,
  Pill,
  Avatar,
  Progress,
  I,
  BosqueLogo,
  ScreenShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/BosqueUI.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaAssinatura.jsx
try { (() => {
// TelaAssinatura.jsx — Tela 7
function TelaAssinatura({
  go
}) {
  const [stage, setStage] = useState(0); // 0 = enviar, 1 = aguardando, 2 = assinado
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Assinatura digital",
    onBack: () => go("contrato"),
    bg: COLORS.bg,
    footer: stage === 0 ? /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => setStage(1),
      iconRight: I.fwd
    }, "Enviar para assinatura") : stage === 1 ? /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => setStage(2),
      icon: I.check
    }, "Simular assinatura recebida") : /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => go("pagamento"),
      iconRight: I.fwd
    }, "Avan\xE7ar para pagamento")
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18,
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 12,
      background: COLORS.primaryTint,
      color: COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.pen), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: COLORS.ink
    }
  }, "Contrato Bosque Fam\xEDlia"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, "Maria Aparecida Silva \xB7 4 p\xE1ginas")), /*#__PURE__*/React.createElement(Pill, {
    tone: "primary"
  }, "D4Sign")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginBottom: 10
    }
  }, "Linha do tempo"), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 16
    }
  }, [{
    t: "Contrato gerado",
    s: "Hoje, 14:22",
    done: true
  }, {
    t: "Enviado para assinatura",
    s: stage >= 1 ? "Hoje, 14:23" : "—",
    done: stage >= 1,
    active: stage === 0
  }, {
    t: "Aguardando assinatura do titular",
    s: stage === 1 ? "SMS enviado · expira em 48h" : stage >= 2 ? "Concluído" : "—",
    done: stage >= 2,
    active: stage === 1
  }, {
    t: "Contrato assinado",
    s: stage >= 2 ? "Hoje, 14:31" : "—",
    done: stage >= 2
  }].map((step, i, arr) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
      paddingBottom: i < arr.length - 1 ? 14 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: step.done ? COLORS.primary : step.active ? "#fff" : COLORS.surface,
      border: step.active ? `2px solid ${COLORS.primary}` : "none",
      color: step.done ? "#fff" : COLORS.muted2,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, step.done ? I.check : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: step.active ? COLORS.primary : COLORS.muted2
    }
  })), i < arr.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 2,
      flex: 1,
      minHeight: 28,
      background: step.done ? COLORS.primary : COLORS.line,
      marginTop: 2
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      paddingBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: step.done || step.active ? COLORS.ink : COLORS.muted
    }
  }, step.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, step.s))))), stage === 2 && /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 16,
      padding: 14,
      background: "#DCF3E2",
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: COLORS.success,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.check), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#1F5B2C"
    }
  }, "Contrato assinado com sucesso"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#1F5B2C",
      opacity: 0.8
    }
  }, "Pr\xF3ximo passo: confirmar pagamento"))));
}
window.TelaAssinatura = TelaAssinatura;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaAssinatura.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaCancelamento.jsx
try { (() => {
// TelaCancelamento.jsx — Tela 15 — Cancelamento (com retenção)
function TelaCancelamento({
  go
}) {
  const [etapa, setEtapa] = useState(0); // 0=motivo, 1=oferta, 2=confirmação, 3=concluído
  const [motivo, setMotivo] = useState(null);
  const [aceitouOferta, setAceitouOferta] = useState(false);
  const motivos = [{
    k: "preco",
    t: "Preço da mensalidade",
    i: "💰"
  }, {
    k: "uso",
    t: "Não estou usando",
    i: "🤔"
  }, {
    k: "atend",
    t: "Atendimento",
    i: "🙁"
  }, {
    k: "outro_plano",
    t: "Mudei para outro plano",
    i: "🔄"
  }, {
    k: "financ",
    t: "Dificuldade financeira",
    i: "📉"
  }, {
    k: "outro",
    t: "Outro motivo",
    i: "✍️"
  }];
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Cancelar plano",
    onBack: () => etapa === 0 ? go("dashboard") : setEtapa(etapa - 1),
    bg: COLORS.bg,
    footer: etapa === 0 ? /*#__PURE__*/React.createElement(Btn, {
      variant: "danger",
      fullWidth: true,
      onClick: () => motivo && setEtapa(1),
      style: {
        opacity: motivo ? 1 : 0.5
      }
    }, "Continuar com o cancelamento") : etapa === 1 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      icon: I.check,
      onClick: () => {
        setAceitouOferta(true);
        setEtapa(3);
      }
    }, "Aceitar oferta e continuar"), /*#__PURE__*/React.createElement(Btn, {
      variant: "ghost",
      fullWidth: true,
      style: {
        borderColor: COLORS.danger,
        color: COLORS.danger
      },
      onClick: () => setEtapa(2)
    }, "Recusar e cancelar mesmo assim")) : etapa === 2 ? /*#__PURE__*/React.createElement(Btn, {
      variant: "danger",
      fullWidth: true,
      onClick: () => setEtapa(3)
    }, "Confirmar cancelamento") : /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => go("dashboard")
    }, "Voltar ao in\xEDcio")
  }, etapa === 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: COLORS.surface
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Maria Aparecida",
    size: 44,
    idx: 2
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink
    }
  }, "Maria Aparecida Silva"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, "Bosque Fam\xEDlia \xB7 R$ 89,70/m\xEAs \xB7 ativo h\xE1 18 meses"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      color: COLORS.ink,
      marginBottom: 6
    }
  }, "Por que est\xE1 cancelando?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginBottom: 16
    }
  }, "Sua resposta nos ajuda a melhorar. Sem julgamentos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, motivos.map(m => {
    const a = motivo === m.k;
    return /*#__PURE__*/React.createElement("button", {
      key: m.k,
      onClick: () => setMotivo(m.k),
      style: {
        padding: "16px 12px",
        borderRadius: 14,
        background: a ? COLORS.primaryTint : "#fff",
        border: a ? `1.5px solid ${COLORS.primary}` : `1.5px solid ${COLORS.line}`,
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22
      }
    }, m.i), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: a ? COLORS.primary : COLORS.ink,
        lineHeight: 1.3
      }
    }, m.t));
  })), motivo === "outro" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Conte um pouco mais (opcional)",
    value: "",
    onChange: () => {},
    placeholder: "Pode ser direto."
  }))), etapa === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "12px 0 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "#FFF1DA",
      color: "#A05A0F",
      padding: "6px 14px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      marginBottom: 14
    }
  }, I.trophy, " OFERTA EXCLUSIVA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 26,
      color: COLORS.ink,
      letterSpacing: "-0.02em",
      lineHeight: 1.1,
      padding: "0 8px"
    }
  }, "Que tal continuar com", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.primary
    }
  }, "40% off por 6 meses?")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 10
    }
  }, "De R$ 89,70 por ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: COLORS.ink
    }
  }, "R$ 53,80"), " ao m\xEAs")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 16,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em",
      marginBottom: 12
    }
  }, "VOC\xCA CONTINUA COM"), ["Velório e cerimônia · 100% coberto", "Sepultamento ou cremação", "Translado intermunicipal", "Apoio psicológico (90 dias)", "Carência mantida (sem reinício)"].map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "5px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 5,
      background: "#DCF3E2",
      color: COLORS.success,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.check), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: COLORS.ink
    }
  }, c)))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      background: COLORS.surface,
      fontSize: 12,
      color: COLORS.muted,
      lineHeight: 1.5
    }
  }, "O desconto come\xE7a na pr\xF3xima fatura e vale por 6 meses. Ap\xF3s esse per\xEDodo, a mensalidade volta a R$ 89,70.")), etapa === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 16,
      marginBottom: 14,
      background: "#FFE4E2",
      border: `1.5px solid ${COLORS.danger}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      background: COLORS.danger,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, I.warn), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: "#7A1F1A"
    }
  }, "Ao cancelar voc\xEA perde"), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: "8px 0 0",
      paddingLeft: 18,
      fontSize: 12,
      color: "#7A1F1A",
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("li", null, "18 meses de car\xEAncia acumulada"), /*#__PURE__*/React.createElement("li", null, "Tabela atual (pr\xF3xima entrada ser\xE1 no pre\xE7o de tabela)"), /*#__PURE__*/React.createElement("li", null, "Hist\xF3rico de pagamentos pontuais"))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em",
      marginBottom: 12
    }
  }, "RESUMO"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.muted
    }
  }, "Plano"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: COLORS.ink
    }
  }, "Bosque Fam\xEDlia")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.muted
    }
  }, "\xDAltima cobran\xE7a paga"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: COLORS.ink
    }
  }, "05/05/2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.muted
    }
  }, "Plano ativo at\xE9"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: COLORS.ink
    }
  }, "04/06/2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.muted
    }
  }, "Multa rescis\xF3ria"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: COLORS.success
    }
  }, "Isento"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      fontSize: 12,
      color: COLORS.muted,
      lineHeight: 1.5,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    defaultChecked: true,
    style: {
      marginTop: 2,
      accentColor: COLORS.primary
    }
  }), /*#__PURE__*/React.createElement("span", null, "Estou ciente de que o plano permanece ativo at\xE9 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: COLORS.ink
    }
  }, "04/06/2026"), " e que a car\xEAncia ser\xE1 reiniciada caso eu volte a contratar.")))), etapa === 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "30px 0 16px"
    }
  }, aceitouOferta ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96,
      height: 96,
      borderRadius: "50%",
      background: "#DCF3E2",
      color: COLORS.success,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 18px"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "48",
    height: "48",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 24,
      color: COLORS.ink,
      letterSpacing: "-0.02em"
    }
  }, "Que bom ter voc\xEA com a gente!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 10,
      lineHeight: 1.5,
      padding: "0 12px"
    }
  }, "Desconto aplicado na pr\xF3xima fatura.", /*#__PURE__*/React.createElement("br", null), "Nova mensalidade: ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: COLORS.ink
    }
  }, "R$ 53,80"), " por 6 meses.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96,
      height: 96,
      borderRadius: "50%",
      background: COLORS.surface,
      color: COLORS.muted,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 18px"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "40",
    height: "40",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 22,
      color: COLORS.ink,
      letterSpacing: "-0.02em"
    }
  }, "Cancelamento solicitado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 10,
      lineHeight: 1.55,
      padding: "0 12px"
    }
  }, "O plano permanece ativo at\xE9 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: COLORS.ink
    }
  }, "04/06/2026"), ". Sentiremos sua falta \u2014 se mudar de ideia, \xE9 s\xF3 voltar."), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 22,
      padding: 14,
      background: COLORS.primaryTint,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.primary,
      letterSpacing: "0.04em",
      marginBottom: 4
    }
  }, "PROTOCOLO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      color: COLORS.primary,
      fontFamily: "ui-monospace, monospace",
      letterSpacing: "0.04em"
    }
  }, "#CAN\u201126\u201101987")))));
}
window.TelaCancelamento = TelaCancelamento;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaCancelamento.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaComissoes.jsx
try { (() => {
// TelaComissoes.jsx — Tela 10 — Comissões
function TelaComissoes({
  go
}) {
  const [mes, setMes] = useState("nov");
  const itens = [{
    c: "Família Costa",
    p: "Bosque Família",
    v: 540,
    d: "12/11",
    s: "pago"
  }, {
    c: "Maria Aparecida",
    p: "Bosque Família",
    v: 320,
    d: "28/11",
    s: "previsto"
  }, {
    c: "João Souza",
    p: "Bosque Essencial",
    v: 180,
    d: "30/11",
    s: "previsto"
  }, {
    c: "Rita Mendes",
    p: "Bosque Família",
    v: 410,
    d: "05/11",
    s: "pago"
  }, {
    c: "Carlos Eduardo",
    p: "Bosque Premium",
    v: 720,
    d: "08/11",
    s: "pago"
  }];
  const pago = itens.filter(i => i.s === "pago").reduce((a, b) => a + b.v, 0);
  const previsto = itens.filter(i => i.s === "previsto").reduce((a, b) => a + b.v, 0);
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Comiss\xF5es",
    onBack: () => go("dashboard"),
    bg: COLORS.bg
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 16,
      padding: 4,
      background: COLORS.surface,
      borderRadius: 12
    }
  }, [["set", "Set"], ["out", "Out"], ["nov", "Nov"], ["dez", "Dez"]].map(([k, l]) => {
    const a = mes === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setMes(k),
      style: {
        flex: 1,
        height: 34,
        borderRadius: 9,
        border: "none",
        background: a ? "#fff" : "transparent",
        color: a ? COLORS.ink : COLORS.muted,
        fontWeight: 700,
        fontSize: 12,
        boxShadow: a ? "0 2px 6px rgba(15,23,12,0.06)" : "none",
        cursor: "pointer"
      }
    }, l);
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 20,
      marginBottom: 14,
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -60,
      top: -60,
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: COLORS.primaryTint,
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.06em"
    }
  }, "TOTAL DO M\xCAS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 38,
      fontWeight: 700,
      color: COLORS.primary,
      marginTop: 6,
      letterSpacing: "-0.025em"
    }
  }, "R$ ", (pago + previsto).toLocaleString("pt-BR")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 18,
      paddingTop: 16,
      borderTop: `1px solid ${COLORS.divider}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 600,
      letterSpacing: "0.04em"
    }
  }, "PAGO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4,
      letterSpacing: "-0.02em"
    }
  }, "R$ ", pago.toLocaleString("pt-BR"))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: COLORS.divider
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 600,
      letterSpacing: "0.04em"
    }
  }, "PREVISTO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4,
      letterSpacing: "-0.02em"
    }
  }, "R$ ", previsto.toLocaleString("pt-BR")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em"
    }
  }, "TICKET M\xC9DIO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4
    }
  }, "R$ 434")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em"
    }
  }, "VENDAS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4
    }
  }, "5"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginBottom: 10
    }
  }, "Extrato detalhado"), /*#__PURE__*/React.createElement(Card, null, itens.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      borderBottom: i < itens.length - 1 ? `1px solid ${COLORS.divider}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: it.s === "pago" ? "#DCF3E2" : COLORS.primaryTint,
      color: it.s === "pago" ? COLORS.success : COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, it.s === "pago" ? I.check : I.clock), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.ink
    }
  }, it.c), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      marginTop: 2
    }
  }, it.p, " \xB7 ", it.d)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink
    }
  }, "R$ ", it.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: it.s === "pago" ? COLORS.success : COLORS.secondary,
      marginTop: 2
    }
  }, it.s === "pago" ? "PAGO" : "PREVISTO"))))));
}
window.TelaComissoes = TelaComissoes;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaComissoes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaCompartilhar.jsx
try { (() => {
// TelaCompartilhar.jsx — Tela 5
function TelaCompartilhar({
  go
}) {
  const [copied, setCopied] = useState(false);
  const link = "vitalize.app/p/8f3a2";
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Compartilhar or\xE7amento",
    onBack: () => go("resultado"),
    bg: COLORS.bg
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18,
      marginBottom: 16,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 16,
      background: COLORS.primaryTint,
      color: COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 14px"
    }
  }, I.share), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: COLORS.ink,
      letterSpacing: "-0.01em"
    }
  }, "Proposta pronta para enviar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 6,
      lineHeight: 1.4
    }
  }, "Bosque Fam\xEDlia \xB7 R$ 89,70/m\xEAs", /*#__PURE__*/React.createElement("br", null), "V\xE1lida por 7 dias")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.muted,
      letterSpacing: "0.04em",
      margin: "8px 0 10px"
    }
  }, "CANAIS"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginBottom: 20
    }
  }, [{
    i: I.whats,
    t: "WhatsApp",
    s: "Enviar com mensagem pronta",
    bg: "#DCF6CE",
    fg: "#1F8B3E"
  }, {
    i: I.mail,
    t: "E-mail",
    s: "Envia PDF anexado automaticamente",
    bg: COLORS.primaryTint,
    fg: COLORS.primary
  }, {
    i: I.pdf,
    t: "Baixar PDF",
    s: "Proposta com branding Bosque",
    bg: "#FFE4E2",
    fg: "#C8413A"
  }, {
    i: I.link,
    t: "Link da proposta",
    s: link,
    bg: "#F0EBFF",
    fg: "#6B4FE3"
  }].map((c, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    style: {
      padding: 14,
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: c.bg,
      color: c.fg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, c.i), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink
    }
  }, c.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, c.s)), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      border: "none",
      background: COLORS.surface,
      color: COLORS.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.fwd)))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      background: COLORS.surface,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontFamily: "var(--font-text)",
      fontSize: 13,
      color: COLORS.ink,
      fontWeight: 600
    }
  }, link), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    },
    style: {
      height: 36,
      padding: "0 14px",
      borderRadius: 10,
      border: "none",
      background: copied ? COLORS.success : COLORS.primary,
      color: "#fff",
      fontWeight: 700,
      fontSize: 12,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, copied ? /*#__PURE__*/React.createElement(React.Fragment, null, I.check, " Copiado") : /*#__PURE__*/React.createElement(React.Fragment, null, I.copy, " Copiar"))));
}
window.TelaCompartilhar = TelaCompartilhar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaCompartilhar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaContrato.jsx
try { (() => {
// TelaContrato.jsx — Tela 6 — Formalização (4 etapas)
function TelaContrato({
  go
}) {
  const [etapa, setEtapa] = useState(0);
  const pct = [25, 50, 75, 95][etapa];
  const titulos = ["Dados do titular", "Endereço", "Dependentes", "Documentos"];
  const [cep, setCep] = useState("");
  const [cpf, setCpf] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [dados, setDados] = useState(null);
  const [docs, setDocs] = useState({
    rg: false,
    cpf: false,
    comp: false
  });
  function consultarCpf(v) {
    setCpf(v);
    if (v.length >= 11 && !dados) {
      setConsultando(true);
      setTimeout(() => {
        setDados({
          nome: "Maria Aparecida Silva",
          nasc: "12/03/1968",
          tel: "(11) 98342-7710"
        });
        setConsultando(false);
      }, 900);
    }
  }
  function consultarCep(v) {
    setCep(v);
  }
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Contrata\xE7\xE3o",
    onBack: () => etapa === 0 ? go("resultado") : setEtapa(etapa - 1),
    bg: COLORS.bg,
    footer: /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      iconRight: I.fwd,
      onClick: () => etapa < 3 ? setEtapa(etapa + 1) : go("assinatura")
    }, etapa < 3 ? "Continuar" : "Enviar para assinatura")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em"
    }
  }, "CADASTRO ", pct, "% CONCLU\xCDDO"), /*#__PURE__*/React.createElement(Pill, {
    tone: "primary"
  }, etapa + 1, " de 4")), /*#__PURE__*/React.createElement(Progress, {
    value: pct
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      margin: "14px 0 22px"
    }
  }, titulos.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      flex: 1,
      textAlign: "center",
      fontSize: 10,
      fontWeight: 700,
      color: i === etapa ? COLORS.primary : COLORS.muted2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 2,
      background: i <= etapa ? COLORS.primary : COLORS.line,
      marginBottom: 6
    }
  }), t.split(" ")[0].toUpperCase()))), etapa === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "CPF",
    value: cpf,
    onChange: consultarCpf,
    placeholder: "000.000.000-00",
    icon: I.user
  }), consultando && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.primary,
      fontWeight: 600
    }
  }, "Consultando Receita Federal\u2026"), dados && /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      background: "#DCF3E2",
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      background: COLORS.success,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.check), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#1F5B2C",
      fontWeight: 600
    }
  }, "CPF validado. Dados preenchidos automaticamente.")), /*#__PURE__*/React.createElement(Field, {
    label: "Nome completo",
    value: dados?.nome || "",
    onChange: () => {},
    placeholder: "Nome do titular",
    icon: I.user
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Data de nascimento",
    value: dados?.nasc || "",
    onChange: () => {},
    placeholder: "DD/MM/AAAA"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Telefone",
    value: dados?.tel || "",
    onChange: () => {},
    placeholder: "(00) 00000-0000"
  })), etapa === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "CEP",
    value: cep,
    onChange: consultarCep,
    placeholder: "00000-000",
    hint: "Digite 8 d\xEDgitos para preenchimento autom\xE1tico"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Logradouro",
    value: "Av. Paulista",
    onChange: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1.5fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "N\xFAmero",
    value: "1578",
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Complemento",
    value: "Apto 84",
    onChange: () => {}
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Bairro",
    value: "Bela Vista",
    onChange: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Cidade",
    value: "S\xE3o Paulo",
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Field, {
    label: "UF",
    value: "SP",
    onChange: () => {}
  }))), etapa === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginBottom: 14
    }
  }, "Confirme os dados dos dependentes selecionados."), [{
    p: "Cônjuge",
    n: "José Carlos Silva",
    d: "08/11/1965"
  }, {
    p: "Filha",
    n: "Júlia Silva",
    d: "22/04/1995"
  }].map((d, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    style: {
      marginBottom: 12,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: COLORS.primaryTint,
      color: COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.heart), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink
    }
  }, d.p)), /*#__PURE__*/React.createElement(Field, {
    label: "Nome",
    value: d.n,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10
    }
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Data de nascimento",
    value: d.d,
    onChange: () => {}
  })))), etapa === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginBottom: 16
    }
  }, "Use a c\xE2mera. Nosso OCR preenche os dados automaticamente em segundos."), [{
    k: "rg",
    t: "RG (frente e verso)",
    s: docs.rg ? "Validado · CPF cruzado" : "Toque para capturar"
  }, {
    k: "cpf",
    t: "CPF",
    s: docs.cpf ? "Validado automaticamente" : "Capturar documento"
  }, {
    k: "comp",
    t: "Comprovante de residência",
    s: docs.comp ? "Endereço confere com CEP" : "Capturar comprovante"
  }].map(d => {
    const done = docs[d.k];
    return /*#__PURE__*/React.createElement(Card, {
      key: d.k,
      onClick: () => setDocs({
        ...docs,
        [d.k]: true
      }),
      style: {
        padding: 14,
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: done ? `1.5px solid ${COLORS.success}` : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        borderRadius: 12,
        background: done ? "#DCF3E2" : COLORS.surface,
        color: done ? COLORS.success : COLORS.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, done ? I.check : I.camera), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14,
        color: COLORS.ink
      }
    }, d.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: done ? COLORS.success : COLORS.muted,
        marginTop: 2,
        fontWeight: done ? 600 : 500
      }
    }, d.s)));
  })));
}
window.TelaContrato = TelaContrato;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaContrato.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaDashboard.jsx
try { (() => {
// TelaDashboard.jsx — Tela 2 — Dashboard do Vendedor (refresh: clean + emerald accent)
function TelaDashboard({
  go
}) {
  const meta = 87000,
    atingido = 64320;
  const pct = Math.round(atingido / meta * 100);
  const leads = [{
    nome: "Maria Aparecida",
    etapa: "Negociação",
    valor: "R$ 4.890",
    tom: "warning"
  }, {
    nome: "João Souza",
    etapa: "Orçamento enviado",
    valor: "R$ 3.250",
    tom: "primary"
  }, {
    nome: "Ana Beatriz",
    etapa: "Contato realizado",
    valor: "R$ 5.120",
    tom: "neutral"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 20px 4px",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Lucas Mendes",
    size: 44,
    idx: 0
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.muted,
      fontSize: 12,
      fontWeight: 500
    }
  }, "Ol\xE1, vendedor"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.ink,
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: "-0.01em"
    }
  }, "Lucas Mendes")), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 12,
      border: `1px solid ${COLORS.divider}`,
      background: "#fff",
      color: COLORS.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      cursor: "pointer"
    }
  }, I.bell, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 9,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: COLORS.secondary,
      border: "2px solid #fff"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "16px 20px 100px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 20,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.06em"
    }
  }, "META DE NOVEMBRO"), /*#__PURE__*/React.createElement(Pill, {
    tone: "primary"
  }, pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: COLORS.ink,
      letterSpacing: "-0.025em"
    }
  }, "R$ ", (atingido / 1000).toFixed(1), "k"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: COLORS.muted,
      fontWeight: 500
    }
  }, "de R$ ", (meta / 1000).toFixed(0), "k")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      height: 8,
      borderRadius: 4,
      background: COLORS.surface,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: "100%",
      background: COLORS.primary,
      borderRadius: 4,
      boxShadow: "0 0 12px rgba(16,185,129,0.4)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.muted
    }
  }, "Faltam ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: COLORS.ink,
      fontWeight: 700
    }
  }, "R$ ", ((meta - atingido) / 1000).toFixed(1), "k")), /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.muted
    }
  }, "18 dias restantes"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.04em"
    }
  }, "VENDAS HOJE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 6,
      letterSpacing: "-0.02em"
    }
  }, "3"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11,
      color: COLORS.primary,
      fontWeight: 700,
      marginTop: 4
    }
  }, "\u2191 1 vs ontem")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.04em"
    }
  }, "COMISS\xD5ES"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 6,
      letterSpacing: "-0.02em"
    }
  }, "R$ 4.218"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 500,
      marginTop: 4
    }
  }, "Recebe em 5/dez"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 14,
      background: COLORS.secondarySoft,
      color: COLORS.secondaryDeep,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.trophy), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      letterSpacing: "-0.01em"
    }
  }, "Voc\xEA est\xE1 em 2\xBA no ranking"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, "Faltam R$ 1.380 para o 1\xBA lugar")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.muted2
    }
  }, I.fwd)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: COLORS.ink,
      letterSpacing: "-0.01em"
    }
  }, "Atalhos r\xE1pidos")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Card, {
    onClick: () => go("plano"),
    style: {
      padding: 16,
      gridColumn: "span 2",
      display: "flex",
      alignItems: "center",
      gap: 14,
      background: COLORS.primary,
      color: "#fff",
      boxShadow: "0 10px 28px rgba(16,185,129,0.32)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 14,
      background: "rgba(255,255,255,0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.bolt), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: "-0.01em"
    }
  }, "Novo or\xE7amento"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,0.9)",
      marginTop: 2
    }
  }, "Calcule um plano em 30 segundos")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "rgba(255,255,255,0.9)"
    }
  }, I.fwd)), /*#__PURE__*/React.createElement(Card, {
    onClick: () => go("contrato"),
    style: {
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: COLORS.primaryTint,
      color: COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.doc), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginTop: 4
    }
  }, "Nova venda"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 500
    }
  }, "Contratar plano")), /*#__PURE__*/React.createElement(Card, {
    onClick: () => go("pipeline"),
    style: {
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: COLORS.secondarySoft,
      color: COLORS.secondaryDeep,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.funnel), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginTop: 4
    }
  }, "Pipeline"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 500
    }
  }, "12 leads ativos"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: COLORS.ink,
      letterSpacing: "-0.01em"
    }
  }, "Pr\xF3ximos leads"), /*#__PURE__*/React.createElement("a", {
    onClick: () => go("pipeline"),
    style: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "Ver todos \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, leads.map((l, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    style: {
      padding: 14,
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: l.nome,
    idx: i + 1,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      letterSpacing: "-0.01em"
    }
  }, l.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2,
      fontWeight: 500
    }
  }, l.valor, " \xB7 ", l.etapa)), /*#__PURE__*/React.createElement(Pill, {
    tone: l.tom
  }, l.etapa.split(" ")[0]))))), /*#__PURE__*/React.createElement(BottomNav, {
    active: "dashboard",
    go: go
  }));
}
function BottomNav({
  active,
  go
}) {
  const items = [{
    k: "dashboard",
    i: I.home,
    l: "Início"
  }, {
    k: "pipeline",
    i: I.funnel,
    l: "Pipeline"
  }, {
    k: "plano",
    i: I.plus,
    l: "Novo",
    big: true
  }, {
    k: "comissoes",
    i: I.wallet,
    l: "Comissões"
  }, {
    k: "perfil",
    i: I.cog,
    l: "Conta"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "10px 16px 24px",
      background: "rgba(255,255,255,0.96)",
      borderTop: `1px solid ${COLORS.divider}`,
      backdropFilter: "blur(20px)"
    }
  }, items.map(it => {
    const isActive = active === it.k;
    if (it.big) return /*#__PURE__*/React.createElement("button", {
      key: it.k,
      onClick: () => go(it.k),
      style: {
        width: 56,
        height: 56,
        borderRadius: 20,
        background: COLORS.primary,
        color: "#fff",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 10px 24px rgba(16,185,129,0.45)",
        marginTop: -22
      }
    }, it.i);
    return /*#__PURE__*/React.createElement("button", {
      key: it.k,
      onClick: () => go(it.k),
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        border: "none",
        background: "transparent",
        color: isActive ? COLORS.primary : COLORS.muted2,
        fontWeight: isActive ? 700 : 500,
        fontSize: 10,
        cursor: "pointer",
        position: "relative"
      }
    }, it.i, it.l, isActive && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        bottom: -2,
        width: 4,
        height: 4,
        borderRadius: 2,
        background: COLORS.primary
      }
    }));
  }));
}
window.TelaDashboard = TelaDashboard;
window.BottomNav = BottomNav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaDashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaGestaoAVista.jsx
try { (() => {
// TelaGestaoAVista.jsx — Tela 12 — Gestão à Vista (modo TV)
function TelaGestaoAVista({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      overflow: "auto",
      background: "#0F1B0B",
      color: "#fff",
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("supervisor"),
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      border: "none",
      background: "rgba(255,255,255,0.1)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.back), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/bosque-icon.png",
    width: 22,
    height: 20
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontWeight: 600,
      fontSize: 14,
      letterSpacing: "0.02em"
    }
  }, "GEST\xC3O \xC0 VISTA \xB7 ZONA SUL"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.78)",
      fontWeight: 600
    }
  }, "AO VIVO \xB7 14:38")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(KpiTile, {
    label: "META M\xCAS",
    value: "68%",
    sub: "R$ 278k de R$ 410k",
    accent: COLORS.primary
  }), /*#__PURE__*/React.createElement(KpiTile, {
    label: "HOJE",
    value: "R$ 18.420",
    sub: "11 vendas \xB7 meta di\xE1ria 89%",
    accent: COLORS.secondary
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 12,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.78)",
      fontWeight: 700,
      letterSpacing: "0.04em",
      marginBottom: 10
    }
  }, "RITMO DA SEMANA"), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 300 70",
    style: {
      width: "100%",
      height: 70
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "grad",
    x1: "0",
    x2: "0",
    y1: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: COLORS.primary,
    stopOpacity: "0.5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: COLORS.primary,
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M0,52 L40,38 L80,46 L120,28 L160,32 L200,18 L240,24 L280,10 L300,14",
    fill: "none",
    stroke: COLORS.primary,
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0,52 L40,38 L80,46 L120,28 L160,32 L200,18 L240,24 L280,10 L300,14 L300,70 L0,70 Z",
    fill: "url(#grad)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 6,
      fontSize: 10,
      color: "rgba(255,255,255,0.95)",
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", null, "SEG"), /*#__PURE__*/React.createElement("span", null, "TER"), /*#__PURE__*/React.createElement("span", null, "QUA"), /*#__PURE__*/React.createElement("span", null, "QUI"), /*#__PURE__*/React.createElement("span", null, "SEX"), /*#__PURE__*/React.createElement("span", null, "S\xC1B"), /*#__PURE__*/React.createElement("span", null, "DOM"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      fontSize: 11,
      color: "rgba(255,255,255,0.78)",
      fontWeight: 700,
      letterSpacing: "0.04em",
      borderBottom: "1px solid rgba(255,255,255,0.08)"
    }
  }, "RANKING DO DIA"), [{
    n: "Ana C.",
    v: "R$ 6.2k",
    p: 95,
    t: "🥇"
  }, {
    n: "Lucas M.",
    v: "R$ 4.8k",
    p: 74,
    t: "🥈"
  }, {
    n: "Beatriz L.",
    v: "R$ 3.9k",
    p: 68,
    t: "🥉"
  }, {
    n: "Rafael S.",
    v: "R$ 2.5k",
    p: 52,
    t: ""
  }].map((v, i, a) => /*#__PURE__*/React.createElement("div", {
    key: v.n,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      fontSize: 14,
      fontWeight: 600,
      color: "rgba(255,255,255,0.95)",
      textAlign: "center"
    }
  }, v.t || `#${i + 1}`), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontWeight: 600,
      fontSize: 13
    }
  }, v.n), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 5,
      borderRadius: 3,
      background: "rgba(255,255,255,0.08)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${v.p}%`,
      height: "100%",
      background: COLORS.primary
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 70,
      textAlign: "right",
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.primary
    }
  }, v.v)))), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 12,
      padding: 14,
      background: "rgba(255,161,60,0.12)",
      border: "1px solid rgba(255,161,60,0.3)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: COLORS.secondary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.trophy), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Faltam R$ 132k para a meta mensal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.95)",
      marginTop: 2
    }
  }, "Bata R$ 22k por dia \xFAtil e fechamos no dia 28"))));
}
function KpiTile({
  label,
  value,
  sub,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.78)",
      fontWeight: 700,
      letterSpacing: "0.04em"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      marginTop: 4,
      color: accent,
      letterSpacing: "-0.02em"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.95)",
      marginTop: 2
    }
  }, sub));
}
window.TelaGestaoAVista = TelaGestaoAVista;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaGestaoAVista.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaLogin.jsx
try { (() => {
// TelaLogin.jsx — Tela 1 — Login (refresh: clean, branco com emerald)
function TelaLogin({
  go
}) {
  const [email, setEmail] = useState("vendedor@bosque.com.br");
  const [senha, setSenha] = useState("••••••••");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#fff",
      padding: "16px 24px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/bosque-icon.png",
    width: 42,
    height: 40,
    style: {
      borderRadius: 11
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-accent)",
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: "-0.02em",
      color: COLORS.ink,
      lineHeight: 1
    }
  }, "Bosque"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: COLORS.muted2,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      marginTop: 3
    }
  }, "by Vitalize"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 30,
      fontWeight: 700,
      color: COLORS.ink,
      letterSpacing: "-0.025em",
      lineHeight: 1.15,
      marginBottom: 8
    }
  }, "Bem-vindo", /*#__PURE__*/React.createElement("br", null), "de volta."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: COLORS.muted,
      marginBottom: 36,
      lineHeight: 1.5,
      fontWeight: 500
    }
  }, "Vamos fechar mais vendas hoje?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "E-mail",
    value: email,
    onChange: setEmail,
    icon: I.mail,
    placeholder: "seu@email.com"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Senha",
    value: senha,
    onChange: setSenha,
    type: "password",
    icon: I.lock,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      marginTop: -2
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "Esqueci minha senha"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    fullWidth: true,
    onClick: () => go("dashboard"),
    iconRight: I.fwd
  }, "Entrar"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    fullWidth: true,
    icon: I.finger,
    onClick: () => go("dashboard")
  }, "Entrar com biometria")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 22,
      fontSize: 13,
      color: COLORS.muted
    }
  }, "Primeiro acesso? ", /*#__PURE__*/React.createElement("a", {
    style: {
      color: COLORS.primary,
      fontWeight: 700,
      cursor: "pointer"
    }
  }, "Solicitar credenciais")));
}
window.TelaLogin = TelaLogin;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaLogin.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaPagamento.jsx
try { (() => {
// TelaPagamento.jsx — Tela 8
function TelaPagamento({
  go
}) {
  const [method, setMethod] = useState("pix");
  const [status, setStatus] = useState("aguardando");
  const pixCode = "00020126360014BR.GOV.BCB.PIX0114+551133334444520400005303986540589.705802BR5919BOSQUE PLANOS LTDA6009SAO PAULO62070503***6304A1B2";
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Pagamento",
    onBack: () => go("assinatura"),
    bg: COLORS.bg,
    footer: status === "aguardando" ? /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => setStatus("pago"),
      icon: I.check
    }, "Simular pagamento recebido") : /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => go("dashboard"),
      iconRight: I.fwd
    }, "Concluir venda")
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18,
      marginBottom: 16,
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -50,
      top: -50,
      width: 160,
      height: 160,
      borderRadius: "50%",
      background: COLORS.primaryTint,
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.06em"
    }
  }, "VALOR DA 1\xAA MENSALIDADE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      fontWeight: 700,
      color: COLORS.primary,
      marginTop: 6,
      letterSpacing: "-0.025em"
    }
  }, "R$ 89,70"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 4,
      fontWeight: 500
    }
  }, "Maria Aparecida Silva \xB7 Bosque Fam\xEDlia"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, [{
    k: "pix",
    i: I.pix,
    t: "PIX"
  }, {
    k: "boleto",
    i: I.doc,
    t: "Boleto"
  }, {
    k: "link",
    i: I.link,
    t: "Link"
  }].map(o => {
    const a = method === o.k;
    return /*#__PURE__*/React.createElement("button", {
      key: o.k,
      onClick: () => setMethod(o.k),
      style: {
        flex: 1,
        height: 64,
        borderRadius: 14,
        background: a ? COLORS.primary : "#fff",
        color: a ? "#fff" : COLORS.ink,
        border: a ? "none" : `1.5px solid ${COLORS.line}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12
      }
    }, o.i, o.t);
  })), method === "pix" && /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      aspectRatio: "1/1",
      maxWidth: 240,
      margin: "0 auto 16px",
      borderRadius: 14,
      background: "#fff",
      border: `2px solid ${COLORS.ink}`,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 14
    }
  }, /*#__PURE__*/React.createElement(QrPattern, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: 44,
      height: 44,
      borderRadius: 10,
      background: "#fff",
      border: `2px solid ${COLORS.ink}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/bosque-icon.png",
    width: 32,
    height: 30,
    style: {
      borderRadius: 6
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "dark",
    fullWidth: true,
    icon: I.copy
  }, "Copiar c\xF3digo PIX"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    fullWidth: true,
    icon: I.whats
  }, "Compartilhar no WhatsApp")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: "10px 14px",
      borderRadius: 12,
      background: COLORS.surface,
      fontSize: 11,
      color: COLORS.muted,
      lineHeight: 1.5,
      fontFamily: "ui-monospace, monospace",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, pixCode)), method === "boleto" && /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginBottom: 6
    }
  }, "Boleto banc\xE1rio"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginBottom: 14
    }
  }, "Vencimento em 3 dias \xFAteis \xB7 compensa\xE7\xE3o em at\xE9 2 dias"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      borderRadius: 8,
      background: "repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 4px, #000 4px 7px, transparent 7px 8px)",
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: "ui-monospace, monospace",
      color: COLORS.ink,
      fontWeight: 700,
      letterSpacing: "0.04em",
      marginBottom: 16
    }
  }, "23793.38128 60082.901108 00000.987654 7 99280000008970"), /*#__PURE__*/React.createElement(Btn, {
    variant: "dark",
    fullWidth: true,
    icon: I.share
  }, "Compartilhar boleto")), method === "link" && /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginBottom: 14
    }
  }, "Enviar link de pagamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 12,
      background: COLORS.surface,
      fontSize: 12,
      color: COLORS.ink,
      fontWeight: 600,
      marginBottom: 14
    }
  }, "pay.bosque.app/c/8f3a2-mar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    fullWidth: true,
    icon: I.whats
  }, "Enviar via WhatsApp"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    fullWidth: true,
    icon: I.mail
  }, "Enviar via E-mail"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 16,
      padding: 14,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: status === "pago" ? "#DCF3E2" : COLORS.primaryTint
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: status === "pago" ? COLORS.success : COLORS.primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, status === "pago" ? I.check : I.bolt), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.ink
    }
  }, status === "pago" ? "Pagamento confirmado!" : "Aguardando pagamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      marginTop: 2
    }
  }, status === "pago" ? "Bosque Família ativado · contrato em vigência" : "Confirmação em tempo real via webhook"))));
}
function QrPattern() {
  // Decorative QR-style grid
  const cells = [];
  const seed = 0x9f3c;
  let s = seed;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    s = s * 1103515245 + 12345 & 0x7fffffff;
    const fill = (s & 1) === 1;
    const corner = x < 7 && y < 7 || x > 13 && y < 7 || x < 7 && y > 13;
    cells.push({
      x,
      y,
      fill: fill || corner
    });
  }
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 21 21",
    style: {
      width: "100%",
      height: "100%"
    }
  }, cells.map((c, i) => c.fill && /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: c.x,
    y: c.y,
    width: 1,
    height: 1,
    fill: "#0F1B0B"
  })), [[0, 0], [14, 0], [0, 14]].map(([x, y], i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: y,
    width: 7,
    height: 7,
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: y,
    width: 7,
    height: 1,
    fill: "#0F1B0B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: y + 6,
    width: 7,
    height: 1,
    fill: "#0F1B0B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: y,
    width: 1,
    height: 7,
    fill: "#0F1B0B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x + 6,
    y: y,
    width: 1,
    height: 7,
    fill: "#0F1B0B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x + 2,
    y: y + 2,
    width: 3,
    height: 3,
    fill: "#0F1B0B"
  }))));
}
window.TelaPagamento = TelaPagamento;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaPagamento.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaPerfil.jsx
try { (() => {
// TelaPerfil.jsx — Tela 13 — Perfil & Configurações
function TelaPerfil({
  go
}) {
  const [notif, setNotif] = useState({
    leads: true,
    comissoes: true,
    ranking: true,
    marketing: false
  });
  const [tema, setTema] = useState("claro");
  const [bio, setBio] = useState(true);
  const [tab, setTab] = useState("perfil");
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Perfil",
    onBack: () => go("dashboard"),
    bg: COLORS.bg
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "8px 0 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Lucas Mendes",
    size: 88,
    idx: 1
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 30,
      height: 30,
      borderRadius: "50%",
      border: `3px solid ${COLORS.bg}`,
      background: COLORS.secondary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.camera)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: COLORS.ink,
      marginTop: 12
    }
  }, "Lucas Mendes"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, "Vendedor \xB7 Time Zona Sul"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "primary"
  }, "\uD83E\uDD48 2\xBA lugar"), /*#__PURE__*/React.createElement(Pill, {
    tone: "secondary"
  }, "87 vendas em 2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 14,
      padding: 4,
      background: COLORS.surface,
      borderRadius: 12
    }
  }, [["perfil", "Perfil"], ["preferencias", "Preferências"], ["seguranca", "Segurança"]].map(([k, l]) => {
    const a = tab === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setTab(k),
      style: {
        flex: 1,
        height: 36,
        borderRadius: 9,
        border: "none",
        background: a ? "#fff" : "transparent",
        color: a ? COLORS.ink : COLORS.muted,
        fontWeight: 700,
        fontSize: 12,
        boxShadow: a ? "0 2px 6px rgba(15,27,11,0.06)" : "none"
      }
    }, l);
  })), tab === "perfil" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Nome",
    value: "Lucas Mendes"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "E-mail",
    value: "lucas.mendes@vitalize.com.br"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Telefone",
    value: "(11) 98742-3310"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "CPF",
    value: "\u2022\u2022\u2022 .\u2022\u2022\u2022 .\u2022\u2022 12-34",
    last: true
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Empresa",
    value: "Vitalize Planos"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Filial",
    value: "S\xE3o Paulo \xB7 Zona Sul"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Supervisor",
    value: "Renata Lima",
    last: true
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Banco",
    value: "Ita\xFA \xB7 Ag 1234 / CC 56789-0"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "PIX para comiss\xF5es",
    value: "lucas.mendes@vitalize.com.br",
    last: true
  }))), tab === "preferencias" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.06em",
      margin: "4px 6px 8px"
    }
  }, "NOTIFICA\xC7\xD5ES"), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Novos leads",
    sub: "Notifica quando um lead chega",
    v: notif.leads,
    on: v => setNotif({
      ...notif,
      leads: v
    })
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Comiss\xF5es pagas",
    sub: "Confirma\xE7\xE3o de cada pagamento",
    v: notif.comissoes,
    on: v => setNotif({
      ...notif,
      comissoes: v
    })
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Ranking semanal",
    sub: "Sua posi\xE7\xE3o no time toda 2\xAA",
    v: notif.ranking,
    on: v => setNotif({
      ...notif,
      ranking: v
    })
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Comunica\xE7\xF5es Vitalize",
    sub: "Promo\xE7\xF5es e treinamentos",
    v: notif.marketing,
    on: v => setNotif({
      ...notif,
      marketing: v
    }),
    last: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.06em",
      margin: "4px 6px 8px"
    }
  }, "TEMA"), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["claro", "Claro"], ["escuro", "Escuro"], ["auto", "Auto"]].map(([k, l]) => {
    const a = tema === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setTema(k),
      style: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        border: a ? `1.5px solid ${COLORS.primary}` : `1.5px solid ${COLORS.line}`,
        background: a ? COLORS.primaryTint : "#fff",
        color: a ? COLORS.primary : COLORS.ink,
        fontWeight: 600,
        fontSize: 13
      }
    }, l);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.06em",
      margin: "4px 6px 8px"
    }
  }, "REGI\xC3O"), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Idioma",
    value: "Portugu\xEAs (BR)"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Moeda",
    value: "Real (BRL)"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Fuso hor\xE1rio",
    value: "Bras\xEDlia (UTC\u22123)",
    last: true
  }))), tab === "seguranca" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Login biom\xE9trico",
    sub: "Face ID ou impress\xE3o digital",
    v: bio,
    on: setBio
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Alterar senha",
    value: "\xDAltima troca h\xE1 3 meses",
    arrow: true
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Sess\xF5es ativas",
    value: "3 dispositivos",
    arrow: true,
    last: true
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 14,
      display: "flex",
      gap: 12,
      alignItems: "center",
      background: COLORS.primaryTint
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: COLORS.primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.shield), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.primary
    }
  }, "Autentica\xE7\xE3o em 2 etapas ativa"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.primary,
      opacity: 0.85,
      marginTop: 2
    }
  }, "SMS para (11) \u2022\u2022\u2022\u2022\u20113310"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Pol\xEDtica de privacidade",
    arrow: true
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Termos de uso",
    arrow: true
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Central de ajuda",
    arrow: true,
    last: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    fullWidth: true,
    style: {
      borderColor: COLORS.danger,
      color: COLORS.danger
    },
    onClick: () => go("login")
  }, "Sair da conta"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      width: "100%",
      padding: 12,
      background: "transparent",
      border: "none",
      color: COLORS.muted2,
      fontSize: 11,
      fontWeight: 600
    }
  }, "Excluir conta permanentemente"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 18,
      fontSize: 11,
      color: COLORS.muted2
    }
  }, "Bosque CRM v3.4.1 \xB7 Vitalize")));
}
function Row({
  label,
  value,
  last,
  arrow
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "14px 16px",
      borderBottom: last ? "none" : `1px solid ${COLORS.divider}`,
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: COLORS.ink
    }
  }, label), value && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, value)), arrow && /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.muted2
    }
  }, I.fwd));
}
function Toggle({
  label,
  sub,
  v,
  on,
  last
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "14px 16px",
      borderBottom: last ? "none" : `1px solid ${COLORS.divider}`,
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: COLORS.ink
    }
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      marginTop: 2
    }
  }, sub)), /*#__PURE__*/React.createElement("button", {
    onClick: () => on(!v),
    style: {
      width: 46,
      height: 28,
      borderRadius: 999,
      border: "none",
      background: v ? COLORS.primary : COLORS.line,
      padding: 2,
      position: "relative",
      cursor: "pointer",
      transition: "background 0.15s"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      height: 24,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
      transform: v ? "translateX(18px)" : "translateX(0)",
      transition: "transform 0.15s"
    }
  })));
}
window.TelaPerfil = TelaPerfil;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaPerfil.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaPipeline.jsx
try { (() => {
// TelaPipeline.jsx — Tela 9 — Pipeline CRM (Kanban)
function TelaPipeline({
  go
}) {
  const [filter, setFilter] = useState("todos");
  const cols = [{
    id: "novo",
    t: "Novos leads",
    tone: "neutral",
    cards: [{
      n: "Renata Lima",
      v: "R$ 2.890",
      ag: "Hoje 16h",
      t: "Indicação · 2 vidas"
    }, {
      n: "Pedro Alves",
      v: "R$ 4.120",
      ag: "Amanhã",
      t: "Site · 4 vidas"
    }]
  }, {
    id: "contato",
    t: "Em contato",
    tone: "primary",
    cards: [{
      n: "Ana Beatriz",
      v: "R$ 5.120",
      ag: "Retornar 14h",
      t: "WhatsApp · 3 vidas"
    }]
  }, {
    id: "orcado",
    t: "Orçado",
    tone: "warning",
    cards: [{
      n: "João Souza",
      v: "R$ 3.250",
      ag: "Aguardando",
      t: "Enviado ontem · 2 vidas"
    }, {
      n: "Marcos R.",
      v: "R$ 6.780",
      ag: "Aguardando",
      t: "Enviado 3d · 5 vidas"
    }]
  }, {
    id: "negoc",
    t: "Negociação",
    tone: "secondary",
    cards: [{
      n: "Maria Aparecida",
      v: "R$ 4.890",
      ag: "Reunião 17h",
      t: "Pode fechar hoje · 3 vidas",
      hot: true
    }]
  }, {
    id: "fech",
    t: "Fechado",
    tone: "success",
    cards: [{
      n: "Família Costa",
      v: "R$ 8.940",
      ag: "Pago",
      t: "Bosque Família · 6 vidas"
    }]
  }];
  const toneBg = {
    neutral: COLORS.surface,
    primary: COLORS.primaryTint,
    warning: "#FFF1DA",
    secondary: "#FFE9D1",
    success: "#DCF3E2"
  };
  const toneText = {
    neutral: COLORS.muted,
    primary: COLORS.primary,
    warning: "#A05A0F",
    secondary: "#C45F00",
    success: "#1F5B2C"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: COLORS.bg
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      padding: "14px 18px",
      borderBottom: `1px solid ${COLORS.divider}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("dashboard"),
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      border: "none",
      background: COLORS.surface,
      color: COLORS.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.back), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 600
    }
  }, "PIPELINE \xB7 NOVEMBRO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: COLORS.ink
    }
  }, "34 oportunidades \xB7 R$ 142k")), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      border: `1px solid ${COLORS.divider}`,
      background: "#fff",
      color: COLORS.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.filter)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      overflowX: "auto"
    }
  }, [["todos", "Todos"], ["meus", "Meus"], ["quentes", "🔥 Quentes"], ["atrasados", "Atrasados"]].map(([k, l]) => {
    const a = filter === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setFilter(k),
      style: {
        padding: "6px 12px",
        borderRadius: 999,
        border: "none",
        background: a ? COLORS.ink : COLORS.surface,
        color: a ? "#fff" : COLORS.muted,
        fontWeight: 700,
        fontSize: 12,
        whiteSpace: "nowrap"
      }
    }, l);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowX: "auto",
      overflowY: "hidden",
      display: "flex",
      gap: 12,
      padding: 14
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      minWidth: 240,
      maxWidth: 240,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: toneText[c.tone]
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.ink,
      flex: 1
    }
  }, c.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 700
    }
  }, c.cards.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, c.cards.map((card, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    style: {
      padding: 12,
      borderLeft: `3px solid ${toneText[c.tone]}`,
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.ink
    }
  }, card.n), card.hot && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, "\uD83D\uDD25")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      marginBottom: 8
    }
  }, card.t), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.primary
    }
  }, card.v), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: "2px 8px",
      borderRadius: 999,
      background: toneBg[c.tone],
      color: toneText[c.tone],
      fontWeight: 700
    }
  }, card.ag)))), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: 10,
      borderRadius: 10,
      border: `1.5px dashed ${COLORS.line}`,
      background: "transparent",
      color: COLORS.muted,
      fontWeight: 600,
      fontSize: 12
    }
  }, "+ Adicionar lead"))))));
}
window.TelaPipeline = TelaPipeline;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaPipeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaPlano.jsx
try { (() => {
// TelaPlano.jsx — Tela 3 — Criação do plano (titular + dependentes)
const FAIXAS = ["0–18", "19–30", "31–40", "41–64", "65–69", "70–74", "75+"];
const PARENT = ["Cônjuge", "Filho", "Filha", "Pai", "Mãe", "Irmão", "Irmã", "Avô", "Avó", "Outro"];
function TelaPlano({
  go
}) {
  const [step, setStep] = useState(1);
  const [titularFaixa, setTitularFaixa] = useState("41–64");
  const [titularNome, setTitularNome] = useState("");
  const [deps, setDeps] = useState([{
    parentesco: "Cônjuge",
    faixa: "41–64"
  }]);
  const [adding, setAdding] = useState(false);
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: step === 1 ? "Quem é o titular?" : "Composição familiar",
    onBack: () => step === 1 ? go("dashboard") : setStep(1),
    bg: COLORS.bg,
    footer: /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => step === 1 ? setStep(2) : go("resultado"),
      iconRight: I.fwd
    }, step === 1 ? "Continuar" : `Calcular plano (${deps.length + 1} pessoas)`)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      background: COLORS.primary
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      background: step >= 2 ? COLORS.primary : COLORS.line
    }
  })), step === 1 ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: COLORS.ink,
      lineHeight: 1.25,
      marginBottom: 8,
      letterSpacing: "-0.01em"
    }
  }, "Vamos come\xE7ar pelo", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.primary
    }
  }, "titular do plano.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginBottom: 22
    }
  }, "Selecione a faixa et\xE1ria. O nome \xE9 opcional."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: COLORS.muted,
      marginBottom: 10,
      letterSpacing: "0.04em"
    }
  }, "FAIXA ET\xC1RIA"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 22
    }
  }, FAIXAS.map(f => {
    const a = titularFaixa === f;
    return /*#__PURE__*/React.createElement("button", {
      key: f,
      onClick: () => setTitularFaixa(f),
      style: {
        height: 60,
        borderRadius: 16,
        border: a ? `2px solid ${COLORS.primary}` : `1.5px solid ${COLORS.line}`,
        background: a ? COLORS.primaryTint : "#fff",
        color: a ? COLORS.primary : COLORS.ink,
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer",
        fontFamily: "var(--font-text)"
      }
    }, f);
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Nome do titular (opcional)",
    value: titularNome,
    onChange: setTitularNome,
    icon: I.user,
    placeholder: "Maria Aparecida"
  })) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: COLORS.ink,
      lineHeight: 1.25,
      marginBottom: 8,
      letterSpacing: "-0.01em"
    }
  }, "Quem mais entra", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: COLORS.primary
    }
  }, "na prote\xE7\xE3o?")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginBottom: 18
    }
  }, "Adicione dependentes. Voc\xEA pode editar ou remover a qualquer momento."), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: COLORS.primaryTint,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: COLORS.primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.user), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.primary
    }
  }, "TITULAR"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink
    }
  }, titularNome || "Não informado", " \xB7 ", titularFaixa)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      border: "none",
      background: "rgba(255,255,255,0.95)",
      color: COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.edit)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginBottom: 14
    }
  }, deps.map((d, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    style: {
      padding: 14,
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: COLORS.primaryTint,
      color: COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.heart), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink
    }
  }, d.parentesco), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted
    }
  }, "Faixa ", d.faixa)), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      border: "none",
      background: COLORS.surface,
      color: COLORS.muted,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.edit), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDeps(deps.filter((_, j) => j !== i)),
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      border: "none",
      background: COLORS.surface,
      color: COLORS.danger,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.trash)))), !adding ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setAdding(true),
    style: {
      width: "100%",
      height: 54,
      borderRadius: 16,
      border: `1.5px dashed ${COLORS.primary}`,
      background: "transparent",
      color: COLORS.primary,
      fontWeight: 600,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      cursor: "pointer"
    }
  }, I.plus, " Adicionar dependente") : /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      background: COLORS.surface
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: COLORS.muted,
      marginBottom: 8
    }
  }, "PARENTESCO"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 14
    }
  }, PARENT.map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => setDeps([...deps, {
      parentesco: p,
      faixa: "31–40"
    }]) || setAdding(false),
    style: {
      padding: "8px 14px",
      borderRadius: 999,
      border: `1.5px solid ${COLORS.line}`,
      background: "#fff",
      color: COLORS.ink,
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer"
    }
  }, p))), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    size: "md",
    onClick: () => setAdding(false),
    fullWidth: true
  }, "Cancelar"))));
}
window.TelaPlano = TelaPlano;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaPlano.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaResultado.jsx
try { (() => {
// TelaResultado.jsx — Tela 4 — Resultado do plano
function TelaResultado({
  go
}) {
  const mensal = 89.70;
  const diario = (mensal / 30).toFixed(2);
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Plano calculado",
    onBack: () => go("plano"),
    bg: COLORS.surface,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "ghost",
      onClick: () => go("compartilhar"),
      icon: I.share
    }, "Compartilhar"), /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => go("contrato"),
      iconRight: I.fwd,
      style: {
        flex: 1
      }
    }, "Contratar agora"))
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: "22px 22px 20px",
      marginBottom: 16,
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -60,
      top: -60,
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: COLORS.primaryTint,
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "primary"
  }, "BOSQUE FAM\xCDLIA \xB7 COMPLETO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 16,
      fontWeight: 500
    }
  }, "Prote\xE7\xE3o completa da sua fam\xEDlia por apenas"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      alignItems: "baseline",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      color: COLORS.muted,
      fontWeight: 600
    }
  }, "R$"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      color: COLORS.primary,
      letterSpacing: "-0.04em",
      lineHeight: 1
    }
  }, diario.replace(".", ",")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: COLORS.muted,
      fontWeight: 600,
      marginLeft: 4
    }
  }, "/ dia")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 13,
      color: COLORS.muted,
      fontWeight: 500
    }
  }, "ou ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: COLORS.ink,
      fontWeight: 700
    }
  }, "R$ ", mensal.toFixed(2).replace(".", ",")), "/m\xEAs \xB7 sem reajuste no 1\xBA ano"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      padding: "12px 14px",
      borderRadius: 14,
      background: COLORS.secondarySoft,
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: COLORS.secondary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.bolt), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.ink
    }
  }, "Taxa de ades\xE3o zerada"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.secondaryDeep,
      fontWeight: 600,
      marginTop: 2
    }
  }, "Promo\xE7\xE3o v\xE1lida at\xE9 hoje"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginBottom: 10
    }
  }, "Cobertura inclusa"), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginBottom: 14,
      padding: 16
    }
  }, [["Funeral completo até R$ 8.000", "Velório, urna, transporte e cerimônia"], ["Sala de velório por 24h", "Em todo território nacional"], ["Assistência 24h imediata", "Atendimento em até 1 hora"], ["Translado nacional", "Sem limite de distância"]].map(([t, s], i, arr) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "10px 0",
      borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.divider}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 8,
      background: COLORS.primaryTint,
      color: COLORS.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 28px"
    }
  }, I.check), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.ink
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: 700
    }
  }, "CAR\xCANCIA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4
    }
  }, "90 dias"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      marginTop: 2
    }
  }, "ap\xF3s pagamento")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: 700
    }
  }, "VIG\xCANCIA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4
    }
  }, "Vital\xEDcia"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      marginTop: 2
    }
  }, "enquanto vigente"))));
}
window.TelaResultado = TelaResultado;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaResultado.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaSinistro.jsx
try { (() => {
// TelaSinistro.jsx — Tela 14 — Abertura de Sinistro (acionamento do plano)
function TelaSinistro({
  go
}) {
  const [etapa, setEtapa] = useState(0);
  const [tipo, setTipo] = useState(null);
  const [docs, setDocs] = useState({
    obito: false,
    doc: false
  });
  const titulos = ["Identificação", "Ocorrido", "Documentos", "Atendimento"];
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Acionar plano",
    onBack: () => etapa === 0 ? go("dashboard") : setEtapa(etapa - 1),
    bg: COLORS.bg,
    footer: etapa < 3 ? /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      iconRight: I.fwd,
      onClick: () => setEtapa(etapa + 1)
    }, etapa === 0 ? "Confirmar titular" : etapa === 1 ? "Continuar" : "Solicitar atendimento") : /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      fullWidth: true,
      onClick: () => go("dashboard")
    }, "Voltar ao in\xEDcio")
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 14,
      background: "#FFE4E2",
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      background: COLORS.danger,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, I.heart), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#7A1F1A"
    }
  }, "Nossos sentimentos."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#7A1F1A",
      opacity: 0.85,
      marginTop: 4,
      lineHeight: 1.45
    }
  }, "Estamos aqui em todo o processo. Tudo o que precisa fazer \xE9 confirmar os dados \u2014 cuidamos do resto."))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em",
      marginBottom: 8
    }
  }, "ETAPA ", etapa + 1, " DE 4"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 20
    }
  }, titulos.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 2,
      background: i <= etapa ? COLORS.primary : COLORS.line
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: i === etapa ? COLORS.primary : COLORS.muted2,
      marginTop: 6
    }
  }, t.toUpperCase())))), etapa === 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: COLORS.ink,
      marginBottom: 12
    }
  }, "Confirme o titular do plano"), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 12,
      border: `1.5px solid ${COLORS.primary}`
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Maria Aparecida",
    size: 44,
    idx: 2
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink
    }
  }, "Maria Aparecida Silva"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2
    }
  }, "Bosque Fam\xEDlia \xB7 ativo desde 11/2024")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: COLORS.primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.check)), /*#__PURE__*/React.createElement("button", {
    style: {
      width: "100%",
      padding: 14,
      borderRadius: 14,
      background: COLORS.surface,
      border: `1.5px dashed ${COLORS.line}`,
      color: COLORS.muted,
      fontWeight: 600,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, I.search, " Procurar outro titular"), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 16,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em",
      marginBottom: 10
    }
  }, "COBERTURAS ATIVAS"), ["Velório e cerimônia", "Sepultamento ou cremação", "Translado intermunicipal", "Apoio psicológico (90 dias)"].map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 5,
      background: "#DCF3E2",
      color: COLORS.success,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.check), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: COLORS.ink
    }
  }, c))))), etapa === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: COLORS.ink,
      marginBottom: 6
    }
  }, "Quem est\xE1 sendo acionado?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginBottom: 14
    }
  }, "Selecione o ente coberto pelo plano."), [{
    k: "titular",
    n: "Maria Aparecida Silva",
    r: "Titular",
    d: "12/03/1968"
  }, {
    k: "conjuge",
    n: "José Carlos Silva",
    r: "Cônjuge",
    d: "08/11/1965"
  }, {
    k: "filha",
    n: "Júlia Silva",
    r: "Filha",
    d: "22/04/1995"
  }].map(d => {
    const a = tipo === d.k;
    return /*#__PURE__*/React.createElement(Card, {
      key: d.k,
      onClick: () => setTipo(d.k),
      style: {
        padding: 14,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: a ? `1.5px solid ${COLORS.primary}` : "none",
        background: a ? COLORS.primaryTint : "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: a ? `2px solid ${COLORS.primary}` : `2px solid ${COLORS.line}`,
        background: a ? COLORS.primary : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, a && /*#__PURE__*/React.createElement("div", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "#fff"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        color: COLORS.ink
      }
    }, d.n), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: COLORS.muted,
        marginTop: 2
      }
    }, d.r, " \xB7 nasc. ", d.d)));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14
    }
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Data do ocorrido",
    value: "13/05/2026",
    onChange: () => {},
    icon: I.clock
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 12
    }
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Local (cidade/UF)",
    value: "S\xE3o Paulo \xB7 SP",
    onChange: () => {}
  })), etapa === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: COLORS.ink,
      marginBottom: 6
    }
  }, "Envie os documentos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      marginBottom: 14
    }
  }, "Pode enviar agora ou trazer no atendimento \u2014 o que for melhor para a fam\xEDlia."), [{
    k: "obito",
    t: "Atestado de óbito",
    s: "Obrigatório para liberação"
  }, {
    k: "doc",
    t: "Documento com foto do ente",
    s: "RG, CNH ou passaporte"
  }].map(d => {
    const done = docs[d.k];
    return /*#__PURE__*/React.createElement(Card, {
      key: d.k,
      onClick: () => setDocs({
        ...docs,
        [d.k]: true
      }),
      style: {
        padding: 14,
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: done ? `1.5px solid ${COLORS.success}` : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        borderRadius: 12,
        background: done ? "#DCF3E2" : COLORS.surface,
        color: done ? COLORS.success : COLORS.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, done ? I.check : I.camera), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        color: COLORS.ink
      }
    }, d.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: done ? COLORS.success : COLORS.muted,
        marginTop: 2,
        fontWeight: done ? 600 : 500
      }
    }, done ? "Anexado" : d.s)));
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginTop: 8,
      background: COLORS.surface,
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 6,
      background: COLORS.primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, "i"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: COLORS.muted,
      lineHeight: 1.5
    }
  }, "Sem o atestado em m\xE3os? Pode anexar depois pelo WhatsApp do atendimento. N\xE3o atrasamos a libera\xE7\xE3o por isso."))), etapa === 3 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      borderRadius: "50%",
      background: "#DCF3E2",
      color: COLORS.success,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "40",
    height: "40",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 20,
      color: COLORS.ink,
      marginBottom: 6
    }
  }, "Atendimento ativado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: COLORS.muted,
      lineHeight: 1.5,
      padding: "0 12px"
    }
  }, "Um agente Bosque j\xE1 est\xE1 a caminho.", /*#__PURE__*/React.createElement("br", null), "A fam\xEDlia receber\xE1 liga\xE7\xE3o em at\xE9 30 minutos.")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 16,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
      paddingBottom: 14,
      borderBottom: `1px solid ${COLORS.divider}`
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Carla Antunes",
    size: 44,
    idx: 2
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: "0.04em"
    }
  }, "AGENTE DESIGNADO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginTop: 2
    }
  }, "Carla Antunes \xB7 Plant\xE3o SP"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    size: "md",
    fullWidth: true,
    icon: I.whats
  }, "WhatsApp"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    size: "md",
    fullWidth: true
  }, "Ligar"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      background: COLORS.primaryTint
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.primary,
      letterSpacing: "0.04em",
      marginBottom: 6
    }
  }, "PROTOCOLO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      color: COLORS.primary,
      fontFamily: "ui-monospace, monospace",
      letterSpacing: "0.04em"
    }
  }, "#SIN\u201126\u201100482"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.primary,
      opacity: 0.8,
      marginTop: 4
    }
  }, "Guarde para acompanhar o atendimento"))));
}
window.TelaSinistro = TelaSinistro;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaSinistro.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/TelaSupervisor.jsx
try { (() => {
// TelaSupervisor.jsx — Tela 11 — Dashboard do Supervisor
function TelaSupervisor({
  go
}) {
  const team = [{
    n: "Ana Carolina",
    m: 95,
    v: "R$ 82,6k",
    d: 9,
    t: "🥇",
    c: 0
  }, {
    n: "Lucas Mendes",
    m: 74,
    v: "R$ 64,3k",
    d: 7,
    t: "🥈",
    c: 1
  }, {
    n: "Beatriz Lima",
    m: 68,
    v: "R$ 59,2k",
    d: 6,
    t: "🥉",
    c: 2
  }, {
    n: "Rafael Souza",
    m: 52,
    v: "R$ 45,2k",
    d: 5,
    t: "",
    c: 3
  }, {
    n: "Camila Reis",
    m: 31,
    v: "R$ 27,0k",
    d: 3,
    t: "⚠️",
    c: 4
  }];
  const total = team.reduce((a, b) => a + b.d, 0);
  return /*#__PURE__*/React.createElement(ScreenShell, {
    title: "Vis\xE3o da equipe",
    onBack: () => go("dashboard"),
    bg: COLORS.bg
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18,
      marginBottom: 14,
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -50,
      top: -50,
      width: 160,
      height: 160,
      borderRadius: "50%",
      background: COLORS.primaryTint,
      opacity: 0.55
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Renata Lima",
    size: 42,
    idx: 3
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 700,
      letterSpacing: "0.04em"
    }
  }, "SUPERVISORA \xB7 ZONA SUL"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: COLORS.ink,
      letterSpacing: "-0.01em"
    }
  }, "Renata Lima")), /*#__PURE__*/React.createElement(Pill, {
    tone: "primary"
  }, "5 pessoas")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 12,
      paddingTop: 14,
      borderTop: `1px solid ${COLORS.divider}`
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: COLORS.muted,
      fontWeight: 700,
      letterSpacing: "0.04em"
    }
  }, "META TIME"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: COLORS.primary,
      marginTop: 4,
      letterSpacing: "-0.02em"
    }
  }, "68%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: COLORS.muted,
      fontWeight: 700,
      letterSpacing: "0.04em"
    }
  }, "VENDAS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4,
      letterSpacing: "-0.02em"
    }
  }, total)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: COLORS.muted,
      fontWeight: 700,
      letterSpacing: "0.04em"
    }
  }, "RECEITA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: COLORS.ink,
      marginTop: 4,
      letterSpacing: "-0.02em"
    }
  }, "R$ 278k")))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "#FFF1DA"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: COLORS.warning,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I.warn), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#7A4A0A"
    }
  }, "2 vendedores abaixo de 50%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#7A4A0A",
      opacity: 0.8,
      marginTop: 2
    }
  }, "Camila e Rafael precisam de 1:1 esta semana")), /*#__PURE__*/React.createElement("button", {
    style: {
      background: COLORS.warning,
      color: "#fff",
      border: "none",
      padding: "8px 12px",
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 12
    }
  }, "Agendar")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: COLORS.ink,
      marginBottom: 10
    }
  }, "Ranking do time"), /*#__PURE__*/React.createElement(Card, null, team.map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: v.n,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      borderBottom: i < team.length - 1 ? `1px solid ${COLORS.divider}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      textAlign: "center",
      fontSize: v.t ? 18 : 14,
      fontWeight: 700,
      color: COLORS.muted
    }
  }, v.t || `#${i + 1}`), /*#__PURE__*/React.createElement(Avatar, {
    name: v.n,
    size: 36,
    idx: v.c
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: COLORS.ink
    }
  }, v.n), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      borderRadius: 3,
      background: COLORS.surface,
      marginTop: 6,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${v.m}%`,
      height: "100%",
      background: v.m >= 70 ? COLORS.success : v.m >= 50 ? COLORS.primary : COLORS.danger,
      borderRadius: 3
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: 600
    }
  }, v.d, " vendas \xB7 ", v.v), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: v.m >= 70 ? COLORS.success : v.m >= 50 ? COLORS.primary : COLORS.danger,
      fontWeight: 700
    }
  }, v.m, "%")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 16
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    fullWidth: true,
    icon: I.tv,
    onClick: () => go("gestaoavista")
  }, "Abrir gest\xE3o \xE0 vista (TV)"));
}
window.TelaSupervisor = TelaSupervisor;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/TelaSupervisor.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bosque/ios-frame.jsx
try { (() => {
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports: IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bosque/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/ChatPanel.jsx
try { (() => {
// ChatPanel.jsx — right-rail messaging surface
function ChatPanel({
  messages,
  onSend
}) {
  const [draft, setDraft] = React.useState("");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 320,
      background: "#FCFCFE",
      borderLeft: "1px solid #EFF1F3",
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 20px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderBottom: "1px solid #EFF1F3"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Jason Kim",
    idx: 2,
    size: 40,
    presence: true
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#1C1243"
    }
  }, "Jason Kim"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#47C272",
      fontWeight: 600
    }
  }, "Active now")), /*#__PURE__*/React.createElement("button", {
    style: {
      marginLeft: "auto",
      width: 32,
      height: 32,
      borderRadius: 8,
      border: "none",
      background: "transparent",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "voice",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, messages.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      alignSelf: m.from === "me" ? "flex-end" : "flex-start",
      background: m.from === "me" ? "#643FDB" : "#EFF1F3",
      color: m.from === "me" ? "#fff" : "#1C1243",
      padding: "10px 14px",
      borderRadius: 16,
      maxWidth: "82%",
      fontSize: 14,
      lineHeight: 1.4
    }
  }, m.text))), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      if (draft.trim()) {
        onSend?.(draft);
        setDraft("");
      }
    },
    style: {
      padding: 16,
      borderTop: "1px solid #EFF1F3",
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: draft,
    onChange: e => setDraft(e.target.value),
    placeholder: "Write a message\u2026",
    style: {
      flex: 1,
      height: 40,
      padding: "0 16px",
      border: "1px solid #EFF1F3",
      borderRadius: 999,
      background: "#fff",
      outline: "none",
      fontFamily: "var(--font-text)",
      fontSize: 14,
      color: "#1C1243"
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: {
      width: 40,
      height: 40,
      borderRadius: "50%",
      border: "none",
      background: "#643FDB",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6"
  })))));
}
window.ChatPanel = ChatPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/ChatPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/Dashboard.jsx
try { (() => {
// Dashboard.jsx — main "overview" screen
function Dashboard() {
  const [activeTab, setActiveTab] = React.useState("Overview");
  const [doneState, setDoneState] = React.useState({
    p1: true,
    p2: false,
    p3: false
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: "#F9F9F9"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Good morning, Tien",
    subtitle: "You have 3 deadlines this week"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    tabs: ["Overview", "Analytics", "Projects", "Completed"],
    active: activeTab,
    onChange: setActiveTab
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "soft",
    iconRight: "chevron-right",
    style: {
      height: 40,
      borderRadius: 12,
      fontSize: 14,
      padding: "0 16px"
    }
  }, "This week")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Active projects",
    value: "12",
    delta: 8,
    tone: "primary",
    icon: "dashboard"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Tasks done",
    value: "84",
    delta: 12,
    tone: "success",
    icon: "check-done"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "In review",
    value: "6",
    delta: -3,
    tone: "ascent",
    icon: "description"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Overdue",
    value: "2",
    delta: -1,
    tone: "danger",
    icon: "priority"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: "#1C1243"
    }
  }, "Your projects"), /*#__PURE__*/React.createElement("a", {
    style: {
      color: "#643FDB",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "View all \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TaskCard, {
    title: "Userflow",
    deadline: "20 Jan 2026",
    priority: "High",
    members: ["Anna B", "Caro C", "Dan D", "Eli E"],
    progress: 72,
    done: doneState.p1,
    onToggle: () => setDoneState(s => ({
      ...s,
      p1: !s.p1
    }))
  }), /*#__PURE__*/React.createElement(TaskCard, {
    title: "UI design",
    deadline: "24 Jan 2026",
    priority: "High",
    members: ["Felix F", "Gina G"],
    progress: 48,
    done: doneState.p2,
    onToggle: () => setDoneState(s => ({
      ...s,
      p2: !s.p2
    }))
  }), /*#__PURE__*/React.createElement(TaskCard, {
    title: "Brand audit",
    deadline: "02 Feb 2026",
    priority: "Medium",
    members: ["Henri H", "Iris I", "Jay J"],
    progress: 20,
    done: doneState.p3,
    onToggle: () => setDoneState(s => ({
      ...s,
      p3: !s.p3
    }))
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: "#1C1243",
      marginBottom: 12
    }
  }, "Today's meetings"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(MeetingCard, {
    title: "Weekly stand-up",
    time: "10:00 \u2014 10:30 AM",
    status: "live",
    attendees: ["Anna", "Caro", "Dan", "Eli"]
  }), /*#__PURE__*/React.createElement(MeetingCard, {
    title: "Design review",
    time: "2:00 \u2014 3:00 PM",
    status: "upcoming",
    attendees: ["Felix", "Gina", "Henri"]
  })))));
}
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/MeetingCard.jsx
try { (() => {
// MeetingCard.jsx — upcoming meeting row used in the sidebar feed
function MeetingCard({
  title,
  time,
  attendees = [],
  status = "upcoming"
}) {
  const statusTone = {
    upcoming: {
      bg: "#EDE7FC",
      fg: "#643FDB",
      label: "Upcoming"
    },
    live: {
      bg: "#FFE4E2",
      fg: "#C8413A",
      label: "Live"
    },
    done: {
      bg: "#EFF1F3",
      fg: "#61565C",
      label: "Done"
    }
  }[status];
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "#FFE7CC",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "meeting",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#1C1243"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8F8D8D",
      marginTop: 2
    }
  }, time)), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: "4px 10px",
      borderRadius: 999,
      background: statusTone.bg,
      color: statusTone.fg,
      fontSize: 11,
      fontWeight: 700
    }
  }, statusTone.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, attendees.slice(0, 4).map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      marginLeft: i ? -10 : 0,
      border: "3px solid #fff",
      borderRadius: "50%"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: a,
    idx: i + 1,
    size: 28
  })))), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 32,
      padding: "0 14px",
      borderRadius: 999,
      background: "#1C1243",
      color: "#fff",
      border: "none",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "video",
    size: 14
  }), " Join")));
}
window.MeetingCard = MeetingCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/MeetingCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/Sidebar.jsx
try { (() => {
// Sidebar.jsx — left nav rail used throughout the Vitalize CRM
function Sidebar({
  active,
  onNav
}) {
  const items = [{
    key: "dashboard",
    icon: "dashboard",
    label: "Dashboard"
  }, {
    key: "analytics",
    icon: "analytics",
    label: "Analytics"
  }, {
    key: "events",
    icon: "event",
    label: "Events"
  }, {
    key: "messages",
    icon: "message",
    label: "Messages"
  }, {
    key: "mail",
    icon: "mail",
    label: "Mail"
  }, {
    key: "settings",
    icon: "settings",
    label: "Settings"
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      background: "#FCFCFE",
      height: "100%",
      borderRight: "1px solid #EFF1F3",
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 8px 24px"
    }
  }, /*#__PURE__*/React.createElement(Logo, null)), items.map(it => {
    const isActive = active === it.key;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      onClick: () => onNav?.(it.key),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: "none",
        background: isActive ? "#EDE7FC" : "transparent",
        color: isActive ? "#643FDB" : "#363853",
        fontWeight: isActive ? 700 : 500,
        fontSize: 14,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-text)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 20
    }), /*#__PURE__*/React.createElement("span", null, it.label), isActive && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "#FF8A00"
      }
    }));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      padding: "12px 8px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Tien Tom",
    idx: 2,
    presence: true,
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.25
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "#1C1243"
    }
  }, "Tien Tom"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8F8D8D"
    }
  }, "Product designer"))));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/StatCard.jsx
try { (() => {
// StatCard.jsx — small KPI tile used on the dashboard
function StatCard({
  label,
  value,
  delta,
  tone = "primary",
  icon
}) {
  const palette = {
    primary: {
      bg: "#EDE7FC",
      fg: "#643FDB"
    },
    ascent: {
      bg: "#FFE7CC",
      fg: "#FF8514"
    },
    success: {
      bg: "#E1F6E8",
      fg: "#1F8B3E"
    },
    danger: {
      bg: "#FFE4E2",
      fg: "#C8413A"
    }
  }[tone];
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minWidth: 180
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: palette.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#8F8D8D",
      fontWeight: 500
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      color: "#1C1243",
      letterSpacing: "-0.02em"
    }
  }, value), delta != null && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: delta >= 0 ? "#1F8B3E" : "#C8413A"
    }
  }, delta >= 0 ? "+" : "", delta, "%")));
}
window.StatCard = StatCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/StatCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/TaskCard.jsx
try { (() => {
// TaskCard.jsx — project / task summary card
function TaskCard({
  title,
  deadline,
  priority,
  members = [],
  progress = 0,
  done = false,
  onToggle
}) {
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      minWidth: 240,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "#EDE7FC",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dashboard",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "#1C1243"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      color: "#643FDB",
      fontWeight: 600,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "date-time",
    size: 14
  }), " Deadline"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 20,
      fontSize: 13,
      color: "#8F8D8D"
    }
  }, deadline)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      color: "#FF8A00",
      fontWeight: 600,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "priority",
    size: 14
  }), " Priority"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 20,
      fontSize: 13,
      color: "#8F8D8D"
    }
  }, priority)), members.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center"
    }
  }, members.slice(0, 3).map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      marginLeft: i ? -10 : 0,
      border: "3px solid #fff",
      borderRadius: "50%"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: m,
    idx: i,
    size: 32
  }))), members.length > 3 && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: -10,
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "#FF8A00",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 12,
      border: "3px solid #fff"
    }
  }, "+", members.length - 3)), progress > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 3,
      background: "#EFF1F3",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${progress}%`,
      height: "100%",
      background: "#643FDB"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 11,
      color: "#8F8D8D"
    }
  }, progress, "% complete")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onToggle?.(),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      border: "none",
      background: "transparent",
      padding: 0,
      cursor: "pointer",
      color: done ? "#1C1243" : "#8F8D8D",
      fontWeight: done ? 600 : 500,
      fontSize: 13,
      fontFamily: "var(--font-text)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 6,
      background: "#EFF1F3",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, done && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  })), done ? "Done" : "Mark as done"));
}
window.TaskCard = TaskCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/TaskCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/TopBar.jsx
try { (() => {
// TopBar.jsx — page header with search + actions
function TopBar({
  title,
  subtitle
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "20px 32px",
      borderBottom: "1px solid #EFF1F3",
      gap: 24,
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-text)",
      fontWeight: 700,
      fontSize: 22,
      color: "#1C1243"
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#8F8D8D",
      marginTop: 2
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 44,
      padding: "0 18px",
      borderRadius: 14,
      background: "#fff",
      boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      width: 360,
      color: "#8F8D8D",
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, "Search projects, people, files\u2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      border: "1px solid #EFF1F3",
      background: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 8,
      right: 9,
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#FF6A5D",
      border: "2px solid #fff"
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "add-member",
    style: {
      height: 44,
      borderRadius: 12,
      padding: "0 18px",
      fontSize: 14
    }
  }, "New project")));
}
window.TopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm/VitalizeUI.jsx
try { (() => {
// VitalizeUI.jsx — Reusable UI primitives for the Vitalize CRM
// Loaded as Babel script: `<script type="text/babel" src="VitalizeUI.jsx"></script>`

const {
  useState
} = React;

/* ---------------- Icon ---------------- */
function Icon({
  name,
  size = 24,
  color,
  style
}) {
  return /*#__PURE__*/React.createElement("img", {
    src: `../../assets/icons/${name}.svg`,
    width: size,
    height: size,
    alt: "",
    style: {
      display: "block",
      filter: color ? "none" : undefined,
      ...style
    }
  });
}

/* ---------------- Avatar ---------------- */
const AVATAR_GRADIENTS = ["linear-gradient(135deg,#E15A93,#643FDB)", "linear-gradient(135deg,#FF8A00,#FF6A5D)", "linear-gradient(135deg,#47C272,#643FDB)", "linear-gradient(135deg,#B37BE7,#643FDB)", "linear-gradient(135deg,#FFB523,#FF8A00)"];
function Avatar({
  name = "U",
  size = 40,
  presence = false,
  idx = 0
}) {
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: size,
      height: size,
      borderRadius: "50%",
      background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length],
      color: "#fff",
      fontWeight: 700,
      fontSize: size * 0.4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: `0 0 ${size}px`
    }
  }, initials, presence && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: size * 0.28,
      height: size * 0.28,
      borderRadius: "50%",
      background: "#47C272",
      border: "2px solid #fff"
    }
  }));
}

/* ---------------- Button ---------------- */
function Button({
  children,
  variant = "primary",
  icon,
  iconRight,
  onClick,
  style
}) {
  const base = {
    height: 48,
    borderRadius: 16,
    padding: "0 24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-text)",
    fontWeight: 500,
    fontSize: 16,
    cursor: "pointer",
    border: "none",
    color: "#fff"
  };
  const v = {
    primary: {
      background: "#643FDB"
    },
    dark: {
      background: "#1C1243"
    },
    ghost: {
      background: "transparent",
      color: "#643FDB",
      border: "1px solid #643FDB"
    },
    soft: {
      background: "#EDE7FC",
      color: "#643FDB"
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      ...base,
      ...v,
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20
  }), children, iconRight && /*#__PURE__*/React.createElement(Icon, {
    name: iconRight,
    size: 20
  }));
}

/* ---------------- Input ---------------- */
function Field({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  trailing
}) {
  const [focus, setFocus] = useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%",
      maxWidth: 327,
      height: 48,
      padding: "0 18px",
      borderRadius: 16,
      background: "#fff",
      border: focus ? "1px solid #1C1243" : "1px solid #EFF1F3",
      transition: "border-color 0.15s"
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20
  }), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    onChange: e => onChange?.(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    placeholder: placeholder,
    style: {
      border: "none",
      outline: "none",
      background: "transparent",
      flex: 1,
      fontFamily: "var(--font-text)",
      fontWeight: 500,
      fontSize: 14,
      color: "#1C1243"
    }
  }), trailing);
}

/* ---------------- Card ---------------- */
function Card({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      ...style
    }
  }, children);
}

/* ---------------- Tabs ---------------- */
function Tabs({
  tabs,
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => onChange?.(t),
    style: {
      height: 40,
      padding: "0 16px",
      borderRadius: 12,
      background: active === t ? "#643FDB" : "transparent",
      color: active === t ? "#fff" : "#61565C",
      fontWeight: active === t ? 700 : 500,
      fontSize: 16,
      border: "none",
      cursor: "pointer",
      fontFamily: "var(--font-text)"
    }
  }, t)));
}

/* ---------------- Toggle ---------------- */
function Toggle({
  on,
  onChange
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange?.(!on),
    style: {
      width: 56,
      height: 32,
      borderRadius: 32,
      position: "relative",
      background: on ? "#32D74B" : "#EFF1F3",
      border: "none",
      padding: 0,
      cursor: "pointer",
      transition: "background 0.15s"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 4,
      left: on ? 28 : 4,
      width: 24,
      height: 24,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 3px 1px rgba(0,0,0,0.06), 0 3px 8px rgba(0,0,0,0.15)",
      transition: "left 0.15s"
    }
  }));
}

/* ---------------- Badge / Status ---------------- */
function Badge({
  children,
  tone = "primary"
}) {
  const tones = {
    primary: {
      bg: "#EDE7FC",
      fg: "#643FDB"
    },
    success: {
      bg: "#E1F6E8",
      fg: "#1F8B3E"
    },
    danger: {
      bg: "#FFE4E2",
      fg: "#C8413A"
    },
    warning: {
      bg: "#FFE7CC",
      fg: "#FF8514"
    },
    neutral: {
      bg: "#EFF1F3",
      fg: "#363853"
    }
  }[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      background: tones.bg,
      color: tones.fg,
      fontFamily: "var(--font-text)",
      fontWeight: 600,
      fontSize: 12
    }
  }, children);
}

/* ---------------- Logo ---------------- */
function Logo({
  dark = false,
  size = 1
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10 * size
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36 * size,
      height: 36 * size,
      borderRadius: 10 * size,
      background: "linear-gradient(135deg,#643FDB,#5435C0)",
      color: "#fff",
      fontWeight: 800,
      fontSize: 20 * size,
      fontFamily: "var(--font-accent)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, "V"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontWeight: 700,
      fontSize: 22 * size,
      letterSpacing: "-0.01em",
      color: dark ? "#fff" : "#1C1243"
    }
  }, "Vitalize", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#FF8A00"
    }
  }, ".")));
}
Object.assign(window, {
  Icon,
  Avatar,
  Button,
  Field,
  Card,
  Tabs,
  Toggle,
  Badge,
  Logo
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm/VitalizeUI.jsx", error: String((e && e.message) || e) }); }

})();
