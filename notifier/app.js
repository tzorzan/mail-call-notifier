let AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION});
let ddb = new AWS.DynamoDB.DocumentClient();

let twilio = require('twilio');
let client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.lambdaHandler = async (event, context) => {
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
        let data = await putItem(item);

        data = await getUsersOnCall();
        let username = data.Items[0].sortkey.split("#")[2];
        let phone = data.Items[0].phone;
        console.log("Contacting " + username + " at phone: " + phone);

        let sms = await sendTwilioMessage(notification, phone, process.env.TWILIO_NUMBER);
        console.log("Twilio message id: " + sms.sid);

        let call = await startTwilioCall(process.env.RESPONSE_API_URL + message.mail.messageId, phone, process.env.TWILIO_NUMBER);
        console.log("Twilio call id: " + call.sid);
    } catch (e) {
        console.error(e);
        return e;
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
