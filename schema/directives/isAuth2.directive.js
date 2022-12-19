import {Roles} from "../../constants/enums";
import {RoleBaseAccess, Shop} from '../../models'
import {mapSchema, getDirective, MapperKind} from '@graphql-tools/utils'
import {GraphQLSchema} from 'graphql'
import {ObjectSchema} from "yup";

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
                        // console.log('authDirective ==>', authDirective)
                        const {requires} = authDirective
                        if (requires) {
                            const {resolve = defaultFieldResolver} = fieldConfig
                            fieldConfig.resolve = async function (source, args, context, info) {
                                console.log('info:', JSON.stringify(info))

                                if (!context.isAuth) {
                                    throw new Error('Need Authorization')
                                }
                                const user = getUserFn(context.user)
                                let baseRole = await user.getRoleBaseAccess(context, info);
                                console.log(baseRole, ' :baseRole')
                                if (!user.hasRole(requires, baseRole)) {
                                    let required = requires.toString()
                                    throw new Error(`Not Authorized, User Must Be ${required}`)
                                }
                                context.user.baseRole = "none"
                                context.baseRole = "none"
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
        getRoleBaseAccess: async (context, info) => {
            let {user} = context
            // let access = await RoleBaseAccess.findOne({"user": user.id})
            // console.log('fieldName==>', info['fieldName'])
            if (info.fieldName.toLowerCase().includes('shop')) {
                // let key = Object.keys(info.variableValues)[0];
                let id = info.variableValues?.id;
                // let id = info.variableValues[key];
                if (id && id.length === 24) {
                    let shop = await Shop.findById(id);
                    if (shop.owner.toString() === user.id) {
                        return Roles.OWNER
                    } else if (shop.admins.includes(user.id)) {
                        return Roles.ADMIN
                    } else if (shop.modifiers.includes(user.id)) {
                        return Roles.MODIFIER
                    } else if (shop.watchers.includes(user.id)) {
                        return Roles.WATCHER
                    }
                }
            }
            if (info.fieldName.toLowerCase().includes('brand')) {
                let id = info.variableValues?.id;
                if (id.length === 24) {
                    let brand = await Brand.findById(id);
                    console.log('brand:', brand)
                    if (brand.owner === user.id) {
                        return Roles.OWNER
                    } else if (brand.admins.includes(user.id)) {
                        return Roles.ADMIN
                    } else if (brand.modifiers.includes(user.id)) {
                        return Roles.MODIFIER
                    } else if (brand.watchers.includes(user.id)) {
                        return Roles.WATCHER
                    }
                }
            }
            return ""
        },
        hasRole: (requiredRole, baseRole) => {
            let hasRole = false;
            requiredRole.forEach((rr) => {
                if (userRole === rr || baseRole === rr) {
                    hasRole = true
                }
            })
            return hasRole;
        }
    }
}

export const {authDirectiveTypeDefs, authDirectiveTransformer} = authDirective('isAuth2', getUser)