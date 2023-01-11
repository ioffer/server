const {gql} = require('apollo-server-express');


const brandRoleBaseAccessInviteTypeDefs = gql`

    type BrandRoleBaseAccessInvite {
        id: ID!,
        user: User!,
        invitedEmail: String!,
        invited: User,
        brand:Brand!,
        role(role:Role):String!,
        inviteLink: String!,
        isAccepted: Boolean,
        isExpired: Boolean,
        isDeleted: Boolean,
        status: Status,
        createdAt: String,
        updatedAt: String,
    }
    
`;


module.exports = brandRoleBaseAccessInviteTypeDefs;
