import {
    GMAIL_USER,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL,
    GOOGLE_CLIENT_ID
} from "../config"
import nodemailer from "nodemailer";
const { google } = require('googleapis');



export async function sendEmail(email, link, html) {
    try {
        const oAuth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URL
        );
        oAuth2Client.setCredentials({refresh_token: GOOGLE_REFRESH_TOKEN});

        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: GMAIL_USER,
                clientId: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                refreshToken: GOOGLE_REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        const mailOptions = {
            from: GMAIL_USER,
            to: email,
            subject: "IOffer 🌱",
            text: link,
            html: html,
        }

        const result = await transport.sendMail(mailOptions);
        console.log("email result:", result)
        return result;
    } catch (e) {
        return e;
    }
}