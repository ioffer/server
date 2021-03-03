const {gql} = require('apollo-server-express');

// todo add auth
const imageQuery = gql `
    
    extend type Query {
        uploads: [File]
    }
     
    extend type Mutation {
        imageUploader(file: Upload!): String! @isAuth
    }

`
module.exports=imageQuery;