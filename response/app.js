let AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION});
let ddb = new AWS.DynamoDB.DocumentClient();

const VoiceResponse = require('twilio').twiml.VoiceResponse;

exports.lambdaHandler = async (event, context) => {
    let id = event.pathParameters.id;
    console.log("Composing response for id: " + id);

    try {
        let data = await queryItem(id);
        let item = data.Items[0];

        console.log("Item: " + JSON.stringify(item));

        const voiceResponse = new VoiceResponse();
        voiceResponse.say({
            voice: 'woman',
            language: 'it-IT'
        }, "Hai una nuova mail da: " + item.from[0] + " con soggetto: " + item.subject);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml'
            },
            body: voiceResponse.toString()
        };
    } catch (e) {
        console.error(e);
        return e;
    }
};

function queryItem(id) {
    let params = {
        TableName: process.env.DYNAMODB_TABLE,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: { ":id": id }
    };
    return ddb.query(params).promise();
}