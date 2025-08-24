/**
 * Enhanced Figma API Integration Demo
 * 
 * This file demonstrates how to use the new AI-optimized Figma API integration
 * with improved performance, global variables, and design token generation.
 */

import { EnhancedFigmaService } from '../services/enhancedFigmaApi';
// import { EnhancedMetadataParser } from '../utils/enhancedMetadataParser';
import { EnhancedCodeGenerator } from '../utils/enhancedCodeGenerator';
import { GlobalVariableManager } from '../utils/globalVariables';
import { extractFromDesign } from '../extractors/nodeWalker';
import { 
  allExtractors, 
  layoutAndText, 
  contentOnly, 
  layoutExtractor,
  textExtractor,
  visualsExtractor 
} from '../extractors/builtInExtractors';

/**
 * Demo: Complete Enhanced Workflow
 * 
 * This demonstrates the full pipeline from Figma API to generated React component
 * with global variables and design tokens.
 */
export async function demonstrateEnhancedWorkflow() {
  console.log('=== Enhanced Figma API Integration Demo ===\n');

  // Step 1: Initialize the enhanced services
  console.log('1. Initializing Enhanced Services...');
  const figmaService = new EnhancedFigmaService({
    figmaApiKey: 'your-api-key-here', // Replace with actual API key
    useOAuth: false, // Set to true if using OAuth
  });

  const globalVars = new GlobalVariableManager();
  // const parser = new EnhancedMetadataParser();
  const generator = new EnhancedCodeGenerator(globalVars.getGlobalVars());

  // Step 2: Fetch Figma file data (replace with your file key)
  console.log('2. Fetching Figma File Data...');
  try {
    const fileKey = 'your-figma-file-key-here';
    const rawFileData = await figmaService.getRawFile(fileKey);
    
    console.log(`   ✓ Fetched file: "${rawFileData.name}"`);
    console.log(`   ✓ Document root: ${rawFileData.document.name}`);
    
    // Step 3: Extract using the flexible extractor system
    console.log('3. Extracting Design Data with AI-Optimized System...');
    const startTime = performance.now();
    
    const extractedData = extractFromDesign(rawFileData.document, {
      extractors: allExtractors, // Use all extractors for complete analysis
      globalVars: globalVars.getGlobalVars(),
      traversalOptions: {
        maxDepth: 8, // Reasonable depth limit
      }
    });
    
    const extractionTime = performance.now() - startTime;
    console.log(`   ✓ Extraction completed in ${extractionTime.toFixed(2)}ms`);
    console.log(`   ✓ Global variables created: ${Object.keys(globalVars.getGlobalVars().styles).length}`);
    
    // Step 4: Generate design tokens
    console.log('4. Generating Design Tokens...');
    const designTokens = globalVars.generateDesignTokens();
    const cssProperties = globalVars.generateCSSCustomProperties();
    
    console.log(`   ✓ Generated ${Object.keys(designTokens).length} design token categories`);
    console.log(`   ✓ Generated ${cssProperties.length} CSS custom properties`);
    
    // Step 5: Generate enhanced React component
    console.log('5. Generating Enhanced React Component...');
    const component = generator.generateEnhancedComponent(
      extractedData,
      { componentName: 'EnhancedFigmaComponent' }
    );
    
    console.log(`   ✓ Component generated: ${component.name}`);
    console.log(`   ✓ Code length: ${component.code.length} characters`);
    console.log(`   ✓ CSS length: ${component.css.length} characters`);
    
    // Step 6: Display results
    console.log('\n6. Results Summary:');
    console.log('==================');
    console.log(`File Name: ${rawFileData.name}`);
    console.log(`Component Name: ${component.name}`);
    console.log(`Global Variables: ${Object.keys(globalVars.getGlobalVars().styles).length}`);
    console.log(`Design Tokens: ${Object.keys(designTokens).length} categories`);
    
    return {
      extractedData,
      component,
      designTokens,
      cssProperties,
      globalVars,
      metrics: {
        extractionTime,
        globalVariablesCount: Object.keys(globalVars.getGlobalVars().styles).length,
        designTokensCount: Object.keys(designTokens).length
      }
    };
    
  } catch (error) {
    console.error('Demo failed:', error);
    throw error;
  }
}

/**
 * Demo: Different Extraction Modes
 * 
 * Shows how to use different extractor combinations for different use cases.
 */
export function demonstrateExtractionModes(figmaNode: any) {
  console.log('=== Extractor Modes Demonstration ===\n');
  
  const globalVars = new GlobalVariableManager();
  
  // Mode 1: Layout and Text only (fast, minimal data)
  console.log('1. Layout and Text Only Mode:');
  const layoutTextData = extractFromDesign(figmaNode, {
    extractors: layoutAndText,
    globalVars: globalVars.getGlobalVars()
  });
  console.log(`   ✓ Extracted layout and text data`);
  console.log(`   ✓ Has layout: ${layoutTextData.layout ? 'Yes' : 'No'}`);
  console.log(`   ✓ Has text: ${layoutTextData.text ? 'Yes' : 'No'}`);
  console.log(`   ✓ Has fills: ${layoutTextData.fills ? 'Yes' : 'No'}`);
  
  // Mode 2: Content only (text and basic info)
  console.log('\n2. Content Only Mode:');
  const contentData = extractFromDesign(figmaNode, {
    extractors: contentOnly,
    globalVars: globalVars.getGlobalVars()
  });
  console.log(`   ✓ Extracted content data only`);
  
  // Mode 3: Individual extractors
  console.log('\n3. Individual Extractor Usage:');
  
  const layoutOnlyData = extractFromDesign(figmaNode, {
    extractors: [layoutExtractor],
    globalVars: globalVars.getGlobalVars()
  });
  console.log(`   ✓ Layout extractor: ${layoutOnlyData.layout ? 'Success' : 'No data'}`);
  
  const textOnlyData = extractFromDesign(figmaNode, {
    extractors: [textExtractor],
    globalVars: globalVars.getGlobalVars()
  });
  console.log(`   ✓ Text extractor: ${textOnlyData.text ? 'Success' : 'No data'}`);
  
  const visualsOnlyData = extractFromDesign(figmaNode, {
    extractors: [visualsExtractor],
    globalVars: globalVars.getGlobalVars()
  });
  console.log(`   ✓ Visuals extractor: ${visualsOnlyData.fills ? 'Success' : 'No data'}`);
  
  // Mode 4: All extractors (complete analysis)
  console.log('\n4. Complete Analysis Mode:');
  const completeData = extractFromDesign(figmaNode, {
    extractors: allExtractors,
    globalVars: globalVars.getGlobalVars()
  });
  console.log(`   ✓ Complete extraction finished`);
  console.log(`   ✓ Global variables created: ${Object.keys(globalVars.getGlobalVars().styles).length}`);
  
  return {
    layoutText: layoutTextData,
    content: contentData,
    complete: completeData,
    globalVariablesCount: Object.keys(globalVars.getGlobalVars().styles).length
  };
}

/**
 * Demo: Global Variables and Design Tokens
 * 
 * Shows how the global variable system works for style deduplication.
 */
export function demonstrateGlobalVariables() {
  console.log('=== Global Variables & Design Tokens Demo ===\n');
  
  const globalVars = new GlobalVariableManager();
  
  // Create some sample styles
  console.log('1. Creating Sample Styles...');
  const buttonStyle = {
    backgroundColor: '#007AFF',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600'
  };
  
  const cardStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  };
  
  // Add to global variables
  const buttonVarId = globalVars.findOrCreateVariable(buttonStyle, 'component');
  const cardVarId = globalVars.findOrCreateVariable(cardStyle, 'component');
  
  console.log(`   ✓ Button style ID: ${buttonVarId}`);
  console.log(`   ✓ Card style ID: ${cardVarId}`);
  
  // Try adding the same style again (should reuse)
  const duplicateButtonId = globalVars.findOrCreateVariable(buttonStyle, 'component');
  console.log(`   ✓ Duplicate button style ID: ${duplicateButtonId}`);
  console.log(`   ✓ Deduplication working: ${buttonVarId === duplicateButtonId}`);
  
  // Generate design tokens
  console.log('\n2. Generating Design Tokens...');
  const tokens = globalVars.generateDesignTokens();
  const allTokens = [
    ...tokens.colors,
    ...tokens.typography,
    ...tokens.layout,
    ...tokens.effects,
    ...tokens.spacing,
    ...tokens.components
  ];
  allTokens.forEach((token: any) => {
    console.log(`   • ${token.name} (${token.type}): ${token.value}`);
  });
  
  // Generate CSS custom properties
  console.log('\n3. Generating CSS Custom Properties...');
  const cssProps = globalVars.generateCSSCustomProperties();
  const cssLines = cssProps.split('\n');
  cssLines.forEach((prop: string) => {
    if (prop.trim()) {
      console.log(`   ${prop}`);
    }
  });
  
  return {
    globalVars,
    tokens: allTokens,
    cssProps: cssLines,
    deduplicationWorking: buttonVarId === duplicateButtonId
  };
}

/**
 * Demo: Performance Comparison
 * 
 * Compares single-pass vs multi-pass extraction performance.
 */
export function demonstratePerformance(figmaNode: any, iterations: number = 100) {
  console.log('=== Performance Comparison Demo ===\n');
  
  // Single-pass extraction (new way)
  console.log('1. Testing Single-Pass Extraction...');
  const singlePassTimes: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const globalVars = new GlobalVariableManager();
    const startTime = performance.now();
    
    extractFromDesign(figmaNode, {
      extractors: allExtractors,
      globalVars: globalVars.getGlobalVars()
    });
    
    const endTime = performance.now();
    singlePassTimes.push(endTime - startTime);
  }
  
  const avgSinglePass = singlePassTimes.reduce((a, b) => a + b, 0) / iterations;
  
  // Multi-pass simulation (old way)
  console.log('2. Testing Multi-Pass Extraction...');
  const multiPassTimes: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const globalVars = new GlobalVariableManager();
    const startTime = performance.now();
    
    // Simulate multiple passes
    extractFromDesign(figmaNode, {
      extractors: [layoutExtractor],
      globalVars: globalVars.getGlobalVars()
    });
    extractFromDesign(figmaNode, {
      extractors: [textExtractor],
      globalVars: globalVars.getGlobalVars()
    });
    extractFromDesign(figmaNode, {
      extractors: [visualsExtractor],
      globalVars: globalVars.getGlobalVars()
    });
    
    const endTime = performance.now();
    multiPassTimes.push(endTime - startTime);
  }
  
  const avgMultiPass = multiPassTimes.reduce((a, b) => a + b, 0) / iterations;
  
  // Results
  console.log('\n3. Performance Results:');
  console.log(`   Single-pass average: ${avgSinglePass.toFixed(2)}ms`);
  console.log(`   Multi-pass average: ${avgMultiPass.toFixed(2)}ms`);
  
  const improvement = ((avgMultiPass - avgSinglePass) / avgMultiPass * 100);
  console.log(`   Performance improvement: ${improvement.toFixed(1)}%`);
  
  return {
    singlePassAvg: avgSinglePass,
    multiPassAvg: avgMultiPass,
    improvement: improvement,
    iterations: iterations
  };
}

/**
 * Main demo function - runs all demonstrations
 */
export async function runAllDemos() {
  try {
    console.log('🚀 Starting Enhanced Figma API Integration Demos\n');
    
    // Note: This would require actual Figma API credentials and file keys
    // For now, we'll demonstrate with the components that don't require API calls
    
    console.log('Demo 1: Global Variables System');
    const globalVarsDemo = demonstrateGlobalVariables();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('Demo 2: Extraction Modes');
    const mockNode = {
      id: '1:1',
      name: 'Demo Node',
      type: 'FRAME' as const,
      visible: true,
      layoutMode: 'VERTICAL' as const,
      children: []
    };
    const extractionDemo = demonstrateExtractionModes(mockNode);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('Demo 3: Performance Comparison');
    const performanceDemo = demonstratePerformance(mockNode, 10); // Smaller iteration count for demo
    
    console.log('\n🎉 All demos completed successfully!');
    console.log('\nTo run the complete workflow demo with actual Figma data:');
    console.log('1. Set your FIGMA_API_KEY environment variable');
    console.log('2. Replace "your-figma-file-key-here" with an actual file key');
    console.log('3. Call demonstrateEnhancedWorkflow()');
    
    return {
      globalVars: globalVarsDemo,
      extraction: extractionDemo,
      performance: performanceDemo
    };
    
  } catch (error) {
    console.error('Demo failed:', error);
    throw error;
  }
}

// Export for easy usage
export default {
  demonstrateEnhancedWorkflow,
  demonstrateExtractionModes,
  demonstrateGlobalVariables,
  demonstratePerformance,
  runAllDemos
};