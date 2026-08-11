export const externalPlatforms = ["x", "instagram", "facebook"] as const;

export type ExternalPlatform = (typeof externalPlatforms)[number];

export type ExternalPostReference = {
  platform: ExternalPlatform;
  url: string;
  postId: string | null;
};

const MAX_EXTERNAL_URL_LENGTH = 2048;
const MAX_EXTERNAL_POST_ID_LENGTH = 200;

function isSafeExternalId(value: string | null): value is string {
  return Boolean(
    value
    && value.length <= MAX_EXTERNAL_POST_ID_LENGTH
    && /^[A-Za-z0-9_-]+$/.test(value),
  );
}

function cleanPathname(pathname: string) {
  const compact = pathname.replace(/\/{2,}/g, "/");
  return compact === "/" ? compact : compact.replace(/\/+$/, "");
}

function parseXUrl(url: URL): ExternalPostReference | null {
  const host = url.hostname.toLowerCase();
  if (![
    "x.com",
    "www.x.com",
    "m.x.com",
    "mobile.x.com",
    "twitter.com",
    "www.twitter.com",
    "m.twitter.com",
    "mobile.twitter.com",
  ].includes(host)) {
    return null;
  }

  const pathname = cleanPathname(url.pathname);
  const userMatch = pathname.match(/^\/([A-Za-z0-9_]{1,50})\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?$/);
  const webMatch = pathname.match(/^\/i\/web\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?$/);
  const postId = userMatch?.[2] ?? webMatch?.[1];

  if (!postId || postId.length > MAX_EXTERNAL_POST_ID_LENGTH) return null;

  const canonicalPath = userMatch
    ? `/${userMatch[1]}/status/${postId}`
    : `/i/web/status/${postId}`;

  return {
    platform: "x",
    url: `https://x.com${canonicalPath}`,
    postId,
  };
}

function parseInstagramUrl(url: URL): ExternalPostReference | null {
  const host = url.hostname.toLowerCase();
  if (!["instagram.com", "www.instagram.com", "m.instagram.com"].includes(host)) {
    return null;
  }

  const pathname = cleanPathname(url.pathname);
  const match = pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]{1,200})$/);

  if (!match) return null;

  return {
    platform: "instagram",
    url: `https://www.instagram.com/${match[1]}/${match[2]}/`,
    postId: match[2],
  };
}

function parseFacebookUrl(url: URL): ExternalPostReference | null {
  const host = url.hostname.toLowerCase();
  const pathname = cleanPathname(url.pathname);

  if (["fb.watch", "www.fb.watch"].includes(host)) {
    const match = pathname.match(/^\/([A-Za-z0-9_-]{1,200})$/);
    if (!match) return null;
    return {
      platform: "facebook",
      url: `https://fb.watch/${match[1]}/`,
      postId: match[1],
    };
  }

  if (!["facebook.com", "www.facebook.com", "m.facebook.com", "mobile.facebook.com"].includes(host)) {
    return null;
  }

  const pathPostId =
    pathname.match(/^\/[A-Za-z0-9._-]{1,100}\/(?:posts|videos)\/([A-Za-z0-9_-]{1,200})$/)?.[1]
    ?? pathname.match(/^\/(?:reel|share\/(?:p|r|v))\/([A-Za-z0-9_-]{1,200})$/)?.[1];

  const queryPostIdCandidate = ["/story.php", "/permalink.php"].includes(pathname)
    ? url.searchParams.get("story_fbid")
    : pathname === "/photo.php"
      ? url.searchParams.get("fbid")
      : pathname === "/watch"
        ? url.searchParams.get("v")
        : null;
  const queryPostId = isSafeExternalId(queryPostIdCandidate)
    ? queryPostIdCandidate
    : null;

  if (!pathPostId && !queryPostId) return null;

  const canonical = new URL(`https://www.facebook.com${pathname}`);
  const canonicalQueryKeys = ["/story.php", "/permalink.php"].includes(pathname)
    ? ["story_fbid", "id"]
    : pathname === "/photo.php"
      ? ["fbid", "id"]
      : pathname === "/watch"
        ? ["v"]
        : [];
  for (const key of canonicalQueryKeys) {
    const value = url.searchParams.get(key);
    if (isSafeExternalId(value)) canonical.searchParams.set(key, value);
  }

  return {
    platform: "facebook",
    url: canonical.toString(),
    postId: pathPostId ?? queryPostId,
  };
}

export function parseExternalPostUrl(value: string): ExternalPostReference | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_EXTERNAL_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
  ) {
    return null;
  }

  url.hash = "";

  return parseXUrl(url) ?? parseInstagramUrl(url) ?? parseFacebookUrl(url);
}

export function externalPlatformLabel(platform: ExternalPlatform) {
  if (platform === "x") return "X";
  if (platform === "instagram") return "Instagram";
  return "Facebook";
}
