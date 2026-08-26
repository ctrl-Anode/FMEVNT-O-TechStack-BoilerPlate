export function parsePagination(query, { defaultLimit = 20, maxLimit = 100, sortable = ['createdAt'] } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  let limit = Number.parseInt(query.limit, 10) || defaultLimit;
  if (limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const sortParam = typeof query.sort === 'string' ? query.sort : '';
  const field = sortParam.replace(/^-/, '');
  const dir = sortParam.startsWith('-') ? 'desc' : 'asc';

  const orderBy = sortable.includes(field)
    ? { [field]: dir }
    : { [sortable[0]]: 'desc' };

  return { page, limit, offset: (page - 1) * limit, orderBy };
}
