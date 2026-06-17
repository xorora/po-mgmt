export type BlobAuthOptions = {
  token?: string;
  storeId?: string;
  oidcToken?: string;
};

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Shared Blob credentials for put/get/del/issueSignedToken. Prefers OIDC when configured. */
export function getBlobAuthOptions(): BlobAuthOptions | null {
  const storeId = trimEnv("BLOB_STORE_ID");
  const oidcToken = trimEnv("VERCEL_OIDC_TOKEN");

  if (storeId && oidcToken) {
    return { storeId, oidcToken };
  }

  if (storeId && process.env.VERCEL === "1") {
    // On Vercel the SDK can read x-vercel-oidc-token from request context.
    return { storeId };
  }

  const readWrite = trimEnv("BLOB_READ_WRITE_TOKEN");
  if (readWrite) {
    return { token: readWrite };
  }

  return null;
}

export function isBlobStorageConfigured(): boolean {
  return getBlobAuthOptions() !== null;
}

export function pathnameFromBlobUrl(blobUrl: string): string {
  return decodeURIComponent(new URL(blobUrl).pathname).replace(/^\//, "");
}
