# AWS AppSync CWL Migrator

This is a sample package that migrates a given set of requestIds from the AppSync customer logs in CloudWatch, from the current (unstructured) to the new (structured JSON) format. If you have any AppSync logs from your existing APIs in an unstructured format, and are looking to run some analytics on the GraphQL tracing logs, this script will help you convert the older logs into a structured format, so you can leverage log analytics services to analyze on your existing requests.

You can use this as a starter project, and modify to work according to your needs and convenience.

## Usage

### Installation

You can clone this repository and fetch the dependencies by running the following commands:

```sh
git clone git@github.com:aws-samples/aws-appsync-cwl-migrator.git
cd aws-appsync-cwl-migrator
npm install
```

### Update Metadata

Update the `awsProfile`, `graphQLAPIId`, `logGroupName` and `requestIds` from [resources/metadata.json](./resources/metadata.json):

* **awsProfile** with an AWS Profile that you have created using the [AWS Command Line Interface](https://aws.amazon.com/cli/)
* **graphQLAPIId** with the AWS AppSync GraphQL API ID, available from the Settings page on your AppSync Console
* **logGroupName** with the log group name that contains the AppSync logs from your existing API
* **requestIds** with the list of requestIds that you would like to migrate to the newer structure

### Run the Script

Run `npm run start` to convert the given requestIds into a structured format. These transformed logs will appear in a new log group in Amazon CloudWatch - `aws-appsync-cwl-migrator`.

### Overview

As of May 8, 2019, [AWS AppSync](https://aws.amazon.com/appsync/) generates log events as fully structured JSON. This enables you to use log analytics services such as Amazon CloudWatch Logs Insights and Amazon Elasticsearch Service to understand the performance of your GraphQL requests and usage characteristics of your schema fields. For example, you can easily identify resolvers with large latencies that may be the root cause of a performance issue. You can also identify the most and least frequently used fields in your schema and assess the impact of deprecating GraphQL fields.

Using these structured logs, you can get more visibility into GraphQL performance with AWS AppSync logs, as described [here](https://aws.amazon.com/blogs/mobile/getting-more-visibility-into-graphql-performance-with-aws-appsync-logs/).

### Building Amazon CloudWatch Logs Insights dashboard

For your convenience, we have added a dashboard template, that you can modify and use to build a dashboard from source, using the CloudWatch console. Use the following steps to create a dashboard in your account:

* Open [resources/cwl-dashboard-source.json](./resources/cwl-dashboard-source.json)
* Update all occurences of "GRAPHQL_API_ID" with your AWS AppSync API ID, available from the Settings page of your AppSync console
* Update all occurences of "APPSYNC_REGION" with the region that API is created
* Navigate to the “Dashboards” section on the CloudWatch Console
* Click on “Create dashboard” button and provide a name
* Since we are creating a Dashboard from source, you can hit “Cancel” on the Widget configuration section (in the next step)
* You can now select “View/edit source” option under the “Actions” dropdown, and paste the above content from the above template with your GraphQL API ID
* Hit "Save" to Save your changes. This will then create a dashboard on CloudWatch Insights

You can then choose a time window that you are interested in, and run aggregated Insights queries to answer the following:

* Number of unique HTTP response status codes
* Top 'N' requests with maximum latency
* Top 'N' resolvers with maximum latency
* Most frequently invoked resolvers
* Resolvers with most errors in mapping templates
* Resolver latency statistics
* Field latency statistics

You can also go over the links to the AWS Mobile Blog and documentation pages listed above to get additional information.

## License

This library is licensed under the Apache 2.0 License.
