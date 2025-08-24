import type {
  FigmaCredentials,
  FigmaApiResponse,
  FigmaFileData,
  ApiError,
  FigmaImagesResponse,
  FigmaImageFillsResponse,
  FigmaNode
} from "../types/figma";
import { MetadataParser } from '../utils/metadataParser';
// import { VisualValidator } from '../utils/visualValidator'; // Unused for now
import type { ParsedNodeMetadata } from '../utils/metadataParser';

const FIGMA_API_BASE_URL = "https://api.figma.com";

export interface EnhancedFigmaData {
  fileData: FigmaFileData;
  metadata: ParsedNodeMetadata[];
  images: Record<string, string>;
  imageFills: Record<string, string>;
  designTokens?: {
    colors: string[];
    typography: string[];
    spacing: string[];
    effects: string[];
  };
}

export interface FigmaExtractionOptions {
  includeImages?: boolean;
  includeImageFills?: boolean;
  includeDesignTokens?: boolean;
  extractComponents?: boolean;
  extractVariants?: boolean;
  maxDepth?: number;
}

export class FigmaApiService {
  private static createApiError(message: string, status?: number): ApiError {
    let type: ApiError["type"] = "UNKNOWN";

    if (status === 401 || status === 403) {
      type = "AUTHENTICATION";
    } else if (status === 404) {
      type = "NOT_FOUND";
    } else if (status === 429) {
      type = "RATE_LIMIT";
    } else if (!status || status >= 500) {
      type = "NETWORK";
    }

    return { message, status, type };
  }

  private static async makeRequest(
    url: string,
    accessToken: string
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Figma-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      return response;
    } catch (error) {
      console.log(error);
      throw this.createApiError(
        "Network error: Unable to connect to Figma API. Please check your internet connection.",
        0
      );
    }
  }

  private static async handleResponse<T = FigmaApiResponse>(
    response: Response
  ): Promise<T> {
    if (!response.ok) {
      let errorMessage =
        "An error occurred while fetching data from Figma API.";

      switch (response.status) {
        case 401:
          errorMessage =
            "Invalid access token. Please check your personal access token.";
          break;
        case 403:
          errorMessage =
            "Access denied. You may not have permission to access this file.";
          break;
        case 404:
          errorMessage =
            "File not found. Please check the file ID and ensure the file exists.";
          break;
        case 429:
          errorMessage =
            "Rate limit exceeded. Please wait a moment before trying again.";
          break;
        case 500:
        case 502:
        case 503:
          errorMessage =
            "Figma API is currently unavailable. Please try again later.";
          break;
        default:
          errorMessage = `API error (${response.status}): ${response.statusText}`;
      }

      throw this.createApiError(errorMessage, response.status);
    }

    try {
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.log(error);
      throw this.createApiError(
        "Invalid response from Figma API. The response could not be parsed.",
        response.status
      );
    }
  }

  public static async getFileMetadata(
    credentials: FigmaCredentials
  ): Promise<FigmaFileData> {
    const { fileId, accessToken } = credentials;

    // Validate inputs
    if (!fileId || !accessToken) {
      throw this.createApiError("File ID and access token are required.");
    }

    const url = `${FIGMA_API_BASE_URL}/v1/files/${fileId}`;

    const response = await this.makeRequest(url, accessToken);
    const apiResponse = await this.handleResponse(response);

    // Transform API response to our internal format
    const fileData: FigmaFileData = {
      name: apiResponse.name,
      lastModified: apiResponse.lastModified,
      document: apiResponse.document as FigmaNode,
    };

    return fileData;
  }

  public static async getNodeImages(
    credentials: FigmaCredentials,
    nodeIds: string[],
    format: "png" | "jpg" | "svg" | "pdf" = "png",
    scale: number = 1
  ): Promise<Record<string, string | null>> {
    const { fileId, accessToken } = credentials;

    if (!fileId || !accessToken || !nodeIds.length) {
      throw this.createApiError(
        "File ID, access token, and node IDs are required."
      );
    }

    if (scale < 0.01 || scale > 4) {
      throw this.createApiError("Scale must be between 0.01 and 4.");
    }

    const params = new URLSearchParams({
      ids: nodeIds.join(","),
      format,
      scale: scale.toString(),
    });

    const url = `${FIGMA_API_BASE_URL}/v1/images/${fileId}?${params}`;

    const response = await this.makeRequest(url, accessToken);
    const data = await this.handleResponse<FigmaImagesResponse>(response);

    // Handle API errors in the response
    if (data.err) {
      throw this.createApiError(`Image rendering failed: ${data.err}`, (data as any).status);
    }

    return data.images || {};
  }

  public static async getImageFills(
    credentials: FigmaCredentials
  ): Promise<Record<string, string>> {
    const { fileId, accessToken } = credentials;

    if (!fileId || !accessToken) {
      throw this.createApiError("File ID and access token are required.");
    }

    const url = `${FIGMA_API_BASE_URL}/v1/files/${fileId}/images`;
    console.log('Making image fills request to:', url);

    const response = await this.makeRequest(url, accessToken);
    const data = await this.handleResponse<FigmaImageFillsResponse>(response);

    // Log the response for debugging
    console.log('Image fills API response:', {
      status: response.status,
      data,
      imageCount: (data as any).images ? Object.keys((data as any).images).length : 0,
      sampleImages: (data as any).images ? Object.entries((data as any).images).slice(0, 2) : []
    });

    const images = (data as any).images || {};
    
    // Validate image URLs
    for (const [fillId, imageUrl] of Object.entries(images)) {
      const url = imageUrl as string;
      console.log(`Image fill ${fillId}:`, {
        url: url,
        isValidUrl: url.startsWith('https://'),
        containsFigma: url.includes('figma')
      });
    }
    
    return images;
  }

  /**
   * Enhanced method to get comprehensive design data with visual fidelity
   */
  public static async getEnhancedDesignData(
    credentials: FigmaCredentials,
    options: FigmaExtractionOptions = {}
  ): Promise<EnhancedFigmaData> {
    const {
      includeImages = true,
      includeImageFills = true,
      includeDesignTokens = true,
      extractComponents: _extractComponents = true,
      maxDepth = 10
    } = options;

    // Get basic file metadata
    const fileData = await this.getFileMetadata(credentials);
    
    // Extract comprehensive metadata with enhanced processing
    const metadata = this.extractEnhancedMetadata(fileData.document, maxDepth);
    
    // Get images if requested
    let images: Record<string, string> = {};
    if (includeImages) {
      const nodeIds = this.extractNodeIds(fileData.document);
      if (nodeIds.length > 0) {
        try {
          const imageResponse = await this.getNodeImages(credentials, nodeIds.slice(0, 50), 'png', 2);
          // Filter out null values
          images = Object.fromEntries(
            Object.entries(imageResponse).filter(([_, url]) => url !== null)
          ) as Record<string, string>;
        } catch (error) {
          console.warn('Failed to fetch node images:', error);
        }
      }
    }

    // Get image fills if requested
    let imageFills: Record<string, string> = {};
    if (includeImageFills) {
      try {
        imageFills = await this.getImageFills(credentials);
      } catch (error) {
        console.warn('Failed to fetch image fills:', error);
      }
    }

    // Generate design tokens if requested
    let designTokens: EnhancedFigmaData['designTokens'];
    if (includeDesignTokens) {
      designTokens = this.generateDesignTokens(metadata);
    }

    return {
      fileData,
      metadata,
      images,
      imageFills,
      designTokens
    };
  }

  /**
   * Extract enhanced metadata from Figma nodes
   */
  private static extractEnhancedMetadata(
    rootNode: FigmaNode, 
    maxDepth: number = 10
  ): ParsedNodeMetadata[] {
    const metadata: ParsedNodeMetadata[] = [];
    
    const processNode = (node: FigmaNode, depth: number = 0, parent?: FigmaNode) => {
      if (depth > maxDepth) return;
      
      // Parse node with enhanced capabilities
      const parsedNode = MetadataParser.parseNode(node, depth, parent);
      metadata.push(parsedNode);
      
      // Process children recursively
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          if (child.visible !== false) {
            processNode(child, depth + 1, node);
          }
        });
      }
    };
    
    processNode(rootNode);
    return metadata;
  }

  /**
   * Extract all node IDs from document tree
   */
  private static extractNodeIds(rootNode: FigmaNode): string[] {
    const nodeIds: string[] = [];
    
    const processNode = (node: FigmaNode) => {
      // Only include visual nodes that can be rendered
      const visualNodeTypes = [
        'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 
        'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR', 'TEXT'
      ];
      
      if (visualNodeTypes.includes(node.type) && node.visible !== false) {
        nodeIds.push(node.id);
      }
      
      if (node.children) {
        node.children.forEach(child => processNode(child));
      }
    };
    
    processNode(rootNode);
    return nodeIds;
  }

  /**
   * Generate comprehensive design tokens from metadata
   */
  private static generateDesignTokens(metadata: ParsedNodeMetadata[]): EnhancedFigmaData['designTokens'] {
    const colorSet = new Set<string>();
    const typographySet = new Set<string>();
    const spacingSet = new Set<string>();
    const effectSet = new Set<string>();
    
    metadata.forEach(node => {
      // Collect color tokens
      if (node.designTokens?.colors) {
        node.designTokens.colors.forEach(color => colorSet.add(color));
      }
      
      // Collect typography tokens
      if (node.designTokens?.typography) {
        node.designTokens.typography.forEach(typo => typographySet.add(typo));
      }
      
      // Collect spacing tokens
      if (node.designTokens?.spacing) {
        node.designTokens.spacing.forEach(space => spacingSet.add(space));
      }
      
      // Collect effect tokens
      if (node.visualStyle?.shadows) {
        node.visualStyle.shadows.forEach(shadow => {
          effectSet.add(`--shadow-${node.name.toLowerCase().replace(/\s+/g, '-')}: ${shadow};`);
        });
      }
    });
    
    return {
      colors: Array.from(colorSet),
      typography: Array.from(typographySet),
      spacing: Array.from(spacingSet),
      effects: Array.from(effectSet)
    };
  }

  /**
   * Get component variants and properties
   */
  public static async getComponentVariants(
    credentials: FigmaCredentials,
    componentId: string
  ): Promise<any> {
    const { fileId, accessToken } = credentials;
    
    if (!fileId || !accessToken || !componentId) {
      throw this.createApiError('File ID, access token, and component ID are required.');
    }
    
    const url = `${FIGMA_API_BASE_URL}/v1/files/${fileId}/components/${componentId}`;
    
    const response = await this.makeRequest(url, accessToken);
    const data = await this.handleResponse(response);
    
    return data;
  }

  /**
   * Get file components with enhanced metadata
   */
  public static async getFileComponents(
    credentials: FigmaCredentials
  ): Promise<any> {
    const { fileId, accessToken } = credentials;
    
    if (!fileId || !accessToken) {
      throw this.createApiError('File ID and access token are required.');
    }
    
    const url = `${FIGMA_API_BASE_URL}/v1/files/${fileId}/components`;
    
    const response = await this.makeRequest(url, accessToken);
    const data = await this.handleResponse(response);
    
    return data;
  }

  /**
   * Get team library components
   */
  public static async getTeamComponents(
    credentials: FigmaCredentials,
    teamId: string
  ): Promise<any> {
    const { accessToken } = credentials;
    
    if (!accessToken || !teamId) {
      throw this.createApiError('Access token and team ID are required.');
    }
    
    const url = `${FIGMA_API_BASE_URL}/v1/teams/${teamId}/components`;
    
    const response = await this.makeRequest(url, accessToken);
    const data = await this.handleResponse(response);
    
    return data;
  }
}

// Convenience functions for the main use cases
export const getFigmaFileMetadata = (
  credentials: FigmaCredentials
): Promise<FigmaFileData> => {
  return FigmaApiService.getFileMetadata(credentials);
};

export const getFigmaNodeImages = (
  credentials: FigmaCredentials,
  nodeIds: string[],
  format: "png" | "jpg" | "svg" | "pdf" = "png",
  scale: number = 1
): Promise<Record<string, string | null>> => {
  return FigmaApiService.getNodeImages(credentials, nodeIds, format, scale);
};

export const getFigmaImageFills = (
  credentials: FigmaCredentials
): Promise<Record<string, string>> => {
  return FigmaApiService.getImageFills(credentials);
};

export default FigmaApiService;
