import * as yup from 'yup';
import {AuthenticationError} from "apollo-server-express";

/**
 * USER MODEL Validation Rules
 */

const id = yup
    .string()
    .required('Must Authenticate')

const userName = yup
    .string()
    .required('UserName is required.')
    .min(3, 'UserName should have atleast 5 characters.')
    .max(20, 'UserName should have atmost 10 characters.')
    .matches(/^\w+$/, 'Should be alphanumeric.');

const fullName = yup
    .string()
    .required('FullName is required.')
    .min(3, 'FullName should have atleast 3 characters.');


const email = yup
    .string()
    .required('Email is required.')
    .email('This is invalid email.');

const password = yup
    .string()
    .required("Password is required.")
    .min(5, 'Password should have atleast 5 characters.')
    .max(15, 'Password should have atmost 15 characters.');

// User Registeration Validation Schema
export const UserRegisterationRules = yup.object().shape({
    userName,
    password,
    fullName,
    email
});

// User Authentication Validation Schema
export const UserAuthenticationRules = yup.object().shape({
    userName,
    password
});

export const EmailRules= yup.object().shape({
    email
});

export const PasswordRules= yup.object().shape({
    password
});

export const UserRules = yup.object().shape({
    id
});
