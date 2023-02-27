const {gql} = require('apollo-server-express');


const enumsTypeDefs = gql`

    enum Status {
        PENDING
        NOT_SUBMITTED
        VERIFIED
        REJECTED
        ARCHIVED
        DELETED
        UPCOMING
        PUBLISHED
        DRAFT
        ACCEPTED
        EXPIRED
    }
    enum Model {
        User
        Promotion
        Brand
        Shop
        BrandRoleBaseAccessInvite
        ShopRoleBaseAccessInvite
    }
    enum Role {
        SUPER_ADMIN
        ADMIN
        MODIFIER
        WATCHER
        OWNER
        USER
    }


    enum Verified {
        REJECTED
        PENDING
        VERIFIED
    }

    enum Sort{
        NEWEST
        LOW_TO_HIGH
        HIGH_TO_LOW
        TOP_SOLD
    }

    enum MediaTypes {
        AVATAR
        IMAGE
        BOOKLET
        THUMBNAIL
        LOGO
        VIDEO
        VIDEO_THUMBNAIL
    }

    union Entity = User |Promotion |Brand |Shop |BrandRoleBaseAccessInvite |ShopRoleBaseAccessInvite
    
    type MessageResponse {
        message: String!
        success: Boolean
    },

    input PaginationOptions {
        page: Int,
        limit: Int,
    },

    input Options {
        paginationOptions: PaginationOptions,
        where: String,
        sort: String,
        published: Boolean,
    },
    
    type Pagination {
        currentPage: Int,
        previousPage:Int,
        nextPage:Int,
        firstPage:Int,
        lastPage: Int,
        limit: Int,
        offset:Int,
        totalPages:Int,
        totalRecords:Int,
        fromRecord:Int,
        toRecord:Int,
    }
    
    

`;

module.exports = enumsTypeDefs;
