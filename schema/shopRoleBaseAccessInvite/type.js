const {gql} = require('apollo-server-express');


const shopRoleBaseAccessInviteTypeDefs = gql`

    type ShopRoleBaseAccessInvite {
        id: ID!,
        user: User,
        invite: User,
        shop:Shop,
        role(role:Role):String,
        inviteLink: String,
        isAccepted: Boolean,
        isExpired: Boolean,
        createdAt: String,
        updatedAt: String,
    }
    
`;


module.exports = shopRoleBaseAccessInviteTypeDefs;
