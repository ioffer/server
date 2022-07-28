  const {gql} = require('apollo-server-express');

const tagQuery = gql`
    extend type Query {
        tags:[Tag],
        tagById(id:ID!):Tag,
        tagByTitle(title:String!):Tag,
    },
    extend type Mutation {
        createTag(title: String!):Tag @isAuth,
    }
    
`;


module.exports = tagQuery;
