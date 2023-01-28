const admin = require("firebase-admin");

const serviceAccount = require("../ioffer-366108-firebase-adminsdk-pyull-c24d28d114.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


export function sendPushNotification(registrationTokens, payload){
    admin.messaging().sendToDevice(registrationTokens, payload)
        .then((response) => {
            console.log('Sent successfully.\n');
            console.log(response);
        })
        .catch((error) => {
            console.log('Sent failed.\n');
            console.log(error);
        });
}
