const {gql} = require('apollo-server-express');


const brandTypeDefs = gql`
    
    input BrandInput {
        name: String!,
        email: String,
        category:[ID]!,
        subCategory:[ID]!,
        logo: ID,
        coverImage:ID,
        tags:[ID]!,
        website: String,
        phoneNumber: String!,
        mobileNumber: String!,
        facebook: String,
        tiktok: String,
        twitter: String,
        instagram: String,
        youtube: String,
        linkedIn: String,
        status:Status
    }

    type Brand {
        id: ID!,
        name: String,
        email: String,
        category:[Category],
        subCategory:[Category],
        logo: Media,
        coverImage: Media,
        tags:[Tag],
        website: String,
        phoneNumber: String,
        mobileNumber: String,
        publishingDateTime:String,
        facebook: String,
        tiktok: String,
        twitter: String,
        instagram: String,
        youtube: String,
        linkedIn: String,
        status(status:Status):String,
        isBlocked: Boolean,
        verified(verified:Verified):String,
        viewCounts: Int,
        clickCounts: Int,
        subscriberCounts: Int,
        owner: User,
        brandShops:[Shop],
        admins:[User],
        modifiers:[User],
        watchers:[User],
        roleBaseAccessInvites:[BrandRoleBaseAccessInvite]
        subscribers:[User],
        verifiedBy: User,
        promotions: [Promotion],
        createdAt: String,
        updatedAt: String,
        #        offers: [Offer]
    }
    
    type BrandClick {
        brand: Brand,
        user:User,
    }
    
    type BrandView {
        brand: Brand,
        user:User,
    }
    
`;


module.exports = brandTypeDefs;
