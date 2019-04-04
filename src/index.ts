import * as AWS from 'aws-sdk';
import {
	LogInfo,
	createLogGroupOrStream,
	putLogEvents,
	filterLogEvents
} from './cloudwatch-util';
import { transform } from './transform-util';
import { sleep } from './utils';

const fs = require('fs');

const metadata = JSON.parse(fs.readFileSync('./resources/metadata.json'));

const credentials = new AWS.SharedIniFileCredentials({
	profile: metadata.awsProfile
});
AWS.config.update({
	credentials: credentials,
	region: 'us-west-2'
});

const getNextSequenceToken = (errorMessage: string) => {
	return errorMessage.split(': ')[1];
};

const writeTransformedLogs = async (
	cwlClient: AWS.CloudWatchLogs,
	logInfo: LogInfo,
	logEvents: any[],
	nextSequenceToken: string
) => {
	try {
		const result = await putLogEvents(
			cwlClient,
			logInfo,
			logEvents,
			nextSequenceToken
		);
		const sleepTimeInMillis = 100;
		const errorWhileInSleep = (err) =>
			console.error('Error occured while sleeping:', err);
		await sleep(sleepTimeInMillis).catch(errorWhileInSleep); // Waiting to avoid throttling
		return result.nextSequenceToken;
	} catch (err) {
		const awsError = err as AWS.AWSError;
		if (
			!awsError ||
			('InvalidSequenceTokenException' !== awsError.code &&
				'DataAlreadyAcceptedException' !== awsError.code)
		) {
			throw err;
		}
		nextSequenceToken = getNextSequenceToken(awsError.message);
		console.log(`NextSequenceToken: ${nextSequenceToken}`);
		const result = await putLogEvents(
			cwlClient,
			logInfo,
			logEvents,
			nextSequenceToken
		);
		return result.nextSequenceToken;
	}
};

(async () => {
	try {
		const cwlClient = new AWS.CloudWatchLogs();
		const logInfo = await createLogGroupOrStream(cwlClient);

		const filterLogsPromises: Promise<
			AWS.CloudWatchLogs.FilteredLogEvent[]
		>[] = metadata.requestIds.map((requestId) =>
			filterLogEvents(cwlClient, metadata.logGroupName, requestId)
		);
		const filterLogsResponses = await Promise.all(filterLogsPromises);
		let nextSequenceToken = null;
		for (let index = 0; index < filterLogsResponses.length; index++) {
			const response = filterLogsResponses[index];
			if (response) {
				nextSequenceToken = await writeTransformedLogs(
					cwlClient,
					logInfo,
					response.map((event) =>
						transform(event.message, metadata.graphQLAPIId)
					),
					nextSequenceToken
				);
				console.log(
					`Ingested the transformed logs for requestId=${
						metadata.requestIds[index]
					}. Next sequenceToken: ${nextSequenceToken}`
				);
			}
		}
	} catch (err) {
		console.error(err);
	}
})();
