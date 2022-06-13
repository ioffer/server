const {gql} = require('apollo-server-express');


const mediaTypeDefs = gql`
    
    type Media {
        id: ID!,
        url: [String],
        mediaType(mediaType:MediaTypes):String,
        uploadedBy:User,
        createdAt: String,
        updatedAt: String,
    }
    
`;


module.exports = mediaTypeDefs;
