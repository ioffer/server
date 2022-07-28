import mongoose from 'mongoose';

export const getPaginations = async(Model, page, limit) => {
    let first = 1;
    let totalRecords = await Model.count({});
    let total = totalRecords/limit;
    if(parseInt(total)<total){
        total = parseInt(total)+1;
    }
    let previous = page>total?total:page<1?1:page-1;
    let next = page>total?total:page<1?1:page+1;
    let fromRecord = 1 + (limit*(page-1));
    let toRecord = page===total?total:fromRecord+limit-1;
    let pagination = {
        current:page,
        previous,
        next,
        first,
        last:total,
        limit:limit,
        total,
        totalRecords,
        fromRecord,
        toRecord,
    }
    return pagination
}