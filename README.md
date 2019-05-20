# mail-call-notifier

This is a sample template for mail-call-notifier 
### Local development

**Invoking function locally using a local sample payload**

```bash
sam local invoke -e event.json -n env.json NotifierFunction
```

## Packaging and deployment


Run the following command to package our Lambda function to S3:

```bash
sam package \
    --output-template-file packaged.yaml \
    --s3-bucket REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME
```

Next, the following command will create a Cloudformation Stack and deploy your SAM resources.

```bash
sam deploy \
    --template-file packaged.yaml \
    --stack-name mail-call-notifier \
    --capabilities CAPABILITY_IAM
```
