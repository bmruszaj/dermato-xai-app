import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import BBoxSelector from "../BBoxSelector";

export type EntryType = {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
};

type Props = {
  url: string;
  inputMethod: "text" | "select";
  labels?: string | string[];
  onChange: (entries: EntryType[]) => void;
  borderWidth?: number;
};

type AnnotatorStatus = "free" | "corner";

type AnnotatorEntry = EntryType & {
  id: string;
};

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const MIN_RECT_SIZE = 3;
const HANDLE_SIZE = 28;

const panelButtonStyle: React.CSSProperties = {
  border: "1px solid #86cecd",
  borderRadius: "999px",
  background: "#ffffff",
  boxSizing: "border-box",
  color: "#0d4a48",
  cursor: "pointer",
  flex: "1 1 120px",
  fontWeight: 700,
  minHeight: "44px",
  minWidth: "120px",
  padding: "10px 14px",
  touchAction: "manipulation",
};

function normalizeLabels(labels?: string | string[]) {
  if (!labels) {
    return ["object"];
  }

  return typeof labels === "string" ? [labels] : labels;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createHandleStyle(handle: ResizeHandle): React.CSSProperties {
  const halfHandle = HANDLE_SIZE / -2;
  const style: React.CSSProperties = {
    position: "absolute",
    width: `${HANDLE_SIZE}px`,
    height: `${HANDLE_SIZE}px`,
    background: "#ffffff",
    border: "3px solid #0d8f8a",
    borderRadius: "999px",
    boxShadow: "0 8px 20px rgba(13, 74, 72, 0.22)",
    padding: 0,
    touchAction: "none",
    zIndex: 4,
  };

  if (handle.includes("n")) {
    style.top = `${halfHandle}px`;
  }
  if (handle.includes("s")) {
    style.bottom = `${halfHandle}px`;
  }
  if (handle.includes("w")) {
    style.left = `${halfHandle}px`;
  }
  if (handle.includes("e")) {
    style.right = `${halfHandle}px`;
  }

  if (handle === "n" || handle === "s") {
    style.left = "50%";
    style.transform = "translateX(-50%)";
    style.cursor = "ns-resize";
  }
  if (handle === "e" || handle === "w") {
    style.top = "50%";
    style.transform = "translateY(-50%)";
    style.cursor = "ew-resize";
  }

  if (handle === "nw" || handle === "se") {
    style.cursor = "nwse-resize";
  }
  if (handle === "ne" || handle === "sw") {
    style.cursor = "nesw-resize";
  }

  return style;
}

function getLabelForInput(labels: string[], current: string) {
  return current || labels[0] || "";
}

function rectangleFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const x1 = Math.min(start.x, end.x);
  const x2 = Math.max(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const y2 = Math.max(start.y, end.y);

  return {
    left: x1,
    top: y1,
    width: x2 - x1 + 1,
    height: y2 - y1 + 1,
  };
}

const BBoxAnnotator = React.forwardRef<{ reset: () => void }, Props>(
  ({ url, borderWidth = 2, inputMethod, labels, onChange }, ref) => {
    const availableLabels = useMemo(() => normalizeLabels(labels), [labels]);
    const [pointer, setPointer] = useState<{ x: number; y: number } | null>(
      null
    );
    const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
    const [entries, setEntries] = useState<AnnotatorEntry[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draftLabel, setDraftLabel] = useState(() =>
      getLabelForInput(availableLabels, "")
    );
    const [status, setStatus] = useState<AnnotatorStatus>("free");
    const [dragging, setDragging] = useState<{
      id: string;
      offsetX: number;
      offsetY: number;
    } | null>(null);
    const [resizing, setResizing] = useState<{
      id: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      startRect: { left: number; top: number; width: number; height: number };
    } | null>(null);
    const [multiplier, setMultiplier] = useState(1);
    const [bBoxAnnotatorStyle, setBboxAnnotatorStyle] = useState<{
      width?: number;
      height?: number;
    }>({});
    const [imageFrameStyle, setImageFrameStyle] = useState<{
      width?: number;
      height?: number;
      backgroundImageSrc?: string;
    }>({});

    const bBoxAnnotatorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      onChange(
        entries.map((entry) => ({
          width: Math.round(entry.width * multiplier),
          height: Math.round(entry.height * multiplier),
          top: Math.round(entry.top * multiplier),
          left: Math.round(entry.left * multiplier),
          label: entry.label,
        }))
      );
    }, [entries, multiplier, onChange]);

    useEffect(() => {
      const maxWidth = bBoxAnnotatorRef.current?.offsetWidth || 1;
      const imageElement = new Image();
      imageElement.src = url;
      imageElement.onload = () => {
        const width = imageElement.naturalWidth || imageElement.width;
        const height = imageElement.naturalHeight || imageElement.height;
        const scale = width / maxWidth;
        const displayWidth = Math.round(width / scale);
        const displayHeight = Math.round(height / scale);
        setMultiplier(scale);
        setBboxAnnotatorStyle({
          width: displayWidth,
          height: displayHeight,
        });
        setImageFrameStyle({
          backgroundImageSrc: imageElement.src,
          width: displayWidth,
          height: displayHeight,
        });
      };
      imageElement.onerror = () => {
        throw new Error("Invalid image URL: " + url);
      };
    }, [url]);

    useEffect(() => {
      setDraftLabel((current) => getLabelForInput(availableLabels, current));
    }, [availableLabels]);

    useImperativeHandle(ref, () => ({
      reset() {
        setEntries([]);
        setSelectedId(null);
        cancelDraft();
      },
    }));

    const crop = (clientX: number, clientY: number) => {
      const rect = bBoxAnnotatorRef.current?.getBoundingClientRect();
      return {
        x:
          rect && imageFrameStyle.width
            ? clamp(
                Math.round(clientX - rect.left),
                0,
                Math.round(imageFrameStyle.width - 1)
              )
            : 0,
        y:
          rect && imageFrameStyle.height
            ? clamp(
                Math.round(clientY - rect.top),
                0,
                Math.round(imageFrameStyle.height - 1)
              )
            : 0,
      };
    };

    const rectangle = () => {
      return offset && pointer
        ? rectangleFromPoints(offset, pointer)
        : {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          };
    };

    const rect = rectangle();
    const selectedEntry =
      entries.find((entry) => entry.id === selectedId) ?? null;

    function cancelDraft() {
      setStatus("free");
      setPointer(null);
      setOffset(null);
      setDraftLabel(getLabelForInput(availableLabels, ""));
    }

    function handleImagePointerUp(e: React.PointerEvent<HTMLDivElement>) {
      if (e.target !== e.currentTarget || dragging || resizing) {
        return;
      }
      if (e.button !== 0) {
        return;
      }

      const pos = crop(e.clientX, e.clientY);

      if (status === "free") {
        setOffset(pos);
        setPointer(pos);
        setSelectedId(null);
        setStatus("corner");
        return;
      }

      if (status === "corner" && offset) {
        const nextRect = rectangleFromPoints(offset, pos);
        const nextLabel = draftLabel.trim();

        if (
          nextRect.width < MIN_RECT_SIZE ||
          nextRect.height < MIN_RECT_SIZE ||
          nextLabel.length === 0
        ) {
          cancelDraft();
          return;
        }

        const id = crypto.randomUUID();
        setEntries((current) => [
          ...current,
          {
            ...nextRect,
            id,
            label: nextLabel,
          },
        ]);
        setSelectedId(id);
        cancelDraft();
      }
    }

    function updateSelectedLabel(label: string) {
      if (!selectedId) {
        return;
      }

      setEntries((current) =>
        current.map((entry) =>
          entry.id === selectedId ? { ...entry, label } : entry
        )
      );
    }

    function deleteSelectedEntry() {
      if (!selectedId) {
        return;
      }

      setEntries((current) =>
        current.filter((entry) => entry.id !== selectedId)
      );
      setSelectedId(null);
    }

    function startDragging(
      entry: AnnotatorEntry,
      clientX: number,
      clientY: number
    ) {
      const pos = crop(clientX, clientY);
      setSelectedId(entry.id);
      setDragging({
        id: entry.id,
        offsetX: pos.x - entry.left,
        offsetY: pos.y - entry.top,
      });
    }

    function startResizing(
      entry: AnnotatorEntry,
      handle: ResizeHandle,
      clientX: number,
      clientY: number
    ) {
      const pos = crop(clientX, clientY);
      setSelectedId(entry.id);
      setResizing({
        id: entry.id,
        handle,
        startX: pos.x,
        startY: pos.y,
        startRect: {
          left: entry.left,
          top: entry.top,
          width: entry.width,
          height: entry.height,
        },
      });
    }

    useEffect(() => {
      if (!dragging) {
        return;
      }

      const onMove = (e: PointerEvent) => {
        const pos = crop(e.clientX, e.clientY);
        setEntries((current) =>
          current.map((entry) => {
            if (entry.id !== dragging.id) {
              return entry;
            }

            const imgW = imageFrameStyle.width || 0;
            const imgH = imageFrameStyle.height || 0;
            const newLeft = clamp(
              pos.x - dragging.offsetX,
              0,
              Math.max(0, imgW - entry.width - 1)
            );
            const newTop = clamp(
              pos.y - dragging.offsetY,
              0,
              Math.max(0, imgH - entry.height - 1)
            );

            return { ...entry, left: newLeft, top: newTop };
          })
        );
      };
      const onUp = () => {
        setDragging(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }, [dragging, imageFrameStyle.height, imageFrameStyle.width]);

    useEffect(() => {
      if (!resizing) {
        return;
      }

      const onMove = (e: PointerEvent) => {
        const pos = crop(e.clientX, e.clientY);
        const imgW = imageFrameStyle.width || 0;
        const imgH = imageFrameStyle.height || 0;
        const minW = MIN_RECT_SIZE;
        const minH = MIN_RECT_SIZE;
        const dx = pos.x - resizing.startX;
        const dy = pos.y - resizing.startY;

        setEntries((current) =>
          current.map((entry) => {
            if (entry.id !== resizing.id) {
              return entry;
            }

            let newLeft = resizing.startRect.left;
            let newTop = resizing.startRect.top;
            let newWidth = resizing.startRect.width;
            let newHeight = resizing.startRect.height;

            switch (resizing.handle) {
              case "e": {
                newWidth = clamp(
                  resizing.startRect.width + dx,
                  minW,
                  imgW - resizing.startRect.left - 1
                );
                break;
              }
              case "s": {
                newHeight = clamp(
                  resizing.startRect.height + dy,
                  minH,
                  imgH - resizing.startRect.top - 1
                );
                break;
              }
              case "se": {
                newWidth = clamp(
                  resizing.startRect.width + dx,
                  minW,
                  imgW - resizing.startRect.left - 1
                );
                newHeight = clamp(
                  resizing.startRect.height + dy,
                  minH,
                  imgH - resizing.startRect.top - 1
                );
                break;
              }
              case "w": {
                const maxLeft =
                  resizing.startRect.left + resizing.startRect.width - minW;
                newLeft = clamp(resizing.startRect.left + dx, 0, maxLeft);
                newWidth =
                  resizing.startRect.width -
                  (newLeft - resizing.startRect.left);
                break;
              }
              case "n": {
                const maxTop =
                  resizing.startRect.top + resizing.startRect.height - minH;
                newTop = clamp(resizing.startRect.top + dy, 0, maxTop);
                newHeight =
                  resizing.startRect.height - (newTop - resizing.startRect.top);
                break;
              }
              case "nw": {
                const maxLeft =
                  resizing.startRect.left + resizing.startRect.width - minW;
                const maxTop =
                  resizing.startRect.top + resizing.startRect.height - minH;
                newLeft = clamp(resizing.startRect.left + dx, 0, maxLeft);
                newTop = clamp(resizing.startRect.top + dy, 0, maxTop);
                newWidth =
                  resizing.startRect.width -
                  (newLeft - resizing.startRect.left);
                newHeight =
                  resizing.startRect.height - (newTop - resizing.startRect.top);
                break;
              }
              case "ne": {
                const maxTop =
                  resizing.startRect.top + resizing.startRect.height - minH;
                newTop = clamp(resizing.startRect.top + dy, 0, maxTop);
                newHeight =
                  resizing.startRect.height - (newTop - resizing.startRect.top);
                newWidth = clamp(
                  resizing.startRect.width + dx,
                  minW,
                  imgW - resizing.startRect.left - 1
                );
                break;
              }
              case "sw": {
                const maxLeft =
                  resizing.startRect.left + resizing.startRect.width - minW;
                newLeft = clamp(resizing.startRect.left + dx, 0, maxLeft);
                newWidth =
                  resizing.startRect.width -
                  (newLeft - resizing.startRect.left);
                newHeight = clamp(
                  resizing.startRect.height + dy,
                  minH,
                  imgH - resizing.startRect.top - 1
                );
                break;
              }
              default:
                break;
            }

            newLeft = clamp(newLeft, 0, Math.max(0, imgW - newWidth - 1));
            newTop = clamp(newTop, 0, Math.max(0, imgH - newHeight - 1));

            return {
              ...entry,
              left: newLeft,
              top: newTop,
              width: newWidth,
              height: newHeight,
            };
          })
        );
      };
      const onUp = () => {
        setResizing(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }, [resizing, imageFrameStyle.height, imageFrameStyle.width]);

    function renderLabelInput({
      value,
      onValueChange,
    }: {
      value: string;
      onValueChange: (label: string) => void;
    }) {
      const inputStyle: React.CSSProperties = {
        border: "1px solid #86cecd",
        borderRadius: "999px",
        background: "#ffffff",
        boxSizing: "border-box",
        color: "#0d4a48",
        fontSize: "16px",
        fontWeight: 700,
        maxWidth: "100%",
        minWidth: 0,
        padding: "10px 14px",
        width: "100%",
      };

      if (inputMethod === "select") {
        return (
          <select
            aria-label="Klasa struktury"
            onChange={(e) => onValueChange(e.target.value)}
            style={inputStyle}
            value={value}
          >
            {availableLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          aria-label="Klasa struktury"
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Nazwa klasy"
          style={inputStyle}
          type="text"
          value={value}
        />
      );
    }

    function renderControlPanel() {
      if (status === "corner") {
        return (
          <div style={panelStyle}>
            <div style={panelContentStyle}>
              <strong>Drugi punkt</strong>
              <p style={panelTextStyle}>
                Kliknij albo dotknij przeciwległego rogu zaznaczenia.
              </p>
              {renderLabelInput({
                value: draftLabel,
                onValueChange: setDraftLabel,
              })}
            </div>
            <button
              onClick={cancelDraft}
              style={panelButtonStyle}
              type="button"
            >
              Anuluj
            </button>
          </div>
        );
      }

      if (selectedEntry) {
        return (
          <div style={panelStyle}>
            <div style={panelContentStyle}>
              <strong>Edytuj bounding box</strong>
              <p style={panelTextStyle}>
                Przesuń ramkę lub użyj dużych uchwytów, żeby poprawić rozmiar.
              </p>
              {renderLabelInput({
                value: selectedEntry.label,
                onValueChange: updateSelectedLabel,
              })}
            </div>
            <div style={panelActionsStyle}>
              <button
                onClick={() => setSelectedId(null)}
                style={panelButtonStyle}
                type="button"
              >
                Gotowe
              </button>
              <button
                onClick={deleteSelectedEntry}
                style={{
                  ...panelButtonStyle,
                  borderColor: "#f0b8ad",
                  color: "#9b3f34",
                }}
                type="button"
              >
                Usuń
              </button>
            </div>
          </div>
        );
      }

      return (
        <div style={panelStyle}>
          <div style={panelContentStyle}>
            <strong>Dodaj bounding box</strong>
            <p style={panelTextStyle}>
              Kliknij albo dotknij pierwszego rogu struktury, potem drugiego
              rogu. Box zostanie dodany automatycznie.
            </p>
            {renderLabelInput({
              value: draftLabel,
              onValueChange: setDraftLabel,
            })}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={bBoxAnnotatorRef}
        style={{
          cursor: status === "corner" ? "crosshair" : "default",
          width: `${bBoxAnnotatorStyle.width}px`,
        }}
      >
        <div
          onPointerUp={handleImagePointerUp}
          style={{
            position: "relative",
            backgroundSize: "100%",
            width: `${imageFrameStyle.width}px`,
            height: `${imageFrameStyle.height}px`,
            backgroundImage: `url(${imageFrameStyle.backgroundImageSrc})`,
            touchAction: "manipulation",
          }}
        >
          {status === "corner" ? <BBoxSelector rectangle={rect} /> : null}
          {entries.map((entry) => (
            <div
              key={entry.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                startDragging(entry, e.clientX, e.clientY);
              }}
              style={{
                border:
                  selectedId === entry.id
                    ? `${borderWidth}px solid #0d8f8a`
                    : `${borderWidth}px solid #ff6b5a`,
                position: "absolute",
                top: `${entry.top - borderWidth}px`,
                left: `${entry.left - borderWidth}px`,
                width: `${entry.width}px`,
                height: `${entry.height}px`,
                color: selectedId === entry.id ? "#0d8f8a" : "#ff6b5a",
                cursor: selectedId === entry.id ? "move" : "grab",
                fontFamily: "monospace",
                fontSize: "12px",
                touchAction: "none",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "100%",
                  overflow: "hidden",
                  borderBottomRightRadius: "10px",
                  background: "rgba(255, 255, 255, 0.92)",
                  padding: "2px 6px",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.label}
              </div>
              {selectedId === entry.id
                ? (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map(
                    (handle) => (
                      <button
                        aria-label={`Zmień rozmiar: ${handle}`}
                        key={handle}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          startResizing(entry, handle, e.clientX, e.clientY);
                        }}
                        style={createHandleStyle(handle)}
                        type="button"
                      />
                    )
                  )
                : null}
            </div>
          ))}
        </div>
        {renderControlPanel()}
      </div>
    );
  }
);

const panelStyle: React.CSSProperties = {
  alignItems: "stretch",
  background: "#eef8f8",
  border: "1px solid #b9e2e1",
  borderRadius: "24px",
  boxSizing: "border-box",
  boxShadow: "0 14px 40px rgba(69, 151, 153, 0.12)",
  color: "#0d4a48",
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  justifyContent: "space-between",
  left: 0,
  marginTop: "12px",
  maxWidth: "100%",
  padding: "14px",
  position: "sticky",
  width: "min(100%, calc(100vw - 32px))",
};

const panelContentStyle: React.CSSProperties = {
  boxSizing: "border-box",
  flex: "1 1 240px",
  minWidth: 0,
};

const panelTextStyle: React.CSSProperties = {
  color: "#407674",
  fontSize: "14px",
  lineHeight: 1.5,
  margin: "4px 0 10px",
};

const panelActionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  flex: "1 1 180px",
  gap: "8px",
};

BBoxAnnotator.displayName = "BBoxAnnotator";
export default BBoxAnnotator;
