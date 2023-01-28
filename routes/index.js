var express = require('express');
const {sendPushNotification} = require("../utils/firebase-admin");
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express',port:process.env.port || 4000 });
});

// router.get('/sendmailtest', async function(req, res, next) {
//   await sendEmail("qasimmehmood13936@gmail.com", "","HELLO")
//   res.send("sending email")
// });
router.get('/sendnotification', async function(req, res, next) {
  const message = {
    data:{
      hello:"hi"
    },
    notification: {
      title: "test",
      body: 'test body',
      data:'hi',
    }
  };
  sendPushNotification(['cmX8xoM40kpArKi4kT-HfF:APA91bH-Z8rVnV1cyP461YY5awONcrA4A__eAlDcHGq3TK0aUklhdZlOQs9pk8lDywhWbmWXdYzKROX7YECBdUDBLHVNTd7LBRaPhB463hWr2LzGZJARzXkPwoGkI1DQ3OxYSr7vdByH'], message)
  res.send("sending email")
});

module.exports = router;
