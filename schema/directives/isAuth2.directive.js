import {Roles} from "../../constants/enums";
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { GraphQLSchema } from 'graphql'
function authDirective(directiveName, getUserFn) {
    const typeDirectiveArgumentMaps = {}
    return {
        authDirectiveTypeDefs: `directive @${directiveName}(
      requires: Role = USER,
    ) on OBJECT | FIELD_DEFINITION
    `,
        authDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.TYPE]: type => {
                    // console.log('inside mapping')
                    const authDirective = getDirective(schema, type, directiveName)?.[0]
                    // console.log('authDirective on type', authDirective)
                    if (authDirective) {
                        typeDirectiveArgumentMaps[type.name] = authDirective
                    }
                    return undefined
                },
                [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
                    // console.log("fieldConfig ==> ", fieldConfig,'_fieldName ==> ', _fieldName, 'typeName ==> ', typeName)
                    const authDirective =
                        getDirective(schema, fieldConfig, directiveName)?.[0] ?? typeDirectiveArgumentMaps[typeName]
                    // console.log('authDirective on query', authDirective)
                    if (authDirective) {
                        const { requires } = authDirective
                        if (requires) {
                            const { resolve = defaultFieldResolver } = fieldConfig
                            fieldConfig.resolve = function (source, args, context, info) {
                                const user = getUserFn(context.user)
                                console.log("user", user)
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
    const roles = ['UNKNOWN', 'USER', 'REVIEWER', 'ADMIN']
    console.log("User:", user)

    return {
        hasRole: (role) => {
            const tokenIndex = roles.indexOf(token)
            const roleIndex = roles.indexOf(role)
            console.log('role:', roleIndex >= 0 && tokenIndex >= roleIndex, "token", token)
            return roleIndex >= 0 && tokenIndex >= roleIndex
        }
    }
}

export const { authDirectiveTypeDefs, authDirectiveTransformer } = authDirective('isAuth2', getUser)