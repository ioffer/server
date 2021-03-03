const {gql} = require('apollo-server-express');


const imageTypeDefs = gql`
    type File {
        filename: String!
        mimetype: String!
        encoding: String!
    }

`;



module.exports = imageTypeDefs;