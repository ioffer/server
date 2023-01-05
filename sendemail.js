import {GMAIL_USER,GMAIL_PASSWORD, GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL,GOOGLE_CLIENT_ID} from "../config"
import nodemailer from "nodemailer";
import {google} from "googleapis"

const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL
);
oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
// async.await is not allowed in global scope, must use a wrapper
export async function sendEmail(email,link,html) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    // const testAccount = await nodemailer.createTestAccount();
    console.log("here")
    const accessToken = await oAuth2Client.getAccessToken();
    console.log("here2")


    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        service:'gmail',
        // host: "smtp.ethereal.email",
        // port: 587,
        // secure: false, // true for 465, false for other ports
        auth: {
            type: 'OAuth2',
            user: GMAIL_USER , // generated ethereal user
            // pass: GMAIL_PASSWORD, // generated ethereal password
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            refreshToken: GOOGLE_REFRESH_TOKEN,
            accessToken: accessToken,
        },
    });

    const mailOptions = {
        from: '"IOffer 👻" <DappsLab@example.com>',
        to: email,
        subject: "IOffer",
        text: link,
        html: html,
    }
    // send mail with defined transport object



    try{
        const info = await transporter.sendMail(mailOptions);
        return true;
    }catch (err){
        console.log("Sending mail Error:",err)
        return false
    }

    // return new Promise(async (resolve, reject) => {
    //     try {
    //         const send = await new Promise((resolve, reject) => {
    //             transporter.sendMail(mailOptions,(err,data)=>{
    //                 if(err){
    //                     console.log("error:",err);
    //                     reject(err)
    //                 }else{
    //                     resolve(data);
    //                 }
    //             });
    //         })
    //         // resolve(send)
    //         return true
    //     }
    //     catch (e) {
    //         reject(e)
    //         // return false
    //     }
    // })
}
