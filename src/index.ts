import './lib/setup';

import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { createServer } from 'http';

const client = new SapphireClient({
	defaultPrefix: '!',
	caseInsensitiveCommands: true,
	logger: {
		level: LogLevel.Debug
	},
	intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
	loadMessageCommandListeners: true
});

// Create HTTP server for Clever Cloud health check and monitoring
const server = createServer((req, res) => {
	const url = req.url || '';

	// Health check endpoint for Clever Cloud
	if (url === '/health' || url === '/') {
		const isBotReady = client.isReady();
		const uptime = process.uptime();
		const memoryUsage = process.memoryUsage();

		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		});

		res.end(
			JSON.stringify({
				status: 'healthy',
				service: 'Discord Bot',
				bot: {
					status: isBotReady ? 'online' : 'offline',
					ready: isBotReady,
					uptime: Math.floor(uptime),
					commands: client.stores.get('commands')?.size || 0,
					guilds: client.guilds.cache.size
				},
				system: {
					uptime: Math.floor(uptime),
					memory: {
						used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
						total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
					},
					node: process.version
				},
				timestamp: new Date().toISOString()
			})
		);

		// Log health check requests (but not too frequently)
		if (Math.random() < 0.1) {
			// Only log 10% of requests to avoid spam
			client.logger.debug(`Health check requested from ${req.headers['user-agent'] || 'unknown'}`);
		}
	}
	// Bot status endpoint for monitoring
	else if (url === '/status') {
		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		});

		res.end(
			JSON.stringify({
				bot: {
					ready: client.isReady(),
					ping: client.ws.ping,
					guilds: client.guilds.cache.size,
					users: client.users.cache.size,
					commands: client.stores.get('commands')?.size || 0
				},
				timestamp: new Date().toISOString()
			})
		);
	}
	// 404 for other endpoints
	else {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				error: 'Not found',
				available_endpoints: ['/health', '/status'],
				timestamp: new Date().toISOString()
			})
		);
	}
});

const PORT = process.env.PORT || 8080;

const main = async () => {
	try {
		// Start HTTP server
		server.listen(Number(PORT), '0.0.0.0', () => {
			client.logger.info(`HTTP server listening on port ${PORT}`);
		});

		client.logger.info('Logging in');
		await client.login();
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();
