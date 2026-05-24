const {gql} = require('apollo-server-express');

// todo add auth
const imageQuery = gql`
    extend type Query {
        uploads: [String]
    }

    extend type Mutation {
        imageUploader(file: Upload!): String! @isAuth
    }
`;
module.exports = imageQuery;