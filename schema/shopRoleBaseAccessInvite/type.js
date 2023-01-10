const {gql} = require('apollo-server-express');


const shopRoleBaseAccessInviteTypeDefs = gql`

    type ShopRoleBaseAccessInvite {
        id: ID!,
        user: User,
        invitedEmail: String!,
        invited: User,
        shop:Shop,
        role(role:Role):String,
        inviteLink: String,
        isAccepted: Boolean,
        isDeleted: Boolean,
        isExpired: Boolean,
        status: Status,
        createdAt: String,
        updatedAt: String,
    }
    
`;

module.exports = shopRoleBaseAccessInviteTypeDefs;
