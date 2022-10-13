const {gql} = require('apollo-server-express');


const userSubscriptionTypeDefs = gql`

    type UserSubscription {
        id: ID!,
        user: User!,
        shops:[Shop],
        brands:[Shop],
        createdAt: String,
        updatedAt: String,
    }
    
`;


module.exports = userSubscriptionTypeDefs;
