import papa from 'papaparse';
import { breakStringOnFirstOccurence } from './utils';

const pathResolverMap: { [key: string]: string } = {};

const getFieldKey = (parentType: string, fieldName: string) => {
	return `${parentType}/${fieldName}`;
};

const getFieldInfo = (resolverArn: string) => {
	if (!resolverArn) {
		return {
			parentType: '',
			fieldName: ''
		};
	}

	// An Example of a resolverArn:
	// "arn:aws:appsync:us-west-2:1234567890:apis/abcdefghijklmno/types/ParentType/fields/fieldName"
	const parentFieldSubPath = resolverArn.split('/types/')[1];
	const parts = parentFieldSubPath.split('/fields/');
	return {
		parentType: parts[0],
		fieldName: parts[1]
	};
};

const getPathArray = (pathString: string) => {
	const csvPath = pathString.replace(/^\[(.+)\]$/, '$1');
	return papa.parse(csvPath, { delimiter: ', ' }).data;
};

const getMappingTemplate = (json: any) => {
	const oldKey = 'mappingTemplateType';
	const newKey = 'logType';
	const value = json[oldKey].replace(/\s/g, '');
	delete Object.assign(json, { [newKey]: value })[oldKey];
	const pathArray = getPathArray(json.path);
	if (pathArray.length > 0) {
		json.path = pathArray[0];
	}
	const fieldInfo = getFieldInfo(json.resolverArn);
	json.parentType = fieldInfo.parentType;
	json.fieldName = fieldInfo.fieldName;
	const key = getFieldKey(fieldInfo.parentType, fieldInfo.fieldName);
	pathResolverMap[key] = json.resolverArn;
	return JSON.stringify(json);
};

const getTracingInfo = (json: any) => {
	const key = getFieldKey(json.parentType, json.fieldName);
	json.resolverArn = pathResolverMap[key];
	json.logType = 'Tracing';
	return JSON.stringify(json);
};

const getExecutionSummary = (
	message: string,
	graphQLAPIId: string,
	requestId: string
) => {
	const parts = breakStringOnFirstOccurence(message, ':');
	const jsonMessage = parts.right;
	if (jsonMessage === undefined) {
		return message;
	}
	const json = JSON.parse(jsonMessage);
	json.logType = 'ExecutionSummary';
	json.requestId = requestId;
	json.graphQLAPIId = graphQLAPIId;

	return JSON.stringify(json);
};

export const transform = (message: string, graphQLAPIId: string) => {
	const parts = breakStringOnFirstOccurence(message, ' ');
	const requestId = parts.left;
	const logContent = parts.right;
	if (logContent === undefined) {
		return message;
	}
	if (logContent.startsWith('{')) {
		const json = JSON.parse(logContent);
		json.requestId = requestId;
		json.graphQLAPIId = graphQLAPIId;

		if (json.context !== undefined) {
			return getMappingTemplate(json);
		}
		if (json.parentType) {
			return getTracingInfo(json);
		}
		return message;
	}
	if (logContent.startsWith('Execution Summary:')) {
		return getExecutionSummary(message, graphQLAPIId, requestId);
	}
	return message;
};
