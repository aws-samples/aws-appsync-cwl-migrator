import * as AWS from 'aws-sdk';
import moment from 'moment';

export interface LogInfo {
	logGroupName: string;
	logStreamName: string;
}

export const createLogGroupOrStream = async (
	cwlClient: AWS.CloudWatchLogs
): Promise<LogInfo> => {
	const logGroupName = 'aws-appsync-cwl-migrator';
	const logStreamName = `test-${moment().format('YYYYMMDD-HH')}`; // mmss
	try {
		await cwlClient.createLogGroup({ logGroupName }).promise();
	} catch (err) {
		const code = (err as AWS.AWSError).code;
		if ('ResourceAlreadyExistsException' !== code) {
			throw err;
		}
		console.warn(`${err.message} - ${logGroupName}`);
	}
	try {
		await cwlClient.createLogStream({ logGroupName, logStreamName }).promise();
	} catch (err) {
		const code = (err as AWS.AWSError).code;
		if ('ResourceAlreadyExistsException' !== code) {
			throw err;
		}
		console.warn(`${err.message} - ${logStreamName}`);
	}
	return {
		logGroupName,
		logStreamName
	};
};

export const putLogEvents = (
	cwlClient: AWS.CloudWatchLogs,
	logInfo: LogInfo,
	payload: string[],
	nextSequenceToken: string
) => {
	return cwlClient
		.putLogEvents({
			logGroupName: logInfo.logGroupName,
			logStreamName: logInfo.logStreamName,
			logEvents: payload.map((message) => {
				const inputLogEvent: AWS.CloudWatchLogs.InputLogEvent = {
					timestamp: new Date().getTime(),
					message: message
				};
				return inputLogEvent;
			}),
			sequenceToken: nextSequenceToken
		})
		.promise();
};

const filterLogEventsAndRecurse = async (
	cwlClient: AWS.CloudWatchLogs,
	logGroupName: string,
	filterPattern: string,
	nextToken: string
): Promise<AWS.CloudWatchLogs.FilteredLogEvent[]> => {
	const filterLogsRequest: AWS.CloudWatchLogs.Types.FilterLogEventsRequest = {
		logGroupName,
		filterPattern: `"${filterPattern}"`,
		interleaved: true
	};
	if (nextToken) {
		filterLogsRequest.nextToken = nextToken;
	}
	const result = await cwlClient.filterLogEvents(filterLogsRequest).promise();
	const theseResults: AWS.CloudWatchLogs.FilteredLogEvents = result.events
		? result.events
		: [];
	if (result.nextToken) {
		const downStream = await filterLogEventsAndRecurse(
			cwlClient,
			logGroupName,
			filterPattern,
			result.nextToken
		);
		return [...theseResults, ...downStream];
	}
	return theseResults;
};

export const filterLogEvents = (
	cwlClient: AWS.CloudWatchLogs,
	logGroupName: string,
	filterPattern: string
): Promise<AWS.CloudWatchLogs.FilteredLogEvent[]> => {
	try {
		return filterLogEventsAndRecurse(
			cwlClient,
			logGroupName,
			filterPattern,
			null
		);
	} catch (err) {
		console.log(
			`Error when filtering log events recursively - ${logGroupName}, ${filterPattern}. Ignoring. ${err}`
		);
		return Promise.resolve([]);
	}
};
