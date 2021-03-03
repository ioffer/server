const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    fullName: String,
    userName: {
        type: String,
        unique: true
    },
    email: String,
    password: String,
    confirmed: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    isBlocked: {
        type: Boolean,
        default: false
    },
    emailConfirmToken: String,
    avatar: {
        type: String,
        default: "http://localhost:4000/user.png"
    },
    address: String,
    balance: {
        type: String,
        default: ""
    },
    location: String,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: ""
    },
    twoFactorCode: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        default: "USER",
    },
    kyc: {
        mobile: {
            type: String,
            default: ""
        },
        birthDate: {
            type: String,
            default: ""
        },// !
        nationality: {
            type: String,
            default: ""
        },
        country: {
            type: String,
            default: ""
        },
        postalCode: {
            type: String,
            default: ""
        },
        city: {
            type: String,
            default: ""
        },
        street: {
            type: String,
            default: ""
        },// !
        building: {
            type: String,
            default: ""
        },
        kycStatus: {
            type: String,
            default: "NOT_SUBMITTED"
        }
    },
    smartContracts: [{
        type: Schema.Types.ObjectId,
        ref: 'smartcontracts',
    }],
}, {
    timestamps: true
});


// const User = mongoose.model('users', userSchema);

const User = mongoose.model('users', userSchema);
export default User;

