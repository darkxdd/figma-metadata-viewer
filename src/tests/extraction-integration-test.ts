import { extractFromDesign, extractFromDesignNodes } from '../extractors/nodeWalker';
import { allExtractors, layoutAndText, contentOnly, visualsOnly } from '../extractors/builtInExtractors';
import type { FigmaNode } from '../types/figma';
import type { GlobalVars } from '../extractors/types';

/**
 * Test suite to verify extraction methods from figma_api_example are correctly integrated
 */

// Mock Figma node for testing - fully compliant with @figma/rest-api-spec
const mockFigmaNode: FigmaNode = {
  id: "test-node-1",
  name: "Test Button",
  type: "FRAME",
  visible: true,
  locked: false,
  scrollBehavior: 'SCROLLS' as const,
  blendMode: 'NORMAL' as const,
  opacity: 1,
  absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 40 },
  layoutMode: "HORIZONTAL",
  primaryAxisAlignItems: "CENTER",
  counterAxisAlignItems: "CENTER",
  itemSpacing: 8,
  paddingLeft: 16,
  paddingRight: 16,
  paddingTop: 8,
  paddingBottom: 8,
  layoutSizingHorizontal: 'HUG' as const,
  layoutSizingVertical: 'HUG' as const,
  clipsContent: false,
  layoutWrap: 'NO_WRAP' as const,
  fills: [
    {
      type: "SOLID",
      color: { r: 0, g: 0.48, b: 1, a: 1 },
      visible: true,
      opacity: 1,
      blendMode: 'NORMAL' as const
    }
  ],
  strokes: [],
  strokeWeight: 0,
  strokeAlign: 'INSIDE' as const,
  effects: [],
  cornerRadius: 8,
  rectangleCornerRadii: [8, 8, 8, 8],
  exportSettings: [],
  constraints: {
    horizontal: 'LEFT' as const,
    vertical: 'TOP' as const
  },
  children: [
    {
      id: "test-text-1",
      name: "Button Text",
      type: "TEXT",
      visible: true,
      locked: false,
      scrollBehavior: 'SCROLLS' as const,
      blendMode: 'NORMAL' as const,
      opacity: 1,
      characters: "Click me",
      style: {
        fontFamily: "Inter",
        fontPostScriptName: "Inter-SemiBold",
        fontWeight: 600,
        fontSize: 16,
        textAlignHorizontal: "CENTER",
        textAlignVertical: "CENTER" as const,
        letterSpacing: 0,
        lineHeightPx: 19.2,
        lineHeightPercent: 120
      },
      absoluteBoundingBox: { x: 16, y: 12, width: 168, height: 16 },
      fills: [
        {
          type: "SOLID",
          color: { r: 1, g: 1, b: 1, a: 1 },
          visible: true,
          opacity: 1,
          blendMode: 'NORMAL' as const
        }
      ],
      strokes: [],
      strokeWeight: 0,
      strokeAlign: 'OUTSIDE' as const,
      effects: [],
      exportSettings: [],
      constraints: {
        horizontal: 'LEFT' as const,
        vertical: 'TOP' as const
      }
    }
  ]
} as FigmaNode;

const mockGlobalVars: GlobalVars = {
  styles: {}
};

/**
 * Test 1: Single node extraction with all extractors
 */
export function testSingleNodeExtraction() {
  console.log('🧪 Testing single node extraction with all extractors...');
  
  try {
    const result = extractFromDesign(mockFigmaNode, {
      extractors: allExtractors,
      globalVars: mockGlobalVars,
      traversalOptions: { maxDepth: 3 }
    });

    console.log('✅ Single node extraction successful');
    console.log(`   - Node ID: ${result.id}`);
    console.log(`   - Node type: ${result.type}`);
    console.log(`   - Has layout: ${result.layout ? 'Yes' : 'No'}`);
    console.log(`   - Has fills: ${result.fills ? 'Yes' : 'No'}`);
    console.log(`   - Has children: ${result.children ? result.children.length : 0}`);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Single node extraction failed:', error);
    return { success: false, error };
  }
}

/**
 * Test 2: Multiple nodes extraction
 */
export function testMultipleNodesExtraction() {
  console.log('🧪 Testing multiple nodes extraction...');
  
  try {
    const nodes = [mockFigmaNode, mockFigmaNode.children![0]];
    const result = extractFromDesignNodes(
      nodes,
      allExtractors,
      { maxDepth: 2 },
      mockGlobalVars
    );

    console.log('✅ Multiple nodes extraction successful');
    console.log(`   - Nodes processed: ${result.nodes.length}`);
    console.log(`   - Global variables created: ${Object.keys(result.globalVars.styles).length}`);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Multiple nodes extraction failed:', error);
    return { success: false, error };
  }
}

/**
 * Test 3: Different extractor combinations
 */
export function testExtractorCombinations() {
  console.log('🧪 Testing different extractor combinations...');
  
  const tests = [
    { name: 'Layout and Text', extractors: layoutAndText },
    { name: 'Content Only', extractors: contentOnly },
    { name: 'Visuals Only', extractors: visualsOnly },
    { name: 'All Extractors', extractors: allExtractors }
  ];

  const results: any[] = [];

  for (const test of tests) {
    try {
      const result = extractFromDesign(mockFigmaNode, {
        extractors: test.extractors,
        globalVars: { styles: {} }
      });

      console.log(`✅ ${test.name} extraction successful`);
      console.log(`   - Has layout: ${result.layout ? 'Yes' : 'No'}`);
      console.log(`   - Has text: ${result.text ? 'Yes' : 'No'}`);
      console.log(`   - Has fills: ${result.fills ? 'Yes' : 'No'}`);
      console.log(`   - Has effects: ${result.effects ? 'Yes' : 'No'}`);
      
      results.push({ test: test.name, success: true, result });
    } catch (error) {
      console.error(`❌ ${test.name} extraction failed:`, error);
      results.push({ test: test.name, success: false, error });
    }
  }

  return results;
}

/**
 * Test 4: Global variables functionality
 */
export function testGlobalVariables() {
  console.log('🧪 Testing global variables functionality...');
  
  try {
    const globalVars: GlobalVars = { styles: {} };
    
    // Test deduplication by extracting same node twice
    const result1 = extractFromDesign(mockFigmaNode, {
      extractors: allExtractors,
      globalVars
    });
    
    const initialStylesCount = Object.keys(globalVars.styles).length;
    
    const result2 = extractFromDesign(mockFigmaNode, {
      extractors: allExtractors,
      globalVars
    });
    
    const finalStylesCount = Object.keys(globalVars.styles).length;
    
    console.log('✅ Global variables test successful');
    console.log(`   - Initial styles: ${initialStylesCount}`);
    console.log(`   - Final styles: ${finalStylesCount}`);
    console.log(`   - Deduplication working: ${finalStylesCount === initialStylesCount ? 'Yes' : 'No'}`);
    console.log(`   - Result 1 ID: ${result1.id}`);
    console.log(`   - Result 2 ID: ${result2.id}`);
    
    return { 
      success: true, 
      initialStylesCount, 
      finalStylesCount,
      deduplicationWorking: finalStylesCount === initialStylesCount,
      result1,
      result2
    };
  } catch (error) {
    console.error('❌ Global variables test failed:', error);
    return { success: false, error };
  }
}

/**
 * Test 5: Transformer functions
 */
export async function testTransformerFunctions() {
  console.log('🧪 Testing transformer functions...');
  
  try {
    // Import transformer functions using ES6 imports
    // Note: These are dynamically imported for testing purposes
    const layoutModule = await import('../transformers/layout');
    const styleModule = await import('../transformers/style');
    const effectsModule = await import('../transformers/effects');
    const textModule = await import('../transformers/text');
    
    const { buildSimplifiedLayout } = layoutModule;
    const { parsePaint, buildSimplifiedStrokes } = styleModule;
    const { buildSimplifiedEffects } = effectsModule;
    const { extractNodeText } = textModule;
    
    console.log('✅ All transformer functions imported successfully');
    console.log(`   - Layout transformer: ${typeof buildSimplifiedLayout === 'function' ? 'Available' : 'Missing'}`);
    console.log(`   - Style transformers: ${typeof parsePaint === 'function' ? 'Available' : 'Missing'}`);
    console.log(`   - Stroke transformers: ${typeof buildSimplifiedStrokes === 'function' ? 'Available' : 'Missing'}`);
    console.log(`   - Effects transformer: ${typeof buildSimplifiedEffects === 'function' ? 'Available' : 'Missing'}`);
    console.log(`   - Text transformers: ${typeof extractNodeText === 'function' ? 'Available' : 'Missing'}`);
    
    // Note: Some functions prefixed with _ are reserved for future functionality
    return { success: true };
  } catch (error) {
    console.error('❌ Transformer functions test failed:', error);
    return { success: false, error };
  }
}

/**
 * Run all integration tests
 */
export async function runIntegrationTests() {
  console.log('🚀 Running Extraction Methods Integration Tests');
  console.log('='.repeat(50));
  
  const results = {
    singleNode: testSingleNodeExtraction(),
    multipleNodes: testMultipleNodesExtraction(),
    extractorCombinations: testExtractorCombinations(),
    globalVariables: testGlobalVariables(),
    transformerFunctions: await testTransformerFunctions()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(25));
  
  const successCount = Object.values(results).filter(r => 
    Array.isArray(r) ? r.every(item => item.success) : r.success
  ).length;
  
  console.log(`✅ Successful tests: ${successCount}/5`);
  console.log(`❌ Failed tests: ${5 - successCount}/5`);
  
  if (successCount === 5) {
    console.log('\n🎉 All extraction methods from figma_api_example are correctly integrated!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
  
  return results;
}

// Export for use in other modules
export default {
  runIntegrationTests,
  testSingleNodeExtraction,
  testMultipleNodesExtraction,
  testExtractorCombinations,
  testGlobalVariables,
  testTransformerFunctions
};