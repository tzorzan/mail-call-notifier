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
            "timestamp_status-username": message.mail.timestamp,
            "from": commonHeaders.from,
            "to": commonHeaders.to,
            "subject": commonHeaders.subject
        };
        let data = await putItem(item);
        console.log("Put item in DynamoDB: " + JSON.stringify(data));
    } catch (e) {
        console.error(e);
    }

    try {
        let sms = await sendTwilioMessage(notification, "+393402344097", process.env.TWILIO_NUMBER);
        console.log("Twilio message id: " + sms.sid);
    } catch (e) {
        console.error(e);
    }

    try {
        let call = await startTwilioCall("http://demo.twilio.com/docs/voice.xml", "+393402344097", process.env.TWILIO_NUMBER);
        console.log("Twilio call id: " + call.sid);
    } catch (e) {
        console.error(e);
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
