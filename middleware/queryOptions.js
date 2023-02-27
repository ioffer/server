const getOptionsArguments = (options) => {
    let where = {}, sort = {}, page = 1, limit = 20, published = false;
    if (options) {
        where = options.where
        sort = options.sort
        published = options.published
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
        where = JSON.stringify({})
    } else {
        try {
            JSON.parse(where)
        } catch (e) {
            where = JSON.stringify({})
        }
    }
    if (sort === null || sort === undefined) {
        sort = JSON.stringify({})
    } else {
        try {
            JSON.parse(sort)
        } catch (e) {
            sort = JSON.stringify({})
        }
    }
    if (published === null || published === undefined) {
        published = false
    }
    return {
        paginationOptions: {
            page,
            limit
        },
        sort,
        where,
        published
    }
}
const QueryOptionsMiddleware = async (req, res, next) => {
    // console.log('req:', req)
    let {variables, userName} = req.body
    console.log('variables:🌱', variables, userName)
    if (!variables||!variables.options) {
        if(!variables){
            variables = {
                "options": {}
            }
        }else{
            variables = {
                ...variables,
                "options": {}
            }
        }
        console.log('❌: setting Variables')

    }
    let {options} = variables;
    options = getOptionsArguments(options)
    variables.options = options
    req.body.variables = variables
    console.log("QueryOptionsVariablesMiddleware:", variables);
    return next();
}

export default QueryOptionsMiddleware;