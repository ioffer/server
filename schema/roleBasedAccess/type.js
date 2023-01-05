const {gql} = require('apollo-server-express');


const roleBasedAccessTypeDefs = gql`

    type RoleBasedAccess {
        id: ID!,
        user: User!,
        admin: AccessItem,
        modifier: AccessItem,
        watcher: AccessItem,
        createdAt: String,
        updatedAt: String,
    }
    type AccessItem {
        shops:[Shop],
        brands:[Brand],
    }
`;


module.exports = roleBasedAccessTypeDefs;
