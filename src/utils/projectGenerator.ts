import type { CodePreview } from '../types/gemini';
import JSZip from 'jszip';

export interface ProjectGenerationOptions {
  projectName: string;
  components: CodePreview[];
  includeTypescript?: boolean;
  includeStorybook?: boolean;
  cssFramework?: 'none' | 'tailwind' | 'styled-components';
}

export class ProjectGenerator {
  /**
   * Generate a complete React project with the provided components
   */
  public static async generateProject(options: ProjectGenerationOptions): Promise<Blob> {
    const zip = new JSZip();
    const { projectName, components, includeTypescript = true, cssFramework = 'none' } = options;
    
    // Create project structure
    this.createPackageJson(zip, projectName, includeTypescript, cssFramework);
    this.createTsConfig(zip, includeTypescript);
    this.createViteConfig(zip);
    this.createIndexHtml(zip, projectName);
    this.createGitignore(zip);
    this.createReadme(zip, projectName, components);
    
    // Create source files
    this.createMainEntry(zip, includeTypescript);
    this.createAppComponent(zip, components, includeTypescript);
    this.createGlobalStyles(zip, cssFramework);
    
    // Create components
    this.createComponents(zip, components, includeTypescript);
    
    // Create types if TypeScript
    if (includeTypescript) {
      this.createTypes(zip);
    }
    
    return await zip.generateAsync({ type: 'blob' });
  }
  
  /**
   * Create package.json
   */
  private static createPackageJson(
    zip: JSZip,
    projectName: string,
    includeTypescript: boolean,
    cssFramework: string
  ): void {
    const dependencies: Record<string, string> = {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
    };
    
    if (cssFramework === 'styled-components') {
      dependencies['styled-components'] = '^6.0.7';
    }
    
    const devDependencies: Record<string, string> = {
      '@vitejs/plugin-react': '^4.0.3',
      'vite': '^4.4.5',
      'eslint': '^8.45.0',
      'eslint-plugin-react-hooks': '^4.6.0',
      'eslint-plugin-react-refresh': '^0.4.3',
    };
    
    if (includeTypescript) {
      devDependencies['typescript'] = '^5.0.2';
      devDependencies['@types/react'] = '^18.2.15';
      devDependencies['@types/react-dom'] = '^18.2.7';
      if (cssFramework === 'styled-components') {
        devDependencies['@types/styled-components'] = '^5.1.26';
      }
    }
    
    if (cssFramework === 'tailwind') {
      devDependencies['tailwindcss'] = '^3.3.0';
      devDependencies['autoprefixer'] = '^10.4.14';
      devDependencies['postcss'] = '^8.4.24';
    }
    
    const packageJson = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: includeTypescript ? 'tsc && vite build' : 'vite build',
        lint: 'eslint . --ext ts,tsx,js,jsx --report-unused-disable-directives --max-warnings 0',
        preview: 'vite preview',
      },
      dependencies,
      devDependencies,
    };
    
    zip.file('package.json', JSON.stringify(packageJson, null, 2));
  }
  
  /**
   * Create TypeScript configuration
   */
  private static createTsConfig(zip: JSZip, includeTypescript: boolean): void {
    if (!includeTypescript) return;
    
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    };
    
    const tsConfigNode = {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
      },
      include: ['vite.config.ts'],
    };
    
    zip.file('tsconfig.json', JSON.stringify(tsConfig, null, 2));
    zip.file('tsconfig.node.json', JSON.stringify(tsConfigNode, null, 2));
  }
  
  /**
   * Create Vite configuration
   */
  private static createViteConfig(zip: JSZip): void {
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
`;
    
    zip.file('vite.config.ts', viteConfig);
  }
  
  /**
   * Create index.html
   */
  private static createIndexHtml(zip: JSZip, projectName: string): void {
    const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    
    zip.file('index.html', indexHtml);
  }
  
  /**
   * Create .gitignore
   */
  private static createGitignore(zip: JSZip): void {
    const gitignore = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;
    
    zip.file('.gitignore', gitignore);
  }
  
  /**
   * Create README.md
   */
  private static createReadme(zip: JSZip, projectName: string, components: CodePreview[]): void {
    const componentsList = components.map(c => `- ${c.componentName}`).join('\n');
    
    const readme = `# ${projectName}

This project was generated from Figma designs using the Figma-to-React converter.

## Components

${componentsList}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open your browser and navigate to \`http://localhost:5173\`

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run lint\` - Run ESLint

## Project Structure

\`\`\`
src/
├── components/     # Generated React components
├── types/         # TypeScript type definitions
├── App.tsx        # Main application component
├── main.tsx       # Application entry point
└── index.css      # Global styles
\`\`\`

Generated from Figma designs with ❤️
`;
    
    zip.file('README.md', readme);
  }
  
  /**
   * Create main entry file
   */
  private static createMainEntry(zip: JSZip, includeTypescript: boolean): void {
    const ext = includeTypescript ? 'tsx' : 'jsx';
    
    const mainContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.${ext}'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
    
    zip.file(`src/main.${ext}`, mainContent);
  }
  
  /**
   * Create App component that renders the generated components directly without any wrapper UI
   */
  private static createAppComponent(zip: JSZip, components: CodePreview[], includeTypescript: boolean): void {
    const ext = includeTypescript ? 'tsx' : 'jsx';
    
    const imports = components.map(c => 
      `import ${c.componentName} from './components/${c.componentName}';`
    ).join('\n');
    
    // Render components directly without any wrapper UI for exact design replication
    const componentRenders = components.length === 1 
      ? `      <${components[0].componentName} />` // Single component - render directly
      : components.map(c => 
          `      <${c.componentName} />`
        ).join('\n'); // Multiple components - render each directly
    
    const appContent = `import React from 'react';
${imports}

function App() {
  return (
    <div className="figma-design-replica">
${componentRenders}
    </div>
  );
}

export default App;
`;
    
    zip.file(`src/App.${ext}`, appContent);
  }
  
  /**
   * Create global styles
   */
  private static createGlobalStyles(zip: JSZip, cssFramework: string): void {
    let indexCss = `/* Minimal Global Styles for Figma Design Replication */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  width: 100%;
  min-height: 100vh;
}

/* Container for Figma design replica */
.figma-design-replica {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Reset default margins and padding for precise control */
h1, h2, h3, h4, h5, h6, p {
  margin: 0;
  padding: 0;
}

/* Ensure images maintain their aspect ratio */
img {
  max-width: 100%;
  height: auto;
}
`;
    
    if (cssFramework === 'tailwind') {
      indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

` + indexCss;
      
      // Create Tailwind config
      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
      zip.file('tailwind.config.js', tailwindConfig);
      
      const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
      zip.file('postcss.config.js', postcssConfig);
    }
    
    zip.file('src/index.css', indexCss);
  }
  
  /**
   * Create component files
   */
  private static createComponents(zip: JSZip, components: CodePreview[], includeTypescript: boolean): void {
    const ext = includeTypescript ? 'tsx' : 'jsx';
    
    components.forEach(component => {
      // Create component file
      zip.file(`src/components/${component.componentName}.${ext}`, component.code);
      
      // Create CSS file
      if (component.css) {
        zip.file(`src/components/${component.componentName}.css`, component.css);
      }
    });
  }
  
  /**
   * Create TypeScript types
   */
  private static createTypes(zip: JSZip): void {
    const types = `/// <reference types="vite/client" />

// Global type definitions
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Add your custom types here
`;
    
    zip.file('src/types/index.ts', types);
  }
  
  /**
   * Download the generated project
   */
  public static async downloadProject(projectName: string, components: CodePreview[]): Promise<void> {
    try {
      const projectBlob = await this.generateProject({
        projectName,
        components,
        includeTypescript: true,
        cssFramework: 'none',
      });
      
      // Create download link
      const url = URL.createObjectURL(projectBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.zip`;
      link.click();
      
      // Cleanup
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate project:', error);
      throw new Error('Failed to generate project. Please try again.');
    }
  }
}

export default ProjectGenerator;