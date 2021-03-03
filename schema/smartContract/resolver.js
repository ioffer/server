import {ApolloError, AuthenticationError} from "apollo-server-express";
import {compilerVersions} from "../../helpers/solidityVersions"
import lodash from "lodash"
const path = require('path');
const fs = require('fs');
const {SmartContract,User} = require('../../models');
const dateTime = require('../../helpers/DateTimefunctions');


let fetchData = ()=>{
    return SmartContract.find()
}

const resolvers = {
    SmartContract: {
        publisher:async (parent)=>{
            return User.findOne({"_id":parent.publisher})
        },
        verifiedBy: async (parent)=>{
            return User.findOne({"_id":parent.verifiedBy})
        },
    },
    Query: {
        smartContracts: () => {
            return fetchData()
        },
        verifiedSmartContracts: () => {
            return SmartContract.find({verified:"VERIFIED"});
        },
        smartContractById: async (_,args)=>{
            return await SmartContract.findById(args.id);
        },
        filterSmartContract: async (_,{searchSmartContract})=>{
            let filterCategory;
            try{
                if(searchSmartContract.contractCategory!==[]&&searchSmartContract.contractCategory!==undefined&&searchSmartContract.contractCategory!==""&&searchSmartContract.contractCategory[0]!==''&&searchSmartContract.contractCategory[0]!==undefined){
                    filterCategory = {
                        '$in':searchSmartContract.contractCategory
                    }
                }else{
                    filterCategory={$ne:null}
                }

                let filterTags;
                if(searchSmartContract.tags!==[]&&searchSmartContract.tags!==undefined&&searchSmartContract.tags!==""&&searchSmartContract.tags[0]!==''&&searchSmartContract.tags[0]!==undefined){
                    filterTags = {
                        '$in':searchSmartContract.tags
                    }
                }else{
                    filterTags={$ne:null}
                }

                let filterName;
                if(searchSmartContract.contractName!==[]&&searchSmartContract.contractName!==undefined&&searchSmartContract.contractName!==""){
                    filterName = { "$regex": searchSmartContract.contractName, "$options": "i" }
                }else{
                    filterName={$ne:null}
                }

                let filter = {
                    verified:"VERIFIED",
                    contractName:filterName,
                    contractCategory:filterCategory,
                    tags: filterTags,
                };


                let SortBy;
                if(searchSmartContract.sortBy!==""&&searchSmartContract.sortBy!==undefined){
                    if(searchSmartContract.sortBy==='NEWEST'){
                        SortBy={createdAt: -1}
                    }else if(searchSmartContract.sortBy==='LOW_TO_HIGH'){
                        SortBy={singleLicensePrice: 1}
                    }else if(searchSmartContract.sortBy==='HIGH_TO_LOW'){
                        SortBy={singleLicensePrice: -1}
                    }else if(searchSmartContract.sortBy==='TOP_SOLD'){
                        SortBy={purchasedCounts: -1}
                    }
                }else {
                    SortBy = 0;
                }
                try{
                    let response = await SmartContract.find(filter).sort(SortBy)
                    if(!response){
                        return new ApolloError("SmartContract Not Found", 404)
                    }
                    let {
                        minPrice,
                        maxPrice
                    } = searchSmartContract

                    if(minPrice===undefined&&maxPrice===undefined){
                        minPrice=0;
                        maxPrice=999999999;
                    }
                    let filteredResponse = lodash.remove(response, (n)=> {
                        if((parseFloat(n.singleLicensePrice) <= parseFloat(maxPrice)) && (parseFloat(n.singleLicensePrice) >= parseFloat(minPrice))){
                            return n;
                        }
                    });
                    return filteredResponse;
                }catch(err){
                    return new ApolloError("Internal Server Error", 500)
                }

            }catch (err) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        searchSmartContract: async (_,{searchSmartContract})=>{
            try{
                let filter = {
                    verified:"VERIFIED",
                    '$or':[
                        {contractName:{ "$regex": searchSmartContract.contractName, "$options": "i" }},
                        {tags: { "$regex":  searchSmartContract.contractName, "$options": "i" }}
                    ]
                };
                let response = await SmartContract.find(filter)
                if(!response){
                    return new ApolloError("SmartContract Not Found", 404)
                }
                return response;
            }catch(err){
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        searchPendingSmartContracts:async(_,{},{user})=>{
            if (!user){
                return  new AuthenticationError("Authentication Must Be Provided")
            }
            if(user.type==="ADMIN"){
                return await SmartContract.find({verified:"PENDING"});
            }else{
                throw new ApolloError("UnAuthorized", 403)
            }
        },
        getSource:async (_,{id},{user}) => {
            if(!user){
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let smartContract  = await SmartContract.findOne({"_id":id})
                if(user.id === smartContract.publisher||user.type === "ADMIN"){
                    if(!smartContract){
                        return new ApolloError("SmartContract Not Found", 404)
                    }
                    let filename = smartContract.source.substr(22,99);
                    filename =  filename.slice(0, -4);
                    const sourceFile=path.resolve ( './' ,'contracts',filename+'.sol');
                    try{
                        return await fs.readFileSync (sourceFile,'utf8');
                    }catch(err){
                        return new ApolloError("Reading File Error", 500)
                    }
                } else{
                    return new ApolloError("UnAuthorized User", 403)
                }
            }catch (err) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        getCompilerVersions:async (_,{},{})=>{
            return compilerVersions();
        }
    },
    Mutation:{
        cancelSmartContract: async (_, {id},{user})=>{
            if(!user){
                return  new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if(user.type ==="ADMIN"){
                    let smartContract;
                    try {
                        smartContract = {
                            verifiedBy: user.id,
                            verifiedDateTime:dateTime(),
                            verified:"REJECTED",
                        };
                    }catch(e){
                        console.log("error:",e)
                    }
                    try {
                        let response = await SmartContract.findByIdAndUpdate(id, {$set:smartContract},{new:true})
                        if (!response) {
                            return new ApolloError("Request Not Found", 404)
                        }
                        return response

                    } catch (err) {
                        return new ApolloError("Internal Server Error", 500);
                    }
                }else{
                    return new ApolloError("UnAuthorized User", 403);
                }
            }catch (err) {
                return new ApolloError("Internal Server Error", 500);
            }

        },
        createSmartContract:async (_,{newSmartContract},{SmartContract,user})=>{
            if(!user){
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let smartContract;
                smartContract =  SmartContract({
                    ...newSmartContract,
                    publisher: user.id,
                    publishingDateTime:dateTime(),
                });
                let result = await smartContract.save();
                let response = await User.findById(user.id);
                response.smartContracts.push(result._id);
                response.save();
                result = {
                    ...result.toObject(),
                    id: result._id.toString()
                }
                return result;
            }catch(e){
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        updateSmartContract:async (_,{newSmartContract,id},{SmartContract,user})=>{
            if(!user){
                return  new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let newContract = {
                    ...newSmartContract,
                    verified:"PENDING"
                }
                return await SmartContract.findByIdAndUpdate(id,newContract,{new:true})
            } catch (err) {
                throw new ApolloError("Internal Server Error", 500);
            }
        },
        deleteSmartContract:async (_,{id},{user})=>{
            if(!user){
                return  new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let response = await SmartContract.findByIdAndDelete(id);
                if (!response) {
                    return new ApolloError("SmartContract Not Found", 404);
                }
                return {
                    success: true,
                    message: "SmartContract Deleted Successfully."
                }
            } catch (err) {
                throw new ApolloError("Internal Server Error", 500);
            }
        },
        verifySmartContract:async (_,{id},{SmartContract,user})=>{
            if(!user){
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if(user.type ==="ADMIN"){
                try {
                    let smartContract;
                    smartContract = {
                        verified:"VERIFIED",
                        verifiedBy: user.id,
                        verifiedDateTime:dateTime(),
                    };
                    return await SmartContract.findByIdAndUpdate(id, {$set:smartContract},{new:true})
                } catch (err) {
                    throw new ApolloError("Internal Server Error", 500);
                }
            }else{
                throw new ApolloError("UnAuthorized User",403);
            }
        },
    }
}

module.exports = resolvers;
