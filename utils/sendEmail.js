import {
    GMAIL_USER,
    GMAIL_PASSWORD,
    GOOGLE_ACCESS_TOKEN,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL,
    GOOGLE_CLIENT_ID
} from "../config"
import nodemailer from "nodemailer";
import {google} from "googleapis"
import main from '../helpers/googleAuth'

// ! i was using this for google send email, it was working, but then suddenly stoped working, so i am trying it again with old process.

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(email, link, html) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    const testAccount = await nodemailer.createTestAccount();

    try {
        console.warn("here")
        await main()
        console.log("here accessToken:", accessToken)

        // const accessToken = await oAuth2Client.getAccessToken();
    }catch (e) {
        console.log("Error in getting accessToken:", e)
    }

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        // host: "smtp.ethereal.email",
        // port: 587,
        // secure: false, // true for 465, false for other ports
        auth: {
            type: 'OAuth2',
            user: GMAIL_USER, // generated ethereal user
            pass: GMAIL_PASSWORD, // generated ethereal password
            clientId: "519527238773-g5ule7vgg7cfr5qt83s6fqr8pj7juvln.apps.googleusercontent.com",
            clientSecret: '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',
            refreshToken: '1//04CZiKqP-qSjdCgYIARAAGAQSNwF-L9IrS-So7dAolmi4eWYX0K20TvQfea24Q15_Wo1ruFQUFXvkuDabcD6OD7W-Fzbl9UHhkU4',
            accessToken: GOOGLE_ACCESS_TOKEN
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


    try {
        const info = await transporter.sendMail(mailOptions);
        return true;
    } catch (err) {
        console.log("Sending mail Error:", err)
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


// // async.await is not allowed in global scope, must use a wrapper
// export async function sendEmail(email, link, html) {
//     // Generate test SMTP service account from ethereal.email
//     // Only needed if you don't have a real mail account for testing
//     const testAccount = await nodemailer.createTestAccount();
//
//
//     // create reusable transporter object using the default SMTP transport
//     const transporter = nodemailer.createTransport({
//         // service: 'gmail',
//         // // host: "smtp.ethereal.email",
//         // // port: 587,
//         // // secure: false, // true for 465, false for other ports
//         // auth: {
//         //     // type: 'OAuth2',
//         //     user: GMAIL_USER, // generated ethereal user
//         //     pass: GMAIL_PASSWORD, // generated ethereal password
//         //     // clientId: "519527238773-g5ule7vgg7cfr5qt83s6fqr8pj7juvln.apps.googleusercontent.com",
//         //     // clientSecret: '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',
//         //     // refreshToken: '1//04CZiKqP-qSjdCgYIARAAGAQSNwF-L9IrS-So7dAolmi4eWYX0K20TvQfea24Q15_Wo1ruFQUFXvkuDabcD6OD7W-Fzbl9UHhkU4',
//         //     // accessToken: GOOGLE_ACCESS_TOKEN
//         // },
//         host: "smtp.ethereal.email",
//         port: 587,
//         secure: false, // true for 465, false for other ports
//         auth: {
//             user: testAccount.user, // generated ethereal user
//             pass: testAccount.pass, // generated ethereal password
//         },
//     });
//
//     const mailOptions = {
//         from: '"IOffer" <DappsLab@example.com>',
//         to: email,
//         subject: "IOffer",
//         text: "link",
//         html: "html",
//     }
//     // send mail with defined transport object
//
//
//     // try {
//     //     const info = await transporter.sendMail(mailOptions);
//     //     console.log("mail info =>", info)
//     //     return true;
//     // } catch (err) {
//     //     console.log("Sending mail Error:", err)
//     //     return false
//     // }
//
//     return new Promise(async (resolve, reject) => {
//         try {
//             const send = await new Promise((resolve, reject) => {
//                 transporter.sendMail(mailOptions,(err,data)=>{
//                     if(err){
//                         console.log("error:",err);
//                         reject(err)
//                     }else{
//                         console.log("sending email to ",email,"=>", data);
//                         resolve(data);
//                     }
//                 });
//             })
//             // resolve(send)
//             return true
//         }
//         catch (e) {
//             reject(e)
//             // return false
//         }
//     })
// }