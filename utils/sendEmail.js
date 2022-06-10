import {GMAIL_USER,GMAIL_PASSWORD} from "../config"
import nodemailer from "nodemailer";

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(email,link,html) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    const testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        service:'gmail',
        // host: "smtp.ethereal.email",
        // port: 587,
        // secure: false, // true for 465, false for other ports
        auth: {
            type: 'OAuth2',
            user: GMAIL_USER , // generated ethereal user
            pass: GMAIL_PASSWORD, // generated ethereal password
            clientId:"29505227254-20jjgehtdgnou22u51963gua5sd0onaf.apps.googleusercontent.com",
            clientSecret: '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',
            refreshToken: '1//04_ted6GM_XOqCgYIARAAGAQSNwF-L9IrlsTuOqhNegdsV5OwUVdW4I89kY4qkRyoTovpe6297dYk-XP7SVT0ddyQrywOHipImc0'
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
