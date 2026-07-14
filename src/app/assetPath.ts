export function getPublicAssetPath(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  const baseUrl = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

  return `${baseUrl}${cleanPath}`;
}
