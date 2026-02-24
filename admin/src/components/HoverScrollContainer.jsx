const HoverScrollContainer = ({
  height = "100%",
  className = "",
  style = {},
  children,
}) => {
  const mergedClassName = ["hover-scroll", className].filter(Boolean).join(" ");
  return (
    <div
      className={mergedClassName}
      style={{ height, maxHeight: height, overflowY: "auto", ...style }}
    >
      {children}
    </div>
  );
};

export default HoverScrollContainer;
