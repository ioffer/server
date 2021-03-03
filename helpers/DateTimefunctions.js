// current timestamp in milliseconds

let dateTime=()=>{
    let ts = Date.now();

    let date_ob = new Date(ts);
    let sec = date_ob.getSeconds();
    let min = date_ob.getMinutes();
    let hour = date_ob.getHours();
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();

// prints date & time in YYYY-MM-DD format
//     console.log(year + "-" + month + "-" + date+"-"+hour+"-"+min+"-"+sec);
    const datetime2 = year + "-" + month + "-" + date+"-"+hour+"-"+min+"-"+sec;
    return datetime2;
}

module.exports = dateTime
