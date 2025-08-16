# Figma Metadata Viewer

A modern web application for extracting and viewing metadata from Figma files. Built with React, TypeScript, and Vite, this tool provides an intuitive interface to explore Figma file structures, node properties, and image assets.

## Features

- **File Metadata Extraction**: View comprehensive metadata from any Figma file
- **Interactive Node Explorer**: Browse through the file's node hierarchy with detailed information
- **Image Asset Viewer**: Preview and analyze image fills used in your designs
- **Real-time Data**: Fetch live data directly from the Figma API
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Error Handling**: Robust error handling with helpful user feedback
- **Copy to Clipboard**: Easy copying of node data and metadata

## Screenshots

![Figma Metadata Viewer Interface](public/figma-viewer-icon.svg)

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm, yarn, pnpm, or bun
- A Figma account with API access

### Installation

1. Clone the repository:

```bash
git clone https://github.com/darkxdd/figma-metadata-viewer.git
cd figma-metadata-viewer
```

2. Navigate to the project directory:

```bash
cd figmareact
```

3. Install dependencies:

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install

# Using bun
bun install
```

### Running the Application

#### Development Mode

Start the development server with hot module replacement:

```bash
# Using npm
npm run dev

# Using yarn
yarn dev

# Using pnpm
pnpm dev

# Using bun
bun dev
```

The application will be available at `http://localhost:5173`

#### Production Build

Build the application for production:

```bash
# Using npm
npm run build

# Using yarn
yarn build

# Using pnpm
pnpm build

# Using bun
bun build
```

#### Preview Production Build

Preview the production build locally:

```bash
# Using npm
npm run preview

# Using yarn
yarn preview

# Using pnpm
pnpm preview

# Using bun
bun preview
```

## Usage

### Getting Your Figma API Token

1. Go to your [Figma account settings](https://www.figma.com/settings)
2. Scroll down to "Personal access tokens"
3. Click "Create a new personal access token"
4. Give it a name and click "Create token"
5. Copy the token (you won't be able to see it again)

### Getting a Figma File ID

The File ID can be found in any Figma file URL:

```
https://www.figma.com/file/[FILE_ID]/[FILE_NAME]
```

### Using the Application

1. Open the application in your browser
2. Enter your Figma Personal Access Token
3. Enter the Figma File ID you want to analyze
4. Click "Load Metadata" to fetch the file data
5. Explore the file structure and click on nodes to view detailed information
6. View image fills and assets in the detail panel

## API Integration

This application uses the [Figma REST API](https://www.figma.com/developers/api) to fetch:

- File metadata and document structure
- Node properties and styling information
- Image fills and asset URLs
- File modification timestamps

## Development

### Project Structure

```
figmareact/
├── src/
│   ├── components/          # React components
│   ├── services/           # API services
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── App.tsx             # Main application component
├── public/                 # Static assets
└── dist/                   # Production build output
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **CSS3** - Styling with modern CSS features
- **Figma API** - Data source for file metadata

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/) for fast development
- Uses the [Figma API](https://www.figma.com/developers/api) for data access
- Inspired by the need for better Figma file analysis tools

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/darkxdd/figma-metadata-viewer/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide as much detail as possible, including error messages and steps to reproduce

---

**Note**: This tool requires a Figma Personal Access Token and only works with files you have access to. Keep your access token secure and never commit it to version control.
