/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
fs.writeFileSync('/home/daniel/testing-terminal-1', 'foo');

import * as os from 'os';
import * as path from 'path';
import * as ptyJs from 'node-pty';

fs.writeFileSync('/home/daniel/testing-terminal-2', 'foo');
// The pty process needs to be run in its own child process to get around maxing out CPU on Mac,
// see https://github.com/electron/electron/issues/38
var shellName: string;
if (os.platform() === 'win32') {
	shellName = path.basename(process.env.PTYSHELL);
} else {
	// Using 'xterm-256color' here helps ensure that the majority of Linux distributions will use a
	// color prompt as defined in the default ~/.bashrc file.
	shellName = 'xterm-256color';
}
var shell = process.env.PTYSHELL;
var args = getArgs();
var cwd = process.env.PTYCWD;
var cols = process.env.PTYCOLS;
var rows = process.env.PTYROWS;
var currentTitle = '';

setupPlanB(process.env.PTYPID);
cleanEnv();

interface IOptions {
	name: string;
	cwd: string;
	cols?: number;
	rows?: number;
}

var options: IOptions = {
	name: shellName,
	cwd
};
if (cols && rows) {
	options.cols = parseInt(cols, 10);
	options.rows = parseInt(rows, 10);
}

fs.writeFileSync('/home/daniel/testing-terminal-3', 'foo');
var ptyProcess = ptyJs.fork(shell, args, options);

fs.writeFileSync('/home/daniel/testing-terminal-4', 'foo');
var closeTimeout;
var exitCode;

// Allow any trailing data events to be sent before the exit event is sent.
// See https://github.com/Tyriar/node-pty/issues/72
function queueProcessExit() {
	closeTimeout = setTimeout(function () {
		ptyProcess.kill();
		process.exit(exitCode);
	}, 250);
}

ptyProcess.on('data', function (data) {
	process.send({
		type: 'data',
		content: data
	});
	if (closeTimeout) {
		clearTimeout(closeTimeout);
		queueProcessExit();
	}
});

ptyProcess.on('exit', function (code) {
	exitCode = code;
	queueProcessExit();
});

process.on('message', function (message) {
	if (message.event === 'input') {
		ptyProcess.write(message.data);
	} else if (message.event === 'resize') {
		ptyProcess.resize(message.cols, message.rows);
	}
});

sendProcessId();
setupTitlePolling();

function getArgs() {
	if (process.env['PTYSHELLCMDLINE']) {
		return process.env['PTYSHELLCMDLINE'];
	}
	var args = [];
	var i = 0;
	while (process.env['PTYSHELLARG' + i]) {
		args.push(process.env['PTYSHELLARG' + i]);
		i++;
	}
	return args;
}

function cleanEnv() {
	var keys = [
		'AMD_ENTRYPOINT',
		'ELECTRON_RUN_AS_NODE',
		'PTYCWD',
		'PTYPID',
		'PTYSHELL',
		'PTYCOLS',
		'PTYROWS',
		'PTYSHELLCMDLINE'
	];
	keys.forEach(function (key) {
		if (process.env[key]) {
			delete process.env[key];
		}
	});
	var i = 0;
	while (process.env['PTYSHELLARG' + i]) {
		delete process.env['PTYSHELLARG' + i];
	}
}

function setupPlanB(parentPid) {
	setInterval(function () {
		try {
			process.kill(parentPid, 0); // throws an exception if the main process doesn't exist anymore.
		} catch (e) {
			process.exit();
		}
	}, 5000);
}

function sendProcessId() {
	process.send({
		type: 'pid',
		content: ptyProcess.pid
	});
}

function setupTitlePolling() {
	sendProcessTitle();
	setInterval(function () {
		if (currentTitle !== ptyProcess.process) {
			sendProcessTitle();
		}
	}, 200);
}

function sendProcessTitle() {
	process.send({
		type: 'title',
		content: ptyProcess.process
	});
	currentTitle = ptyProcess.process;
}