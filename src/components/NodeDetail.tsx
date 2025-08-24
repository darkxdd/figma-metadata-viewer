import React, { useState } from "react";
import type {
  NodeDetailProps,
  FigmaNode,
  Color,
  Fill,
  Stroke,
  Effect,
  BoundingBox,
} from "../types/figma";
import { copyToClipboard } from "../utils/clipboard";
import { hasImageFills } from "../utils/imageFills";
import ErrorMessage from "./ErrorMessage";
import ImagePreview from "./ImagePreview";
import "./NodeDetail.css";

const NodeDetail: React.FC<NodeDetailProps> = ({
  node,
  credentials,
  onCopy,
}) => {
  const [error, setError] = useState<string | null>(null);

  // Validate node data
  if (!node || !node.id) {
    return (
      <ErrorMessage
        error="Invalid node data. Unable to display node details."
        onDismiss={() => setError(null)}
      />
    );
  }

  // Determine if node should show image preview
  const shouldShowPreview = (node: FigmaNode): boolean => {
    // Show preview for visual nodes that can be rendered
    const visualNodeTypes = [
      "FRAME",
      "GROUP",
      "COMPONENT",
      "INSTANCE",
      "RECTANGLE",
      "ELLIPSE",
      "POLYGON",
      "STAR",
      "VECTOR",
      "TEXT",
      "LINE",
    ];

    return (
      visualNodeTypes.includes(node.type) &&
      node.visible !== false &&
      credentials !== undefined
    );
  };

  // Helper functions for formatting
  const formatColor = (color: Color): string => {
    try {
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const a = color.a;

      if (a === 1) {
        return `rgb(${r}, ${g}, ${b})`;
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    } catch (err) {
      console.error("Error formatting color:", err);
      return "rgba(0, 0, 0, 1)";
    }
  };

  const formatColorHex = (color: Color): string => {
    const r = Math.round(color.r * 255)
      .toString(16)
      .padStart(2, "0");
    const g = Math.round(color.g * 255)
      .toString(16)
      .padStart(2, "0");
    const b = Math.round(color.b * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${r}${g}${b}`;
  };

  const formatFills = (fills: Fill[]): string[] => {
    return fills
      .filter((fill) => fill.visible !== false)
      .map((fill) => {
        if (fill.type === "SOLID" && (fill as any).color) {
          return `background-color: ${formatColor((fill as any).color)};`;
        }
        return `/* ${fill.type} fill */`;
      });
  };

  const formatStrokes = (
    strokes: Stroke[],
    strokeWeight?: number
  ): string[] => {
    const result: string[] = [];

    if (strokeWeight) {
      result.push(`border-width: ${strokeWeight}px;`);
    }

    strokes
      .filter((stroke) => stroke.visible !== false)
      .forEach((stroke) => {
        if (stroke.type === "SOLID" && (stroke as any).color) {
          result.push(`border-color: ${formatColor((stroke as any).color)};`);
          result.push(`border-style: solid;`);
        }
      });

    return result;
  };

  const formatEffects = (effects: Effect[]): string[] => {
    return effects
      .filter((effect) => effect.visible !== false)
      .map((effect) => {
        const effectAny = effect as any;
        switch (effect.type) {
          case "DROP_SHADOW": {
            const offsetX = effectAny.offset?.x || 0;
            const offsetY = effectAny.offset?.y || 0;
            const radius = effectAny.radius || 0;
            const color = effectAny.color
              ? formatColor(effectAny.color)
              : "rgba(0,0,0,0.25)";
            return `box-shadow: ${offsetX}px ${offsetY}px ${radius}px ${color};`;
          }
          case "INNER_SHADOW": {
            const insetX = effectAny.offset?.x || 0;
            const insetY = effectAny.offset?.y || 0;
            const radius = effectAny.radius || 0;
            const insetColor = effectAny.color
              ? formatColor(effectAny.color)
              : "rgba(0,0,0,0.25)";
            return `box-shadow: inset ${insetX}px ${insetY}px ${radius}px ${insetColor};`;
          }
          case "LAYER_BLUR":
            return `filter: blur(${effectAny.radius || 0}px);`;
          case "BACKGROUND_BLUR":
            return `backdrop-filter: blur(${effectAny.radius || 0}px);`;
          default:
            return `/* ${effect.type} effect */`;
        }
      });
  };

  const formatBoundingBox = (box: BoundingBox): string[] => {
    return [
      `position: absolute;`,
      `left: ${box.x}px;`,
      `top: ${box.y}px;`,
      `width: ${box.width}px;`,
      `height: ${box.height}px;`,
    ];
  };

  const formatAutoLayout = (node: FigmaNode): string[] => {
    const result: string[] = [];

    if (node.layoutMode) {
      result.push(`display: flex;`);
      result.push(`flex-direction: ${node.layoutMode.toLowerCase()};`);
    }

    if (node.itemSpacing) {
      result.push(`gap: ${node.itemSpacing}px;`);
    }

    if (
      node.paddingTop ||
      node.paddingRight ||
      node.paddingBottom ||
      node.paddingLeft
    ) {
      const top = node.paddingTop || 0;
      const right = node.paddingRight || 0;
      const bottom = node.paddingBottom || 0;
      const left = node.paddingLeft || 0;
      result.push(`padding: ${top}px ${right}px ${bottom}px ${left}px;`);
    }

    if (node.primaryAxisAlignItems) {
      const alignMap = {
        MIN: "flex-start",
        CENTER: "center",
        MAX: "flex-end",
        SPACE_BETWEEN: "space-between",
      };
      const alignValue = alignMap[node.primaryAxisAlignItems];
      if (node.layoutMode === "HORIZONTAL") {
        result.push(`justify-content: ${alignValue};`);
      } else {
        result.push(`align-items: ${alignValue};`);
      }
    }

    if (node.counterAxisAlignItems) {
      const alignMap = {
        MIN: "flex-start",
        CENTER: "center",
        MAX: "flex-end",
      };
      const alignValue = alignMap[node.counterAxisAlignItems];
      if (node.layoutMode === "HORIZONTAL") {
        result.push(`align-items: ${alignValue};`);
      } else {
        result.push(`justify-content: ${alignValue};`);
      }
    }

    return result;
  };

  const formatTextStyle = (node: FigmaNode): string[] => {
    const result: string[] = [];

    if (node.style) {
      result.push(`font-family: "${node.style.fontFamily}";`);
      result.push(`font-weight: ${node.style.fontWeight};`);
      result.push(`font-size: ${node.style.fontSize}px;`);

      if (node.style.lineHeightPx) {
        result.push(`line-height: ${node.style.lineHeightPx}px;`);
      }

      if (node.style.letterSpacing) {
        result.push(`letter-spacing: ${node.style.letterSpacing}px;`);
      }

      const textAlignMap = {
        LEFT: "left",
        CENTER: "center",
        RIGHT: "right",
        JUSTIFIED: "justify",
      };
      result.push(
        `text-align: ${textAlignMap[node.style.textAlignHorizontal || 'LEFT']};`
      );
    }

    return result;
  };

  const generateCSS = (): string => {
    const cssRules: string[] = [];

    // Position and size
    if (node.absoluteBoundingBox) {
      cssRules.push(...formatBoundingBox(node.absoluteBoundingBox));
    }

    // Fills (background)
    if (node.fills && node.fills.length > 0) {
      cssRules.push(...formatFills(node.fills));
    }

    // Strokes (borders)
    if (node.strokes && node.strokes.length > 0) {
      cssRules.push(...formatStrokes(node.strokes, node.strokeWeight || 1));
    }

    // Effects (shadows, blur)
    if (node.effects && node.effects.length > 0) {
      cssRules.push(...formatEffects(node.effects));
    }

    // Corner radius
    if (node.cornerRadius) {
      cssRules.push(`border-radius: ${node.cornerRadius}px;`);
    }

    // Opacity
    if (node.opacity !== undefined && node.opacity !== 1) {
      cssRules.push(`opacity: ${node.opacity};`);
    }

    // Auto Layout (Flexbox)
    if (node.layoutMode) {
      cssRules.push(...formatAutoLayout(node));
    }

    // Text styles
    if (node.type === "TEXT" && node.style) {
      cssRules.push(...formatTextStyle(node));
    }

    return cssRules.join("\n");
  };

  const handleCopyCSS = async () => {
    try {
      const css = generateCSS();
      await copyToClipboard(css, {
        onSuccess: () => {
          if (onCopy) {
            onCopy(css);
          }
        },
      });
    } catch (err) {
      console.error("Error copying CSS:", err);
      setError("Failed to copy CSS to clipboard");
    }
  };

  const handleCopyJSON = async () => {
    try {
      const json = JSON.stringify(node, null, 2);
      await copyToClipboard(json, {
        onSuccess: () => {
          if (onCopy) {
            onCopy(json);
          }
        },
      });
    } catch (err) {
      console.error("Error copying JSON:", err);
      setError("Failed to copy JSON to clipboard");
    }
  };

  const renderBasicProperties = () => (
    <div className="property-section">
      <h3>Basic Properties</h3>
      <div className="property-grid">
        <div className="property-item">
          <label>ID:</label>
          <span className="monospace">{node.id}</span>
        </div>
        <div className="property-item">
          <label>Name:</label>
          <span>{node.name}</span>
        </div>
        <div className="property-item">
          <label>Type:</label>
          <span className="node-type-badge">{node.type}</span>
        </div>
        {node.visible !== undefined && (
          <div className="property-item">
            <label>Visible:</label>
            <span>{node.visible ? "Yes" : "No"}</span>
          </div>
        )}
        {node.componentId && (
          <div className="property-item">
            <label>Component ID:</label>
            <span className="monospace">{node.componentId}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderDimensions = () => {
    if (!node.absoluteBoundingBox) return null;

    const box = node.absoluteBoundingBox;
    return (
      <div className="property-section">
        <h3>Dimensions & Position</h3>
        <div className="property-grid">
          <div className="property-item">
            <label>X:</label>
            <span>{box.x}px</span>
          </div>
          <div className="property-item">
            <label>Y:</label>
            <span>{box.y}px</span>
          </div>
          <div className="property-item">
            <label>Width:</label>
            <span>{box.width}px</span>
          </div>
          <div className="property-item">
            <label>Height:</label>
            <span>{box.height}px</span>
          </div>
        </div>
      </div>
    );
  };

  const renderFills = () => {
    if (!node.fills || node.fills.length === 0) return null;

    return (
      <div className="property-section">
        <h3>Fills</h3>
        {node.fills.map((fill, index) => (
          <div key={index} className="fill-item">
            <div className="fill-header">
              <span className="fill-type">{fill.type}</span>
              {fill.visible === false && (
                <span className="hidden-badge">Hidden</span>
              )}
            </div>
            {(fill as any).color && (
              <div className="color-display">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: formatColor((fill as any).color) }}
                />
                <div className="color-values">
                  <span className="monospace">{formatColor((fill as any).color)}</span>
                  <span className="monospace">
                    {formatColorHex((fill as any).color)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTextContent = () => {
    if (node.type !== "TEXT" || !node.characters) return null;

    return (
      <div className="property-section">
        <h3>Text Content</h3>
        <div className="text-content">
          <pre>{node.characters}</pre>
        </div>
      </div>
    );
  };

  const renderAutoLayout = () => {
    if (!node.layoutMode) return null;

    return (
      <div className="property-section">
        <h3>Auto Layout</h3>
        <div className="property-grid">
          <div className="property-item">
            <label>Direction:</label>
            <span>{node.layoutMode}</span>
          </div>
          {node.itemSpacing && (
            <div className="property-item">
              <label>Item Spacing:</label>
              <span>{node.itemSpacing}px</span>
            </div>
          )}
          {node.primaryAxisAlignItems && (
            <div className="property-item">
              <label>Primary Axis:</label>
              <span>{node.primaryAxisAlignItems}</span>
            </div>
          )}
          {node.counterAxisAlignItems && (
            <div className="property-item">
              <label>Counter Axis:</label>
              <span>{node.counterAxisAlignItems}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderImagePreview = () => {
    if (!shouldShowPreview(node) || !credentials) return null;

    return (
      <div className="property-section">
        <h3>Visual Preview</h3>
        <div className="image-preview-section">
          <div className="large-preview-container">
            <ImagePreview
              key={`preview-${node.id}`}
              nodeId={node.id}
              credentials={credentials}
              scale={1}
              format="png"
              lazy={false}
              className="node-preview-large"
              alt={`Preview of ${node.name}`}
              onLoad={() => {
                // Image loaded successfully
              }}
              onError={(error) => {
                console.warn(
                  `Failed to load preview for node ${node.id}:`,
                  error
                );
              }}
            />
          </div>

          {hasImageFills(node) && (
            <div className="image-fills-note">
              <span className="info-icon">ℹ️</span>
              <span>This node contains image fills</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="node-detail">
      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}

      <div className="node-detail-header">
        <h2>{node.name}</h2>
        <div className="copy-buttons">
          <button onClick={handleCopyCSS} className="copy-button">
            Copy CSS
          </button>
          <button onClick={handleCopyJSON} className="copy-button">
            Copy JSON
          </button>
        </div>
      </div>

      {renderImagePreview()}
      {renderBasicProperties()}
      {renderDimensions()}
      {renderFills()}
      {renderTextContent()}
      {renderAutoLayout()}

      <div className="property-section">
        <h3>Generated CSS</h3>
        <pre className="css-output">{generateCSS()}</pre>
      </div>
    </div>
  );
};

export default NodeDetail;
