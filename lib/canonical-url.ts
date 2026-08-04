export const CONCLAVE_CANONICAL_ORIGIN = "https://conclave.drunstan.com";

export function canonicalConclaveUrl({
  host,
  pathname,
  search,
  isProduction
}: {
  host: string;
  pathname: string;
  search: string;
  isProduction: boolean;
}) {
  if (!isProduction) return null;
  const canonical = new URL(CONCLAVE_CANONICAL_ORIGIN);
  if (host.toLowerCase() === canonical.host) return null;
  return new URL(`${pathname}${search}`, canonical);
}
