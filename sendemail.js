
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
//accesstoken = ya29.a0AX9GBdWilJuBtrplPbhDEXCnlK2sWQia3msZ7tnvUhHnvqnZyDFS5frnaW1BqMNx2JgnLSlqcOBjhvcF7xJ0zpuxVaigaSu6U-BM9K1QFpD2CqllmF8P-V8ppqmjrX5YiinBOaYR1WuXfkSd35U5mHed-F_5aCgYKAY4SARASFQHUCsbCpadc3RfumlFSp86sYZcx8A0163
// These id's and secrets should come from .env file.
const CLIENT_ID = '29505227254-tbac2dam9vscrkdv3c3feh0ugbjn08mr.apps.googleusercontent.com';
const CLEINT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04SJYEJJSFt6-CgYIARAAGAQSNwF-L9IrYXGs3EtcDKL2Yq4OKjmgPdeII8gZRe7LvDh7gISNqPxnbXKLK3KJRxmp-7LiREChLyM';

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLEINT_SECRET,
    REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendMail() {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'dappslab.com@gmail.com',
                clientId: CLIENT_ID,
                clientSecret: CLEINT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        const mailOptions = {
            from: 'dappslab.com@gmail.com',
            to: 'qasimmehmood13936@gmail.com',
            subject: 'Hello from gmail using API',
            text: 'Hello from gmail email using API',
            html: '<h1>Hello from gmail email using API</h1>',
        };

        const result = await transport.sendMail(mailOptions);
        return result;
    } catch (error) {
        return error;
    }
}

sendMail()
    .then((result) => console.log('Email sent...', result))
    .catch((error) => console.log(error.message));

 //            user:'dappslab.com@gmail.com',
 //            clientId: '',
 //            clientSecret: '',
 //            refreshToken: '',
 //            accessToken: 'ya29.a0AX9GBdVz98kd_rcq6KTaWDhnhT5tFhnMiRA_mOWbYh_UH6pMzoiBQhMLn46OPRh7yFypX9SFzP9svv2e0_70J8jozJ3dxH6lS7FtuQ3I8nKSrHTtmpUrElf4ACDQWsIC9mrUFuOYsydPpnykelAs8S79jnrlaCgYKAfUSARASFQHUCsbCLsg0aqMOLohKP0NCFFzOdw0163'
 //