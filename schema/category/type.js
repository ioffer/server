const {gql} = require('apollo-server-express');


const categoryTypeDefs = gql`

    type Category {
        id: ID,
        title: String,
        level:Float,
        subCategories: [Category],
        parentCategory: Category,
        createdAt: String,
        updatedAt: String,
    }
`;


module.exports = categoryTypeDefs;
