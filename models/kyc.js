const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let kycSchema = new Schema({
    mobile: String,
    birthDate: String,
    nationality: String,
    country: String,
    postalCode: String,
    city: String,
    street: String,
    building:String,
    kycStatus: String
});


const Kyc = mongoose.model('kyc', kycSchema);
export default Kyc;
