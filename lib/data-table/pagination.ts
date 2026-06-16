export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function parsePaginationSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): PaginationParams {
  const rawPage = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;
  const rawPageSize = Array.isArray(searchParams.pageSize)
    ? searchParams.pageSize[0]
    : searchParams.pageSize;

  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);

  const parsedPageSize = Number.parseInt(
    rawPageSize ?? String(DEFAULT_PAGE_SIZE),
    10,
  );
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    parsedPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? parsedPageSize
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

export function getPaginationOffset({ page, pageSize }: PaginationParams) {
  return (page - 1) * pageSize;
}

export function buildPaginatedResult<T>(
  rows: T[],
  totalCount: number,
  { page, pageSize }: PaginationParams,
): PaginatedResult<T> {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const normalizedPage = Math.min(page, pageCount);

  return {
    rows,
    totalCount,
    page: normalizedPage,
    pageSize,
    pageCount,
  };
}

export function buildPaginationHref(
  pathname: string,
  searchParams: URLSearchParams,
  updates: Partial<PaginationParams>,
) {
  const params = new URLSearchParams(searchParams.toString());

  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(updates.page));
    }
  }

  if (updates.pageSize !== undefined) {
    if (updates.pageSize === DEFAULT_PAGE_SIZE) {
      params.delete("pageSize");
    } else {
      params.set("pageSize", String(updates.pageSize));
    }
    params.delete("page");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
