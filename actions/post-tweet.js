'use strict';

var path = require('path');
var child_process = require('child_process');
var Twit = require('twit');

/*
 * COMMAND-LINE ARGS
 */
var argv = require('yargs')
			.usage("Usage: $0 [--count=n --ngram=n --status=string]")
			.alias('c', 'count').describe('c', 'Number of responses to generate').default('c', 1)
			.alias('n', 'ngram').describe('n', 'N-gram factor').default('n', 3)
			.string('s').alias('s', 'status').describe('s', 'Tweet status, do not generate')
			.help('h').alias('h', 'help')
			.argv;

/*
 * LOAD SETTINGS
 */
try {
	var SETTINGS = require(path.resolve(__dirname, '../settings.json'));
	if (!SETTINGS.hasOwnProperty('twitter')) {
		throw new ReferenceError("Twitter settings property doesn't exist");
	}
} catch (err) {
	console.error("Unable to load Twitter auth settings");
	process.exit(1);
}

const MAX_LEN = 140; //it's twitter of course
var twit = new Twit(SETTINGS.twitter);


/**
 * @param {number?} opts.count = 1
 * @param {number?} opts.ngram = 3
 * @param {function(err, array[string])} callback
 */
function generateStatus (opts, callback) {
	if (typeof arguments[0] === 'function') { callback = arguments[0]; }
	let count = (typeof opts == 'object' && opts.count !== undefined) ? opts.count : 1;
	let ngram = (typeof opts == 'object' && opts.ngram !== undefined) ? opts.ngram : 3;
	let script = path.resolve(__dirname, '../generate-tweet/main.py');
	let corpus = path.resolve(__dirname, '../corpus/tweets/realDonaldTrump.txt');
	let cmd = `python ${script} -j -t ${corpus} -c ${count} -n ${ngram}`;

	child_process.exec(cmd, function (err, stdout, stderr) {
		if (err) {
			callback(err);
		} else {
			try {
				var responses = JSON.parse(stdout);
			} catch (err) {
				callback(new Error(`Unable to parse JSON from ${script}`));
			}
			if (!Array.isArray(responses)) {
				callback(new Error(`Did not get an array back from ${script}`));
			} else {
				callback(err, responses);
			}
		}
	});
}

/**
 * @param {string} status
 * @param {function(err, data, response)} callback
 */
function postTweet (status, callback) {
	if (typeof status !== 'string' || status.length == 0) {
		console.error("Tweet must be a non-empty string, aborting.");
		process.exit(1);
	}
	if (status.length > MAX_LEN) {
		console.log(`Tweet is longer than ${MAX_LEN} chars (${argv.tweet.length}), aborting.`);
		process.exit(1);
	}

	twit.post('statuses/update', {status: status}, function (err, data, res) {
		if (callback) {
			callback(err, data, res);
		} else if (err) {
			throw err;
		}
	});
}

/**
 * @param {error?} err
 * @param {object} data ---Twitter API 'tweet' object: https://dev.twitter.com/overview/api/tweets
 * @param {} response
 */
function onTweetPost (err, data, response) {
	if (err) throw err;
	console.log(`Posted tweet to ${data.user.name}'s timeline!`);
	console.log(data.text);
	console.log(`https://twitter.com/${data.user.screen_name}/status/${data.id_str}`);
	process.exit(0);
}

/*
 * MAIN
 */

//user-supplied or generate our own
if (argv.hasOwnProperty('status')) {
	postTweet(argv.status, onTweetPost);
} else {
	let count = parseInt(argv['count']);
	let ngram = parseInt(argv['ngram']);
	console.log(`Generating ${count} tweet${count>1?'s':''}, n-gram factor ${ngram} ...`);
	generateStatus({count: count, ngram: ngram}, function (err, strings) {
		if (err) throw err;
		postTweet(strings[0], onTweetPost);
	});
}
