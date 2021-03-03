const {gql} = require('apollo-server-express');

const baseTypeDefs = gql `
    directive @isAuth on FIELD_DEFINITION

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