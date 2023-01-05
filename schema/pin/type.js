const {gql} = require('apollo-server-express');


const pinTypeDefs = gql`

    type Pin {
        id: ID!,
        user: User!,
        shops:[Shop],
        brands:[Shop],
        promotions:[Promotion],
#        offers:[Offer],
        createdAt: String,
        updatedAt: String,
    }
    
`;


module.exports = pinTypeDefs;
