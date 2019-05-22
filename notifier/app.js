let AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION});
let ddb = new AWS.DynamoDB.DocumentClient();
let moment = require('moment');
let twilio = require('twilio');
let client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.lambdaHandler = async (event) => {
    let message = JSON.parse(event.Records[0].Sns.Message);
    let commonHeaders = message.mail.commonHeaders;
    let notification = "New mail from: " + commonHeaders.from[0] + " to: " + commonHeaders.to[0] + " with subject: " + commonHeaders.subject;
    console.log(notification);

    try {
        let item = {
            "id": message.mail.messageId,
            "sortkey": message.mail.timestamp,
            "from": commonHeaders.from,
            "to": commonHeaders.to,
            "subject": commonHeaders.subject
        };
        await putItem(item);
        let data = await getUsersOnCall();

        let availableUsers = data.Items.filter( user => userIsOnDuty(user));
        if(availableUsers.length < 1) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("No user on-call to contact.")
        }

        let username = availableUsers[0].sortkey.split("#")[2];
        let phone = availableUsers[0].phone;

        console.log("Contacting " + username + " at phone: " + phone);

        let sms = await sendTwilioMessage(notification, phone, process.env.TWILIO_NUMBER);
        console.log("Twilio message id: " + sms.sid);

        let call = await startTwilioCall(process.env.RESPONSE_API_URL + message.mail.messageId, phone, process.env.TWILIO_NUMBER);
        console.log("Twilio call id: " + call.sid);
    } catch (e) {
        console.error(e);
        return e.toString();
    }

    return "Success";
};

function putItem(item) {
    let params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: item
    };
    return ddb.put(params).promise();
}

function getUsersOnCall() {
    let params = {
        TableName: process.env.DYNAMODB_TABLE,
        KeyConditionExpression: "id = :u AND begins_with(sortkey, :status)",
        ExpressionAttributeValues: { ":u" : "user", ":status" : "ONCALL#" }
    };
    return ddb.query(params).promise();
}

function userIsOnDuty(user) {
    let onduty = checkShiftDays(user.days) && checkShiftHours(user.hours);
    console.log(user.sortkey.split("#")[2] + " is on-call, checking if it is on duty: " + onduty);
    return onduty;
}

function checkShiftDays(shift) {
    let today = moment().isoWeekday();
    let start = moment(shift.split("-")[0], "ddd").isoWeekday();
    let end = moment(shift.split("-")[1], "ddd").isoWeekday();
    return start <= end ? today >= start && today <= end : !(today > end && today < start);
}

function checkShiftHours(shift) {
    let now = moment();
    let start = moment(shift.split("-")[0], "HH:mm");
    let end = moment(shift.split("-")[1], "HH:mm");
    return start <= end ? now >= start && now <= end : !(now > end && now < start);
}

async function sendTwilioMessage (body, to, from) {
    return client.messages.create({
        body: body,
        to: to,
        from: from
    });
}

async function startTwilioCall (url, to, from) {
    return client.calls.create({
        url: url,
        to: to,
        from: from
    });
}
