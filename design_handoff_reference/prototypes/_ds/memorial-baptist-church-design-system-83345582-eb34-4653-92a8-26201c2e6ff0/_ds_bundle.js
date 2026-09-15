/* @ds-bundle: {"format":4,"namespace":"MemorialBaptistChurchDesignSystem_833455","components":[{"name":"ArchPhoto","sourcePath":"components/content/ArchPhoto.jsx"},{"name":"EventCard","sourcePath":"components/content/EventCard.jsx"},{"name":"GroupCard","sourcePath":"components/content/GroupCard.jsx"},{"name":"SectionHeading","sourcePath":"components/content/SectionHeading.jsx"},{"name":"SermonRow","sourcePath":"components/content/SermonRow.jsx"},{"name":"ServiceTimes","sourcePath":"components/content/ServiceTimes.jsx"},{"name":"StatBlock","sourcePath":"components/content/StatBlock.jsx"},{"name":"VerseBlock","sourcePath":"components/content/VerseBlock.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"RadioOption","sourcePath":"components/core/RadioOption.jsx"},{"name":"ArchOutline","sourcePath":"components/ministries/ArchOutline.jsx"},{"name":"DoorwayBand","sourcePath":"components/ministries/DoorwayBand.jsx"},{"name":"DoorwayPhoto","sourcePath":"components/ministries/DoorwayPhoto.jsx"},{"name":"FilterBar","sourcePath":"components/navigation/FilterBar.jsx"},{"name":"Logo","sourcePath":"components/navigation/Logo.jsx"},{"name":"PreviewBanner","sourcePath":"components/navigation/PreviewBanner.jsx"},{"name":"SiteFooter","sourcePath":"components/navigation/SiteFooter.jsx"},{"name":"SiteHeader","sourcePath":"components/navigation/SiteHeader.jsx"}],"sourceHashes":{"components/content/ArchPhoto.jsx":"7e6b9ba8c79a","components/content/EventCard.jsx":"8c1936cd61e8","components/content/GroupCard.jsx":"a007ba324593","components/content/SectionHeading.jsx":"f9db585aeeb0","components/content/SermonRow.jsx":"2ba7d807da6c","components/content/ServiceTimes.jsx":"0a254ca5d0ca","components/content/StatBlock.jsx":"328995c8501e","components/content/VerseBlock.jsx":"8df5776065d0","components/core/Button.jsx":"bb7071c99180","components/core/Card.jsx":"12e1426ebb98","components/core/Chip.jsx":"0b2855e23fea","components/core/Eyebrow.jsx":"55833b6303dd","components/core/Input.jsx":"165d341d31a5","components/core/RadioOption.jsx":"98e62303b8f7","components/ministries/ArchOutline.jsx":"cfe8390a9b68","components/ministries/DoorwayBand.jsx":"011b2107b87f","components/ministries/DoorwayPhoto.jsx":"33cbe22c0727","components/navigation/FilterBar.jsx":"851a0d1b0489","components/navigation/Logo.jsx":"9f8a6a4b71a2","components/navigation/PreviewBanner.jsx":"ad7ebd1cbd40","components/navigation/SiteFooter.jsx":"ce467460d3a7","components/navigation/SiteHeader.jsx":"09e1a3b51b36","ui_kits/website/App.jsx":"8af9a04a18a4","ui_kits/website/ConnectScreen.jsx":"eef9eeb4a236","ui_kits/website/EventsScreen.jsx":"8417be4a59d4","ui_kits/website/GivingScreen.jsx":"2658a4d5abf6","ui_kits/website/HomeScreen.jsx":"7f1d2b6cad30","ui_kits/website/MemberHubScreen.jsx":"450575ccc37a","ui_kits/website/SermonsScreen.jsx":"a3d377161ccd","ui_kits/website/VisitScreen.jsx":"b651f8be0eab","ui_kits/website/data.js":"48659ba937fa"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MemorialBaptistChurchDesignSystem_833455 = window.MemorialBaptistChurchDesignSystem_833455 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/content/ArchPhoto.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The signature device: photography cropped to the steeple arch. Empty state is the striped placeholder slot. */
function ArchPhoto({
  src,
  alt = '',
  label = 'photo',
  ratio = '4/5',
  shape = 'arch',
  tone = 'light',
  style,
  ...rest
}) {
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: shape === 'arch' ? 'var(--photo-radius)' : 'var(--mbc-radius-panel)',
      overflow: 'hidden',
      border: dark ? 'none' : '1px solid var(--mbc-border-photo)',
      background: src ? 'var(--mbc-stripe-b)' : dark ? 'var(--photo-placeholder-dark)' : 'var(--photo-placeholder)',
      aspectRatio: ratio,
      display: 'grid',
      placeItems: 'center',
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 11px/1.6 var(--mbc-font-mono)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: dark ? 'var(--text-muted)' : 'var(--mbc-slot-label)',
      textAlign: 'center',
      padding: '0 24px'
    }
  }, label));
}
Object.assign(__ds_scope, { ArchPhoto });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ArchPhoto.jsx", error: String((e && e.message) || e) }); }

// components/content/SermonRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** One row of the sermon archive: date, title + series, passage + speaker, length. */
function SermonRow({
  date,
  title,
  series,
  reference,
  speaker,
  length,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,100px) minmax(0,1.4fr) minmax(0,1fr) minmax(0,90px)',
      gap: 'clamp(14px,2.5vw,32px)',
      padding: '24px 4px',
      borderBottom: '1px solid var(--border-section)',
      alignItems: 'baseline',
      background: hover ? 'var(--surface-panel)' : 'transparent',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '700 11px/1.4 var(--mbc-font-sans)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      margin: 0
    }
  }, date), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 19px/1.3 var(--mbc-font-serif)',
      margin: '0 0 6px',
      color: 'var(--text-heading)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 14px/1.4 var(--mbc-font-sans)',
      color: 'var(--text-meta)',
      margin: 0
    }
  }, series)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 16px/1.4 var(--mbc-font-sans)',
      color: 'var(--text-scripture)',
      margin: 0
    }
  }, reference, /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-meta)'
    }
  }, speaker)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 14px/1.4 var(--mbc-font-sans)',
      color: 'var(--text-meta)',
      margin: 0,
      textAlign: 'right'
    }
  }, length));
}
Object.assign(__ds_scope, { SermonRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SermonRow.jsx", error: String((e && e.message) || e) }); }

// components/content/ServiceTimes.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The gathering-times band: day label, service name, Lora time. */
function ServiceTimes({
  times = [],
  tone = 'dark',
  children,
  style,
  ...rest
}) {
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
      gap: 'clamp(24px,3vw,44px)',
      ...style
    }
  }, rest), times.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '700 10px/1 var(--mbc-font-sans)',
      letterSpacing: 'var(--mbc-track-label)',
      textTransform: 'uppercase',
      color: dark ? 'var(--text-on-dark-label)' : 'var(--text-muted)',
      margin: '0 0 12px'
    }
  }, t.day), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 15px/1.4 var(--mbc-font-sans)',
      color: dark ? 'var(--mbc-on-dark-strong)' : 'var(--text-body)',
      margin: '0 0 6px'
    }
  }, t.name), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 30px/1 var(--mbc-font-serif)',
      margin: 0,
      letterSpacing: '-.01em',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-heading)'
    }
  }, t.time))), children);
}
Object.assign(__ds_scope, { ServiceTimes });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ServiceTimes.jsx", error: String((e && e.message) || e) }); }

// components/content/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** A single figure with its explanation — the stewardship band on Giving. */
function StatBlock({
  stat,
  label,
  tone = 'dark',
  style,
  ...rest
}) {
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: style
  }, rest), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 clamp(30px,3vw,42px)/1 var(--mbc-font-serif)',
      margin: '0 0 12px',
      color: dark ? 'var(--text-on-dark-accent)' : 'var(--text-eyebrow)'
    }
  }, stat), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 15px/1.55 var(--mbc-font-sans)',
      color: dark ? 'var(--text-on-dark-soft)' : 'var(--text-body)',
      margin: 0
    }
  }, label));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/content/VerseBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: '17px',
  md: '22px',
  lg: 'clamp(24px,3.2vw,40px)'
};

/** Scripture. Always Lora italic — it is never set in Lato. */
function VerseBlock({
  children,
  reference,
  size = 'md',
  tone = 'light',
  align = 'left',
  style,
  ...rest
}) {
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 italic ' + SIZES[size] + '/var(--mbc-leading-scripture) var(--mbc-font-serif)',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-scripture)',
      margin: 0,
      textWrap: 'pretty'
    }
  }, children), reference ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: '700 11px/1 var(--mbc-font-sans)',
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      color: dark ? 'var(--text-on-dark-label)' : 'var(--text-muted)',
      margin: '22px 0 0'
    }
  }, reference) : null);
}
Object.assign(__ds_scope, { VerseBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/VerseBlock.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: '12px 22px',
    font: '700 12px/1 var(--mbc-font-sans)',
    letterSpacing: '.06em'
  },
  md: {
    padding: '15px 28px',
    font: '700 13px/1 var(--mbc-font-sans)',
    letterSpacing: '.04em'
  },
  lg: {
    padding: '16px 30px',
    font: '700 14px/1 var(--mbc-font-sans)',
    letterSpacing: '.03em'
  }
};
const VARIANTS = {
  primary: {
    base: {
      background: 'var(--action-primary)',
      border: 'none',
      color: 'var(--action-primary-text)'
    },
    hover: {
      filter: 'brightness(.92)'
    }
  },
  outline: {
    base: {
      background: 'none',
      border: '1px solid var(--border-control)',
      color: 'var(--text-heading)'
    },
    hover: {
      borderColor: 'var(--border-control-hover)',
      background: 'var(--action-ghost-hover)'
    }
  },
  dark: {
    base: {
      background: 'var(--action-dark)',
      border: 'none',
      color: 'var(--text-on-dark)'
    },
    hover: {
      background: 'var(--action-dark-press)'
    }
  },
  light: {
    base: {
      background: 'var(--action-light)',
      border: 'none',
      color: 'var(--text-heading)'
    },
    hover: {
      background: '#fff'
    }
  },
  ghostDark: {
    base: {
      background: 'none',
      border: '1px solid var(--mbc-dark-border)',
      color: 'var(--text-on-dark)'
    },
    hover: {
      borderColor: 'var(--text-on-dark)'
    }
  }
};

/** Pill-shaped action button. The only shapes MBC uses: a Lamplight fill, a warm outline, or a dark/light pair for dark grounds. */
function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  children,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: 'var(--mbc-radius-pill)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      whiteSpace: 'nowrap',
      width: full ? '100%' : undefined,
      minHeight: 'var(--mbc-tap-min)',
      transition: 'var(--motion-hover)',
      opacity: disabled ? 0.42 : 1,
      ...s,
      ...v.base,
      ...(hover && !disabled ? v.hover : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  paper: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-card)',
    color: 'var(--text-heading)'
  },
  panel: {
    background: 'var(--surface-panel)',
    border: '1px solid var(--border-section)',
    color: 'var(--text-heading)'
  },
  dark: {
    background: 'var(--surface-dark)',
    border: 'none',
    color: 'var(--text-on-dark)'
  },
  print: {
    background: 'var(--surface-print)',
    border: '1px solid var(--mbc-border-photo)',
    color: 'var(--text-heading)',
    boxShadow: 'var(--mbc-shadow-print)'
  }
};

/** The MBC container: a warm ground, a hairline rule, a generous radius, and no shadow on screen. */
function Card({
  tone = 'paper',
  radius = 'panel',
  pad = 30,
  children,
  style,
  ...rest
}) {
  const radii = {
    card: 'var(--mbc-radius-card)',
    cardLg: 'var(--mbc-radius-card-lg)',
    panel: 'var(--mbc-radius-panel)',
    panelLg: 'var(--mbc-radius-panel-lg)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: radii[radius] || radii.panel,
      padding: pad,
      ...TONES[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Pill filter toggle used above the sermon list, the events calendar, group days, and giving amounts. */
function Chip({
  active = false,
  children,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: 'var(--mbc-radius-pill)',
      padding: '11px 20px',
      cursor: 'pointer',
      font: '700 12px/1 var(--mbc-font-sans)',
      letterSpacing: '.05em',
      transition: 'var(--motion-hover)',
      background: active ? 'var(--action-dark)' : 'transparent',
      color: active ? 'var(--text-on-dark)' : 'var(--text-body)',
      border: '1px solid ' + (active ? 'var(--action-dark)' : 'var(--mbc-border-chip)'),
      ...(hover && !active ? {
        borderColor: 'var(--border-control-hover)'
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  lamplight: 'var(--text-eyebrow)',
  sage: 'var(--text-category)',
  stone: 'var(--text-muted)',
  onDark: 'var(--text-on-dark-label)',
  brass: 'var(--text-on-dark-accent)'
};

/** All-caps tracked label. It always sits ABOVE the heading it belongs to — never below. */
function Eyebrow({
  tone = 'lamplight',
  size = 'md',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("p", _extends({
    style: {
      font: '700 ' + (size === 'sm' ? '10px' : '11px') + '/1 var(--mbc-font-sans)',
      letterSpacing: size === 'sm' ? 'var(--mbc-track-label-tight)' : 'var(--mbc-track-label)',
      textTransform: 'uppercase',
      color: TONES[tone] || TONES.lamplight,
      margin: 0,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/content/EventCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Upcoming-event card: 16:9 image slot, sage category, Lora title, plain when/where line. */
function EventCard({
  category,
  title,
  when,
  image,
  imageLabel = 'event image 16:9',
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--mbc-radius-card-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.ArchPhoto, {
    src: image,
    label: imageLabel,
    ratio: "16/9",
    shape: "rounded",
    style: {
      borderRadius: 0,
      border: 'none',
      borderBottom: '1px solid var(--border-card)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 26,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--mbc-space-4)',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: "sage",
    size: "sm"
  }, category), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 20px/1.25 var(--mbc-font-serif)',
      margin: 0,
      letterSpacing: 'var(--mbc-track-h3)',
      color: 'var(--text-heading)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--mbc-type-small)',
      color: 'var(--text-body)',
      margin: 0
    }
  }, when)));
}
Object.assign(__ds_scope, { EventCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/EventCard.jsx", error: String((e && e.message) || e) }); }

// components/content/GroupCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** A Sunday class or community group, with its meeting time and remaining spots. */
function GroupCard({
  kind,
  title,
  body,
  when,
  where,
  spots,
  full = false,
  cta = 'Join',
  onJoin,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--mbc-radius-card-lg)',
      padding: 30,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--mbc-space-5)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 'var(--mbc-space-5)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: "sage",
    size: "sm"
  }, kind), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 13px/1 var(--mbc-font-sans)',
      color: full ? 'var(--mbc-stone-pale)' : 'var(--text-category)',
      margin: 0
    }
  }, spots)), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 22px/1.24 var(--mbc-font-serif)',
      margin: 0,
      letterSpacing: 'var(--mbc-track-h3)',
      color: 'var(--text-heading)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--mbc-type-small)',
      color: 'var(--text-body)',
      margin: 0,
      flex: 1,
      textWrap: 'pretty'
    }
  }, body), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)',
      paddingTop: 'var(--mbc-space-7)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 'var(--mbc-space-5)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 14px/1.5 var(--mbc-font-sans)',
      color: 'var(--text-meta)',
      margin: 0
    }
  }, when, /*#__PURE__*/React.createElement("br", null), where), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    onClick: onJoin,
    style: {
      flex: 'none'
    }
  }, cta)));
}
Object.assign(__ds_scope, { GroupCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/GroupCard.jsx", error: String((e && e.message) || e) }); }

// components/content/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LEVELS = {
  display: {
    font: 'var(--mbc-type-display)',
    letterSpacing: 'var(--mbc-track-display)',
    maxWidth: '20ch'
  },
  h1: {
    font: 'var(--mbc-type-h1)',
    letterSpacing: 'var(--mbc-track-display)',
    maxWidth: '22ch'
  },
  h2: {
    font: 'var(--mbc-type-h2)',
    letterSpacing: 'var(--mbc-track-h2)',
    maxWidth: '24ch'
  }
};

/** Eyebrow → heading → lead paragraph. The opening move of nearly every section on the site. */
function SectionHeading({
  eyebrow,
  title,
  lead,
  level = 'h2',
  tone = 'light',
  align = 'left',
  eyebrowTone,
  style,
  ...rest
}) {
  const l = LEVELS[level] || LEVELS.h2;
  const Tag = level === 'h2' ? 'h2' : 'h1';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      ...style
    }
  }, rest), eyebrow ? /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: eyebrowTone || (tone === 'dark' ? 'onDark' : 'lamplight'),
    style: {
      marginBottom: 'var(--mbc-space-9)'
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement(Tag, {
    style: {
      font: l.font,
      letterSpacing: l.letterSpacing,
      margin: 0,
      maxWidth: l.maxWidth,
      textWrap: 'balance',
      color: tone === 'dark' ? 'var(--text-on-dark)' : 'var(--text-heading)',
      marginLeft: align === 'center' ? 'auto' : undefined,
      marginRight: align === 'center' ? 'auto' : undefined
    }
  }, title), lead ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--mbc-type-lead)',
      margin: '26px 0 0',
      maxWidth: '56ch',
      textWrap: 'pretty',
      color: tone === 'dark' ? 'var(--text-on-dark-soft)' : 'var(--text-body)',
      marginLeft: align === 'center' ? 'auto' : undefined,
      marginRight: align === 'center' ? 'auto' : undefined
    }
  }, lead) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Warm-ground text field. Same shape in the connect form, the giving form, and the Member Hub sign-in. */
function Input({
  label,
  on = 'panel',
  style,
  ...rest
}) {
  const field = /*#__PURE__*/React.createElement("input", _extends({
    style: {
      width: '100%',
      background: on === 'card' ? 'var(--surface-field)' : 'var(--surface-card)',
      border: '1px solid var(--mbc-border-panel)',
      borderRadius: 'var(--mbc-radius-input)',
      padding: '15px 18px',
      font: '400 16px/1 var(--mbc-font-sans)',
      color: 'var(--text-heading)',
      ...style
    }
  }, rest));
  if (!label) return field;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'grid',
      gap: 'var(--mbc-space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 11px/1 var(--mbc-font-sans)',
      letterSpacing: 'var(--mbc-track-label-tight)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, label), field);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/RadioOption.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Full-width selectable row — the giving designations. The circle is drawn with a border, never a native input. */
function RadioOption({
  selected = false,
  children,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--mbc-space-5)',
      padding: '15px 18px',
      border: '1px solid ' + (selected ? 'var(--action-dark)' : 'var(--mbc-border-panel)'),
      borderRadius: 'var(--mbc-radius-input)',
      cursor: 'pointer',
      font: '400 16px/1.35 var(--mbc-font-sans)',
      color: 'var(--text-heading)',
      transition: 'var(--motion-hover)',
      ...(hover && !selected ? {
        borderColor: 'var(--mbc-border-control-strong)',
        background: 'var(--surface-field)'
      } : null),
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 'var(--mbc-radius-pill)',
      flex: 'none',
      border: '1px solid ' + (selected ? 'var(--action-primary)' : 'var(--mbc-border-control-strong)'),
      boxShadow: selected ? 'inset 0 0 0 3px var(--surface-card)' : 'none',
      background: selected ? 'var(--action-primary)' : 'transparent'
    }
  }), children);
}
Object.assign(__ds_scope, { RadioOption });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/RadioOption.jsx", error: String((e && e.message) || e) }); }

// components/ministries/ArchOutline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** MBC Students draw the arch instead of filling it: a 2px Brass outline around a verse or a date. */
function ArchOutline({
  children,
  tone = 'dark',
  stroke,
  pad = '16% 12% 12%',
  style,
  ...rest
}) {
  const line = stroke || (tone === 'dark' ? 'var(--mbc-brass)' : 'var(--mbc-lamplight)');
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      border: `var(--mbc-rule-students) solid ${line}`,
      borderRadius: 'var(--mbc-radius-arch-drawn)',
      padding: pad,
      textAlign: 'center',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { ArchOutline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ministries/ArchOutline.jsx", error: String((e && e.message) || e) }); }

// components/ministries/DoorwayBand.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Three doorways in Sunbeam, Meadow and Doorway Blue — the MBC Kids rule, used where Memorial uses a hairline. */
function DoorwayBand({
  height = 48,
  align = 'left',
  style,
  ...rest
}) {
  const bars = [{
    c: 'var(--mbc-sunbeam)',
    h: height * 0.7
  }, {
    c: 'var(--mbc-meadow)',
    h: height
  }, {
    c: 'var(--mbc-doorway-blue)',
    h: height * 0.7
  }];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: Math.round(height / 6),
      alignItems: 'flex-end',
      justifyContent: align === 'center' ? 'center' : 'flex-start',
      ...style
    }
  }, rest), bars.map((b, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: Math.round(height * 0.46),
      height: b.h,
      borderRadius: '999px 999px 3px 3px',
      background: b.c,
      display: 'block'
    }
  })));
}
Object.assign(__ds_scope, { DoorwayBand });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ministries/DoorwayBand.jsx", error: String((e && e.message) || e) }); }

// components/ministries/DoorwayPhoto.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The MBC Kids photo crop: one unbroken doorway sweep instead of the parent arch's shoulders. */
function DoorwayPhoto({
  src,
  alt = '',
  label = 'photo',
  ratio = '4/5',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: 'var(--mbc-radius-doorway)',
      overflow: 'hidden',
      border: '1px solid var(--mbc-border-photo)',
      background: src ? 'var(--mbc-stripe-b)' : 'var(--photo-placeholder)',
      aspectRatio: ratio,
      display: 'grid',
      placeItems: 'center',
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 11px/1.6 var(--mbc-font-mono)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--mbc-slot-label)',
      textAlign: 'center',
      padding: '0 24px'
    }
  }, label));
}
Object.assign(__ds_scope, { DoorwayPhoto });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ministries/DoorwayPhoto.jsx", error: String((e && e.message) || e) }); }

// components/navigation/FilterBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** A row of Chips above a filterable list, optionally framed as the Connect card with a label and a count. */
function FilterBar({
  options = [],
  value,
  onChange,
  label,
  count,
  framed = false,
  style,
  ...rest
}) {
  const chips = options.map(o => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: o,
    active: o === value,
    onClick: () => onChange && onChange(o)
  }, o));
  if (!framed) return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--mbc-space-3)',
      ...style
    }
  }, rest), chips);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--mbc-space-4)',
      alignItems: 'center',
      padding: '20px 24px',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--mbc-radius-card)',
      ...style
    }
  }, rest), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 11px/1 var(--mbc-font-sans)',
      letterSpacing: 'var(--mbc-track-label-tight)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginRight: 'var(--mbc-space-3)'
    }
  }, label) : null, chips, count ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      font: '400 14px/1 var(--mbc-font-sans)',
      color: 'var(--text-meta)'
    }
  }, count) : null);
}
Object.assign(__ds_scope, { FilterBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/FilterBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The church mark and wordmark. Never tinted, never redrawn — Steeple Brown, Cream, or knocked out to white. */
function Logo({
  variant = 'lockup',
  src,
  size = 50,
  knockout = false,
  style,
  ...rest
}) {
  const mark = src || 'assets/mbc-mark.png';
  const img = /*#__PURE__*/React.createElement("img", {
    src: mark,
    alt: variant === 'mark' ? 'Memorial Baptist Church' : '',
    style: {
      width: size,
      height: size,
      objectFit: 'contain',
      flex: 'none',
      filter: knockout ? 'brightness(0) invert(1)' : undefined
    }
  });
  if (variant === 'mark') return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      ...style
    }
  }, rest), img);
  if (variant === 'wordmark') {
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        lineHeight: 1,
        ...style
      }
    }, rest), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 28px/1 var(--mbc-font-serif)',
        letterSpacing: '-.015em',
        color: knockout ? 'var(--text-on-dark)' : 'var(--text-heading)'
      }
    }, "Memorial"), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '700 10px/1 var(--mbc-font-sans)',
        letterSpacing: '.28em',
        color: knockout ? 'var(--text-on-dark-label)' : 'var(--text-muted)',
        marginTop: 4
      }
    }, "BAPTIST CHURCH"));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      ...style
    }
  }, rest), img, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 28px/1 var(--mbc-font-serif)',
      letterSpacing: '-.015em',
      color: knockout ? 'var(--text-on-dark)' : 'var(--text-heading)'
    }
  }, "Memorial"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 10px/1 var(--mbc-font-sans)',
      letterSpacing: '.28em',
      color: knockout ? 'var(--text-on-dark-label)' : 'var(--text-muted)',
      marginTop: 4
    }
  }, "BAPTIST CHURCH")));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Logo.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PreviewBanner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Full-width notice strip that sits above SiteHeader, flagging content that is still standing in. Removed at launch. */
function PreviewBanner({
  label = 'Preview',
  message = 'Sermons, events, groups, and photography are placeholders awaiting real content. Service times, address, and staff are current.',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-dark)',
      color: 'var(--text-on-dark-strong)',
      padding: '10px clamp(18px,4vw,56px)',
      font: '400 13px/1.5 var(--mbc-font-sans)',
      textAlign: 'center',
      ...style
    }
  }, rest), label ? /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: 700,
      color: 'var(--text-on-dark-accent)'
    }
  }, label) : null, label ? '\u00A0\u00B7\u00A0' : null, message);
}
Object.assign(__ds_scope, { PreviewBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PreviewBanner.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SiteFooter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Dark footer: mark, address and contact, three link columns, gathering times, then a fine-print rule. */
function SiteFooter({
  columns = [],
  times = [],
  address = ['2800 S. Yale Ave.', 'Tulsa, OK 74114'],
  phone = '918.744.0079',
  email = 'staff@memorialbaptist.com',
  onNavigate,
  logoSrc,
  note = '© 2026 Memorial Baptist Church · A Southern Baptist congregation',
  tagline = 'For the glory of God & the good of all people',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("footer", _extends({
    style: {
      background: 'var(--surface-dark-deep)',
      color: 'var(--text-on-dark-soft)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(48px,5vw,80px) var(--mbc-gutter) 32px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
      gap: 'clamp(28px,4vw,56px)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "mark",
    src: logoSrc,
    size: 62,
    knockout: true,
    style: {
      marginBottom: 22,
      opacity: .9
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 16px/1.6 var(--mbc-font-sans)',
      margin: 0,
      color: 'var(--mbc-on-dark-strong)'
    }
  }, address.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, a, /*#__PURE__*/React.createElement("br", null)))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 16px/1.6 var(--mbc-font-sans)',
      margin: '14px 0 0'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: 'tel:' + phone.replace(/\D/g, ''),
    style: {
      color: 'var(--text-on-dark-accent)'
    }
  }, phone), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("a", {
    href: 'mailto:' + email,
    style: {
      color: 'var(--text-on-dark-accent)'
    }
  }, email))), columns.map(col => /*#__PURE__*/React.createElement("div", {
    key: col.head
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '700 10px/1 var(--mbc-font-sans)',
      letterSpacing: 'var(--mbc-track-label)',
      textTransform: 'uppercase',
      color: 'var(--text-meta)',
      margin: '0 0 20px'
    }
  }, col.head), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      alignItems: 'flex-start'
    }
  }, col.items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.label,
    type: "button",
    onClick: () => onNavigate && onNavigate(it.key),
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      font: '400 16px/1.3 var(--mbc-font-sans)',
      color: 'var(--text-on-dark-soft)',
      textAlign: 'left'
    }
  }, it.label))))), times.length ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '700 10px/1 var(--mbc-font-sans)',
      letterSpacing: 'var(--mbc-track-label)',
      textTransform: 'uppercase',
      color: 'var(--text-meta)',
      margin: '0 0 20px'
    }
  }, "Gathering times"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11
    }
  }, times.map((t, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    style: {
      font: '400 16px/1.35 var(--mbc-font-sans)',
      margin: 0,
      color: 'var(--mbc-on-dark-strong)'
    }
  }, t)))) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '24px var(--mbc-gutter) 44px',
      borderTop: '1px solid var(--mbc-dark-rule-soft)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 13px/1 var(--mbc-font-sans)',
      color: 'var(--text-meta)',
      margin: 0
    }
  }, note), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 13px/1 var(--mbc-font-sans)',
      color: 'var(--text-meta)',
      margin: 0
    }
  }, tagline)));
}
Object.assign(__ds_scope, { SiteFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SiteHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Sticky site header: lockup, primary nav, Member Hub, and the Give button. */
function SiteHeader({
  items = [],
  active,
  onNavigate,
  logoSrc,
  onGive,
  onHub,
  compact = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--mbc-header-bg)',
      backdropFilter: 'var(--mbc-blur-chrome)',
      borderBottom: '1px solid var(--border-card)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter)',
      minHeight: 'var(--mbc-header-h)',
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(14px,3vw,44px)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onNavigate && onNavigate(items[0] && items[0].key ? 'home' : 'home'),
    style: {
      display: 'flex',
      alignItems: 'center',
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      flex: 'none',
      marginRight: 'auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "lockup",
    src: logoSrc,
    size: 50
  })), !compact ? /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(10px,1.7vw,26px)',
      flex: 'none'
    }
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.key,
    type: "button",
    onClick: () => onNavigate && onNavigate(it.key),
    style: {
      background: 'none',
      border: 'none',
      padding: '6px 0',
      cursor: 'pointer',
      font: '400 15px/1 var(--mbc-font-sans)',
      whiteSpace: 'nowrap',
      color: active === it.key ? 'var(--text-link)' : 'var(--text-heading)',
      borderBottom: '1px solid ' + (active === it.key ? 'var(--text-link)' : 'transparent')
    }
  }, it.label))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--mbc-space-4)',
      flex: 'none'
    }
  }, !compact ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    size: "sm",
    onClick: onHub
  }, "Member Hub") : null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    onClick: onGive
  }, "Give"))));
}
Object.assign(__ds_scope, { SiteHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SiteHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/App.jsx
try { (() => {
const {
  SiteHeader,
  SiteFooter,
  PreviewBanner
} = window.MemorialBaptistChurchDesignSystem_833455;
const Banner = PreviewBanner || (() => null);
function App() {
  const D = window.MBC_DATA;
  const [route, setRoute] = React.useState('home');
  const [signedIn, setSignedIn] = React.useState(false);
  const [w, setW] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  React.useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const go = key => {
    setRoute(key);
    window.scrollTo(0, 0);
  };
  let screen;
  if (route === 'visit') screen = /*#__PURE__*/React.createElement(VisitScreen, {
    go: go
  });else if (route === 'sermons') screen = /*#__PURE__*/React.createElement(SermonsScreen, null);else if (route === 'events') screen = /*#__PURE__*/React.createElement(EventsScreen, null);else if (route === 'groups') screen = /*#__PURE__*/React.createElement(ConnectScreen, null);else if (route === 'giving') screen = /*#__PURE__*/React.createElement(GivingScreen, null);else if (route === 'hub') screen = /*#__PURE__*/React.createElement(MemberHubScreen, {
    signedIn: signedIn,
    onSignIn: () => setSignedIn(true),
    onSignOut: () => setSignedIn(false)
  });else screen = /*#__PURE__*/React.createElement(HomeScreen, {
    go: go
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-page)',
      minHeight: '100vh',
      color: 'var(--text-heading)'
    }
  }, /*#__PURE__*/React.createElement(Banner, null), /*#__PURE__*/React.createElement(SiteHeader, {
    items: D.nav,
    active: route,
    onNavigate: go,
    logoSrc: "../../assets/mbc-mark.png",
    onGive: () => go('giving'),
    onHub: () => go('hub'),
    compact: w < 1040
  }), screen, /*#__PURE__*/React.createElement(SiteFooter, {
    logoSrc: "../../assets/mbc-mark.png",
    onNavigate: go,
    columns: D.footerCols,
    times: D.footerTimes
  }));
}
Object.assign(window, {
  App
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ConnectScreen.jsx
try { (() => {
const {
  Button,
  Card,
  Input,
  GroupCard,
  FilterBar,
  SectionHeading
} = window.MemorialBaptistChurchDesignSystem_833455;
function ConnectScreen() {
  const D = window.MBC_DATA;
  const [day, setDay] = React.useState('Any day');
  const list = day === 'Any day' ? D.groups : D.groups.filter(g => g.d === day);
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 880,
      margin: '0 auto',
      padding: 'clamp(48px,6vw,88px) var(--mbc-gutter) clamp(36px,4vw,52px)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    level: "h1",
    eyebrow: "Connect",
    title: "Our aim is to build community around the Bible.",
    lead: "Join us for: a Sunday morning class at 9:15, or a community group that meets during the week to discuss the sermon passage."
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) clamp(48px,5vw,72px)'
    }
  }, /*#__PURE__*/React.createElement(FilterBar, {
    framed: true,
    label: "Meets on",
    count: list.length + (list.length === 1 ? ' group' : ' groups'),
    options: ['Any day', 'Sunday', 'Tuesday', 'Wednesday', 'Thursday'],
    value: day,
    onChange: setDay
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
      gap: 'var(--mbc-grid-gap)',
      marginTop: 'var(--mbc-grid-gap)'
    }
  }, list.map(g => /*#__PURE__*/React.createElement(GroupCard, {
    key: g.title,
    kind: g.kind,
    title: g.title,
    body: g.body,
    when: g.when,
    where: g.where,
    spots: g.spots,
    full: g.spots.indexOf('Full') === 0
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y-lg)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "panel",
    radius: "panelLg",
    pad: "clamp(30px,4vw,52px)",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
      gap: 'clamp(28px,4vw,56px)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '400 clamp(26px,2.8vw,36px)/1.15 var(--mbc-font-serif)',
      letterSpacing: 'var(--mbc-track-h2)',
      margin: 0
    }
  }, "Not sure where you'd fit?"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 17px/1.65 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: '16px 0 0',
      maxWidth: '48ch'
    }
  }, "Tell us your life stage and what part of town you're in. Someone will call you \u2014 an actual person, within a week.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Your name"
  }), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Email or phone"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    full: true,
    style: {
      borderRadius: 'var(--mbc-radius-input)'
    }
  }, "Have someone reach out")))));
}
Object.assign(window, {
  ConnectScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ConnectScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/EventsScreen.jsx
try { (() => {
const {
  Button,
  Eyebrow,
  FilterBar
} = window.MemorialBaptistChurchDesignSystem_833455;
const MBC_ALL_EVENTS = [{
  mon: 'Sep',
  day: '02',
  cat: 'Weekly',
  title: 'Wednesday Night Dinner & Bible Study',
  body: 'Dinner in the fellowship hall, then study by age group. Bring a friend; no sign-up needed.',
  when: '6:00 PM study · 7:00 PM dinner',
  where: 'Fellowship Hall',
  cta: 'Details'
}, {
  mon: 'Sep',
  day: '06',
  cat: 'Worship',
  title: 'Lord’s Supper & Baptism Sunday',
  body: 'We share the table together and celebrate three baptisms in the morning service.',
  when: '10:30 AM',
  where: 'Sanctuary',
  cta: 'Details'
}, {
  mon: 'Sep',
  day: '12',
  cat: 'Serve',
  title: 'Serve Tulsa Saturday',
  body: 'Yard work and light repair for neighbors on the streets around the church. Teams of four.',
  when: '8:00 AM – 12:00 PM',
  where: 'Meet in north lot',
  cta: 'Sign up'
}, {
  mon: 'Sep',
  day: '18',
  cat: 'Students',
  title: 'MBC Students Fall Retreat',
  body: 'Two nights at Falls Creek for 6th–12th grade. Cost covers lodging, meals, and transport.',
  when: 'Fri 4 PM – Sun 2 PM',
  where: 'Falls Creek',
  cta: 'Register'
}, {
  mon: 'Sep',
  day: '22',
  cat: 'Senior Adults',
  title: 'Senior Adult Luncheon',
  body: 'Lunch, singing, and a short devotional from Rickey. Rides available on request.',
  when: '11:30 AM',
  where: 'Fellowship Hall',
  cta: 'RSVP'
}, {
  mon: 'Sep',
  day: '28',
  cat: 'Church Family',
  title: 'Quarterly Member Meeting',
  body: 'Budget report, ministry updates, and a vote on the 2027 missions commitment.',
  when: '6:00 PM',
  where: 'Sanctuary',
  cta: 'Agenda'
}];
function EventsScreen() {
  const [cat, setCat] = React.useState('All');
  const list = cat === 'All' ? MBC_ALL_EVENTS : MBC_ALL_EVENTS.filter(e => e.cat === cat);
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(48px,6vw,88px) var(--mbc-gutter) clamp(32px,4vw,48px)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 24,
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 24
    }
  }, "Calendar"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--mbc-type-h1)',
      letterSpacing: 'var(--mbc-track-display)',
      margin: 0
    }
  }, "September 2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    style: {
      width: 44,
      height: 44,
      padding: 0
    }
  }, "\u2190"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    style: {
      width: 44,
      height: 44,
      padding: 0
    }
  }, "\u2192"))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y-lg)'
    }
  }, /*#__PURE__*/React.createElement(FilterBar, {
    options: ['All', 'Worship', 'Serve', 'Students', 'Senior Adults', 'Church Family'],
    value: cat,
    onChange: setCat,
    style: {
      marginBottom: 36
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-section)'
    }
  }, list.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.title,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,84px) minmax(0,1fr) minmax(0,150px)',
      gap: 'clamp(16px,3vw,40px)',
      padding: '26px 4px',
      borderBottom: '1px solid var(--border-section)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      borderRight: '1px solid var(--border-section)',
      paddingRight: 12
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: "sm",
    style: {
      marginBottom: 6
    }
  }, e.mon), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 30px/1 var(--mbc-font-serif)',
      margin: 0
    }
  }, e.day)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "sage",
    size: "sm",
    style: {
      marginBottom: 8
    }
  }, e.cat), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 21px/1.28 var(--mbc-font-serif)',
      margin: '0 0 8px',
      letterSpacing: 'var(--mbc-track-h3)'
    }
  }, e.title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 15px/1.55 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: 0,
      maxWidth: '64ch',
      textWrap: 'pretty'
    }
  }, e.body), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 14px/1.4 var(--mbc-font-sans)',
      color: 'var(--text-meta)',
      margin: '10px 0 0'
    }
  }, e.when, " \xB7 ", e.where)), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    style: {
      justifySelf: 'end'
    }
  }, e.cta))))));
}
Object.assign(window, {
  EventsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/EventsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/GivingScreen.jsx
try { (() => {
const {
  Button,
  Card,
  Chip,
  Eyebrow,
  RadioOption,
  StatBlock
} = window.MemorialBaptistChurchDesignSystem_833455;
function GivingScreen() {
  const [amt, setAmt] = React.useState('$100');
  const [freq, setFreq] = React.useState('Monthly');
  const [fund, setFund] = React.useState(0);
  const funds = ['General fund — the ordinary work of the church', 'Missions — Cooperative Program & our partners', 'Benevolence — direct help for neighbors in need'];
  const ways = [{
    title: 'Online or recurring',
    body: 'Set a one-time or monthly gift from a bank account or card. Change or cancel it yourself in the Member Hub.'
  }, {
    title: 'In the service',
    body: 'Offering boxes placed around the sanctuary. Checks to “Memorial Baptist Church.”'
  }, {
    title: 'By mail or in the office',
    body: '2800 S. Yale Ave., Tulsa, OK 74114. The office is open Monday through Thursday, 9 to 4.'
  }];
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(48px,6vw,88px) var(--mbc-gutter) clamp(56px,6vw,88px)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
      gap: 'clamp(32px,5vw,72px)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 24
    }
  }, "Giving"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--mbc-type-h1)',
      letterSpacing: 'var(--mbc-track-display)',
      margin: 0,
      maxWidth: '20ch',
      textWrap: 'balance'
    }
  }, "Giving funds the ordinary work of the church."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 17px/1.65 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: '24px 0 0',
      maxWidth: '48ch'
    }
  }, "Giving at MBC funds the ordinary work of the church \u2014 the ministers, the building, the meals on Wednesday, and the missionaries we send. Every dollar is reported to the congregation."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 36,
      borderTop: '1px solid var(--border-section)'
    }
  }, ways.map(w => /*#__PURE__*/React.createElement("div", {
    key: w.title,
    style: {
      padding: '22px 0',
      borderBottom: '1px solid var(--border-section)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 18px/1.3 var(--mbc-font-serif)',
      margin: '0 0 8px'
    }
  }, w.title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 15px/1.6 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: 0
    }
  }, w.body))))), /*#__PURE__*/React.createElement(Card, {
    tone: "paper",
    radius: "panelLg",
    pad: "var(--mbc-card-pad)"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '400 26px/1.2 var(--mbc-font-serif)',
      letterSpacing: '-.015em',
      margin: '0 0 26px'
    }
  }, "Give online"), /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "stone",
    style: {
      marginBottom: 12,
      letterSpacing: '.16em'
    }
  }, "Amount"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20
    }
  }, ['$25', '$100', '$250', 'Other'].map(a => /*#__PURE__*/React.createElement(Chip, {
    key: a,
    active: amt === a,
    onClick: () => setAmt(a),
    style: {
      padding: '13px 22px',
      fontSize: 14
    }
  }, a))), /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "stone",
    style: {
      marginBottom: 12,
      letterSpacing: '.16em'
    }
  }, "Designation"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 10,
      marginBottom: 24
    }
  }, funds.map((f, i) => /*#__PURE__*/React.createElement(RadioOption, {
    key: i,
    selected: fund === i,
    onClick: () => setFund(i)
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 24
    }
  }, ['One time', 'Monthly'].map(x => /*#__PURE__*/React.createElement(Chip, {
    key: x,
    active: freq === x,
    onClick: () => setFreq(x),
    style: {
      flex: 1,
      borderRadius: 'var(--mbc-radius-input)',
      padding: 14,
      fontSize: 13
    }
  }, x))), /*#__PURE__*/React.createElement(Button, {
    full: true,
    style: {
      borderRadius: 'var(--mbc-radius-input)',
      padding: 18
    }
  }, "Continue to payment"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 13px/1.5 var(--mbc-font-sans)',
      color: 'var(--text-muted)',
      margin: '16px 0 0',
      textAlign: 'center'
    }
  }, "Secure processing. A receipt is emailed immediately, and a year-end statement in January."))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y-lg)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    radius: "panelLg",
    pad: "clamp(30px,4vw,52px)",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
      gap: 'clamp(24px,3vw,48px)'
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    stat: "Voted",
    label: "The budget is presented to the members and voted on by them \u2014 not set behind closed doors."
  }), /*#__PURE__*/React.createElement(StatBlock, {
    stat: "Monthly",
    label: "A portion goes out the door through the Cooperative Program and our own mission partners."
  }), /*#__PURE__*/React.createElement(StatBlock, {
    stat: "Open",
    label: "Want the detail behind any line of it? Ask. It isn\u2019t hidden."
  }), /*#__PURE__*/React.createElement(StatBlock, {
    stat: "Quarterly",
    label: "A full financial report to the congregation at every member meeting."
  }))));
}
Object.assign(window, {
  GivingScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/GivingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeScreen.jsx
try { (() => {
const {
  Button,
  Card,
  Eyebrow,
  SectionHeading,
  ArchPhoto,
  ServiceTimes,
  EventCard
} = window.MemorialBaptistChurchDesignSystem_833455;
function HomeScreen({
  go
}) {
  const D = window.MBC_DATA;
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(48px,6vw,96px) var(--mbc-gutter) clamp(40px,5vw,72px)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)',
      gap: 'clamp(32px,5vw,80px)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeading, {
    level: "display",
    eyebrow: "Midtown Tulsa \xB7 Since 1948",
    title: /*#__PURE__*/React.createElement("span", null, "For the glory of God and the good of all\xA0people."),
    lead: "A congregation on Yale Avenue learning to grow in love for Christ and one another \u2014 ordinary people, an open Bible, and a table with room at it."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    onClick: () => go('visit')
  }, "Plan your visit"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "outline",
    onClick: () => go('sermons')
  }, "Watch a service"))), /*#__PURE__*/React.createElement(ArchPhoto, {
    ratio: "4/5",
    label: "congregation singing \u2014 portrait crop"
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-dark)',
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(36px,4vw,56px) var(--mbc-gutter)'
    }
  }, /*#__PURE__*/React.createElement(ServiceTimes, {
    times: D.times
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: '1px solid var(--border-dark)',
      paddingLeft: 'clamp(24px,3vw,44px)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "onDark",
    size: "sm",
    style: {
      marginBottom: 12
    }
  }, "Find us"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 17px/1.5 var(--mbc-font-sans)',
      color: 'var(--text-on-dark)',
      margin: 0
    }
  }, "2800 S. Yale Ave.", /*#__PURE__*/React.createElement("br", null), "Tulsa, OK 74114"), /*#__PURE__*/React.createElement("a", {
    href: "https://goo.gl/maps/egYN21uTEHYcKmpL9",
    style: {
      display: 'inline-block',
      marginTop: 14,
      font: '700 12px/1 var(--mbc-font-sans)',
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark-accent)',
      borderBottom: '1px solid #7A6553',
      paddingBottom: 4
    }
  }, "Get directions"))))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-panel)',
      borderTop: '1px solid var(--border-section)',
      borderBottom: '1px solid var(--border-section)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'var(--mbc-section-y) var(--mbc-gutter)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,.9fr) minmax(0,1.1fr)',
      gap: 'clamp(32px,5vw,72px)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(ArchPhoto, {
    ratio: "1/1",
    label: "pastor preaching \u2014 square crop"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 18
    }
  }, "This Sunday"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 15px/1 var(--mbc-font-sans)',
      color: 'var(--text-meta)',
      margin: '0 0 10px'
    }
  }, "Current series \xB7 The Gospel of Mark"), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--mbc-type-h2)',
      letterSpacing: 'var(--mbc-track-h2)',
      margin: 0
    }
  }, "The Son of Man Came to Serve"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 18px/1.6 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: '20px 0 0',
      maxWidth: '48ch'
    }
  }, "Mark 10:35\u201345 \xB7 Jacob Bice. We finish Mark's third passion prediction and ask what greatness actually costs."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    onClick: () => go('sermons')
  }, "Sermon archive"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: () => go('hub')
  }, "Get the sermon notes"))))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'var(--mbc-section-y-lg) var(--mbc-gutter)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "What we practice",
    title: "Five habits that shape everything we do."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
      gap: 1,
      marginTop: 44,
      background: 'var(--border-section)',
      border: '1px solid var(--border-section)',
      borderRadius: 'var(--mbc-radius-card)',
      overflow: 'hidden'
    }
  }, D.values.map(v => /*#__PURE__*/React.createElement("div", {
    key: v.name,
    style: {
      background: 'var(--surface-card)',
      padding: '32px 26px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minHeight: 270
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: "sm",
    style: {
      letterSpacing: '.18em'
    }
  }, v.name), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 italic 17px/1.55 var(--mbc-font-serif)',
      color: 'var(--text-scripture)',
      margin: 0,
      flex: 1,
      textWrap: 'pretty'
    }
  }, v.verse), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '700 11px/1 var(--mbc-font-sans)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      margin: 0
    }
  }, v.ref))))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 20,
      marginBottom: 36
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '400 clamp(28px,3vw,40px)/1.1 var(--mbc-font-serif)',
      letterSpacing: 'var(--mbc-track-h2)',
      margin: 0
    }
  }, "Coming up"), /*#__PURE__*/React.createElement("button", {
    onClick: () => go('events'),
    style: {
      background: 'none',
      border: 'none',
      padding: '0 0 5px',
      cursor: 'pointer',
      font: '700 12px/1 var(--mbc-font-sans)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--text-link)',
      borderBottom: '1px solid var(--mbc-underline)'
    }
  }, "Full calendar")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
      gap: 'var(--mbc-grid-gap)'
    }
  }, D.events.map(e => /*#__PURE__*/React.createElement(EventCard, {
    key: e.title,
    category: e.cat,
    title: e.title,
    when: e.when + ' · ' + e.where
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-dark)',
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(56px,6vw,96px) var(--mbc-gutter)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
      gap: 'clamp(32px,5vw,72px)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeading, {
    tone: "dark",
    eyebrow: "For members",
    title: "Everything a member needs, in one place.",
    lead: "Sermon notes and the passage of the week, your group and serve schedule, reading plans, the prayer wall, and the study library \u2014 no more digging through email."
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "light",
    size: "lg",
    style: {
      marginTop: 32
    },
    onClick: () => go('hub')
  }, "Open the Member Hub")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 1,
      background: 'var(--border-dark)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--mbc-radius-card-sm)',
      overflow: 'hidden'
    }
  }, ['Sermon notes & passage of the week', 'Your group and serve schedule', 'Reading plans and catechism', 'Prayer wall', 'Church calendar & RSVPs', 'Study library and directory'].map(h => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      background: 'var(--surface-dark-card)',
      padding: '22px 20px',
      minHeight: 96
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 15px/1.4 var(--mbc-font-sans)',
      color: 'var(--mbc-on-dark-strong)',
      margin: 0
    }
  }, h)))))));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/MemberHubScreen.jsx
try { (() => {
const {
  Button,
  Card,
  Input,
  Eyebrow,
  Logo,
  VerseBlock
} = window.MemorialBaptistChurchDesignSystem_833455;
function MemberHubScreen({
  signedIn,
  onSignIn,
  onSignOut
}) {
  const D = window.MBC_DATA;
  if (!signedIn) {
    return /*#__PURE__*/React.createElement("main", {
      style: {
        maxWidth: 'var(--mbc-page-max)',
        margin: '0 auto',
        padding: 'clamp(48px,6vw,96px) var(--mbc-gutter) var(--mbc-section-y-lg)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
        gap: 'clamp(32px,5vw,72px)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
      style: {
        marginBottom: 24
      }
    }, "Member Hub"), /*#__PURE__*/React.createElement("h1", {
      style: {
        font: '400 clamp(36px,4.4vw,60px)/1.07 var(--mbc-font-serif)',
        letterSpacing: 'var(--mbc-track-display)',
        margin: 0,
        textWrap: 'balance'
      }
    }, "Your church info, gathered in one place."), /*#__PURE__*/React.createElement("p", {
      style: {
        font: 'var(--mbc-type-lead)',
        color: 'var(--text-body)',
        margin: '24px 0 0',
        maxWidth: '50ch'
      }
    }, "Sermon notes and the passage of the week, your group and serve schedule, reading plans, the prayer wall, the directory, and the whole study library."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--border-section)',
        border: '1px solid var(--border-section)',
        borderRadius: 'var(--mbc-radius-card-sm)',
        overflow: 'hidden',
        marginTop: 36
      }
    }, ['Sermon notes & passage of the week', 'Your group and serve schedule', 'Reading plans and catechism', 'Prayer wall', 'Church calendar & RSVPs', 'Study library and directory'].map(h => /*#__PURE__*/React.createElement("div", {
      key: h,
      style: {
        background: 'var(--surface-card)',
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        font: '400 15px/1.4 var(--mbc-font-sans)',
        color: 'var(--text-scripture)',
        margin: 0
      }
    }, h))))), /*#__PURE__*/React.createElement(Card, {
      tone: "paper",
      radius: "panelLg",
      pad: "clamp(30px,3.5vw,48px)",
      style: {
        maxWidth: 460,
        width: '100%',
        justifySelf: 'center'
      }
    }, /*#__PURE__*/React.createElement(Logo, {
      variant: "mark",
      src: "../../assets/mbc-mark.png",
      size: 44,
      style: {
        marginBottom: 24
      }
    }), /*#__PURE__*/React.createElement("h2", {
      style: {
        font: '400 27px/1.2 var(--mbc-font-serif)',
        letterSpacing: '-.015em',
        margin: '0 0 8px'
      }
    }, "Sign in"), /*#__PURE__*/React.createElement("p", {
      style: {
        font: '400 15px/1.6 var(--mbc-font-sans)',
        color: 'var(--text-meta)',
        margin: '0 0 28px'
      }
    }, "Use the email you gave the church office."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Input, {
      on: "card",
      placeholder: "you@example.com",
      defaultValue: "daniel@example.com"
    }), /*#__PURE__*/React.createElement(Input, {
      on: "card",
      type: "password",
      placeholder: "Password",
      defaultValue: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
    }), /*#__PURE__*/React.createElement(Button, {
      full: true,
      onClick: onSignIn,
      style: {
        borderRadius: 'var(--mbc-radius-input)',
        padding: 17,
        marginTop: 6
      }
    }, "Sign in")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 22,
        font: '400 14px/1 var(--mbc-font-sans)'
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#reset"
    }, "Forgot password"), /*#__PURE__*/React.createElement("a", {
      href: "#new"
    }, "Request access"))));
  }
  return /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(36px,4vw,60px) var(--mbc-gutter) clamp(64px,7vw,100px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 20,
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 36
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 16
    }
  }, "Sunday, September 6"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '400 clamp(32px,3.6vw,48px)/1.1 var(--mbc-font-serif)',
      letterSpacing: 'var(--mbc-track-h2)',
      margin: 0
    }
  }, "Good morning, Daniel.")), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    onClick: onSignOut
  }, "Sign out")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
      gap: 'var(--mbc-grid-gap)',
      marginBottom: 'var(--mbc-grid-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    radius: "panel",
    pad: 32,
    style: {
      gridColumn: 'span 2',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "onDark",
    size: "sm",
    style: {
      marginBottom: 18
    }
  }, "Passage of the week"), /*#__PURE__*/React.createElement(VerseBlock, {
    tone: "dark",
    size: "md",
    reference: "Mark 10:45"
  }, "\u201CFor even the Son of Man came not to be served but to serve, and to give his life as a ransom for many.\u201D"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "light",
    size: "sm"
  }, "Sermon notes"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghostDark",
    size: "sm"
  }, "Group discussion guide"))), /*#__PURE__*/React.createElement(Card, {
    tone: "paper",
    radius: "panel",
    pad: 30,
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "sage",
    size: "sm",
    style: {
      marginBottom: 18
    }
  }, "Next steps"), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 21px/1.25 var(--mbc-font-serif)',
      margin: '0 0 14px'
    }
  }, "You're 3 of 5 through the membership pathway."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      marginBottom: 18
    }
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      height: 5,
      borderRadius: 99,
      background: i <= 3 ? 'var(--action-primary)' : 'var(--border-section)'
    }
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 15px/1.6 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: '0 0 20px',
      flex: 1
    }
  }, "Up next: the Serve interview with Spencer Ray."), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    size: "sm",
    full: true,
    style: {
      borderRadius: 'var(--mbc-radius-input)'
    }
  }, "Schedule it"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
      gap: 'var(--mbc-grid-gap)'
    }
  }, D.hubCards.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.title,
    tone: "paper",
    radius: "panel",
    pad: 28,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      minHeight: 220
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: "sm"
  }, c.kicker), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 13px/1 var(--mbc-font-sans)',
      color: 'var(--mbc-stone-pale)',
      margin: 0
    }
  }, c.meta)), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 20px/1.28 var(--mbc-font-serif)',
      margin: 0,
      letterSpacing: 'var(--mbc-track-h3)'
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, c.rows.map(r => /*#__PURE__*/React.createElement("p", {
    key: r,
    style: {
      font: '400 15px/1.5 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: 0,
      padding: '9px 0',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, r))), /*#__PURE__*/React.createElement("button", {
    style: {
      alignSelf: 'flex-start',
      background: 'none',
      border: 'none',
      padding: '0 0 4px',
      cursor: 'pointer',
      font: '700 11px/1 var(--mbc-font-sans)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--text-link)',
      borderBottom: '1px solid var(--mbc-underline-soft)'
    }
  }, c.cta)))));
}
Object.assign(window, {
  MemberHubScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/MemberHubScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SermonsScreen.jsx
try { (() => {
const {
  Button,
  Eyebrow,
  SermonRow,
  FilterBar
} = window.MemorialBaptistChurchDesignSystem_833455;
function SermonsScreen() {
  const D = window.MBC_DATA;
  const [series, setSeries] = React.useState('All');
  const list = series === 'All' ? D.sermons : D.sermons.filter(s => s.series === series);
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: 'clamp(48px,6vw,88px) var(--mbc-gutter) clamp(36px,4vw,52px)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 24
    }
  }, "Sermons"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--mbc-type-h1)',
      letterSpacing: 'var(--mbc-track-display)',
      margin: 0,
      maxWidth: '22ch',
      textWrap: 'balance'
    }
  }, "Every sermon, searchable by book, series, or speaker.")), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) clamp(48px,5vw,72px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-dark)',
      color: 'var(--text-on-dark)',
      borderRadius: 'var(--mbc-radius-panel-lg)',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--photo-placeholder-dark)',
      minHeight: 300,
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 10px/1.5 var(--mbc-font-mono)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, "series graphic 16:9")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'clamp(30px,3.5vw,50px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "onDark",
    style: {
      marginBottom: 16
    }
  }, "Latest \xB7 Aug 17, 2026"), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '400 clamp(26px,2.8vw,38px)/1.14 var(--mbc-font-serif)',
      letterSpacing: 'var(--mbc-track-h2)',
      margin: 0
    }
  }, "The Son of Man Came to Serve"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 17px/1.6 var(--mbc-font-sans)',
      color: 'var(--text-on-dark-soft)',
      margin: '16px 0 0'
    }
  }, "Mark 10:35\u201345 \xB7 Jacob Bice \xB7 38 min"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "light"
  }, "Watch"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghostDark"
  }, "Listen"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghostDark"
  }, "Sermon notes (PDF)"))))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y-lg)'
    }
  }, /*#__PURE__*/React.createElement(FilterBar, {
    options: ['All', 'The Gospel of Mark', 'Summer in Ephesians', 'Our Anchor Passage'],
    value: series,
    onChange: setSeries,
    style: {
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("div", null, list.map(s => /*#__PURE__*/React.createElement(SermonRow, {
    key: s.title,
    date: s.date,
    title: s.title,
    series: s.series,
    reference: s.ref,
    speaker: s.speaker,
    length: s.len,
    onClick: () => {}
  })))));
}
Object.assign(window, {
  SermonsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SermonsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/VisitScreen.jsx
try { (() => {
const {
  Button,
  Card,
  Eyebrow,
  SectionHeading
} = window.MemorialBaptistChurchDesignSystem_833455;
function VisitScreen({
  go
}) {
  const D = window.MBC_DATA;
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 900,
      margin: '0 auto',
      padding: 'clamp(48px,6vw,88px) var(--mbc-gutter) clamp(32px,4vw,56px)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    level: "h1",
    eyebrow: "Plan your visit",
    title: "You are welcome here!",
    lead: "We'll meet you at the door."
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "paper",
    radius: "panel",
    pad: "clamp(28px,4vw,48px)"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '400 clamp(26px,2.6vw,34px)/1.15 var(--mbc-font-serif)',
      letterSpacing: '-.015em',
      margin: '0 0 34px'
    }
  }, "What a Sunday looks like"), D.sundayFlow.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.time,
    style: {
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 'clamp(16px,3vw,40px)',
      padding: '24px 0',
      borderTop: '1px solid var(--border-hairline)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 22px/1.2 var(--mbc-font-serif)',
      color: 'var(--text-eyebrow)',
      margin: 0
    }
  }, s.time), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 19px/1.3 var(--mbc-font-serif)',
      margin: '0 0 8px'
    }
  }, s.title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 16px/1.62 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: 0,
      maxWidth: '62ch',
      textWrap: 'pretty'
    }
  }, s.body)))))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
      gap: 'var(--mbc-grid-gap)'
    }
  }, [{
    k: 'Parking',
    h: 'Guest spaces, north lot',
    b: 'Reserved parking for guests runs along 28th Street, across from the building. Enter through the doors under the steeple — a host will be there.'
  }, {
    k: 'Kids',
    h: 'Secure check-in for birth–5th grade',
    b: 'Every worker is background-checked. You’ll get a matching tag and a text if you’re needed.'
  }, {
    k: 'Getting here',
    h: 'Midtown, just north of the BA',
    b: '2800 S. Yale Ave., a half mile north of the Broken Arrow Expressway (SH 51 / US 64).'
  }].map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.k,
    tone: "panel",
    radius: "panel",
    pad: 36
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "sage",
    style: {
      marginBottom: 16,
      letterSpacing: '.18em'
    }
  }, c.k), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '400 26px/1.2 var(--mbc-font-serif)',
      margin: '0 0 14px',
      letterSpacing: '-.015em'
    }
  }, c.h), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 16px/1.62 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: 0
    }
  }, c.b)))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--mbc-page-max)',
      margin: '0 auto',
      padding: '0 var(--mbc-gutter) var(--mbc-section-y-lg)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '400 clamp(26px,2.6vw,34px)/1.15 var(--mbc-font-serif)',
      letterSpacing: '-.015em',
      margin: '0 0 30px'
    }
  }, "Honest answers"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-section)'
    }
  }, D.faqs.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.q,
    style: {
      borderBottom: '1px solid var(--border-section)',
      padding: '26px 0',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,.8fr) minmax(0,1.2fr)',
      gap: 'clamp(20px,4vw,56px)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '600 19px/1.35 var(--mbc-font-serif)',
      margin: 0
    }
  }, f.q), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 16px/1.65 var(--mbc-font-sans)',
      color: 'var(--text-body)',
      margin: 0,
      textWrap: 'pretty'
    }
  }, f.a)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 36,
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    onClick: () => go('groups')
  }, "Find a group"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "outline",
    onClick: () => go('sermons')
  }, "Listen first"))));
}
Object.assign(window, {
  VisitScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/VisitScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.js
try { (() => {
window.MBC_DATA = {
  nav: [{
    key: 'visit',
    label: "I'm New"
  }, {
    key: 'about',
    label: 'About'
  }, {
    key: 'sermons',
    label: 'Sermons'
  }, {
    key: 'events',
    label: 'Events'
  }, {
    key: 'groups',
    label: 'Connect'
  }, {
    key: 'ministries',
    label: 'Ministries'
  }],
  times: [{
    day: 'Sunday',
    name: 'Bible Study',
    time: '9:15 AM'
  }, {
    day: 'Sunday',
    name: 'Worship Service',
    time: '10:30 AM'
  }, {
    day: 'Wednesday',
    name: 'Bible Study',
    time: '6:00 PM'
  }, {
    day: 'Wednesday',
    name: 'Family Dinner',
    time: '7:00 PM'
  }],
  values: [{
    name: 'Worship',
    verse: '\u201CDon\u2019t neglect to meet together, as is the habit of some, but encourage one another all the more as you see the Day drawing near.\u201D',
    ref: 'Hebrews 10:25'
  }, {
    name: 'Learn & Tell',
    verse: '\u201CGo and make disciples of all nations\u2026 teaching them to observe all that I have commanded you.\u201D',
    ref: 'Matthew 28:19\u201320'
  }, {
    name: 'Pray',
    verse: '\u201CRejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.\u201D',
    ref: '1 Thessalonians 5:16\u201318'
  }, {
    name: 'Serve',
    verse: '\u201CTo each is given a manifestation of the Spirit for the common good.\u201D',
    ref: '1 Corinthians 12:7'
  }, {
    name: 'Give',
    verse: '\u201CRemember the words of the Lord Jesus, how He Himself said, \u2018It is more blessed to give than to receive.\u2019\u201D',
    ref: 'Acts 20:35'
  }],
  events: [{
    mon: 'Sep',
    day: '02',
    cat: 'Weekly',
    title: 'Wednesday Night Bible Study & Dinner',
    when: '6:00 PM study \u00B7 7:00 PM dinner',
    where: 'Fellowship Hall'
  }, {
    mon: 'Sep',
    day: '06',
    cat: 'Worship',
    title: 'Lord\u2019s Supper & Baptism Sunday',
    when: '10:30 AM',
    where: 'Sanctuary'
  }, {
    mon: 'Sep',
    day: '12',
    cat: 'Serve',
    title: 'Serve Tulsa Saturday',
    when: '8:00 AM \u2013 12:00 PM',
    where: 'Meet in north lot'
  }],
  sermons: [{
    date: 'Aug 17',
    title: 'The Son of Man Came to Serve',
    ref: 'Mark 10:35\u201345',
    speaker: 'Jacob Bice',
    series: 'The Gospel of Mark',
    len: '38 min'
  }, {
    date: 'Aug 10',
    title: 'What Do You Want Me to Do for You?',
    ref: 'Mark 10:46\u201352',
    speaker: 'Jacob Bice',
    series: 'The Gospel of Mark',
    len: '35 min'
  }, {
    date: 'Aug 3',
    title: 'The Cost and the Reward',
    ref: 'Mark 10:17\u201331',
    speaker: 'Spencer Ray',
    series: 'The Gospel of Mark',
    len: '41 min'
  }, {
    date: 'Jul 27',
    title: 'A Household Ordered by Grace',
    ref: 'Ephesians 5:22\u20136:4',
    speaker: 'Jacob Bice',
    series: 'Summer in Ephesians',
    len: '36 min'
  }, {
    date: 'Jul 20',
    title: 'Put On the Whole Armor',
    ref: 'Ephesians 6:10\u201320',
    speaker: 'Andrew McGuire',
    series: 'Summer in Ephesians',
    len: '33 min'
  }, {
    date: 'Jul 13',
    title: 'Rest for the Weary',
    ref: 'Matthew 11:28\u201330',
    speaker: 'Jacob Bice',
    series: 'Our Anchor Passage',
    len: '39 min'
  }],
  groups: [{
    kind: 'Community Group',
    title: 'Midtown Couples',
    body: 'Young and middle-aged couples working through the Sunday sermon passage over dessert.',
    when: 'Tuesdays, 6:30 PM',
    where: 'Hosted near 31st & Harvard',
    spots: '4 spots',
    d: 'Tuesday'
  }, {
    kind: 'Sunday Class',
    title: 'The Berean Class',
    body: 'A long-running class for adults 55+. Book-by-book study, currently in 1 Peter.',
    when: 'Sundays, 9:15 AM',
    where: 'Room 204',
    spots: 'Open',
    d: 'Sunday'
  }, {
    kind: 'Community Group',
    title: 'Young Professionals',
    body: 'Twenties and thirties, single or newly married. Dinner, sermon discussion, prayer.',
    when: 'Thursdays, 7:00 PM',
    where: 'Rotating homes',
    spots: '2 spots',
    d: 'Thursday'
  }, {
    kind: 'Sunday Class',
    title: 'Families with Young Children',
    body: 'Parents of birth\u20135th grade. This fall: family worship and discipleship at home.',
    when: 'Sundays, 9:15 AM',
    where: 'Room 118',
    spots: 'Open',
    d: 'Sunday'
  }, {
    kind: 'Community Group',
    title: 'Men\u2019s Study \u2014 East Side',
    body: 'Early mornings, strong coffee, and the New City Catechism alongside the sermon text.',
    when: 'Wednesdays, 6:00 AM',
    where: 'Hosted near 41st & Sheridan',
    spots: 'Full \u2014 waitlist',
    d: 'Wednesday'
  }, {
    kind: 'Community Group',
    title: 'Women\u2019s Study \u2014 Midtown',
    body: 'A weekday group for women in every season, with childcare provided on site.',
    when: 'Tuesdays, 9:30 AM',
    where: 'Church, Room 210',
    spots: '6 spots',
    d: 'Tuesday'
  }],
  hubCards: [{
    kicker: 'Your group',
    meta: 'Tuesdays',
    title: 'Midtown Couples',
    rows: ['Next meeting: Sep 8, 6:30 PM', 'Bringing: dessert (you)', '9 of 12 attending'],
    cta: 'Group page'
  }, {
    kicker: 'Serve schedule',
    meta: '2 upcoming',
    title: 'You\u2019re on the rotation',
    rows: ['Sep 6 \u2014 Greeter, north doors', 'Sep 20 \u2014 MBC Kids, 2nd grade'],
    cta: 'Request a sub'
  }, {
    kicker: 'Reading plan',
    meta: 'Day 214',
    title: 'Mark & the Psalms',
    rows: ['Today: Mark 11:1\u201333', 'Today: Psalm 118', '14-day streak'],
    cta: 'Mark complete'
  }, {
    kicker: 'Prayer wall',
    meta: '6 new',
    title: 'Praying with the body',
    rows: ['A member recovering from surgery', 'A thanksgiving for answered prayer', 'Our partners in East Asia'],
    cta: 'Add a request'
  }],
  sundayFlow: [{
    time: '9:00',
    title: 'Coffee in the foyer',
    body: 'Come early if you want to meet someone. Hosts in name tags can point you to a class or the nursery.'
  }, {
    time: '9:15',
    title: 'Bible study classes',
    body: 'Classes for adults, kids and students.'
  }, {
    time: '10:30',
    title: 'Worship service',
    body: 'Congregational singing, Scripture read aloud, prayer, and preaching.'
  }],
  faqs: [{
    q: 'What should I wear?',
    a: 'Whatever you own. You will see suits and you will see jeans in the same pew, and nobody is keeping score.'
  }, {
    q: 'Where do my kids go?',
    a: 'Secure check-in for birth through 5th grade, students upstairs. Or keep them with you.'
  }, {
    q: 'Will I be singled out?',
    a: 'No. No visitor cards, no standing up. Say hello to a host if you want to; leave quietly if you\u2019d rather.'
  }, {
    q: 'How long is the service?',
    a: 'About ninety minutes. Preaching runs thirty-five to forty minutes.'
  }],
  footerCols: [{
    head: 'Visit',
    items: [{
      key: 'visit',
      label: "I'm New"
    }, {
      key: 'ministries',
      label: 'Ministries'
    }, {
      key: 'groups',
      label: 'Connect'
    }]
  }, {
    head: 'About',
    items: [{
      key: 'about',
      label: 'Who We Are'
    }, {
      key: 'sermons',
      label: 'Sermons'
    }, {
      key: 'events',
      label: 'Events'
    }]
  }, {
    head: 'Members',
    items: [{
      key: 'hub',
      label: 'Member Hub'
    }, {
      key: 'giving',
      label: 'Giving'
    }]
  }],
  footerTimes: ['Sun Bible Study — 9:15 AM', 'Sun Worship — 10:30 AM', 'Wed Bible Study — 6:00 PM', 'Wed Dinner — 7:00 PM']
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.js", error: String((e && e.message) || e) }); }

__ds_ns.ArchPhoto = __ds_scope.ArchPhoto;

__ds_ns.EventCard = __ds_scope.EventCard;

__ds_ns.GroupCard = __ds_scope.GroupCard;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.SermonRow = __ds_scope.SermonRow;

__ds_ns.ServiceTimes = __ds_scope.ServiceTimes;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.VerseBlock = __ds_scope.VerseBlock;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.RadioOption = __ds_scope.RadioOption;

__ds_ns.ArchOutline = __ds_scope.ArchOutline;

__ds_ns.DoorwayBand = __ds_scope.DoorwayBand;

__ds_ns.DoorwayPhoto = __ds_scope.DoorwayPhoto;

__ds_ns.FilterBar = __ds_scope.FilterBar;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.PreviewBanner = __ds_scope.PreviewBanner;

__ds_ns.SiteFooter = __ds_scope.SiteFooter;

__ds_ns.SiteHeader = __ds_scope.SiteHeader;

})();
