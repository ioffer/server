import {issueConfirmEmailToken} from "../serializers";
import {FRONTEND_URL} from "../config";
const {User} = require('../models');

const forgetPasswordUrl=async(user)=>{
    const token = await issueConfirmEmailToken(user);
    await User.findByIdAndUpdate(user.id,{$set:{resetPasswordToken:token}},{new: true});
    return `${FRONTEND_URL}/user/reset-password/${token}`;
}
const forgetPasswordBody = async(name, link)=>{
    return `<div style=" width: 509px;
    margin: 0 auto;
    padding: 30px;
    background:#b2bec3;
    transform: translateY(104px);">
\t <div style="
    background: white;
    padding: 32px;
    width: 420px;
    margin: 0 auto;">
\t <h2 style="font-size: 25px;
    font-weight: 800;">Reset your password</h2>
\t <hr style="margin-top: 19px;
    margin-bottom: 18px;
    border: 0.3px solid;
    opacity: 0.1;">
\t <h6 style=" word-spacing: 1px;
    font-size: 12px;
    font-weight: 700;">Hi ${name} <br> Need to reset your password? No problem! Just click the button<br>below and you'll be on your way. If you didnot make this request, please ignore this email</h6>
\t <a  href="${link}"style="\tpadding: 11px;
    border: none;
    width: 410px;
    height: 41px;
    margin-top: 18px;
    border-radius:20px;
\tbackground: #5754AB;color: white;
    font-size: 14px;  font-weight: 700;">Reset your password</a>
\t </div>
     <div style="  text-align: center;
    margin-top: 29px;">
     <h5 style="   color: white;
    font-size: 11px;
    margin-top: 10px;
    word-spacing: 3px;">ALL RIGHTS RESERVED. DAPPSLAB ALL RIGHTS RESERVED.</h5>

     </div>
</div>`
}

module.exports={forgetPasswordUrl, forgetPasswordBody}
