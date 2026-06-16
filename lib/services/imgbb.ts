export type ImgbbUploadResult = {
  url: string;
  deleteUrl?: string;
};

export type ImgbbUploadError = {
  error: string;
};

type ImgbbApiResponse = {
  data?: {
    url: string;
    delete_url?: string;
  };
  error?: {
    message?: string;
  };
  status?: number;
};

export function getImgbbApiKey(): string | undefined {
  return process.env.IMGBB_API_KEY?.trim() || undefined;
}

export async function uploadImageToImgbb(
  imageBuffer: Buffer,
  name?: string,
): Promise<ImgbbUploadResult | ImgbbUploadError> {
  const apiKey = getImgbbApiKey();
  if (!apiKey) {
    return { error: "IMGBB_API_KEY is not configured" };
  }

  const body = new URLSearchParams();
  body.set("image", imageBuffer.toString("base64"));
  if (name) {
    body.set("name", name);
  }

  try {
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
    );

    const payload = (await response.json()) as ImgbbApiResponse;

    if (!response.ok || !payload.data?.url) {
      return {
        error:
          payload.error?.message ??
          `imgbb upload failed with status ${response.status}`,
      };
    }

    return {
      url: payload.data.url,
      deleteUrl: payload.data.delete_url,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
