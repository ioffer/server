const {gql} = require('apollo-server-express');

const baseTypeDefs = gql `
#    directive @isAuth on FIELD_DEFINITION
    directive @isAuth(requires: Role = ADMIN) on OBJECT | FIELD_DEFINITION
    directive @isAuth2(requires: [Role] = [USER]) on OBJECT | FIELD_DEFINITION
    type Query {
        _:String
    }
    type Mutation{
        _:String
    }
    type Subscription {
        _:String
    }
`;

module.exports = baseTypeDefs;