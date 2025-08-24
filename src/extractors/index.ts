// Types
export type {
  ExtractorFn,
  TraversalContext,
  TraversalOptions,
  GlobalVars,
  StyleTypes,
  SimplifiedDesign,
  SimplifiedNode,
  SimplifiedTextStyle,
  SimplifiedLayout,
  SimplifiedFill,
  SimplifiedGradientFill,
  SimplifiedImageFill,
  SimplifiedPatternFill,
  SimplifiedStroke,
  SimplifiedEffects,
  ComponentProperties,
  SimplifiedComponentDefinition,
  SimplifiedComponentSetDefinition,
  BoundingBox,
} from "./types";

// Core traversal function
export { extractFromDesign } from "./nodeWalker";

// Design-level extraction (unified nodes + components)
export { simplifyRawFigmaObject } from "./designExtractor";

// Built-in extractors
export {
  layoutExtractor,
  textExtractor,
  visualsExtractor,
  componentExtractor,
  // Convenience combinations
  allExtractors,
  layoutAndText,
  contentOnly,
  visualsOnly,
  layoutOnly,
} from "./builtInExtractors";