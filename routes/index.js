var express = require('express');
const {sendEmail} = require("../sendemail");
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express',port:process.env.port || 4000 });
});

// router.get('/sendmailtest', async function(req, res, next) {
//   await sendEmail("qasimmehmood13936@gmail.com", "","HELLO")
//   res.send("sending email")
// });

module.exports = router;
