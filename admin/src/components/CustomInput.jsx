import React, { forwardRef } from "react";

const sizeClasses = {
  sm: "cool-input--sm",
  md: "cool-input--md",
  lg: "cool-input--lg",
};

const CustomInput = forwardRef((props, ref) => {
  const {
    label,
    dir = "auto",
    name,
    type = "text",
    value,
    defaultValue,
    onChange,
    placeholder,
    maxLength = 100,
    autoFocus,
    size = "md",
    className = "",
    ...rest
  } = props;

  const handleChange = (event) => {
    const nextValue = event.target.value.slice(0, maxLength);
    if (nextValue !== event.target.value) {
      event.target.value = nextValue;
    }
    if (onChange) {
      onChange(event);
    }
  };

  return (
    <label className={`cool-input ${sizeClasses[size] || sizeClasses.md}`}>
      {label && <span className="cool-input__label">{label}</span>}
      <span className="cool-input__shell">
        <input
          ref={ref}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onChange={handleChange}
          className={`custom-input ${className}`}
          dir={dir}
          {...rest}
        />
      </span>
    </label>
  );
});

CustomInput.displayName = "CustomInput";

export default CustomInput;
