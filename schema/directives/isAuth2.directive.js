import {Roles} from "../../constants/enums";
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { GraphQLSchema } from 'graphql'
function authDirective(directiveName, getUserFn) {
    const typeDirectiveArgumentMaps = {}
    return {
        authDirectiveTypeDefs: `directive @${directiveName}(
      requires: [Role] = [USER],
    ) on OBJECT | FIELD_DEFINITION
    `,
        authDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.TYPE]: type => {
                    const authDirective = getDirective(schema, type, directiveName)?.[0]
                    if (authDirective) {
                        typeDirectiveArgumentMaps[type.name] = authDirective
                    }
                    return undefined
                },
                [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
                    // console.log('_fieldName ==> ', _fieldName, 'typeName ==> ', typeName)
                    // if(_fieldName == 'userById'){
                    //     console.log("fieldConfig", fieldConfig)
                    // }
                    const authDirective =
                        getDirective(schema, fieldConfig, directiveName)?.[0] ?? typeDirectiveArgumentMaps[typeName]
                    if (authDirective) {
                        const { requires } = authDirective
                        if (requires) {
                            const { resolve = defaultFieldResolver } = fieldConfig
                            fieldConfig.resolve = function (source, args, context, info) {
                                if(!context.isAuth){
                                    throw new Error('Need Authorization')
                                }
                                const user = getUserFn(context.user)
                                if (!user.hasRole(requires)) {
                                    throw new Error('not authorized')
                                }
                                return resolve(source, args, context, info)
                            }
                            return fieldConfig
                        }
                    }
                }
            })

    }
}

function getUser(user) {
    let roles = Object.keys(Roles)
    let userRole = user.type
    return {
        hasRole: (requiredRole) => {
            let hasRole = false;
            requiredRole.forEach((rr)=>{
                if(userRole === rr){
                    hasRole = true
                }
            })
            return hasRole;
        }
    }
}

export const { authDirectiveTypeDefs, authDirectiveTransformer } = authDirective('isAuth2', getUser)