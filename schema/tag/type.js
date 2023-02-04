const {gql} = require('apollo-server-express');


const tagTypeDefs = gql`

    type Tag {
        id: ID,
        title: String,
        shops:[Shop],
        brands:[Brand],
        promotions:[Promotion],
        createdAt: String,
        updatedAt: String,
    }
`;


module.exports = tagTypeDefs;
