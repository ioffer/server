const {gql} = require('apollo-server-express');


const favoriteTypeDefs = gql`

    type Favorite {
        id: ID!,
        user: User,
        shops:[Shop],
        brands:[Shop],
        createdAt: String,
        updatedAt: String,
        #        offers: [Offer]
    }
    
`;


module.exports = favoriteTypeDefs;
