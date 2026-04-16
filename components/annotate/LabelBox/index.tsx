import React, { useState } from "react";

interface Props {
  left: number;
  top: number;
  inputMethod: "text" | "select";
  labels?: string | string[];
  initialValue?: string;
  onSubmit: (label: string) => void;
}
const LabelBox = React.forwardRef<any, Props>(
  ({ inputMethod, ...props }, forwardedRef) => {
    const [value, setValue] = useState(props.initialValue ?? "");
    const changeHandler = (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>
    ) => {
      setValue(e.target.value);
      if (inputMethod === "select") {
        props.onSubmit(e.target.value);
      }
    };
    const keyDownHandler = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        props.onSubmit(value);
        e.preventDefault();
        return;
      }
    };
    let { labels = ["object"] } = props;
    if (typeof labels === "string") {
      labels = [labels];
    }
    let labelInput;
    switch (inputMethod) {
      case "select":
        labelInput = (
          <select
            defaultValue={props.initialValue || ""}
            name="label"
            onChange={changeHandler}
            onMouseDown={(e) => e.stopPropagation()}
            ref={forwardedRef}
            style={{
              fontSize: "13px",
              padding: "4px 8px",
              border: "1px solid #555",
              borderRadius: "4px",
              background: "#1a1a1a",
              color: "#fff",
              cursor: "pointer",
              minWidth: "180px",
            }}
          >
            <option value="">wybierz klasę...</option>
            {labels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        );
        break;
      case "text":
        labelInput = (
          <input
            name="label"
            onChange={changeHandler}
            onKeyDown={keyDownHandler}
            onMouseDown={(e) => e.stopPropagation()}
            ref={forwardedRef}
            style={{
              fontSize: "13px",
              padding: "4px 8px",
              border: "1px solid #555",
              borderRadius: "4px",
              background: "#1a1a1a",
              color: "#fff",
              minWidth: "160px",
            }}
            type="text"
            value={value}
          />
        );
        break;
      default:
        throw new Error(`Invalid labelInput parameter: ${inputMethod}`);
    }

    return (
      <div
        style={{
          position: "absolute",
          left: `${props.left}px`,
          top: `${props.top}px`,
          zIndex: 10,
          background: "rgba(0,0,0,0.85)",
          borderRadius: "4px",
          padding: "4px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {labelInput}
      </div>
    );
  }
);
LabelBox.displayName = "LabelBox";

export default LabelBox;
