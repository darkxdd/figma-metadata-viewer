import React, { useState, useEffect } from "react";
import type { MetadataDisplayProps, FigmaNode } from "../types/figma";
import { copyToClipboard, copyFormats } from "../utils/clipboard";
import ErrorMessage from "./ErrorMessage";
import "./MetadataDisplay.css";

interface NodeTreeItemProps {
  node: FigmaNode;
  level: number;
  onNodeSelect?: (node: FigmaNode) => void;
  forceExpanded?: boolean | null;
}

const NodeTreeItem: React.FC<NodeTreeItemProps> = ({
  node,
  level,
  onNodeSelect,
  forceExpanded,
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  // Handle force expand/collapse
  useEffect(() => {
    if (typeof forceExpanded === "boolean") {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const hasChildren = node.children && node.children.length > 0;
  const indentStyle = { paddingLeft: `${level * 20}px` };

  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const formatNodeType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "FRAME":
        return "📦";
      case "TEXT":
        return "📝";
      case "RECTANGLE":
        return "⬜";
      case "ELLIPSE":
        return "⭕";
      case "COMPONENT":
        return "🧩";
      case "INSTANCE":
        return "🔗";
      case "GROUP":
        return "📁";
      default:
        return "📄";
    }
  };

  const handleCopyNodeId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(node.id);
  };

  const handleCopyNodeInfo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(copyFormats.nodeBasicInfo(node));
  };

  const handleNodeClick = () => {
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };

  return (
    <div className="node-tree-item">
      <div
        className={`node-header ${hasChildren ? "expandable" : ""}`}
        style={indentStyle}
      >
        <span className="expand-icon" onClick={toggleExpanded}>
          {hasChildren ? (isExpanded ? "▼" : "▶") : "  "}
        </span>
        <span className="node-icon">{getNodeIcon(node.type)}</span>
        <span className="node-name" onClick={handleNodeClick}>
          {node.name}
        </span>
        <span className="node-type">{formatNodeType(node.type)}</span>
        <span
          className="node-id"
          onClick={handleCopyNodeId}
          title="Click to copy ID"
        >
          #{node.id}
        </span>
        <div className="node-actions">
          <button
            className="copy-node-btn"
            onClick={handleCopyNodeInfo}
            title="Copy node info"
          >
            📋
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="node-children">
          {node.children!.map((child) => (
            <NodeTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onNodeSelect={onNodeSelect}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({
  fileData,
  onNodeSelect,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Invalid date";
    }
  };

  const getNodeCount = (node: FigmaNode): number => {
    try {
      let count = 1;
      if (node.children) {
        count += node.children.reduce(
          (sum, child) => sum + getNodeCount(child),
          0
        );
      }
      return count;
    } catch (err) {
      console.error("Error counting nodes:", err);
      return 0;
    }
  };

  const handleCopyFileInfo = async () => {
    try {
      const totalNodes = getNodeCount(fileData.document);
      const fileInfo = `File: ${fileData.name}
Last Modified: ${formatDate(fileData.lastModified)}
Total Nodes: ${totalNodes}`;
      await copyToClipboard(fileInfo);
    } catch (err) {
      console.error("Error copying file info:", err);
      setError("Failed to copy file information");
    }
  };

  // Validate file data
  if (!fileData || !fileData.document) {
    return (
      <ErrorMessage
        error="Invalid file data received. The file may be corrupted or inaccessible."
        onDismiss={() => setError(null)}
      />
    );
  }

  const totalNodes = getNodeCount(fileData.document);

  return (
    <div className="metadata-display">
      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}

      <div className="file-info">
        <div className="file-info-header">
          <h2>File Information</h2>
          <button
            className="copy-file-info-btn"
            onClick={handleCopyFileInfo}
            title="Copy file information"
          >
            📋 Copy Info
          </button>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <label>File Name:</label>
            <span>{fileData.name}</span>
          </div>
          <div className="info-item">
            <label>Last Modified:</label>
            <span>{formatDate(fileData.lastModified)}</span>
          </div>
          <div className="info-item">
            <label>Total Nodes:</label>
            <span>{totalNodes}</span>
          </div>
        </div>
      </div>

      <div className="node-tree">
        <div className="node-tree-header">
          <h2>Document Structure</h2>
          <div className="tree-controls">
            <button
              className="tree-control-btn"
              onClick={() => setExpandAll(true)}
              title="Expand all nodes"
            >
              ⬇️ Expand All
            </button>
            <button
              className="tree-control-btn"
              onClick={() => setExpandAll(false)}
              title="Collapse all nodes"
            >
              ⬆️ Collapse All
            </button>
          </div>
        </div>
        <div className="tree-container">
          <NodeTreeItem
            node={fileData.document}
            level={0}
            onNodeSelect={onNodeSelect}
            forceExpanded={expandAll}
          />
        </div>
      </div>
    </div>
  );
};

export default MetadataDisplay;
