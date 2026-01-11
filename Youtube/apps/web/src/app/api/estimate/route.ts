import { NextRequest, NextResponse } from "next/server";

/**
 * Unified Cost Estimation API
 *
 * Provides accurate cost estimates based on video type, model selection,
 * and generation options. Uses the same calculation as the backend.
 */

export interface CostEstimateRequest {
  videoType: "shorts" | "medium" | "longform";
  models: {
    text: string;
    image: string;
    tts: string;
  };
  output: {
    thumbnailVariants: number;
    resolution: string;
  };
  useImageMode?: boolean; // If true, uses Imagen instead of Veo (much cheaper)
}

export interface CostEstimateResponse {
  success: boolean;
  estimate: {
    total: number;
    breakdown: {
      research: number;
      production: number;
      quality: number;
      thumbnails: number;
      voice: number;
      video: number;
    };
    mode: "image" | "veo";
    tier: "fast" | "standard";
  };
  comparison?: {
    imageModeTotal: number;
    veoFastTotal: number;
    veoStandardTotal: number;
    savings: string;
  };
}

// Cost constants (aligned with backend)
const COSTS = {
  // Research costs (LLM calls)
  research: {
    shorts: 0.15,
    medium: 0.25,
    longform: 0.50,
  },

  // Quality evaluation (Gemini 3 Pro)
  quality: {
    shorts: 1.50,
    medium: 2.00,
    longform: 3.00,
  },

  // Video duration targets
  videoDuration: {
    shorts: 60,    // 60 seconds
    medium: 300,   // 5 minutes
    longform: 900, // 15 minutes
  },

  // Veo 3.1 costs per second
  veo: {
    fast: 0.15,
    standard: 0.40,
  },

  // Image mode (Imagen) costs
  imagen: {
    perImage: 0.04,
    imagesPerMinute: 10,
  },

  // Thumbnail (Imagen)
  thumbnail: {
    perVariant: 0.04,
  },

  // Voice (TTS)
  voice: {
    perMinute: 0.02,
  },
};

function calculateEstimate(request: CostEstimateRequest): CostEstimateResponse["estimate"] {
  const { videoType, models, output, useImageMode = true } = request;

  const useFast = models.text === "gemini-3-flash";
  const duration = COSTS.videoDuration[videoType];
  const durationMinutes = duration / 60;

  // Research cost
  const research = COSTS.research[videoType];

  // Quality evaluation cost
  const quality = COSTS.quality[videoType];

  // Thumbnail cost
  const thumbnails = output.thumbnailVariants * COSTS.thumbnail.perVariant;

  // Voice cost
  const voice = durationMinutes * COSTS.voice.perMinute;

  // Video cost (Imagen vs Veo)
  let video: number;
  if (useImageMode) {
    const imageCount = Math.ceil(durationMinutes * COSTS.imagen.imagesPerMinute);
    video = imageCount * COSTS.imagen.perImage;
  } else {
    const rate = useFast ? COSTS.veo.fast : COSTS.veo.standard;
    video = duration * rate;
  }

  // Production total (video + voice)
  const production = video + voice;

  // Total
  const total = research + production + quality + thumbnails;

  return {
    total: Math.round(total * 100) / 100,
    breakdown: {
      research: Math.round(research * 100) / 100,
      production: Math.round(production * 100) / 100,
      quality: Math.round(quality * 100) / 100,
      thumbnails: Math.round(thumbnails * 100) / 100,
      voice: Math.round(voice * 100) / 100,
      video: Math.round(video * 100) / 100,
    },
    mode: useImageMode ? "image" : "veo",
    tier: useFast ? "fast" : "standard",
  };
}

function calculateComparison(
  videoType: "shorts" | "medium" | "longform",
  models: CostEstimateRequest["models"],
  output: CostEstimateRequest["output"]
): CostEstimateResponse["comparison"] {
  const imageMode = calculateEstimate({ videoType, models, output, useImageMode: true });
  const veoFast = calculateEstimate({
    videoType,
    models: { ...models, text: "gemini-3-flash" },
    output,
    useImageMode: false,
  });
  const veoStandard = calculateEstimate({
    videoType,
    models: { ...models, text: "gemini-3-pro" },
    output,
    useImageMode: false,
  });

  const savingsPercent = ((veoFast.total - imageMode.total) / veoFast.total * 100).toFixed(0);

  return {
    imageModeTotal: imageMode.total,
    veoFastTotal: veoFast.total,
    veoStandardTotal: veoStandard.total,
    savings: `${savingsPercent}% savings vs Veo Fast`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CostEstimateRequest = await request.json();

    // Validate required fields
    if (!body.videoType || !body.models || !body.output) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: videoType, models, output",
        },
        { status: 400 }
      );
    }

    // Calculate estimate
    const estimate = calculateEstimate(body);

    // Calculate comparison (shows all modes)
    const comparison = calculateComparison(body.videoType, body.models, body.output);

    const response: CostEstimateResponse = {
      success: true,
      estimate,
      comparison,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Cost estimate error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate estimate",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for quick estimates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoType = (searchParams.get("type") as "shorts" | "medium" | "longform") || "medium";
  const useFast = searchParams.get("fast") !== "false";
  const thumbnails = parseInt(searchParams.get("thumbnails") || "3", 10);
  const useImageMode = searchParams.get("imageMode") !== "false";

  const estimate = calculateEstimate({
    videoType,
    models: {
      text: useFast ? "gemini-3-flash" : "gemini-3-pro",
      image: "gemini-3-pro-image",
      tts: "gemini-2.5-flash-tts",
    },
    output: {
      thumbnailVariants: thumbnails,
      resolution: "1080p",
    },
    useImageMode,
  });

  return NextResponse.json({
    success: true,
    estimate,
  });
}
