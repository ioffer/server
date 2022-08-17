const {gql} = require('apollo-server-express');

const mediaQuery = gql`
    scalar Upload

    extend type Query {
        greeting:String!,
    },

    extend type Mutation {
        singleUpload(file: Upload!, mediaType:MediaTypes): Media,
        multipleUpload(files: [Upload]!, mediaType:MediaTypes): Media
    }

`;


module.exports = mediaQuery;
