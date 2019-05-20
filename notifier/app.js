let twilio = require('twilio');
let client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.lambdaHandler = async (event, context) => {
    let message = JSON.parse(event.Records[0].Sns.Message);
    let commonHeaders = message.mail.commonHeaders;
    let notification = "New mail from: " + commonHeaders.from[0] + " to: " + commonHeaders.to[0] + " with subject: " + commonHeaders.subject;
    console.log(notification);

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
