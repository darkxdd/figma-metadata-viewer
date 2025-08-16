// Utility functions for clipboard operations with visual feedback

import type { FigmaNode } from "../types/figma";

export interface CopyOptions {
  onSuccess?: (data: string) => void;
  onError?: (error: Error) => void;
  showFeedback?: boolean;
}

export const copyToClipboard = async (
  text: string,
  options: CopyOptions = {}
): Promise<boolean> => {
  const { onSuccess, onError, showFeedback = true } = options;

  try {
    await navigator.clipboard.writeText(text);

    if (onSuccess) {
      onSuccess(text);
    }

    if (showFeedback) {
      showCopyFeedback("Copied to clipboard!");
    }

    return true;
  } catch (error) {
    console.log(error);
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        if (onSuccess) {
          onSuccess(text);
        }

        if (showFeedback) {
          showCopyFeedback("Copied to clipboard!");
        }

        return true;
      } else {
        throw new Error("Copy command failed");
      }
    } catch (fallbackError) {
      const finalError =
        fallbackError instanceof Error
          ? fallbackError
          : new Error("Copy failed");

      if (onError) {
        onError(finalError);
      }

      if (showFeedback) {
        showCopyFeedback("Failed to copy", "error");
      }

      return false;
    }
  }
};

export const showCopyFeedback = (
  message: string,
  type: "success" | "error" = "success"
): void => {
  // Remove any existing feedback
  const existingFeedback = document.querySelector(".copy-feedback");
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement("div");
  feedback.className = `copy-feedback copy-feedback-${type}`;
  feedback.textContent = message;

  // Style the feedback
  Object.assign(feedback.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: type === "success" ? "#28a745" : "#dc3545",
    color: "white",
    padding: "12px 16px",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: "10000",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    transform: "translateX(100%)",
    transition: "transform 0.3s ease",
  });

  document.body.appendChild(feedback);

  // Animate in
  requestAnimationFrame(() => {
    feedback.style.transform = "translateX(0)";
  });

  // Remove after delay
  setTimeout(() => {
    feedback.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 300);
  }, 2000);
};

// Predefined copy formats for different data types
export const copyFormats = {
  nodeBasicInfo: (node: FigmaNode): string => {
    return `Node: ${node.name}
ID: ${node.id}
Type: ${node.type}`;
  },

  nodeCSS: (node: FigmaNode): string => {
    // This would be implemented based on the node properties
    // For now, return a basic format
    const css = [];

    if (node.absoluteBoundingBox) {
      css.push(`width: ${node.absoluteBoundingBox.width}px;`);
      css.push(`height: ${node.absoluteBoundingBox.height}px;`);
    }

    return css.join("\n");
  },

  nodeJSON: (node: FigmaNode): string => {
    return JSON.stringify(node, null, 2);
  },

  nodeID: (node: FigmaNode): string => {
    return node.id;
  },
};

export default {
  copyToClipboard,
  showCopyFeedback,
  copyFormats,
};
