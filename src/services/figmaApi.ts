import type {
  FigmaCredentials,
  FigmaApiResponse,
  FigmaFileData,
  ApiError,
  FigmaImagesResponse,
  FigmaImageFillsResponse,
} from "../types/figma";

const FIGMA_API_BASE_URL = "https://api.figma.com";

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
      document: apiResponse.document,
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
      throw this.createApiError(`Image rendering failed: ${data.err}`, data.status);
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
      imageCount: data.images ? Object.keys(data.images).length : 0,
      sampleImages: data.images ? Object.entries(data.images).slice(0, 2) : []
    });

    const images = data.images || {};
    
    // Validate image URLs
    for (const [fillId, imageUrl] of Object.entries(images)) {
      console.log(`Image fill ${fillId}:`, {
        url: imageUrl,
        isValidUrl: imageUrl.startsWith('https://'),
        containsFigma: imageUrl.includes('figma')
      });
    }

    return images;
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
