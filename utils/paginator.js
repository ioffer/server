import mongoose from 'mongoose';

export const getPaginations = async (Model, page = 1, limit = 20, where = {},sort= {}) => {

    let first = 1;
    let totalRecords = await mongoose.model(Model).count(where).sort(sort);
    let total = totalRecords / limit;
    if (parseInt(total) < total) {
        total = parseInt(total) + 1;
    }
    let previous = page > total ? total : page < 1 ? 1 : page - 1;
    let next = page > total ? total : page < 1 ? 1 : page + 1;
    let fromRecord = 1 + (limit * (page - 1));
    let toRecord = page === total ? totalRecords % limit : fromRecord + limit - 1;
    let offset = (page - 1) * limit
    let pagination = {
        currentPage: page,
        previousPage:previous,
        nextPage:next,
        firstPage:first,
        lastPage: total,
        limit: limit,
        offset,
        totalPages:total,
        totalRecords,
        fromRecord,
        toRecord,
    }
    return pagination
}