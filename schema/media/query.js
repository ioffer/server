const {gql} = require('apollo-server-express');

const mediaQuery = gql`
    scalar Upload

    extend type Query {
        greeting:String!,
    },

    extend type Mutation {
        singleUpload(file: Upload!, type:MediaTypes): Media,
        multipleUpload(files: [Upload]!, type:MediaTypes): Media
    }

`;


module.exports = mediaQuery;
