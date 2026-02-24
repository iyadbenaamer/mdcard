const parsePagination = (pageValue, limitValue) => {
  let page = parseInt(pageValue, 10);
  let limit = parseInt(limitValue, 10);

  page = Number.isNaN(page) || page < 1 ? 1 : page;
  limit = Number.isNaN(limit) || limit < 1 ? 10 : limit;
  limit = limit > 100 ? 100 : limit;

  return { page, limit };
};

export default parsePagination;
