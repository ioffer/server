const {gql} = require('apollo-server-express');

const mediaQuery = gql`
    scalar Upload

    extend type Query {
        greeting:String!,
    },

    extend type Mutation {
        singleUpload(file: Upload!): Media,
        multipleUpload(files: [Upload]!): Media
    }

`;


module.exports = mediaQuery;
