  const {gql} = require('apollo-server-express');

const categoryQuery = gql`
    extend type Query {
        categories:[Category],
        categoryById(id:ID!):Category,
        mainCategories:[Category],
        subCategories(id:ID!):[Category],
    },
    
`;



module.exports = categoryQuery;
