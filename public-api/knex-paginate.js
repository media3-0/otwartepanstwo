module.exports = (knex, query, options = {}) =>
  new Promise(resolve => {
    const perPage = options.perPage || 10;
    const page = Math.max(options.page || 1, 1);
    const offset = (page - 1) * perPage;

    const countQuery = knex.count("* as total").from(query.clone().as("inner"));

    query.offset(offset);

    if (perPage > 0) {
      query.limit(perPage);
    }

    Promise.all([query, countQuery]).then(([data, countRows]) => {
      const total = parseInt(countRows[0].total);

      resolve({
        pagination: {
          total: total,
          perPage,
          currentPage: page,
          lastPage: Math.ceil(total / perPage),
          from: offset,
          to: offset + data.length
        },
        data
      });
    });
  });
