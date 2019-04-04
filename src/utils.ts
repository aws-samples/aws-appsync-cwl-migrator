import { setTimeout } from 'timers';

export const breakStringOnFirstOccurence = (
	message: string,
	delimiter: string
) => {
	return {
		left: message.substr(0, message.indexOf(delimiter)),
		right: message.substr(message.indexOf(delimiter) + 1)
	};
};

export const delayedInvoke = (
	waitTimeInMillis: number,
	callback: () => void
) => {
	setTimeout(() => {
		console.log('Waiting for %s millis', waitTimeInMillis);
		callback();
	}, waitTimeInMillis);
};

export const sleep = (timeInMillis: number) => {
	return new Promise((resolve) =>
		setTimeout(() => {
			console.log(`Sleeping for ${timeInMillis} millis`);
			resolve();
		}, timeInMillis)
	);
};

export const backoff = (fn, retries: number, delay: number) => {
	fn.catch((err) =>
		retries > 1
			? sleep(delay).then(() => backoff(fn, retries - 1, delay * 2))
			: Promise.reject(err)
	);
};

export const retryWithFixedDelay = (fn, retries: number, delay: number) => {
	return fn()
		.then((result) => {
			return Promise.resolve(result);
		})
		.catch((err) => {
			return retries > 0
				? sleep(delay).then(() => retryWithFixedDelay(fn, retries - 1, delay))
				: Promise.reject(err);
		});
};

export const promptAndExecute = (fn, msg: string) => {
	return new Promise((resolve, reject) => {
		console.log(msg);
		process.stdin.once('data', () => {
			try {
				resolve(fn());
			} catch (err) {
				reject(err);
			} finally {
				(process.stdin as any).unref();
			}
		});
	});
};
