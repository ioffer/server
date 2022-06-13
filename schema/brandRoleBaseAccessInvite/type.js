const {gql} = require('apollo-server-express');


const brandRoleBaseAccessInviteTypeDefs = gql`

    type BrandRoleBaseAccessInvite {
        id: ID!,
        user: User,
        invite: User,
        brand:Brand,
        role(role:Role):String,
        inviteLink: String,
        isAccepted: Boolean,
        isExpired: Boolean,
        createdAt: String,
        updatedAt: String,
    }
    
`;


module.exports = brandRoleBaseAccessInviteTypeDefs;
