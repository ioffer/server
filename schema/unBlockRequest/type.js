const {gql} = require('apollo-server-express');


const unBlockRequestTypeDefs = gql`
    
    type UnBlockRequest {
        id: ID!,
        user:User!,
        description:String!,
        unBlocked:Boolean!,
        createdAt: String!,
        updatedAt: String!,
    }
    
`;



module.exports = unBlockRequestTypeDefs;
