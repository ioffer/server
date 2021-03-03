const {gql} = require('apollo-server-express');

const contractUploaderQuery = gql `    
     
    extend type Mutation {
        contractUploader(file: Upload!): String! @isAuth
    }

`
module.exports=contractUploaderQuery;