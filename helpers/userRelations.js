export const arrayRemove = async (arr, value) => {
    return arr.filter(function (ele) {
        return ele != value;
    });
}

export const getBrandUserRelation = async (userId, brands = null) => {
    if (brands) {
        if (Array.isArray(brands)) {
            for (const brand of brands) {
                const i = brands.indexOf(brand);
                let relation = await brand.getRelation(userId)
                brands[i]._doc.user = relation;
                brands[i].user = relation;
            }
        } else {
            let relation = await brands.getRelation(userId)
            brands._doc.user = relation;
            brands.user = relation;
        }
    }
}
export const getShopUserRelation = async (userId, shops = null) => {
    if (shops) {
        console.log("userId:", userId)
        if (Array.isArray(shops)) {
            for (const shop of shops) {
                const i = shops.indexOf(shop);
                let relation = await shop.getRelation(userId)
                shops[i]._doc.user = relation;
                shops[i].user = relation;
            }
        } else {
            let relation = await shops.getRelation(userId)
            shops._doc.user = relation;
            shops.user = relation;
        }
    }
}

export const getPromotionUserRelation = async (userId, promotions = null) => {
    console.log("userId: 👨🏻 ‍🎨", userId)
    if (promotions) {
        console.log("userId:", userId)
        if (Array.isArray(promotions)) {
            for (const promotion of promotions) {
                const i = promotions.indexOf(promotion);
                let relation = await promotion.getRelation(userId)
                promotions[i]._doc.user = relation;
                promotions[i].user = relation;
            }
        } else {
            console.log("userId:", userId)
            let relation = await promotions.getRelation(userId)
            console.log("relation:", relation)
            promotions._doc.user = relation;
            promotions.user = relation;
        }
    }
}

export const getOptionsArguments = (options) => {
    let where = {}, sort = {}, page = 1, limit = 20;
    if (options) {
        where = options.where
        sort = options.sort
        console.log("options:", options)
        if (options.paginationOptions) {
            page = options.paginationOptions.page
            limit = options.paginationOptions.limit
        }
    }

    if (page === null || page === undefined) {
        page = 1
    }
    if (limit === null || limit === undefined) {
        limit = 20
    }
    if (where === null || where === undefined) {
        where = {}
    } else {
        try {
            where = JSON.parse(where)
        }catch (e) {
            where = {}
        }
    }
    if (sort === null || sort === undefined) {
        sort = {}
    } else {
        try {
            sort = JSON.parse(sort)
        }catch (e) {
            sort = {}
        }
    }
    return {
        page,
        limit,
        sort,
        where
    }
}

export const getPropValues = (o, prop) =>
    (res => (JSON.stringify(o, (key, value) =>
        (key === prop && res.push(value), value)), res))([]);