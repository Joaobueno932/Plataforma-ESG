const config = require('./config');

/** Formato de paginação observado na API original (GET /companies, GET /users). */
function paginate(req, rows, { defaultPerPage = 5, basePath }) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const perPage = Math.max(1, parseInt(req.query.perPage, 10) || defaultPerPage);
  const numberOfPages = Math.max(1, Math.ceil(rows.length / perPage));
  const origin = `${req.protocol}://${req.get('host') || `localhost:${config.port}`}`;
  const link = (p) => `${origin}${basePath}/?page=${p}&perPage=${perPage}`;
  return {
    contentCount: rows.slice((page - 1) * perPage, page * perPage).length,
    page,
    numberOfPages,
    nextPage: page < numberOfPages ? link(page + 1) : 'no next page',
    previousPage: page > 1 ? link(page - 1) : 'no previous page',
    data: rows.slice((page - 1) * perPage, page * perPage),
  };
}

module.exports = { paginate };
